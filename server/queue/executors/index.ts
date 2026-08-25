import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { QueueJobPayload } from '../jobQueue';
import { jobQueue } from '../jobQueue';
import { executeLiveWebsiteScan } from '../../scannerEngine';
import { generateRemediation, validateAiOutput } from '../../services/ai.service';
import { isFirebaseConfigured, getAdminDb, FieldValue } from '../../firebaseAdmin';
import { scanRepository } from '../../repositories/scanRepository';
import { watchdogRepository } from '../../repositories/watchdogRepository';
import { pdfReportRepository } from '../../repositories/pdfReportRepository';
import { safeFetch } from '../../security/safeFetch';
import { storage } from '../../storage';
import { computeNextCheckAt, WATCHDOG_FREQUENCY_MS } from '../../watchdogScheduler';

// ─── Notification Provider Interface ───────────────────────────────────────────

export type NotificationStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'                      // ONLY when provider genuinely accepted
  | 'FAILED'                    // Provider rejected or errored
  | 'PROVIDER_NOT_CONFIGURED'   // Credentials missing — NOT a success
  | 'PROVIDER_TIMEOUT'          // Provider did not respond in time
  | 'PROVIDER_REJECTED'         // Provider explicitly rejected
  | 'DEDUPLICATED';             // Already sent, skipped

export type NotificationFailureReason =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_REJECTED'
  | 'PROVIDER_ERROR'
  | 'INVALID_RECIPIENT'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export interface NotificationRecord {
  notificationId: string;
  deliveryKey: string;
  provider: 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';
  recipient: string;
  event: string;
  status: NotificationStatus;
  failureReason?: NotificationFailureReason;
  attempt: number;
  providerResponse?: string;
  providerMessageId?: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

interface NotificationProviderResult {
  accepted: boolean;
  providerMessageId?: string;
  providerResponse?: string;
  failureReason?: NotificationFailureReason;
}

interface NotificationProviderAdapter {
  /**
   * Returns { accepted: true } ONLY when the provider genuinely accepted the message.
   * Must throw on transport errors. Must return { accepted: false } on provider rejection.
   * Must NEVER return accepted: true if credentials are missing.
   */
  send(recipient: string, subject: string, body: string): Promise<NotificationProviderResult>;
  isConfigured(): boolean;
}

// ─── Real Email Provider (Nodemailer) ──────────────────────────────────────────

class EmailProvider implements NotificationProviderAdapter {
  isConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  }

  async send(recipient: string, subject: string, body: string): Promise<NotificationProviderResult> {
    if (!this.isConfigured()) {
      return {
        accepted: false,
        failureReason: 'PROVIDER_NOT_CONFIGURED',
        providerResponse: 'SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required',
      };
    }

    const nodemailerModule = await import('nodemailer');
    const nodemailer = (nodemailerModule as any).default ?? nodemailerModule;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `LeadGuard OS <${process.env.SMTP_USER}>`,
      to: recipient,
      subject,
      text: body,
      html: `<div style="font-family:sans-serif;line-height:1.6">${body.replace(/\n/g, '<br>')}</div>`,
    });

    if (!info.accepted || info.accepted.length === 0) {
      return {
        accepted: false,
        failureReason: 'PROVIDER_REJECTED',
        providerResponse: `Rejected: ${JSON.stringify(info.rejected || [])}`,
      };
    }

    return {
      accepted: true,
      providerMessageId: info.messageId,
      providerResponse: `accepted:${info.accepted.join(',')}`,
    };
  }
}

// ─── Telegram Provider ─────────────────────────────────────────────────────────

class TelegramProvider implements NotificationProviderAdapter {
  isConfigured(): boolean {
    return !!process.env.TELEGRAM_BOT_TOKEN;
  }

  async send(recipient: string, _subject: string, body: string): Promise<NotificationProviderResult> {
    if (!this.isConfigured()) {
      return {
        accepted: false,
        failureReason: 'PROVIDER_NOT_CONFIGURED',
        providerResponse: 'TELEGRAM_BOT_TOKEN is required',
      };
    }

    // Redact token from any logs — use only in URL construction
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: recipient, text: body, parse_mode: 'HTML' }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown');
        if (response.status === 429) {
          return { accepted: false, failureReason: 'RATE_LIMITED', providerResponse: errText };
        }
        return { accepted: false, failureReason: 'PROVIDER_REJECTED', providerResponse: `${response.status}: ${errText}` };
      }

      const data = await response.json() as any;
      if (!data?.ok) {
        return { accepted: false, failureReason: 'PROVIDER_REJECTED', providerResponse: data?.description || 'Unknown Telegram error' };
      }

      return {
        accepted: true,
        providerMessageId: String(data.result?.message_id || ''),
        providerResponse: `chat:${data.result?.chat?.id}`,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { accepted: false, failureReason: 'PROVIDER_TIMEOUT', providerResponse: 'Telegram API timeout (15s)' };
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─── WhatsApp Provider ──────────────────────────────────────────────────────────

class WhatsAppProvider implements NotificationProviderAdapter {
  isConfigured(): boolean {
    return !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  async send(recipient: string, _subject: string, body: string): Promise<NotificationProviderResult> {
    if (!this.isConfigured()) {
      return {
        accepted: false,
        failureReason: 'PROVIDER_NOT_CONFIGURED',
        providerResponse: 'WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required',
      };
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    // Token used in header only — never logged
    const apiToken = process.env.WHATSAPP_API_TOKEN!;
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'text',
          text: { body },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown');
        return { accepted: false, failureReason: 'PROVIDER_REJECTED', providerResponse: `${response.status}: ${errText}` };
      }

      const data = await response.json() as any;
      const waMessageId = data?.messages?.[0]?.id;
      if (!waMessageId) {
        return { accepted: false, failureReason: 'PROVIDER_REJECTED', providerResponse: 'No message ID in response' };
      }

      return {
        accepted: true,
        providerMessageId: waMessageId,
        providerResponse: `wa_status:${data?.messages?.[0]?.message_status || 'accepted'}`,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { accepted: false, failureReason: 'PROVIDER_TIMEOUT', providerResponse: 'WhatsApp API timeout (15s)' };
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─── Provider Registry ─────────────────────────────────────────────────────────

const notificationProviders: Record<string, NotificationProviderAdapter> = {
  EMAIL: new EmailProvider(),
  TELEGRAM: new TelegramProvider(),
  WHATSAPP: new WhatsAppProvider(),
};

// Exported for testing
export { EmailProvider, TelegramProvider, WhatsAppProvider };

// ─── Notification Idempotency ──────────────────────────────────────────────────

export function computeDeliveryKey(event: string, recipient: string, provider: string): string {
  return crypto.createHash('sha256').update(`${event}:${recipient}:${provider}`).digest('hex');
}

/** Test/diagnostic helper mirroring the durable delivery-key check. */
export async function isEventAlreadyDelivered(deliveryKey: string): Promise<boolean> {
  return checkDeliveryIdempotency(deliveryKey);
}

/**
 * @classification DEV-ONLY — development/test delivery-key mirror.
 * Production idempotency authority is the Firestore notificationDeliveries
 * collection; this Map only exists so dev/test environments (no Firebase)
 * still enforce send-once semantics deterministically.
 */
const localDeliveryKeys = new Map<string, { status: string; sentAt?: string }>();

export function __localDeliveryKeysForTests() {
  return localDeliveryKeys;
}

async function checkDeliveryIdempotency(deliveryKey: string): Promise<boolean> {
  const local = localDeliveryKeys.get(deliveryKey);
  if (local?.status === 'SENT') return true;

  try {
    if (isFirebaseConfigured()) {
      const snap = await getAdminDb().collection('notificationDeliveries').doc(deliveryKey).get();
      if (snap.exists && snap.data()?.status === 'SENT') {
        return true; // Already successfully delivered
      }
    }
  } catch {
    // If we can't check, proceed with delivery (idempotency is best-effort for availability)
  }
  return false;
}

async function persistNotificationRecord(record: NotificationRecord): Promise<void> {
  // Mirror the durable state locally so retries in dev/test dedupe correctly.
  if (record.status === 'SENT') {
    localDeliveryKeys.set(record.deliveryKey, { status: 'SENT', sentAt: record.sentAt });
  }

  if (!isFirebaseConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NOTIFICATION_STORE_UNAVAILABLE: Firestore required in production');
    }
    return; // Dev mode: skip persistence
  }

  const db = getAdminDb();
  const batch = db.batch();

  // Persist notification record
  batch.set(db.collection('notifications').doc(record.notificationId), {
    ...record,
    serverTimestamp: FieldValue.serverTimestamp(),
  });

  // Persist delivery key for idempotency
  if (record.status === 'SENT') {
    batch.set(db.collection('notificationDeliveries').doc(record.deliveryKey), {
      deliveryKey: record.deliveryKey,
      notificationId: record.notificationId,
      status: 'SENT',
      sentAt: record.sentAt,
      provider: record.provider,
      recipient: record.recipient,
      serverTimestamp: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}

// ─── sendNotification executor ─────────────────────────────────────────────────

export async function executeSendNotification(job: QueueJobPayload): Promise<NotificationRecord> {
  const { provider, recipient, subject, body, event } = job.data;
  if (!provider || !recipient || !body) {
    throw new Error('INVALID_NOTIFICATION_PAYLOAD: provider, recipient, and body are required');
  }

  const normalizedProvider = String(provider).toUpperCase();
  const adapter = notificationProviders[normalizedProvider];
  if (!adapter) {
    throw new Error(`UNSUPPORTED_NOTIFICATION_PROVIDER: ${provider}`);
  }

  const deliveryKey = computeDeliveryKey(event || job.id, recipient, normalizedProvider);
  const notificationId = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  // Idempotency check: was this exact delivery already completed?
  const alreadySent = await checkDeliveryIdempotency(deliveryKey);
  if (alreadySent) {
    return {
      notificationId,
      deliveryKey,
      provider: normalizedProvider as NotificationRecord['provider'],
      recipient,
      event: event || 'generic',
      status: 'DEDUPLICATED',
      attempt: job.attempt,
      createdAt: now,
      providerResponse: 'Already delivered — idempotency check passed',
    };
  }

  const record: NotificationRecord = {
    notificationId,
    deliveryKey,
    provider: normalizedProvider as NotificationRecord['provider'],
    recipient,
    event: event || 'generic',
    status: 'SENDING',
    attempt: job.attempt,
    createdAt: now,
  };

  // Check configuration BEFORE attempting send
  if (!adapter.isConfigured()) {
    record.status = 'PROVIDER_NOT_CONFIGURED';
    record.failureReason = 'PROVIDER_NOT_CONFIGURED';
    record.error = `${normalizedProvider} provider credentials are not configured`;

    // Persist the failure record (non-blocking for this specific case)
    try { await persistNotificationRecord(record); } catch { /* best-effort for config error */ }

    // Throw so the queue can dead-letter (not a transient error — retry won't help)
    throw new Error(`PROVIDER_NOT_CONFIGURED: ${normalizedProvider} credentials are missing. ` +
      `This notification cannot be delivered until the provider is configured.`);
  }

  // Attempt delivery
  try {
    const result = await adapter.send(recipient, subject || 'LeadGuard Notification', body);

    if (result.accepted) {
      record.status = 'SENT';
      record.sentAt = new Date().toISOString();
      record.providerMessageId = result.providerMessageId;
      record.providerResponse = result.providerResponse;
    } else {
      record.status = 'FAILED';
      record.failureReason = result.failureReason || 'PROVIDER_REJECTED';
      record.error = result.providerResponse;
      record.providerResponse = result.providerResponse;
    }
  } catch (err: any) {
    record.status = 'FAILED';
    record.failureReason = 'PROVIDER_ERROR';
    record.error = err?.message || 'Provider transport error';
  }

  // Persist notification record — MUST succeed for correctness
  await persistNotificationRecord(record);

  // If delivery failed, throw to trigger retry logic
  if (record.status === 'FAILED') {
    throw new Error(`NOTIFICATION_DELIVERY_FAILED: ${record.failureReason}: ${record.error}`);
  }

  return record;
}

// ─── scanBatch executor ────────────────────────────────────────────────────────

export type BatchStatus = 'QUEUED' | 'RUNNING' | 'PARTIAL' | 'COMPLETED' | 'FAILED';

interface BatchResult {
  batchStatus: BatchStatus;
  totalUrls: number;
  completed: number;
  failed: number;
  results: Array<{ url: string; scanId?: string; score?: number; status: 'SUCCESS' | 'ERROR'; error?: string }>;
}

const MAX_BATCH_CONCURRENCY = 5;
const MAX_BATCH_SIZE = 50;

export async function executeScanBatch(job: QueueJobPayload): Promise<BatchResult> {
  const { urls, options } = job.data;
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('INVALID_BATCH_PAYLOAD: urls must be a non-empty array');
  }

  const validUrls: string[] = urls
    .filter((u: unknown) => typeof u === 'string' && u.trim().length > 0)
    .map((u: string) => u.trim())
    .slice(0, MAX_BATCH_SIZE);

  if (validUrls.length === 0) {
    throw new Error('INVALID_BATCH_PAYLOAD: No valid URLs provided');
  }

  const results: BatchResult['results'] = [];
  let completed = 0;
  let failed = 0;

  const pending = [...validUrls];
  const executing: Promise<void>[] = [];

  async function processUrl(url: string): Promise<void> {
    try {
      const scanResult = await executeLiveWebsiteScan(url, options || {});
      results.push({ url, scanId: scanResult.scanId, score: scanResult.score, status: 'SUCCESS' });
      completed++;
    } catch (err: any) {
      results.push({ url, status: 'ERROR', error: err?.message || 'Scan failed' });
      failed++;
    }
  }

  while (pending.length > 0 || executing.length > 0) {
    while (executing.length < MAX_BATCH_CONCURRENCY && pending.length > 0) {
      const url = pending.shift()!;
      const p = processUrl(url).then(() => { executing.splice(executing.indexOf(p), 1); });
      executing.push(p);
    }
    if (executing.length > 0) await Promise.race(executing);
  }

  const batchStatus: BatchStatus = failed === validUrls.length ? 'FAILED' : failed > 0 ? 'PARTIAL' : 'COMPLETED';
  return { batchStatus, totalUrls: validUrls.length, completed, failed, results };
}

// ─── generatePdf executor ──────────────────────────────────────────────────────

export interface PdfMetadata {
  pdfId: string;
  scanId: string;
  userId?: string;
  domain?: string;
  score?: number;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  generatedAt: string;
}

export async function executeGeneratePdf(job: QueueJobPayload): Promise<PdfMetadata> {
  const { scanId } = job.data;
  if (!scanId) throw new Error('INVALID_PDF_PAYLOAD: scanId is required');

  const scan = await scanRepository.getScanById(scanId);
  if (!scan) throw new Error(`SCAN_NOT_FOUND: ${scanId}`);

  if (job.userId && scan.userId && scan.userId !== job.userId) {
    throw new Error('UNAUTHORIZED_PDF_GENERATION: User does not own this scan');
  }

  // Generate PDF using jsPDF
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  doc.setFontSize(24);
  doc.text('LeadGuard OS', 20, 30);
  doc.text('Security & Lead Audit Report', 20, 45);

  doc.setFontSize(12);
  doc.text(`Domain: ${scan.domain || scan.targetUrl}`, 20, 65);
  doc.text(`Score: ${scan.overallScore ?? scan.score}/100`, 20, 75);
  doc.text(`Scanned: ${scan.scannedAt || scan.completedAt}`, 20, 85);
  doc.text(`Business: ${scan.businessName || 'N/A'}`, 20, 95);

  doc.setFontSize(16);
  doc.text('Findings Summary', 20, 115);
  doc.setFontSize(10);

  const issues = scan.allIssues || [];
  let yPos = 130;
  for (let i = 0; i < Math.min(issues.length, 15); i++) {
    const issue = issues[i];
    if (yPos > 270) { doc.addPage(); yPos = 20; }
    doc.text(`[${issue.severity}] ${issue.title}`, 20, yPos);
    yPos += 8;
    if (issue.description) {
      doc.text(`  ${String(issue.description).substring(0, 80)}`, 25, yPos);
      yPos += 8;
    }
  }

  doc.setFontSize(8);
  doc.text('Generated by LeadGuard OS — Confidential', 20, 285);

  // Get raw PDF bytes (Uint8Array)
  const pdfBytes = new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
  const pdfBuffer = Buffer.from(pdfBytes);
  const pdfId = `pdf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const generatedAt = new Date().toISOString();
  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  const storagePath = `reports/${job.userId || 'system'}/${scanId}/${pdfId}.pdf`;

  // Upload to Firebase Storage / GCS (durable object storage).
  // In production a storage failure FAILS the job (retry → dead-letter).
  try {
    const { getStorage } = await import('firebase-admin/storage');
    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);
    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: { pdfId, scanId, userId: job.userId || '', sha256, generatedAt },
      },
    });
  } catch (storageErr: any) {
    if (process.env.NODE_ENV !== 'production') {
      const localDir = path.join(process.env.LEADGUARD_DATA_DIR || './data', 'pdf-reports');
      fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(path.join(localDir, `${pdfId}.pdf`), pdfBuffer);
    } else {
      throw new Error(`PDF_STORAGE_FAILED: Cannot persist PDF to durable storage: ${storageErr?.message}`);
    }
  }

  const metadata: PdfMetadata = {
    pdfId,
    scanId,
    userId: job.userId,
    domain: scan.domain,
    score: scan.overallScore ?? scan.score,
    storagePath,
    contentType: 'application/pdf',
    sizeBytes: pdfBuffer.length,
    sha256,
    generatedAt,
  };

  // Persist metadata to Firestore via the repository — MUST succeed.
  // Job fails (and retries) if durable object storage or metadata persistence fails.
  await pdfReportRepository.save(metadata);

  return metadata;
}

// ─── aiAnalysis executor ───────────────────────────────────────────────────────

export interface AiAnalysisResult {
  scanId: string;
  userId?: string;
  model?: string;
  status: string;
  content?: string;
  inputHash: string;
  resultHash?: string;
  confidence?: number;
  sourceEvidence?: string[];
  assumptions?: string[];
  createdAt: string;
  updatedAt: string;
}

export async function executeAiAnalysis(job: QueueJobPayload): Promise<AiAnalysisResult> {
  const { scanId, findings } = job.data;
  if (!scanId) throw new Error('INVALID_AI_PAYLOAD: scanId is required');

  const scan = await scanRepository.getScanById(scanId);
  if (!scan) throw new Error(`SCAN_NOT_FOUND: ${scanId}`);
  if (job.userId && scan.userId && scan.userId !== job.userId) {
    throw new Error('UNAUTHORIZED_AI_ANALYSIS: User does not own this scan');
  }

  // Use only approved scanner evidence, never raw user-provided data
  const approvedFindings = findings || scan.allIssues || [];
  const inputHash = crypto.createHash('sha256').update(JSON.stringify(approvedFindings)).digest('hex');

  const remediation = await generateRemediation(approvedFindings);

  if (remediation.status === 'FAILED') {
    throw new Error(remediation.error || 'AI remediation generation failed');
  }

  // Phase 9 — AI output safety: scanner evidence is authoritative.
  // Unsupported findings / fabricated revenue estimates / fake penalty or
  // malware claims are rejected. This is non-transient: retrying cannot fix
  // an invalid model output, so the job dead-letters immediately.
  const validation = validateAiOutput(remediation.content || '', approvedFindings);
  if (!validation.valid) {
    throw new Error(validation.reason || 'AI_OUTPUT_INVALID');
  }

  // Result validated — only now may it be persisted.
  const now = new Date().toISOString();
  const resultHash = remediation.content
    ? crypto.createHash('sha256').update(remediation.content).digest('hex')
    : undefined;

  const result: AiAnalysisResult = {
    scanId,
    userId: job.userId,
    model: remediation.model || 'gemini',
    status: remediation.status,
    content: remediation.content,
    inputHash,
    resultHash,
    confidence: remediation.confidence ?? 0.8,
    sourceEvidence: (approvedFindings || []).slice(0, 10).map((f: any) => String(f?.title || '')),
    assumptions: [
      'Revenue estimates derive from scanner-measured evidence and the standard LeadGuard revenue model.',
      'Remediations summarize ONLY the findings listed in sourceEvidence.',
    ],
    createdAt: now,
    updatedAt: now,
  };

  // Persist AI result — MUST succeed. Job fails if persistence fails
  // (retry → dead-letter). Customer data must never live only in memory.
  await persistAiResult(scanId, {
    status: remediation.status,
    content: remediation.content,
    model: result.model,
    promptVersion: AI_PROMPT_VERSION,
    inputHash,
    resultHash,
    confidence: result.confidence,
    updatedAt: now,
  });

  return result;
}

/**
 * Fail-closed AI result persistence (Phase 8/16).
 * Exported separately so the failure semantics are unit-testable without
 * network access to a real LLM provider.
 */
export async function persistAiResult(scanId: string, aiRemediation: Record<string, any>): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await getAdminDb().collection('scans').doc(scanId).set({
        aiRemediation,
        serverTimestamp: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (persistErr: any) {
      throw new Error(`AI_PERSISTENCE_FAILED: ${persistErr?.message || persistErr}`);
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('AI_PERSISTENCE_FAILED: Firestore required in production for AI result storage');
  }
}

/** Bump when the remediation prompt changes; stored with results for audit. */
const AI_PROMPT_VERSION = 'remediation-v1';

// ─── sendWebhook executor ──────────────────────────────────────────────────────

export async function executeSendWebhook(job: QueueJobPayload): Promise<{ delivered: boolean }> {
  const { url, payload, headers } = job.data;
  if (!url) throw new Error('INVALID_WEBHOOK_PAYLOAD: url is required');

  await safeFetch(url, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
    headers: headers || { 'Content-Type': 'application/json' },
  });

  return { delivered: true };
}

// ─── runWatchdog executor ──────────────────────────────────────────────────────

export async function executeRunWatchdog(job: QueueJobPayload): Promise<any> {
  const { targetId } = job.data;
  if (!targetId) throw new Error('INVALID_WATCHDOG_PAYLOAD: targetId is required');

  const target = await watchdogRepository.getTargetById(targetId, undefined, true);
  if (!target) throw new Error(`WATCHDOG_TARGET_NOT_FOUND: ${targetId}`);

  // MUST use exact targetUrl — never fall back to domain.
  // The monitored resource is exactly what the customer configured.
  if (!target.targetUrl || typeof target.targetUrl !== 'string') {
    throw new Error(`WATCHDOG_TARGET_INVALID: Target ${targetId} has no targetUrl configured. Cannot monitor.`);
  }

  let scanResult: any;
  let incidentError: string | undefined;
  try {
    scanResult = await executeLiveWebsiteScan(target.targetUrl);
  } catch (err: any) {
    incidentError = err?.message || 'Target unreachable';
  }

  if (incidentError) {
    await watchdogRepository.addCheckLog({
      targetId,
      domain: target.domain,
      check: 'Connectivity & Server Probe',
      status: 'FAIL (Unreachable)',
      details: incidentError,
    });
    await watchdogRepository.updateTarget(targetId, {
      lastCheckedAt: new Date().toISOString(),
      lastStatus: 'FAIL (Unreachable)',
      pendingRunJobId: null,
      nextCheckAt: computeNextCheckAt(target.frequency),
    }, undefined, true);
    throw new Error(`WATCHDOG_TARGET_UNREACHABLE: ${incidentError}`);
  }

  const score = scanResult.overallScore ?? scanResult.score ?? 0;
  const status = score >= 70 ? 'HEALTHY' : 'INCIDENT_OPEN';

  await watchdogRepository.addCheckLog({
    targetId,
    scanId: scanResult.scanId || scanResult.id,
    status,
    durationMs: scanResult.metadata?.scanDurationMs || scanResult.performance?.totalTimeMs,
    details: JSON.stringify({
      score,
      targetUrl: target.targetUrl,
      whatsappOk: !scanResult.findings?.some((f: any) => f.category === 'WHATSAPP'),
      pixelOk: !scanResult.findings?.some((f: any) => f.category === 'META_PIXEL'),
    }),
  });

  await watchdogRepository.updateTarget(targetId, {
    lastCheckedAt: new Date().toISOString(),
    lastScore: score,
    lastStatus: status,
    pendingRunJobId: null,
    nextCheckAt: computeNextCheckAt(target.frequency),
  }, undefined, true);

  // ── Incident handling: signed webhooks + provider notifications ────────────
  if (status === 'INCIDENT_OPEN') {
    try {
      await dispatchIncidentNotifications(target, scanResult, score);
    } catch (notifyErr: any) {
      // Notification enqueue failures must not fail the probe result itself;
      // the notification jobs are individually retried by the queue.
      console.warn(`[runWatchdog] Incident notification enqueue failed for ${targetId}:`, notifyErr?.message);
    }
  }

  return { scanId: scanResult.scanId, score, status, nextCheckAt: computeNextCheckAt(target.frequency), frequencyIntervalMs: WATCHDOG_FREQUENCY_MS[target.frequency || 'DAILY'] };
}

/** Dispatch signed webhooks and queue channel notifications for an incident. */
export async function dispatchIncidentNotifications(target: any, scanResult: any, score: number): Promise<void> {

  const payload = {
    event: 'watchdog.incident_detected',
    timestamp: new Date().toISOString(),
    target: {
      id: target.id,
      domain: target.domain,
      targetUrl: target.targetUrl,
      contact: target.contact,
      channel: target.channel,
    },
    auditSummary: {
      score,
      issuesCount: (scanResult.allIssues || []).length,
      criticalIssues: (scanResult.allIssues || [])
        .filter((i: any) => i.severity === 'CRITICAL')
        .map((i: any) => i.title),
    },
  };

  // 1. Signed user webhooks (existing feature — preserved)
  const webhooks = storage.getWebhooks().filter(
    (w: any) => w.active && (!target.userId || !w.userId || w.userId === target.userId)
  );
  for (const hook of webhooks) {
    try {
      const bodyStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', hook.secret).update(bodyStr).digest('hex');
      await safeFetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LeadGuard-Signature': signature,
          'User-Agent': 'LeadGuard-Watchdog-Webhook/2.0',
        },
        body: bodyStr,
        timeoutMs: 8000,
      });
      hook.lastTriggeredAt = new Date().toISOString();
      hook.failureCount = 0;
    } catch {
      hook.failureCount = (hook.failureCount || 0) + 1;
    }
  }
  storage.saveToDisk();

  // 2. Channel notification via durable sendNotification job
  if (target.channel && target.contact && ['EMAIL', 'TELEGRAM', 'WHATSAPP'].includes(target.channel)) {
    const body = [
      `LeadGuard Watchdog ALERT for ${target.domain} (${target.targetUrl})`,
      `Health score dropped to ${score}/100.`,
      `${(scanResult.allIssues || []).length} issue(s) detected.`,
    ].join('\n');
    await jobQueue.enqueue(
      'sendNotification',
      {
        provider: target.channel,
        recipient: target.contact,
        subject: `LeadGuard Alert: ${target.domain} needs attention`,
        body,
        event: `watchdog.incident:${target.id}:${new Date().toISOString().slice(0, 10)}:${score}`,
      },
      target.userId,
      5
    );
  }
}

// ─── Central executor dispatch ─────────────────────────────────────────────────

/**
 * Executes any job type through the appropriate executor.
 * Every executor: validates payload → executes → persists result → returns.
 * No generic fallbacks. No fake success. No silent failures.
 */
export async function executeJobByType(job: QueueJobPayload): Promise<any> {
  switch (job.type) {
    case 'scanWebsite':
      return await executeLiveWebsiteScan(job.data.url || job.data.domain, job.data.options || {});
    case 'scanBatch':
      return await executeScanBatch(job);
    case 'runWatchdog':
      return await executeRunWatchdog(job);
    case 'sendWebhook':
      return await executeSendWebhook(job);
    case 'sendNotification':
      return await executeSendNotification(job);
    case 'generatePdf':
      return await executeGeneratePdf(job);
    case 'aiAnalysis':
      return await executeAiAnalysis(job);
    default:
      throw new Error(`UNKNOWN_JOB_TYPE: ${String(job.type)} has no registered executor`);
  }
}
