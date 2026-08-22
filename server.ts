import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { validateAndResolveSafeUrl } from "./server/ssrfGuard";
import { executeLiveWebsiteScan } from "./server/scannerEngine";
import { storage } from "./server/storage";
import { watchdogScheduler } from "./server/watchdogScheduler";
import { FEATURE_REGISTRY } from "./src/config/features";
import { APP_CONFIG } from "./src/config/appConfig";
import { isFirebaseConfigured } from "./server/firebaseAdmin";
import {
  scanRepository,
  userRepository,
  watchdogRepository,
  webhookRepository,
  orderRepository,
  reportRepository,
  statsRepository,
  auditRepository,
} from "./server/repositories";
import {
  optionalAuth,
  requireAuth,
  requireAdmin,
} from "./server/authMiddleware";
import {
  validateBody,
  scanRequestSchema,
  authSyncRequestSchema,
  watchdogSubscribeSchema,
  watchdogUpdateSchema,
  webhookRegisterSchema,
  webhookTestSchema,
  orderCreateSchema,
  orderVerifySchema,
  competitorScanSchema,
  batchScanSchema,
  pitchGeneratorSchema,
  adminSetRoleSchema,
} from "./server/validationSchemas";

dotenv.config();

const app = express();
const PORT = 3000;

// ---------------------------------------------------------------------------
// 1. Security Headers & Request Limits
// ---------------------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(express.json({ limit: "2mb" }));

// Production Startup Validation
if (process.env.NODE_ENV === "production") {
  if (process.env.STORAGE_MODE === "local" || !isFirebaseConfigured()) {
    console.error("FATAL: Production mode requires Firestore database. Set STORAGE_MODE=firestore and configure Firebase credentials.");
  }
}

// ---------------------------------------------------------------------------
// 2. Global Optional Authentication Middleware
// ---------------------------------------------------------------------------
app.use(optionalAuth);

// ---------------------------------------------------------------------------
// 3. Rate Limiting Middleware (IP-level bucket)
// ---------------------------------------------------------------------------
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
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded. Please wait a moment before sending more diagnostic requests.",
        },
      });
    }

    bucket.count++;
    next();
  };
}

// ---------------------------------------------------------------------------
// 4. Gemini AI Initialization with Fallbacks
// ---------------------------------------------------------------------------
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.warn("[Gemini] Failed to initialize GoogleGenAI:", err);
  }
}

async function generateGeminiContentWithFallback(prompt: string): Promise<string | null> {
  if (!ai) return null;

  const candidateModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];
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
    return `Lead channels and security signatures for ${domain} are verified across all 4 pillars.`;
  }

  const brokenWaIssue = issues.find((i) => i.category === "whatsapp" && i.severity === "CRITICAL");
  const pixelIssue = issues.find((i) => i.category === "pixel");
  const seoIssue = issues.find((i) => i.category === "seo");

  const summaryParts: string[] = [];
  if (brokenWaIssue) {
    summaryParts.push("WhatsApp contact button has an invalid routing error (+9191 or invalid prefix).");
  }
  if (pixelIssue) {
    summaryParts.push("Meta Pixel absent, preventing conversion attribution tracking.");
  }
  if (seoIssue) {
    summaryParts.push("Search indexing tag indicates noindex.");
  }

  if (summaryParts.length === 0) {
    summaryParts.push(`${issues.length} audit item(s) inspected.`);
  }

  return `${summaryParts.join(" ")} Overall Funnel Health Score: ${score}/100.`;
}

// ---------------------------------------------------------------------------
// 5. API Routes
// ---------------------------------------------------------------------------

// Health check (Public)
app.get("/api/health", async (req: Request, res: Response) => {
  const monitors = await watchdogRepository.getTargets(undefined, undefined, true);
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: APP_CONFIG.version,
    aiReady: !!ai,
    databaseEngine: isFirebaseConfigured() ? "Cloud Firestore (Firebase Admin)" : "In-Memory Fallback",
    firebaseConfigured: isFirebaseConfigured(),
    monitorsCount: monitors.length,
  });
});

// Feature Registry Inspection Endpoint (Public)
app.get("/api/features", (req: Request, res: Response) => {
  res.json({
    features: FEATURE_REGISTRY,
    totalFeatures: FEATURE_REGISTRY.length,
    productionReady: FEATURE_REGISTRY.filter((f) => f.status === "PRODUCTION_READY").length,
  });
});

// Central Config Endpoint (Public)
app.get("/api/config", (req: Request, res: Response) => {
  res.json(APP_CONFIG);
});

// Real System Statistics API (Firestore with Demo Isolation, Public)
app.get(["/api/scan-stats", "/api/stats"], async (req: Request, res: Response) => {
  try {
    const realStats = await statsRepository.getSystemStats();
    res.json(realStats);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch stats", details: err?.message });
  }
});

// Increment Fix Counter API (Admin or internal verification)
app.post("/api/scan-stats/increment-fix", requireAdmin, async (req: Request, res: Response) => {
  try {
    await statsRepository.recordFixCompleted();
    const updatedStats = await statsRepository.getSystemStats();
    res.json({ success: true, stats: updatedStats });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to record fix", details: err?.message });
  }
});

// Scans History Endpoint (Protected user history, empty for unauthenticated to prevent data leakage)
app.get("/api/scans/history", async (req: Request, res: Response) => {
  try {
    if (req.user?.uid) {
      const userScans = await scanRepository.getUserScans(req.user.uid, 50);
      return res.json({ history: userScans.items, nextCursor: userScans.nextCursor, authenticated: true });
    }

    // Anonymous requesters receive empty array to prevent scanning history leakage
    res.json({
      history: [],
      authenticated: false,
      message: "Sign in to view your scan history across devices.",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch scan history", details: err?.message });
  }
});

// Primary 4-Pillar Website Scan API (SSRF Protected + Real Firestore Persistence)
app.post("/api/scan", rateLimiter(45), validateBody(scanRequestSchema), async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const auditResult = await executeLiveWebsiteScan(url);

    // Attach verified user information from token context if available
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    const organizationId = req.user?.organizationId;

    // AI diagnostic advice enhancement with fallback
    if (auditResult.allIssues.length > 0) {
      const prompt = `You are LeadGuard AI, a website revenue and conversion auditor.
Target Domain: ${auditResult.domain}
Score: ${auditResult.score}/100 (Lead: ${auditResult.pillars?.leadGen?.score ?? 0}, Ads: ${auditResult.pillars?.adSpend?.score ?? 0}, SEO: ${auditResult.pillars?.seo?.score ?? 0}, Cyber: ${auditResult.pillars?.security?.score ?? 0})
Issues found: ${auditResult.allIssues.map((i: any) => `${i.title} (${i.severity}): ${i.description}`).join("; ")}

Provide a concise, 2-sentence executive summary explaining the estimated potential impact and recommended fix priority. Keep it objective, professional, and clear.`;

      const aiText = await generateGeminiContentWithFallback(prompt);
      auditResult.aiDiagnosticAdvice =
        aiText ||
        generateFallbackDiagnosticSummary(
          auditResult.domain,
          auditResult.score,
          auditResult.allIssues
        );
    }

    // Persist real scan to Firestore through scanRepository
    const persistedDoc = await scanRepository.saveCompletedScan(auditResult, userId, userEmail, organizationId);
    auditResult.publicToken = persistedDoc.publicToken;
    auditResult.scanId = persistedDoc.scanId;

    await statsRepository.recordScanCompleted(
      auditResult.allIssues.length > 0,
      auditResult.score >= 80,
      auditResult.allIssues.length,
      true
    );

    res.json(auditResult);
  } catch (error: any) {
    console.error("[Scan Error]:", error?.message || error);
    res.status(500).json({ error: error.message || "Failed to scan website." });
  }
});

// Retrieve cached scan report by ID (Ownership protected)
app.get("/api/scan/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const scan = await scanRepository.getScanById(id);
    if (!scan) {
      return res.status(404).json({ error: "Audit report not found or session expired." });
    }

    const scanOwnerId = (scan as any).userId;
    if (scanOwnerId && req.user!.uid !== scanOwnerId && req.user!.role !== "ADMIN") {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to view this report.",
      });
    }

    res.json(scan);
  } catch (err: any) {
    res.status(500).json({ error: "Error retrieving scan", details: err?.message });
  }
});

// Public Secure Report Access via Unpredictable Token (Sanitized ABAC)
app.get("/api/report/:token", async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const report = await reportRepository.getPublicReport(token);
    if (!report) {
      return res.status(404).json({ error: "Public report not found or link has expired." });
    }
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load public report", details: err?.message });
  }
});

// JSON export for developers & agencies (Protected)
app.get("/api/scan/:id/export", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const report = await scanRepository.getScanById(id);
  if (!report) {
    return res.status(404).json({ error: "Audit report not found." });
  }

  const reportOwnerId = (report as any).userId;
  if (reportOwnerId && req.user!.uid !== reportOwnerId && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden: You do not own this audit report." });
  }

  res.setHeader("Content-Disposition", `attachment; filename="leadguard-audit-${report.domain}.json"`);
  res.json(report);
});

// User Profile Sync Endpoint (Authenticated, extracts trusted UID from token)
app.post("/api/auth/sync", requireAuth, validateBody(authSyncRequestSchema), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { displayName, photoURL } = req.body;

    const userProfile = await userRepository.syncUserProfile(
      user.uid,
      user.email || `${user.uid}@auth.leadguard.os`,
      displayName,
      photoURL
    );

    await statsRepository.recordUserRegistered();
    res.json({ success: true, user: userProfile });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to sync user profile", details: err?.message });
  }
});

// 24/7 Monitoring registration (SSRF Protected + Authenticated)
app.post("/api/watchdog/subscribe", requireAuth, validateBody(watchdogSubscribeSchema), async (req: Request, res: Response) => {
  try {
    const { targetUrl, contact, channel, frequency } = req.body;

    // SSRF Check
    const ssrf = await validateAndResolveSafeUrl(targetUrl);
    if (!ssrf.valid) {
      return res.status(400).json({ error: `Invalid monitor URL: ${ssrf.error}` });
    }

    const domain = targetUrl.replace(/^https?:\/\//i, "").split("/")[0];
    const target = await watchdogRepository.addTarget(
      {
        targetUrl: ssrf.normalized || targetUrl,
        domain,
        contact,
        channel,
        frequency,
        status: "ACTIVE_TRIAL",
        mode: "LIVE",
        lastCheckedAt: new Date().toISOString(),
        lastStatus: "PASS (Active Monitoring)",
        lastScore: 100,
      },
      req.user!.uid,
      req.user!.email
    );

    await watchdogRepository.addCheckLog({
      targetId: target.id,
      domain,
      check: "4-Pillar Watchdog Activation Probe",
      status: "PASS (Active Monitoring)",
      timestamp: new Date().toISOString(),
      details: "Radar registered and heartbeat active in Firestore",
    });

    res.json({
      success: true,
      message: `24/7 Watchdog Radar successfully activated for ${targetUrl}!`,
      lead: target,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to activate watchdog." });
  }
});

// List active watchdog monitors and recent checks (Authenticated)
app.get("/api/watchdog/list", requireAuth, async (req: Request, res: Response) => {
  try {
    const targets = await watchdogRepository.getTargets(
      req.user!.uid,
      req.user!.organizationId,
      req.user!.role === "ADMIN"
    );
    const checks = await watchdogRepository.getCheckLogs(undefined, 25);

    res.json({
      activeMonitors: targets,
      totalCount: targets.length,
      recentChecks: checks,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list watchdog monitors", details: err?.message });
  }
});

// Update watchdog target (Owner or Admin)
app.put("/api/watchdog/targets/:id", requireAuth, validateBody(watchdogUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await watchdogRepository.updateTarget(
      id,
      req.body,
      req.user!.uid,
      req.user!.role === "ADMIN"
    );
    res.json({ success: true, target: updated });
  } catch (err: any) {
    res.status(403).json({ error: err?.message || "Failed to update watchdog target" });
  }
});

// Delete watchdog target (Owner or Admin)
app.delete("/api/watchdog/targets/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await watchdogRepository.deleteTarget(
      id,
      req.user!.uid,
      req.user!.role === "ADMIN"
    );
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(403).json({ error: err?.message || "Failed to delete watchdog target" });
  }
});

// Webhooks API (SSRF Guard + Secret Masking + Authenticated)
app.post("/api/webhooks/register", requireAuth, validateBody(webhookRegisterSchema), async (req: Request, res: Response) => {
  try {
    const { name, url, events } = req.body;
    const webhook = await webhookRepository.addWebhook(
      {
        name,
        url,
        events,
      },
      req.user!.uid,
      req.user!.email
    );

    res.json({ success: true, webhook });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to register webhook." });
  }
});

app.get("/api/webhooks/list", requireAuth, async (req: Request, res: Response) => {
  try {
    const webhooks = await webhookRepository.getWebhooks(req.user!.uid, req.user!.role === "ADMIN");
    res.json({ webhooks });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list webhooks", details: err?.message });
  }
});

app.delete("/api/webhooks/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await webhookRepository.deleteWebhook(id, req.user!.uid, req.user!.role === "ADMIN");
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(403).json({ error: err?.message || "Failed to delete webhook" });
  }
});

app.post("/api/webhooks/test", requireAuth, validateBody(webhookTestSchema), async (req: Request, res: Response) => {
  try {
    const { webhookId, url, secret } = req.body;
    let targetWebhook: any;

    if (webhookId) {
      const found = await webhookRepository.getWebhookById(webhookId, req.user!.uid, req.user!.role === "ADMIN");
      if (!found) {
        return res.status(404).json({ error: "Webhook not found or access denied" });
      }
      targetWebhook = found;
    } else if (url) {
      targetWebhook = {
        id: "whk_test",
        name: "Test Dispatcher",
        url,
        secret: secret || "leadguard_test_secret",
        events: ["test.ping"],
        active: true,
        createdAt: new Date().toISOString(),
        failureCount: 0,
      };
    } else {
      return res.status(400).json({ error: "Either webhookId or url is required." });
    }

    const testDelivery = await webhookRepository.dispatchWebhook(
      targetWebhook,
      "test.ping",
      {
        message: "LeadGuard OS Webhook Test Incident",
        score: 42,
        domain: "sample-client.in",
        testTimestamp: new Date().toISOString(),
      }
    );

    res.json({
      success: testDelivery.status === "SENT",
      httpStatus: testDelivery.httpStatus,
      status: testDelivery.status,
      message:
        testDelivery.status === "SENT"
          ? "Test webhook payload delivered successfully!"
          : `Webhook delivery error: ${testDelivery.errorMessage}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to deliver test webhook." });
  }
});

// Monetization Orders API (Guaranteed PENDING on Submission)
app.post("/api/monetization/order", validateBody(orderCreateSchema), async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    const order = await orderRepository.createPendingOrder(
      orderData,
      req.user?.uid,
      req.user?.email
    );

    await statsRepository.recordOrderCreated();
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to record order." });
  }
});

// Server-side Payment Verification
app.post("/api/monetization/orders/verify", validateBody(orderVerifySchema), async (req: Request, res: Response) => {
  try {
    const { orderId, paymentReference, provider, signature, providerOrderId } = req.body;
    const verifiedOrder = await orderRepository.verifyAndMarkPaid(
      orderId,
      { paymentReference, provider, signature, providerOrderId },
      req.user?.uid
    );
    res.json({ success: true, order: verifiedOrder });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Payment verification failed" });
  }
});

// Provider Webhook Endpoint: Razorpay
app.post("/api/payments/razorpay/webhook", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!webhookSecret || !signature) {
      return res.status(400).json({ error: "Missing Razorpay webhook secret or signature" });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    if (expectedSignature !== signature) {
      await auditRepository.logEvent({
        action: "ORDER_FAILED",
        details: { reason: "RAZORPAY_WEBHOOK_SIGNATURE_MISMATCH" },
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const orderId = paymentEntity?.notes?.orderId || paymentEntity?.description;

    if (orderId && (event === "payment.captured" || event === "order.paid")) {
      await orderRepository.updateOrderStatus(orderId, "PAID", `Razorpay webhook event: ${event}`, true);
    } else if (orderId && event === "payment.failed") {
      await orderRepository.updateOrderStatus(orderId, "FAILED", `Razorpay payment failed: ${paymentEntity?.error_description || "Declined"}`);
    }

    res.json({ status: "ok" });
  } catch (err: any) {
    res.status(500).json({ error: "Webhook processing error", details: err?.message });
  }
});

// Provider Webhook Endpoint: Stripe
app.post("/api/payments/stripe/webhook", async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const orderId = event?.data?.object?.metadata?.orderId;
    if (orderId && event.type === "payment_intent.succeeded") {
      await orderRepository.updateOrderStatus(orderId, "PAID", "Stripe payment_intent.succeeded", true);
    }
    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: "Stripe webhook error", details: err?.message });
  }
});

// Provider Webhook Endpoint: Cashfree
app.post("/api/payments/cashfree/webhook", async (req: Request, res: Response) => {
  try {
    const data = req.body?.data;
    const orderId = data?.order?.order_id;
    const paymentStatus = data?.payment?.payment_status;

    if (orderId && paymentStatus === "SUCCESS") {
      await orderRepository.updateOrderStatus(orderId, "PAID", "Cashfree webhook payment SUCCESS", true);
    }
    res.json({ status: "OK" });
  } catch (err: any) {
    res.status(500).json({ error: "Cashfree webhook error", details: err?.message });
  }
});

app.get("/api/monetization/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const orders = await orderRepository.getOrders(
      req.user!.uid,
      req.user!.organizationId,
      req.user!.role === "ADMIN"
    );
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list orders", details: err?.message });
  }
});

// Competitor Sabotage Radar API (SSRF Protected + Concurrency Bound + Authenticated)
app.post("/api/competitor-sabotage", requireAuth, rateLimiter(20), validateBody(competitorScanSchema), async (req: Request, res: Response) => {
  try {
    const { myUrl, competitorUrls } = req.body;

    const safeCompetitors = competitorUrls.slice(0, 3);
    const [myScanResult, ...compScanResults] = await Promise.allSettled([
      executeLiveWebsiteScan(myUrl),
      ...safeCompetitors.map((u: string) => executeLiveWebsiteScan(u)),
    ]);

    const myAudit = myScanResult.status === "fulfilled" ? myScanResult.value : null;

    const competitorSabotages = safeCompetitors.map((url: string, index: number) => {
      const settled = compScanResults[index];
      const compAudit = settled.status === "fulfilled" ? settled.value : null;
      const domain = url.replace(/^https?:\/\//i, "").split("/")[0];

      if (!compAudit) {
        return {
          competitorUrl: url,
          domain,
          businessName: domain,
          score: null,
          sabotageScore: 0,
          estimatedMonthlyLoss: 0,
          status: "SCAN_FAILED",
          errorCode: "SCAN_UNREACHABLE",
          opportunities: [],
          verdict: `Unable to evaluate ${domain} because the website could not be scanned.`,
        };
      }

      const opportunities: any[] = [];
      let sabotageScore = 0;

      if (!compAudit.metaPixel?.exists) {
        sabotageScore += 35;
        opportunities.push({
          type: "MISSING_PIXEL",
          title: "Competitor Meta Pixel Missing",
          cta: "Competitor Meta Pixel missing: opportunity to target audience keywords.",
          impact: "Attribution tracking not detected in public markup.",
          severity: "HIGH",
        });
      }

      const hasBrokenWa = compAudit.whatsappLinks?.some((w: any) => !w.isValid);
      const hasNoWa = (compAudit.whatsappLinks?.length || 0) === 0;
      if (hasBrokenWa) {
        sabotageScore += 30;
        opportunities.push({
          type: "BROKEN_WHATSAPP",
          title: "Competitor WhatsApp Link Format Error",
          cta: "Competitor WhatsApp link contains prefix error (+9191 or invalid prefix).",
          impact: "Mobile WhatsApp contact clicks fail to open directly.",
          severity: "CRITICAL",
        });
      } else if (hasNoWa) {
        sabotageScore += 15;
        opportunities.push({
          type: "BROKEN_WHATSAPP",
          title: "No WhatsApp Chat Widget Detected",
          cta: "Deploy instant WhatsApp widget to offer faster response times.",
          impact: "Contact form only without instant messenger.",
          severity: "MEDIUM",
        });
      }

      if (compAudit.seoPenalty?.hasNoIndex) {
        sabotageScore += 40;
        opportunities.push({
          type: "NOINDEX_SEO",
          title: "Competitor has 'noindex' Tag",
          cta: "Target organic search queries while competitor remains unindexed.",
          impact: "Search engine indexing restricted by page tag.",
          severity: "CRITICAL",
        });
      }

      sabotageScore = Math.min(99, Math.max(0, sabotageScore));

      return {
        competitorUrl: url,
        domain: compAudit.domain,
        businessName: compAudit.businessName,
        score: compAudit.score,
        sabotageScore,
        estimatedMonthlyLoss: compAudit.estimatedMonthlyLoss,
        opportunities,
        status: "SUCCESS",
        verdict:
          sabotageScore >= 60
            ? `Opportunity identified: ${compAudit.domain} has ${opportunities.length} funnel weakness(es).`
            : sabotageScore >= 30
            ? `Moderate opportunity: ${compAudit.domain} has minor tracking or messaging gaps.`
            : `${compAudit.domain} is well-configured across primary tags.`,
      };
    });

    res.json({
      success: true,
      myAudit,
      competitors: competitorSabotages,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to execute competitor scan." });
  }
});

// Batch Website Scanner & Hunter Machine (Persists Real Scans with Tokens)
app.post("/api/scan-batch", requireAuth, rateLimiter(20), validateBody(batchScanSchema), async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    const maxLimit = Math.min(urls.length, 500);
    const trimmedUrls = urls.slice(0, maxLimit).map((u: string) => u.trim()).filter(Boolean);

    const CONCURRENCY_LIMIT = 5;
    const results: any[] = [];

    for (let i = 0; i < trimmedUrls.length; i += CONCURRENCY_LIMIT) {
      const chunk = trimmedUrls.slice(i, i + CONCURRENCY_LIMIT);
      const chunkResults = await Promise.all(
        chunk.map(async (rawUrl: string) => {
          try {
            const audit = await executeLiveWebsiteScan(rawUrl);

            // Persist scan to obtain genuine publicToken
            const persisted = await scanRepository.saveCompletedScan(
              audit,
              req.user!.uid,
              req.user!.email,
              req.user!.organizationId
            );

            const shareableReportUrl = `${req.protocol}://${req.get("host")}/report/${persisted.publicToken}`;
            const primaryIssue =
              audit.allIssues.length > 0 ? audit.allIssues[0].title : "No critical leaks detected";

            const waStatus = audit.whatsappLinks?.some((w: any) => !w.isValid)
              ? "BROKEN"
              : audit.whatsappLinks?.some((w: any) => w.zeroIntentLeak)
              ? "ZERO_INTENT"
              : (audit.whatsappLinks?.length || 0) > 0
              ? "WORKING"
              : "MISSING";

            const brokenItemNote =
              audit.allIssues.length > 0
                ? `${audit.allIssues[0].title}: ${audit.allIssues[0].description}`
                : "Tracking configuration recommendation";

            const coldWhatsAppPitch = `Hello ${audit.businessName || "Team"},\n\nWe completed an automated diagnostic of ${audit.domain} and observed a potential issue:\n\n• Finding: ${brokenItemNote}\n• Estimated potential impact: ₹${(audit.estimatedMonthlyLoss || 0).toLocaleString("en-IN")}/month\n• Full diagnostic report: ${shareableReportUrl}\n\nLet us know if you would like assistance resolving this item.`;

            const coldEmailPitch = `Subject: Diagnostic report for ${audit.domain}\n\nHi ${audit.businessName || "Team"},\n\nOur diagnostic crawler ran a funnel check on ${audit.domain} and identified ${audit.allIssues.length} item(s):\n\n• Primary finding: ${brokenItemNote}\n• Overall Score: ${audit.score}/100\n• Full Report: ${shareableReportUrl}\n\nFeel free to reply if you would like support deploying fixes.`;

            return {
              scanId: persisted.scanId,
              publicToken: persisted.publicToken,
              targetUrl: audit.targetUrl,
              domain: audit.domain,
              businessName: audit.businessName,
              score: audit.score,
              estimatedMonthlyLoss: audit.estimatedMonthlyLoss,
              adSpendRisk: audit.adSpendRisk,
              whatsappStatus: waStatus,
              metaPixelStatus: audit.metaPixel?.exists ? "HEALTHY" : "MISSING",
              ecommerceStatus: audit.ecommerce
                ? audit.ecommerce.checkoutStatus === "CRITICAL_LEAK"
                  ? "CRITICAL_LEAK"
                  : "HEALTHY"
                : "NONE",
              primaryLeak: primaryIssue,
              shareableReportUrl,
              coldWhatsAppPitch,
              coldEmailPitch,
              scannedAt: audit.scannedAt,
              status: "SUCCESS",
            };
          } catch (err: any) {
            const fallbackDomain = rawUrl.replace(/^https?:\/\//i, "").split("/")[0] || rawUrl;
            return {
              scanId: `scan_err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              targetUrl: rawUrl,
              domain: fallbackDomain,
              businessName: fallbackDomain,
              score: null,
              estimatedMonthlyLoss: 0,
              status: "SCAN_FAILED",
              errorCode: "SCAN_UNREACHABLE",
              errorMessage: err?.message || "DNS resolution, SSL handshake, or connection timeout.",
              scannedAt: new Date().toISOString(),
            };
          }
        })
      );
      results.push(...chunkResults);
    }

    res.json({ results, totalScanned: results.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to complete batch scan." });
  }
});

// AI Cold Pitch Generator (Authenticated)
app.post("/api/ai/pitch-generator", requireAuth, validateBody(pitchGeneratorSchema), async (req: Request, res: Response) => {
  try {
    const { clientName, businessName, auditSummary, tone, language } = req.body;

    const prompt = `You are a professional outreach consultant.
Client: ${clientName}
Business: ${businessName}
Issues: ${auditSummary}
Tone: ${tone}
Language: ${language}

Draft a clear, professional outreach message pointing out the specific findings with an offer for technical assistance. Keep claims objective and based on observed evidence.`;

    const aiText = await generateGeminiContentWithFallback(prompt);
    const fallbackPitch = `Hello ${clientName},\n\nWe noticed a potential technical issue on ${businessName}'s website regarding: ${auditSummary}.\n\nWhen mobile visitors attempt to reach your team, this issue may hinder direct communication. We provide technical diagnostic and repair services to ensure smooth funnel operation.\n\nPlease let us know if you would like us to provide the recommended fix.\n\nBest regards,\nLeadGuard Technical Team`;

    res.json({ pitch: aiText || fallbackPitch });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate pitch." });
  }
});

// Admin Custom Claims & Role Management Endpoint
app.post("/api/admin/role", requireAdmin, validateBody(adminSetRoleSchema), async (req: Request, res: Response) => {
  try {
    const { uid, role } = req.body;
    const updatedUser = await userRepository.setUserRole(uid, role, req.user!.uid);
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to update user role." });
  }
});

// Admin Security Audit Logs Endpoint
app.get("/api/admin/audit-logs", requireAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await auditRepository.getRecentLogs(100);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to retrieve audit logs.", details: err?.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Vite Middleware & Production Server Start
// ---------------------------------------------------------------------------
async function startServer() {
  // Start background watchdog heartbeat scheduler with distributed locking
  watchdogScheduler.start(60000);

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LeadGuard OS Production Diagnostic Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
