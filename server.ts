import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { validateAndResolveSafeUrl } from "./server/ssrfGuard";
import { buildAuditPayload, executeLiveWebsiteScan, generateIssuesFromExtractedData, SAMPLE_PRESETS } from "./server/scannerEngine";
import { storage, ScanSchedule } from "./server/storage";
import { watchdogScheduler } from "./server/watchdogScheduler";
import { FEATURE_REGISTRY } from "./src/config/features";
import { APP_CONFIG } from "./src/config/appConfig";
import { requireAuth, optionalAuth, requireRole, signToken, verifyToken, AuthenticatedRequest } from "./server/middleware/auth";
import { PLAN_CONFIG } from "./server/config/pricing";
import { EntitlementService } from "./server/services/entitlementService";
import { ProductAnalytics } from "./server/observability/analytics";
import { calculateTierPrice, isPaymentBoundToOrder, verifyPaymentSignature, verifyWebhookSignature } from "./server/services/paymentService";
import { validateEnvironment } from "./server/config/envValidator";
import { toPublicAuditReport } from "./server/reports/publicReport";
import { shouldRecordGlobalStats } from "./server/observability/statsPolicy";
import { reportRepository } from "./server/repositories/reportRepository";

dotenv.config();
validateEnvironment();

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const app = express();
const PORT = 3000;
const WATCHDOG_CHANNELS = new Set(["TELEGRAM", "WHATSAPP", "EMAIL"]);
const WATCHDOG_FREQUENCIES = new Set(["DAILY", "HOURLY", "WEEKLY", "15MIN"]);

app.use(express.json({
  limit: "5mb",
  verify: (req: RawBodyRequest, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
}));

// Version header middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-LeadGuard-Version", "1.0.0-rc1");
  next();
});

// ---------------------------------------------------------------------------
// 1. Rate Limiting Middleware (IP-level bucket)
// ---------------------------------------------------------------------------
/** @classification CACHE-ONLY — acceptable for single-instance rate limiting. Multi-instance requires Redis/Firestore. */
const ipRateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(limitPerMin = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const now = Date.now();
    let bucket = ipRateBuckets.get(ip);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + 60000 };
      ipRateBuckets.set(ip, bucket);
      return next();
    }

    if (bucket.count >= limitPerMin) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait a moment before sending more diagnostic requests.",
      });
    }

    bucket.count++;
    next();
  };
}

// ---------------------------------------------------------------------------
// 2. Gemini AI Initialization with Fallbacks
// ---------------------------------------------------------------------------
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn("[Gemini] Failed to initialize GoogleGenAI:", err);
  }
}

async function generateGeminiContentWithFallback(prompt: string): Promise<string | null> {
  if (!ai) return null;

  const candidateModels = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  for (const model of candidateModels) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      if (res && res.text) {
        return res.text.trim();
      }
    } catch (err: any) {
      const isTemporary =
        err?.status === 503 ||
        err?.message?.includes("503") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("429");
      if (isTemporary) {
        console.warn(`[Gemini] Model ${model} unavailable, trying fallback...`);
        continue;
      }
    }
  }
  return null;
}

function generateFallbackDiagnosticSummary(domain: string, score: number, issues: any[]): string {
  if (issues.length === 0) {
    return `Lead channels and security signatures for ${domain} are completely verified and working smoothly across all 4 pillars.`;
  }

  const brokenWaIssue = issues.find((i) => i.category === "whatsapp" && i.severity === "CRITICAL");
  const pixelIssue = issues.find((i) => i.category === "pixel");
  const seoIssue = issues.find((i) => i.category === "seo");

  const summaryParts: string[] = [];
  if (brokenWaIssue) {
    summaryParts.push("WhatsApp contact button par invalid routing error (+9191 ya invalid format) hai jisse chat open nahi ho rahi.");
  }
  if (pixelIssue) {
    summaryParts.push("Meta Pixel absent hone se Facebook/Instagram ads ka attribution data track nahi ho raha.");
  }
  if (seoIssue) {
    summaryParts.push("Robots noindex tag Google search ranking ko block kar raha hai.");
  }

  if (summaryParts.length === 0) {
    summaryParts.push(`${issues.length} audit item(s) inspect kiye gaye hain.`);
  }

  return `${summaryParts.join(" ")} Overall Funnel Health Score: ${score}/100.`;
}

function sendError(res: Response, status: number, code: string, message: string, req?: any) {
  return res.status(status).json({
    error: {
      code,
      message,
      requestId: req?.requestId || `req_${Date.now()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// 3. API Routes
// ---------------------------------------------------------------------------

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: APP_CONFIG.version,
    aiReady: !!ai,
    monitorsCount: storage.getWatchdogTargets().length,
  });
});

// Feature Registry Inspection Endpoint
app.get("/api/features", (req: Request, res: Response) => {
  res.json({
    features: FEATURE_REGISTRY,
    totalFeatures: FEATURE_REGISTRY.length,
    productionReady: FEATURE_REGISTRY.filter(f => f.status === 'PRODUCTION_READY').length,
  });
});

// Central Config Endpoint
app.get("/api/config", (req: Request, res: Response) => {
  res.json(APP_CONFIG);
});

// Scan Statistics API
app.get("/api/scan-stats", (req: Request, res: Response) => {
  res.json(storage.getStats());
});

function scheduleCron(frequency: 'DAILY' | 'WEEKLY'): string {
  return frequency === 'DAILY' ? '0 9 * * *' : '0 9 * * 1';
}

app.get("/api/schedules", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ schedules: storage.getSchedulesForUser(req.user!.id) });
});

app.post("/api/schedules", requireAuth, rateLimiter(20), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUrl, frequency } = req.body;
    if (typeof targetUrl !== 'string' || targetUrl.length > 2048 || !['DAILY', 'WEEKLY'].includes(frequency)) {
      return sendError(res, 400, 'INVALID_INPUT', 'A valid URL and DAILY or WEEKLY frequency are required.', req);
    }
    const validation = await validateAndResolveSafeUrl(targetUrl);
    if (!validation.valid || !validation.normalized) return sendError(res, 400, 'INVALID_TARGET_URL', validation.error || 'Target URL is not allowed.', req);
    if (storage.getSchedulesForUser(req.user!.id).length >= 50) return sendError(res, 429, 'SCHEDULE_LIMIT', 'Maximum of 50 schedules per user reached.', req);
    const now = new Date();
    const schedule: ScanSchedule = {
      id: `sch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: req.user!.id,
      targetUrl: validation.normalized,
      frequency,
      cronExpression: scheduleCron(frequency),
      enabled: true,
      nextRunAt: new Date(now.getTime() + (frequency === 'DAILY' ? 86400000 : 7 * 86400000)).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    storage.addSchedule(schedule);
    res.status(201).json({ schedule });
  } catch (error: any) {
    sendError(res, 500, 'SCHEDULE_ERROR', error?.message || 'Failed to create schedule.', req);
  }
});

app.patch("/api/schedules/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const schedule = storage.getSchedule(req.params.id);
  if (!schedule) return sendError(res, 404, 'NOT_FOUND', 'Schedule not found.', req);
  if (schedule.userId !== req.user!.id) return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to update this schedule.', req);
  const updates: Partial<ScanSchedule> = {};
  if (typeof req.body.enabled === 'boolean') updates.enabled = req.body.enabled;
  if (req.body.frequency === 'DAILY' || req.body.frequency === 'WEEKLY') {
    updates.frequency = req.body.frequency;
    updates.cronExpression = scheduleCron(req.body.frequency);
    updates.nextRunAt = new Date(Date.now() + (req.body.frequency === 'DAILY' ? 86400000 : 7 * 86400000)).toISOString();
  }
  const updated = storage.updateSchedule(schedule.id, updates);
  res.json({ schedule: updated });
});

app.delete("/api/schedules/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const schedule = storage.getSchedule(req.params.id);
  if (!schedule) return sendError(res, 404, 'NOT_FOUND', 'Schedule not found.', req);
  if (schedule.userId !== req.user!.id) return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to delete this schedule.', req);
  res.json({ success: storage.deleteSchedule(schedule.id) });
});

app.get("/api/dashboard", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const since = Date.now() - 7 * 86400000;
  const scans = storage.getScansHistoryForUser(req.user!.id, 200).filter(scan => new Date(scan.scannedAt).getTime() >= since);
  const byDay = new Map<string, number>();
  const severity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const scan of scans) {
    const day = scan.scannedAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + scan.allIssues.length);
    for (const issue of scan.allIssues) if (issue.severity in severity) severity[issue.severity as keyof typeof severity]++;
  }
  const riskiestUrls = [...new Map(scans.map(scan => [scan.targetUrl, scan])).values()]
    .map(scan => ({ targetUrl: scan.targetUrl, domain: scan.domain, riskScore: scan.allIssues.reduce((total, issue) => total + ({ CRITICAL: 10, HIGH: 6, MEDIUM: 3, LOW: 1, INFO: 0 }[issue.severity as string] || 0), 0) }))
    .sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);
  res.json({ scans: scans.length, vulnerabilitiesPerDay: [...byDay.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)), severityDistribution: severity, riskiestUrls });
});

// Increment Fix Counter API
app.post("/api/scan-stats/increment-fix", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  storage.incrementFixes();
  res.json({ success: true, stats: storage.getStats() });
});

// Scans History Endpoint (User Scoped if authenticated)
app.get("/api/scans/history", optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    const history = storage.getScansHistoryForUser(req.user.id, 15);
    return res.json({ history });
  }
  const history = storage.getScansHistory(15);
  res.json({ history: history.map(scan => toPublicAuditReport(scan as any)) });
});

// Explicit Demo Preset Scan API (Isolated from Production /api/scan)
app.post("/api/demo-scan", rateLimiter(60), async (req: Request, res: Response) => {
  try {
    const { presetId = "drsharmadental.in" } = req.body;
    const presetKey = String(presetId).replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    const preset = SAMPLE_PRESETS[presetKey] || SAMPLE_PRESETS["drsharmadental.in"];

    const issues = generateIssuesFromExtractedData(preset);
    const auditResult = buildAuditPayload(`https://${preset.domain}`, preset.domain, preset, issues, Date.now() - 200, 180, 25);

    auditResult.isDemo = true;
    res.json(auditResult);
  } catch (error: any) {
    sendError(res, 500, "DEMO_SCAN_FAILED", error.message || "Failed to load demo scan.", req);
  }
});

// Primary 4-Pillar Website Scan API (Production Live Scan Only)
app.post("/api/scan", rateLimiter(45), optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return sendError(res, 400, "INVALID_URL", "Please enter a valid website URL.", req);
    }

    // Force live scan - NEVER allow silent demo preset fallbacks on production scans
    const auditResult = await executeLiveWebsiteScan(url, { forceLive: true });

    // Server-side user identity attachment
    if (shouldRecordGlobalStats(req.user?.id)) {
      auditResult.userId = req.user.id;
    }

    // AI diagnostic advice enhancement with fallback
    if (auditResult.allIssues.length > 0) {
      const prompt = `You are LeadGuard AI, an elite website revenue & conversion auditor for Indian businesses.
Target Domain: ${auditResult.domain}
Score: ${auditResult.score}/100 (Lead: ${auditResult.pillars.lead.score}, Ads: ${auditResult.pillars.ad.score}, SEO: ${auditResult.pillars.seo.score}, Cyber: ${auditResult.pillars.cyber.score})
Issues found: ${auditResult.allIssues.map((i: any) => `${i.title} (${i.severity}): ${i.description}`).join("; ")}

Provide a sharp, 2-sentence executive summary in Hinglish (Hindi + English) explaining the exact financial loss and urgent fix priority. Keep it punchy, respectful, and authoritative.`;

      const aiText = await generateGeminiContentWithFallback(prompt);
      auditResult.aiDiagnosticAdvice = aiText || generateFallbackDiagnosticSummary(
        auditResult.domain,
        auditResult.score,
        auditResult.allIssues
      );
    }

    // Persist scan in DB
    auditResult.aiRemediation = { status: 'PENDING', updatedAt: new Date().toISOString() };
    storage.saveScan(auditResult);
    await jobQueue.enqueue('aiAnalysis', { scanId: auditResult.scanId, findings: auditResult.allIssues }, auditResult.userId, 2);
    if (req.user) {
      storage.incrementScanStats(
        auditResult.allIssues.length > 0,
        auditResult.score >= 80,
        auditResult.allIssues.length
      );
    }

    res.json(auditResult);
  } catch (error: any) {
    console.error("[Scan Error]:", error?.message || error);
    sendError(res, 400, "SCAN_FAILED", error.message || "Failed to scan target website.", req);
  }
});

// Public Shareable Audit Report endpoint (Token Scoped ONLY - No scanId fallback)
app.get("/api/report/:token", async (req: Request, res: Response) => {
  const { token } = req.params;
  const report = await reportRepository.getPublicReportByToken(token);
  if (!report) return sendError(res, 404, "NOT_FOUND", "Public report not found.", req);
  res.json(report);
});

// Retrieve cached scan report by ID (IDOR & Ownership Scoped)
app.get("/api/scan/:id", optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const report = storage.getScan(id);
  if (!report) {
    return sendError(res, 404, "NOT_FOUND", "Audit report not found or session expired.", req);
  }

  // IDOR Ownership Check
  if (report.userId) {
    const isOwner = req.user && req.user.id === report.userId;
    const isAdmin = req.user && req.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return sendError(res, 403, "FORBIDDEN", "You do not have permission to view this report.", req);
    }
  }

  res.json(req.user ? report : toPublicAuditReport(report as any));
});

// JSON export for developers & agencies (IDOR & Ownership Scoped)
app.get("/api/scan/:id/export", optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const report = storage.getScan(id);
  if (!report) {
    return sendError(res, 404, "NOT_FOUND", "Audit report not found.", req);
  }

  if (report.userId) {
    const isOwner = req.user && req.user.id === report.userId;
    const isAdmin = req.user && req.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return sendError(res, 403, "FORBIDDEN", "You do not have permission to export this report.", req);
    }
  }

  res.setHeader("Content-Disposition", `attachment; filename="leadguard-audit-${report.domain}.json"`);
  res.json(req.user ? report : toPublicAuditReport(report as any));
});

// 24/7 Monitoring registration (Authenticated & User Scoped)
app.post("/api/watchdog/subscribe", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUrl, contact, channel = "TELEGRAM", frequency = "DAILY" } = req.body;
    if (!targetUrl || !contact) {
      return sendError(res, 400, "INVALID_INPUT", "Website URL and contact details are required.", req);
    }
    if (typeof targetUrl !== "string" || targetUrl.length > 2048 || typeof contact !== "string" || contact.length > 255) {
      return sendError(res, 400, "INVALID_INPUT", "Website URL or contact details are invalid.", req);
    }
    if (!WATCHDOG_CHANNELS.has(channel) || !WATCHDOG_FREQUENCIES.has(frequency)) {
      return sendError(res, 400, "INVALID_INPUT", "Unsupported watchdog channel or frequency.", req);
    }

    // SSRF Check on watchdog target URL
    const validation = await validateAndResolveSafeUrl(targetUrl);
    if (!validation.valid || !validation.normalized) {
      return sendError(res, 400, "INVALID_TARGET_URL", validation.error || "Target URL is not allowed.", req);
    }

    const domain = new URL(validation.normalized).hostname;
    const userId = req.user!.id;

    // Persist through watchdogRepository so production scheduling (Firestore)
    // and the durable runWatchdog executor see the exact target.
    const { watchdogRepository } = await import("./server/repositories/watchdogRepository");
    const target = await watchdogRepository.addTarget({
      id: `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetUrl: validation.normalized,
      domain,
      contact,
      channel,
      frequency,
      status: "ACTIVE_TRIAL",
      mode: "LIVE",
      userId,
      lastCheckedAt: new Date().toISOString(),
      lastStatus: "PASS (Active Monitoring)",
      lastScore: 100,
      nextCheckAt: new Date(Date.now() + 60000).toISOString(), // first probe within a minute
    }, userId, req.user?.email);

    storage.addWatchdogTarget(target as any);
    storage.addWatchdogCheckLog({
      id: `chk_${Date.now()}`,
      userId,
      domain,
      check: "4-Pillar Watchdog Activation Probe",
      status: "PASS (Active Monitoring)",
      timestamp: new Date().toISOString(),
      details: "Radar registered and heartbeat active",
    });

    res.json({
      success: true,
      message: `24/7 Watchdog Radar successfully activated for ${targetUrl}!`,
      lead: target,
    });
  } catch (error: any) {
    sendError(res, 500, "WATCHDOG_ERROR", error.message || "Failed to activate watchdog.", req);
  }
});

// List active watchdog monitors (User Scoped)
app.get("/api/watchdog/list", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === "ADMIN";

  const monitors = isAdmin ? storage.getWatchdogTargets() : storage.getWatchdogTargetsForUser(userId!);
  const recentChecks = isAdmin ? storage.getWatchdogCheckLogs(25) : storage.getWatchdogCheckLogsForUser(userId!, 25);

  res.json({
    activeMonitors: monitors,
    totalCount: monitors.length,
    recentChecks,
  });
});

app.delete("/api/watchdog/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = storage.getWatchdogTarget(id);
  if (!target) {
    return sendError(res, 404, "NOT_FOUND", "Watchdog target not found.", req);
  }

  if (target.userId && req.user?.id !== target.userId && req.user?.role !== "ADMIN") {
    return sendError(res, 403, "FORBIDDEN", "You do not have permission to delete this target.", req);
  }

  // Delete from both local cache and production repository (Firestore)
  const deleted = storage.deleteWatchdogTarget(id);
  try {
    const { watchdogRepository } = await import("./server/repositories/watchdogRepository");
    await watchdogRepository.deleteTarget(id, req.user?.id, req.user?.role === "ADMIN");
  } catch (err: any) {
    if (String(err?.message).includes("Unauthorized")) {
      return sendError(res, 403, "FORBIDDEN", "You do not have permission to delete this target.", req);
    }
  }
  res.json({ success: deleted });
});

// Webhooks API (User Scoped)
app.post("/api/webhooks/register", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, url, events = ["watchdog.incident_detected"] } = req.body;
    if (!name || !url) {
      return sendError(res, 400, "INVALID_INPUT", "Webhook name and destination URL are required.", req);
    }
    if (typeof name !== "string" || name.length > 100 || typeof url !== "string" || url.length > 2048 || !Array.isArray(events) || events.length > 20 || events.some((event: any) => typeof event !== "string" || event.length > 100)) {
      return sendError(res, 400, "INVALID_INPUT", "Webhook name, destination URL, or events are invalid.", req);
    }

    const validation = await validateAndResolveSafeUrl(url);
    if (!validation.valid || !validation.normalized) {
      return sendError(res, 400, "INVALID_WEBHOOK_URL", validation.error || "Webhook destination URL is not allowed.", req);
    }

    const userId = req.user!.id;
    const secret = crypto.randomBytes(16).toString("hex");
    const webhook = {
      id: `whk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      name,
      url: validation.normalized,
      secret,
      events,
      active: true,
      createdAt: new Date().toISOString(),
      failureCount: 0,
    };

    storage.addWebhook(webhook);
    res.json({ success: true, webhook });
  } catch (err: any) {
    sendError(res, 500, "WEBHOOK_ERROR", err?.message || "Failed to register webhook.", req);
  }
});

app.get("/api/webhooks/list", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === "ADMIN";
  const webhooks = isAdmin ? storage.getWebhooks() : storage.getWebhooksForUser(userId!);
  res.json({ webhooks });
});

app.get("/api/webhooks", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === "ADMIN";
  const webhooks = isAdmin ? storage.getWebhooks() : storage.getWebhooksForUser(userId!);
  res.json({ webhooks });
});

app.post("/api/webhooks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name = "LeadGuard Webhook", url, events = ["watchdog.incident_detected"] } = req.body;
    if (!url) {
      return sendError(res, 400, "INVALID_INPUT", "Webhook destination URL is required.", req);
    }
    if (typeof name !== "string" || name.length > 100 || typeof url !== "string" || url.length > 2048 || !Array.isArray(events) || events.length > 20 || events.some((event: any) => typeof event !== "string" || event.length > 100)) {
      return sendError(res, 400, "INVALID_INPUT", "Webhook name, destination URL, or events are invalid.", req);
    }

    const validation = await validateAndResolveSafeUrl(url);
    if (!validation.valid || !validation.normalized) {
      return sendError(res, 400, "INVALID_WEBHOOK_URL", validation.error || "Webhook destination URL is not allowed.", req);
    }

    const webhook = {
      id: `whk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: req.user!.id,
      name,
      url: validation.normalized,
      secret: crypto.randomBytes(16).toString("hex"),
      events,
      active: true,
      createdAt: new Date().toISOString(),
      failureCount: 0,
    };

    storage.addWebhook(webhook);
    res.json({ success: true, webhook });
  } catch (err: any) {
    sendError(res, 500, "WEBHOOK_ERROR", err?.message || "Failed to register webhook.", req);
  }
});

app.delete("/api/webhooks/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const webhook = storage.getWebhook(id);
  if (!webhook) {
    return sendError(res, 404, "NOT_FOUND", "Webhook configuration not found.", req);
  }

  if (webhook.userId && req.user?.id !== webhook.userId && req.user?.role !== "ADMIN") {
    return sendError(res, 403, "FORBIDDEN", "You do not have permission to delete this webhook.", req);
  }

  const deleted = storage.deleteWebhook(id);
  res.json({ success: deleted });
});

app.post("/api/webhooks/test", requireAuth, rateLimiter(20), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, url, secret = "leadguard_secret" } = req.body;
    let targetUrl = url;
    let signingSecret = secret;

    if (id) {
      const webhook = storage.getWebhook(String(id));
      if (!webhook) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Webhook configuration not found." } });
      }
      if (webhook.userId && req.user?.id !== webhook.userId && req.user?.role !== "ADMIN") {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to test this webhook." } });
      }
      targetUrl = webhook.url;
      signingSecret = webhook.secret;
    }

    if (!targetUrl) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Target webhook URL or webhook ID required." } });
    }

    const testPayload = {
      event: "test.ping",
      timestamp: new Date().toISOString(),
      message: "LeadGuard OS Webhook Test Incident",
      score: 42,
      domain: "sample-client.in",
    };

    const bodyStr = JSON.stringify(testPayload);
    const signature = crypto.createHmac("sha256", signingSecret).update(bodyStr).digest("hex");

    const { safeFetch } = await import("./server/security/safeFetch");
    const response = await safeFetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LeadGuard-Signature": signature,
        "User-Agent": "LeadGuard-Webhook-Tester/2.0",
      },
      body: bodyStr,
      timeoutMs: 8000,
    });

    res.json({
      success: response.ok,
      httpStatus: response.status,
      message: response.ok ? "Test webhook payload delivered successfully!" : `Webhook endpoint returned HTTP ${response.status}`,
    });
  } catch (err: any) {
    res.status(400).json({ error: { code: "SSRF_OR_DELIVERY_ERROR", message: err?.message || "Failed to deliver test webhook." } });
  }
});

// Monetization Orders API - Server Calculated Price & Immutable Payment State
// Creates a Razorpay order via their Orders API and returns the order_id for frontend checkout.
app.post("/api/monetization/order", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tierId = "tier-express-fix", paymentMethod = "UPI", customerName, customerPhone, customerEmail, domain } = req.body;

    // Server calculates product price - NEVER trust amountINR or status from client
    const tier = calculateTierPrice(tierId);
    const amountINR = tier.priceINR; // Server computed — authoritative

    // Persist through the repository layer so production (Firestore) and
    // payment verification share one source of truth.
    const { orderRepository } = await import("./server/repositories/orderRepository");
    const order = await orderRepository.createPendingOrder({
      tierId,
      tierName: tier.tierName,
      amountINR, // Server computed
      paymentMethod,
      customerName,
      customerPhone,
      customerEmail,
      domain,
    }, req.user?.id, req.user?.email);

    // Create Razorpay order via their Orders API
    let razorpayOrder: any = null;
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (razorpayKeyId && razorpayKeySecret) {
      try {
        const Razorpay = require("razorpay");
        const rzp = new Razorpay({
          key_id: razorpayKeyId,
          key_secret: razorpayKeySecret,
        });

        razorpayOrder = await rzp.orders.create({
          amount: amountINR * 100, // Razorpay expects paise (₹299 → 29900)
          currency: "INR",
          receipt: order.orderId,
          notes: {
            orderId: order.orderId,
            tierId,
            tierName: tier.tierName,
            customerName: customerName || "",
            domain: domain || "",
          },
        });

        // Bind provider order ID to internal order for verification later
        await orderRepository.updateOrderStatus(order.orderId, "PENDING", `Razorpay order created: ${razorpayOrder.id}`, true);
        // Store providerOrderId on the order for binding verification
        order.providerOrderId = razorpayOrder.id;
      } catch (rzpErr: any) {
        AuditLogger.log({ action: "RAZORPAY_ORDER_CREATION_FAILED", resource: order.orderId, details: { error: rzpErr?.message } });
        // Don't fail the whole request — the order exists locally. Frontend can retry.
      }
    }

    res.json({
      success: true,
      order: {
        ...order,
        providerOrderId: razorpayOrder?.id || null,
      },
      razorpay: razorpayOrder ? {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: razorpayKeyId, // Public key — safe to send to frontend
      } : null,
      checkoutNote: razorpayOrder
        ? "Razorpay order created. Open checkout modal with the provided orderId."
        : "Order created in PAYMENT_PENDING state. Razorpay not configured — use manual verification.",
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: "ORDER_ERROR", message: err?.message || "Failed to record order." } });
  }
});

// Payment Verification Endpoint (Server-verified HMAC signature)
// Hardened: routes through orderRepository (state machine + amount guard +
// Firestore persistence) and claims fulfillment exactly-once.
app.post("/api/monetization/verify-payment", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    if (!orderId || !razorpaySignature || !razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ error: { code: "INVALID_PAYMENT", message: "orderId, razorpayOrderId, razorpayPaymentId, and razorpaySignature are required." } });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(503).json({ error: { code: "PAYMENT_PROVIDER_UNCONFIGURED", message: "RAZORPAY_KEY_SECRET is not configured. Payment verification unavailable." } });
    }

    // Cryptographic signature check FIRST — proves the tuple (order|payment)
    // was produced by Razorpay. Forgery is rejected before any state change.
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, secret);
    if (!isValid) {
      AuditLogger.log({ action: "PAYMENT_FORGERY_REJECTED", resource: orderId, details: { provider: "razorpay", channel: "checkout-callback" }, userId: req.user?.id });
      return res.status(400).json({ error: { code: "FORGED_PAYMENT", message: "Invalid payment cryptographic signature." } });
    }

    const { orderRepository } = await import("./server/repositories/orderRepository");
    const existing = await orderRepository.getOrderById(orderId, req.user?.id, req.user?.role === "ADMIN");
    if (!existing) {
      return res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Order not found." } });
    }

    // Provider-order binding: the presented Razorpay order id must be the one
    // bound to this internal order (or the internal id itself for legacy rows).
    if (!isPaymentBoundToOrder(orderId, razorpayOrderId, (existing as any).providerOrderId)) {
      return res.status(400).json({ error: { code: "ORDER_MISMATCH", message: "Payment does not match the requested order." } });
    }

    // State-machine-validated transition (rejects FAILED/CANCELLED/REFUNDED → PAID),
    // persisted fail-closed to Firestore in production.
    const updatedOrder = await orderRepository.verifyAndMarkPaid(
      orderId,
      {
        paymentReference: razorpayPaymentId,
        provider: "RAZORPAY",
        signature: razorpaySignature,
        providerOrderId: razorpayOrderId,
        providerPaymentId: razorpayPaymentId,
      },
      req.user?.id
    );

    // Exactly-once fulfillment activation.
    try {
      const { fulfillmentRepository } = await import("./server/repositories/fulfillmentRepository");
      const tierId = String(updatedOrder.tierId || "");
      const fulfillmentType = tierId.includes("agency") ? "AGENCY_LICENSE"
        : tierId.includes("watchdog") ? "WATCHDOG_SUBSCRIPTION"
        : "EXPRESS_FIX";
      const claimed = await fulfillmentRepository.claimFulfillment(orderId, fulfillmentType as any, updatedOrder.userId, updatedOrder.tierId);
      if (claimed) {
        AuditLogger.log({ action: "FULFILLMENT_ACTIVATED_VIA_CHECKOUT", resource: orderId, details: { fulfillmentType } });
      }
    } catch (fulfillErr: any) {
      AuditLogger.log({ action: "FULFILLMENT_ERROR", resource: orderId, details: { error: fulfillErr?.message } });
    }

    res.json({ success: true, message: "Payment verified successfully", order: updatedOrder });
  } catch (err: any) {
    const code = err?.message || "";
    if (code.includes("INVALID_PAYMENT_STATE_TRANSITION")) {
      return res.status(409).json({ error: { code: "ILLEGAL_PAYMENT_STATE", message: code } });
    }
    if (code.includes("ORDER_NOT_FOUND")) {
      return res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Order not found." } });
    }
    if (code.includes("UNAUTHORIZED_ORDER_ACCESS")) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to verify this order." } });
    }
    res.status(500).json({ error: { code: "PAYMENT_VERIFICATION_ERROR", message: err?.message || "Failed to verify payment." } });
  }
});

app.get("/api/monetization/orders", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orders = req.user?.role === "ADMIN"
    ? storage.getOrders()
    : storage.getOrdersForUser(req.user!.id);
  res.json({ orders });
});

// Competitor Sabotage Radar API
app.post("/api/competitor-sabotage", requireAuth, rateLimiter(20), async (req: Request, res: Response) => {
  try {
    const { myUrl, competitorUrls } = req.body;
    if (!myUrl || !Array.isArray(competitorUrls) || competitorUrls.length === 0) {
      return res.status(400).json({ error: "Your website URL and at least 1 competitor URL are required." });
    }

    const safeCompetitors = competitorUrls.slice(0, 3);
    const [myScanResult, ...compScanResults] = await Promise.allSettled([
      executeLiveWebsiteScan(myUrl),
      ...safeCompetitors.map((u: string) => executeLiveWebsiteScan(u)),
    ]);

    const myAudit = myScanResult.status === "fulfilled" ? myScanResult.value : null;

    const competitorSabotages = safeCompetitors.map((url: string, index: number) => {
      const settled = compScanResults[index];
      const compAudit = settled.status === "fulfilled" ? settled.value : null;
      const domain = url.replace(/^https?:\/\//i, '').split('/')[0];

      if (!compAudit) {
        return {
          competitorUrl: url,
          domain,
          sabotageScore: 50,
          opportunities: [
            {
              type: "BROKEN_WHATSAPP" as const,
              title: "Competitor Site Unreachable / Broken Server",
              cta: "Run Google Search Ads on their brand name right now to capture stranded traffic!",
              impact: "Competitor server is failing to respond reliably.",
              severity: "CRITICAL" as const,
            },
          ],
          verdict: "Competitor has severe downtime / connectivity issues.",
        };
      }

      const opportunities: any[] = [];
      let sabotageScore = 0;

      if (!compAudit.metaPixel?.exists) {
        sabotageScore += 35;
        opportunities.push({
          type: "MISSING_PIXEL",
          title: "Competitor Meta Pixel Missing!",
          cta: "Competitor Pixel Missing! Run Google Ads and Meta Retargeting on their brand keywords now.",
          impact: "They cannot build custom audiences or optimize conversion campaigns.",
          severity: "CRITICAL",
        });
      }

      const hasBrokenWa = compAudit.whatsappLinks.some((w: any) => !w.isValid);
      const hasNoWa = compAudit.whatsappLinks.length === 0;
      if (hasBrokenWa) {
        sabotageScore += 30;
        opportunities.push({
          type: "BROKEN_WHATSAPP",
          title: "Competitor WhatsApp Link is Fatal (+9191 or Malformed)!",
          cta: "Bid aggressively on their local high-intent keywords — their mobile traffic bounces on tap!",
          impact: "100% of mobile WhatsApp clicks from their ad campaigns fail to start a chat.",
          severity: "CRITICAL",
        });
      } else if (hasNoWa) {
        sabotageScore += 15;
        opportunities.push({
          type: "BROKEN_WHATSAPP",
          title: "Competitor has No WhatsApp Chat Widget",
          cta: "Deploy LeadGuard 1-tap WhatsApp widget on your landing page to win 3x more mobile leads.",
          impact: "Friction-heavy contact form only.",
          severity: "HIGH",
        });
      }

      if (compAudit.seoPenalty?.hasNoIndex) {
        sabotageScore += 40;
        opportunities.push({
          type: "NOINDEX_SEO",
          title: "Competitor has Active 'noindex' SEO Penalty!",
          cta: "Target their top organic keywords — their entire site is invisible to Google Search!",
          impact: "They receive zero organic traffic from Google Search.",
          severity: "CRITICAL",
        });
      }

      sabotageScore = Math.min(99, Math.max(10, sabotageScore));

      return {
        competitorUrl: url,
        domain: compAudit.domain,
        businessName: compAudit.businessName,
        score: compAudit.score,
        sabotageScore,
        estimatedMonthlyLoss: compAudit.estimatedMonthlyLoss,
        opportunities,
        verdict: sabotageScore >= 60
          ? `Massive Sabotage Opportunity! ${compAudit.domain} has ${opportunities.length} critical revenue leak(s) you can exploit.`
          : sabotageScore >= 30
          ? `Moderate Opportunity: ${compAudit.domain} has funnel weaknesses in tracking/messaging.`
          : `${compAudit.domain} is well-optimized. Focus on speed and pricing advantage.`,
      };
    });

    res.json({
      success: true,
      myAudit,
      competitors: competitorSabotages,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to execute competitor sabotage scan." });
  }
});

// Batch Website Scanner & Hunter Machine (Throttled & Quota Protected)
app.post("/api/scan-batch", requireAuth, rateLimiter(20), async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: { code: "INVALID_BATCH", message: "Please provide a list of URLs to scan." } });
    }

    // Limit batch size to 20 per request to prevent Denial-of-Service / resource exhaustion
    const maxLimit = Math.min(urls.length, 20);
    const trimmedUrls = urls.slice(0, maxLimit).map((u: string) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);

    // Process URLs in controlled concurrency chunks of 5
    const chunkSize = 5;
    const results: any[] = [];

    for (let i = 0; i < trimmedUrls.length; i += chunkSize) {
      const chunk = trimmedUrls.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (rawUrl: string) => {
          try {
            const audit = await executeLiveWebsiteScan(rawUrl);
            const primaryIssue = audit.allIssues.length > 0 ? audit.allIssues[0].title : "No critical leaks detected";
            const shareableReportUrl = `${req.protocol}://${req.get('host')}/report/${audit.scanId}`;

            const waStatus = audit.whatsappLinks.some((w: any) => !w.isValid)
              ? "BROKEN"
              : audit.whatsappLinks.some((w: any) => w.zeroIntentLeak)
              ? "ZERO_INTENT"
              : audit.whatsappLinks.length > 0
              ? "WORKING"
              : "MISSING";

            const brokenItemNote = audit.allIssues.length > 0
              ? `${audit.allIssues[0].title}: ${audit.allIssues[0].description}`
              : "Missing Meta Pixel tracking script";

            const coldWhatsAppPitch = `Namaste ${audit.businessName || 'Founder'} ji,\n\nI was visiting ${audit.domain}'s website on my phone and noticed a critical leak:\n\n👉 Issue: ${brokenItemNote}\n\nWhenever high-intent customers click your contact button, it bounces (estimated loss: ₹${audit.estimatedMonthlyLoss.toLocaleString('en-IN')}/month in dropped leads).\n\nHere is your full forensic audit report: ${shareableReportUrl}\n\nWe can patch this in under 15 minutes today so you stop losing leads. Should I send over the 1-click fix code?`;

            const coldEmailPitch = `Subject: Urgent conversion leak on ${audit.domain} (₹${audit.estimatedMonthlyLoss.toLocaleString('en-IN')}/mo)\n\nHi ${audit.businessName || 'Team'},\n\nOur diagnostic crawler ran a full conversion health check on ${audit.domain} and identified ${audit.allIssues.length} revenue-blocking defects:\n\n• Primary Bottleneck: ${brokenItemNote}\n• Health Score: ${audit.score}/100\n• Full Audit Report: ${shareableReportUrl}\n\nWe provide rapid 15-minute fixes for conversion funnels. Reply to this email if you'd like our engineers to deploy the fix snippet today.`;

            return {
              scanId: audit.scanId,
              targetUrl: audit.targetUrl,
              domain: audit.domain,
              businessName: audit.businessName,
              score: audit.score,
              estimatedMonthlyLoss: audit.estimatedMonthlyLoss,
              adSpendRisk: audit.adSpendRisk,
              whatsappStatus: waStatus,
              metaPixelStatus: audit.metaPixel?.exists ? "HEALTHY" : "MISSING",
              ecommerceStatus: audit.ecommerce ? (audit.ecommerce.checkoutStatus === "CRITICAL_LEAK" ? "CRITICAL_LEAK" : "HEALTHY") : "NONE",
              primaryLeak: primaryIssue,
              shareableReportUrl,
              coldWhatsAppPitch,
              coldEmailPitch,
              scannedAt: audit.scannedAt,
              status: "SUCCESS",
            };
          } catch (err: any) {
            const fallbackDomain = rawUrl.replace(/^https?:\/\//i, '').split('/')[0] || rawUrl;
            return {
              targetUrl: rawUrl,
              domain: fallbackDomain,
              error: err?.message || "Server connection failed or response timeout",
              scannedAt: new Date().toISOString(),
              status: "ERROR",
            };
          }
        })
      );
      results.push(...chunkResults);
    }

    res.json({ results, totalScanned: results.length, batchLimit: maxLimit });
  } catch (error: any) {
    res.status(500).json({ error: { code: "BATCH_ERROR", message: error.message || "Failed to complete batch scan." } });
  }
});

// AI Cold Pitch Generator
app.post("/api/ai/pitch-generator", requireAuth, rateLimiter(20), async (req: Request, res: Response) => {
  try {
    const { clientName = "Founder", businessName = "your business", auditSummary = "Broken WhatsApp routing & missing Meta Pixel", tone = "direct_urgent", language = "hinglish" } = req.body;

    const prompt = `You are a high-conversion sales strategist for digital agencies in India.
Client: ${clientName}
Business: ${businessName}
Issues: ${auditSummary}
Tone: ${tone}
Language: ${language}

Draft a personalized cold WhatsApp outreach pitch pointing out the exact conversion loss with a friendly 15-minute fix offer.`;

    const aiText = await generateGeminiContentWithFallback(prompt);
    const fallbackPitch = `Namaste ${clientName} ji,\n\nI was visiting ${businessName}'s website today and noticed a critical technical leak affecting your customer inquiries.\n\nIssue detected: ${auditSummary}.\n\nWhenever a potential customer taps your WhatsApp/Call contact button from mobile, the link fails to launch directly into chat, leading to an immediate bounce and wasted ad spend (estimated loss: ₹15,000–₹25,000/month).\n\nWe run an emergency website audit & rapid-fix service for Indian businesses. We can patch and verify this link in under 15 minutes today so you never lose high-intent clients again.\n\nWould you like me to send over the 1-click fix snippet for your developer, or should our team deploy it directly?\n\nBest regards,\nLeadGuard Tech Specialist`;

    res.json({ pitch: aiText || fallbackPitch });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate pitch." });
  }
});

// ---------------------------------------------------------------------------
// Phase 4 Observability, Readiness Probe, Queue & API Key Endpoints
// ---------------------------------------------------------------------------

// 1. Health Probe (Lightweight)
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 2. Readiness Probe (Verifies DB, Queue, Storage)
app.get("/api/ready", async (_req: Request, res: Response) => {
  try {
    const dbHealth = await db.checkHealth();
    const queueDepth = await jobQueue.getQueueDepth();
    const memoryUsage = process.memoryUsage();

    res.json({
      status: "READY",
      database: dbHealth,
      queue: { activeJobs: queueDepth },
      memory: { rssMB: Math.round(memoryUsage.rss / 1024 / 1024) },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({ status: "UNREADY", error: err?.message || "Service unready" });
  }
});

// 3. Operational Metrics Endpoint
app.get("/api/metrics", requireAuth, requireRole("ADMIN"), (_req: Request, res: Response) => {
  res.json(metrics.getSnapshot());
});

// 4. API Key Creation & Revocation Endpoints
app.post("/api/keys/create", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || "anon";
  const { apiKey, keyId, record } = ApiKeyManager.generateApiKey(userId);
  AuditLogger.log({ userId, action: "CREATE_API_KEY", resource: keyId, ipAddress: req.ip });
  res.json({ apiKey, keyId, prefix: record.keyPrefix, createdAt: record.createdAt });
});

app.post("/api/keys/revoke", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { keyId } = req.body;
  if (!keyId) return res.status(400).json({ error: "keyId is required" });
  const success = req.user?.role === "ADMIN"
    ? ApiKeyManager.revokeApiKey(keyId)
    : ApiKeyManager.revokeApiKeyForUser(keyId, req.user!.id);
  if (success) {
    AuditLogger.log({ userId: req.user?.id, action: "REVOKE_API_KEY", resource: keyId, ipAddress: req.ip });
    res.json({ status: "REVOKED", keyId });
  } else {
    res.status(404).json({ error: "API Key not found" });
  }
});

// 5. Asynchronous Job Queue Enqueue & Status Endpoints
app.post("/api/queue/enqueue", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { type, data } = req.body;
  if (!type || !data) return res.status(400).json({ error: "type and data are required" });
  const allowedTypes = new Set(['scanWebsite', 'sendWebhook', 'sendNotification', 'generatePdf']);
  if (typeof type !== 'string' || !allowedTypes.has(type) || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ error: "Unsupported job type or invalid job data" });
  }

  const job = await jobQueue.enqueue(type as any, data, req.user?.id);
  res.json({ jobId: job.id, status: job.status, createdAt: job.createdAt });
});

app.get("/api/queue/job/:id", requireAuth, async (req: Request, res: Response) => {
  const job = await jobQueue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const user = (req as AuthenticatedRequest).user;
  if (job.userId && user?.id !== job.userId && user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(job);
});

// ---------------------------------------------------------------------------
// Phase 5 Monetization, Entitlement, Admin Console & Account Deletion Endpoints
// ---------------------------------------------------------------------------

// 1. Centralized Entitlements & Usage Limits Probe
app.get("/api/entitlements", optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const plan = EntitlementService.getUserPlan(user);
  const limits = PLAN_CONFIG[plan];
  const usage = storage.getUserUsage(user?.id || "anon");

  res.json({
    plan,
    limits,
    usage,
    canScan: EntitlementService.canRunScan(user, usage),
    canWatchdog: EntitlementService.canCreateWatchdog(user, usage),
    canExport: EntitlementService.canExportReport(user),
    canUseTools: EntitlementService.canUseAdvancedTool(user),
  });
});

// 2. GDPR Personal Data Archive Export
app.get("/api/user/export-data", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userScans = storage.getScansForUser(userId);
  const userMonitors = storage.getWatchdogTargetsForUser(userId);
  const userLogs = storage.getWatchdogCheckLogsForUser(userId);
  const userOrders = storage.getOrdersForUser(userId);

  AuditLogger.log({ userId, action: "GDPR_EXPORT_DATA", resource: userId, ipAddress: req.ip });

  res.setHeader("Content-Disposition", `attachment; filename=leadguard_export_${userId}.json`);
  res.json({
    user: req.user,
    scans: userScans,
    monitors: userMonitors,
    checkLogs: userLogs,
    orders: userOrders,
    exportedAt: new Date().toISOString(),
  });
});

// 3. Safe Account Deletion Flow
app.post("/api/user/delete-account", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  AuditLogger.log({ userId, action: "DELETE_ACCOUNT", resource: userId, ipAddress: req.ip });
  const success = storage.deleteAccount(userId);
  res.json({ status: "DELETED", success, userId });
});

// 4. Internal Admin Operations Overview (Requires ADMIN role)
app.get("/api/admin/overview", requireAuth, requireRole("ADMIN"), (req: AuthenticatedRequest, res: Response) => {
  const snapshot = metrics.getSnapshot();
  const logs = storage.getAuditLogs(50);
  const totalScans = storage.getStats();

  AuditLogger.log({ userId: req.user?.id, action: "VIEW_ADMIN_OVERVIEW", resource: "ADMIN_CONSOLE", ipAddress: req.ip });

  res.json({
    metrics: snapshot,
    auditLogs: logs,
    stats: totalScans,
    serverTime: new Date().toISOString(),
  });
});

// 5. Authoritative Razorpay Payment Webhook
app.post("/api/payments/webhook", async (req: RawBodyRequest, res: Response) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const payload = req.rawBody || Buffer.from(JSON.stringify(req.body));

  if (!signature) {
    return res.status(400).json({ error: "Missing webhook signature" });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET || (process.env.NODE_ENV === "production" ? "" : "leadguard_dev_razorpay_secret");
  const isValid = verifyWebhookSignature(payload, signature, secret);
  if (!isValid) {
    AuditLogger.log({ action: "PAYMENT_WEBHOOK_FAILED", resource: "WEBHOOK", details: { reason: "Invalid HMAC signature" } });
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  const { event, payload: eventData } = req.body;
  const eventId = typeof req.body?.id === "string" ? req.body.id : undefined;
  if (!eventId && process.env.NODE_ENV === "production") return res.status(400).json({ error: "Missing provider event id" });
  if (eventId) {
    const { paymentEventRepository } = await import("./server/repositories/paymentEventRepository");
    const claimed = await paymentEventRepository.claim({ provider: "razorpay", providerEventId: eventId, orderId: eventData?.payment?.entity?.order_id, eventType: event || "unknown", payloadHash: crypto.createHash("sha256").update(payload).digest("hex") });
    if (!claimed) return res.json({ status: "DUPLICATE_IGNORED", event });
  }

  if (event === "payment.captured") {
    const orderId = eventData?.payment?.entity?.order_id;
    AuditLogger.log({ action: "PAYMENT_WEBHOOK_CAPTURED", resource: orderId || "WEBHOOK" });
    ProductAnalytics.track("payment_completed", "anon", { orderId });

    // Fulfillment idempotency: activate entitlement ONLY ONCE
    if (orderId) {
      try {
        const { fulfillmentRepository } = await import("./server/repositories/fulfillmentRepository");
        const { orderRepository } = await import("./server/repositories/orderRepository");
        const order = await orderRepository.getOrderById(orderId, undefined, true);
        if (order) {
          // ── Provider-reported amount & currency verification ──────────────
          // Razorpay reports amounts in the smallest currency unit (paise).
          // A captured payment whose amount/currency does not match the
          // server-authoritative catalog price must NEVER be fulfilled.
          const entity = eventData?.payment?.entity || {};
          const providerAmountINR = typeof entity.amount === "number" ? entity.amount / 100 : undefined;
          const providerCurrency = typeof entity.currency === "string" ? entity.currency : undefined;
          try {
            const { verifyPaymentAmount } = await import("./server/services/paymentStateMachine");
            const expected = calculateTierPrice(order.tierId);
            verifyPaymentAmount(
              expected.priceINR,
              providerAmountINR ?? expected.priceINR,
              "INR",
              providerCurrency ?? "INR",
              orderId
            );
          } catch (amountErr: any) {
            AuditLogger.log({ action: "FULFILLMENT_ERROR", resource: orderId, details: { error: amountErr?.message, providerAmountINR, providerCurrency } });
            return res.json({ status: "REJECTED_AMOUNT_MISMATCH", event });
          }

          // State-machine validated transition to PAID (idempotent for
          // already-PAID orders via duplicate-event claim above).
          if (order.status !== "PAID" && order.status !== "REFUNDED") {
            try {
              await orderRepository.verifyAndMarkPaid(
                orderId,
                {
                  paymentReference: String(entity.id || eventId || "webhook-capture"),
                  provider: "RAZORPAY",
                  providerOrderId: String(entity.order_id || orderId),
                  providerPaymentId: String(entity.id || ""),
                },
                order.userId
              );
            } catch (transitionErr: any) {
              // Illegal transition (e.g. FAILED/CANCELLED → PAID) is rejected.
              AuditLogger.log({ action: "FULFILLMENT_ERROR", resource: orderId, details: { error: transitionErr?.message } });
              return res.json({ status: "REJECTED_ILLEGAL_TRANSITION", event });
            }
          }

          const fulfillmentType = order.tierId?.includes('agency') ? 'AGENCY_LICENSE'
            : order.tierId?.includes('watchdog') ? 'WATCHDOG_SUBSCRIPTION'
            : order.tierId?.includes('express') ? 'EXPRESS_FIX'
            : 'GENERIC';
          const fulfillment = await fulfillmentRepository.claimFulfillment(
            orderId, fulfillmentType as any, order.userId, order.tierId
          );
          if (fulfillment) {
            AuditLogger.log({ action: "FULFILLMENT_ACTIVATED_VIA_WEBHOOK", resource: orderId, details: { fulfillmentType } });
          } else {
            AuditLogger.log({ action: "FULFILLMENT_ALREADY_ACTIVATED", resource: orderId });
          }
        }
      } catch (fulfillErr: any) {
        AuditLogger.log({ action: "FULFILLMENT_ERROR", resource: orderId, details: { error: fulfillErr?.message } });
      }
    }
  }

  res.json({ status: "PROCESSED", event });
});

// ---------------------------------------------------------------------------
// Phase 6 Public API v1, OpenAPI Spec & Shareable Report Routes
// ---------------------------------------------------------------------------
import { v1Router } from "./server/api/v1";
import { generateOpenApiSpec } from "./server/api/openapi";
import { reportManager } from "./server/reports/reportManager";

// 1. Mount Public REST API v1
app.use("/api/v1", v1Router);

// 2. Serve OpenAPI 3.0 JSON Specification
app.get("/api/v1/openapi.json", (_req: Request, res: Response) => {
  res.json(generateOpenApiSpec());
});

// 3. Serve High-Entropy Immutable Shareable Report Snapshot
app.get("/report/share/:token", (req: Request, res: Response) => {
  const password = req.query.password as string;
  const result = reportManager.getSnapshot(req.params.token, password);

  if (result.error) {
    return res.status(404).json({ error: result.error });
  }

  res.json({ snapshot: result.snapshot, sharedAt: new Date().toISOString() });
});

// 3b. Secure PDF Report Download (Owner / Admin / explicit public-share)
// Enforces: authenticated owner or ADMIN, OR a valid public share token bound
// to the same scanId. Storage paths are never exposed — bytes are streamed
// server-side from durable object storage after integrity verification.
app.get("/api/pdf/:pdfId", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pdfReportRepository } = await import("./server/repositories/pdfReportRepository");
    const meta = await pdfReportRepository.getById(String(req.params.pdfId));
    if (!meta) {
      return sendError(res, 404, "NOT_FOUND", "PDF report not found.", req);
    }

    // Basic metadata sanity before any storage access
    if (meta.contentType !== "application/pdf" || !meta.storagePath || meta.sizeBytes <= 0 || meta.sizeBytes > 25 * 1024 * 1024) {
      return sendError(res, 400, "INVALID_PDF_METADATA", "PDF metadata failed validation.", req);
    }

    // Authorization: owner, admin, or valid public share token for this scan
    const user = req.user;
    const isOwner = !!user?.id && !!meta.userId && user.id === meta.userId;
    const isAdmin = user?.role === "ADMIN";
    const shareToken = (req.query.shareToken as string) || "";
    let isPublicShare = false;
    if (shareToken && /^[a-f0-9]{64}$/.test(shareToken)) {
      const shared = reportManager.getSnapshot(shareToken, req.query.password as string | undefined);
      isPublicShare = !shared.error && (shared.snapshot as any)?.scanId === meta.scanId;
    }

    if (!isOwner && !isAdmin && !isPublicShare) {
      AuditLogger.log({ action: "PDF_ACCESS_DENIED", resource: meta.pdfId, userId: user?.id });
      return sendError(res, 403, "FORBIDDEN", "You do not have permission to download this report.", req);
    }

    const bytes = await pdfReportRepository.readBytes(meta);
    if (!pdfReportRepository.verifyIntegrity(bytes, meta)) {
      AuditLogger.log({ action: "PDF_INTEGRITY_FAILED", resource: meta.pdfId });
      return sendError(res, 500, "PDF_INTEGRITY_FAILED", "Stored report failed integrity verification.", req);
    }

    AuditLogger.log({ action: "PDF_DOWNLOADED", resource: meta.pdfId, userId: user?.id });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("Content-Disposition", `attachment; filename="leadguard-report-${meta.scanId}.pdf"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(bytes);
  } catch (err: any) {
    if (String(err?.message).includes("NOT_FOUND")) {
      return sendError(res, 404, "NOT_FOUND", "PDF object missing from storage.", req);
    }
    return sendError(res, 500, "PDF_DOWNLOAD_ERROR", err?.message || "Failed to download PDF.", req);
  }
});

// 4. User Feedback Endpoint
app.post("/api/feedback", (req: Request, res: Response) => {
  const { scanId, rating, comments } = req.body;
  if (!rating) return res.status(400).json({ error: "rating is required" });

  AuditLogger.log({ action: "USER_FEEDBACK", resource: scanId || "GENERAL", details: { rating, comments } });
  res.status(201).json({ status: "RECEIVED", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 4. Vite Middleware & Production Server Start
// ---------------------------------------------------------------------------
import { backgroundWorker } from "./server/queue/worker";
import { GracefulShutdownHandler } from "./server/utils/shutdown";
import { db } from "./server/db/database";
import { jobQueue } from "./server/queue/jobQueue";
import { metrics } from "./server/observability/metrics";
import { AuditLogger } from "./server/observability/auditLogger";
import { ApiKeyManager } from "./server/security/apiKeyManager";

async function startServer() {
  // Start background watchdog heartbeat & background queue worker
  watchdogScheduler.start(60000);
  backgroundWorker.start(1000);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`LeadGuard OS Production Diagnostic Server active on http://0.0.0.0:${PORT}`);
  });

  // Register graceful shutdown handler
  GracefulShutdownHandler.registerSignalHandlers(server);
}

startServer();
