import { Router, Request, Response } from 'express';
import { ApiKeyManager } from '../security/apiKeyManager';
import { executeLiveWebsiteScan } from '../scannerEngine';
import { scanRepository } from '../repositories/scanRepository';
import { watchdogRepository } from '../repositories/watchdogRepository';
import { EntitlementService } from '../services/entitlementService';
import { reportManager } from '../reports/reportManager';
import { validateAndResolveSafeUrl } from '../ssrfGuard';

export const v1Router = Router();
const WATCHDOG_CHANNELS = new Set(['TELEGRAM', 'WHATSAPP', 'EMAIL']);
const WATCHDOG_FREQUENCIES = new Set(['DAILY', 'HOURLY', 'WEEKLY', '15MIN']);

// Middleware: Verify API Key
async function requireApiKey(req: Request, res: Response, next: any) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing X-API-Key header.' } });
  }

  const record = await ApiKeyManager.verifyApiKeyAsync(apiKey);
  if (!record) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked X-API-Key.' } });
  }

  (req as any).apiKeyRecord = record;
  (req as any).user = { id: record.userId, role: 'USER' };
  next();
}

v1Router.use(requireApiKey);

function canAccessOwnedResource(req: Request, ownerId?: string): boolean {
  const user = (req as any).user;
  return !ownerId || ownerId === user?.id || user?.role === 'ADMIN';
}

// 1. Create Scan (POST /api/v1/scans)
v1Router.post('/scans', async (req: Request, res: Response) => {
  try {
    const { url, options } = req.body;
    if (!url) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'url is required' } });

    const user = (req as any).user;
    const usage = { scansThisMonth: 0, watchdogTargetsCount: 0, exportsThisMonth: 0 };
    const entitlement = EntitlementService.canRunScan(user, usage);

    if (!entitlement.allowed) {
      return res.status(403).json({ error: { code: 'QUOTA_EXCEEDED', message: entitlement.reason } });
    }

    const result = await executeLiveWebsiteScan(url, { ...options, forceLive: true });
    result.userId = user.id;
    await scanRepository.saveCompletedScan(result, user.id);

    res.status(201).json({
      scanId: result.scanId,
      targetUrl: result.targetUrl,
      domain: result.domain,
      score: result.score,
      estimatedMonthlyLoss: result.estimatedMonthlyLoss,
      scannedAt: result.scannedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SCAN_FAILED', message: err?.message || 'Scan execution failed' } });
  }
});

// 2. Get Scan (GET /api/v1/scans/:id)
v1Router.get('/scans/:id', async (req: Request, res: Response) => {
  const scan = await scanRepository.getScanById(req.params.id);
  if (!scan) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan not found' } });
  if (!canAccessOwnedResource(req, scan.userId)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this scan.' } });
  }
  res.json(scan);
});

// 3. List Scans (GET /api/v1/scans)
v1Router.get('/scans', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { items } = await scanRepository.getUserScans(userId);
  res.json({ data: items, total: items.length });
});

// 4. Get Findings (GET /api/v1/scans/:id/findings)
v1Router.get('/scans/:id/findings', async (req: Request, res: Response) => {
  const scan = await scanRepository.getScanById(req.params.id);
  if (!scan) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan not found' } });
  if (!canAccessOwnedResource(req, scan.userId)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this scan.' } });
  }
  res.json({ scanId: scan.scanId, issues: scan.allIssues || [] });
});

// 5. Create Watchdog Target (POST /api/v1/watchdog)
v1Router.post('/watchdog', async (req: Request, res: Response) => {
  const { url, contact, channel, frequency } = req.body;
  if (!url) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'url is required' } });
  if (typeof url !== 'string' || url.length > 2048) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'url is invalid' } });
  }
  const normalizedChannel = channel || 'TELEGRAM';
  const normalizedFrequency = frequency || 'DAILY';
  if (!WATCHDOG_CHANNELS.has(normalizedChannel) || !WATCHDOG_FREQUENCIES.has(normalizedFrequency)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'channel or frequency is invalid' } });
  }

  const validation = await validateAndResolveSafeUrl(url);
  if (!validation.valid || !validation.normalized) {
    return res.status(400).json({ error: { code: 'INVALID_TARGET_URL', message: validation.error || 'Target URL is not allowed.' } });
  }

  const userId = (req as any).user.id;
  const domain = new URL(validation.normalized).hostname;

  const target = await watchdogRepository.addTarget({
    id: `wd_v1_${Date.now()}`,
    targetUrl: validation.normalized,
    domain,
    contact: typeof contact === 'string' && contact.length <= 255 ? contact : 'API User',
    channel: normalizedChannel,
    frequency: normalizedFrequency,
    status: 'ACTIVE_TRIAL',
    mode: 'LIVE',
    userId,
    nextCheckAt: new Date(Date.now() + 60000).toISOString(),
  }, userId);

  res.status(201).json(target);
});

// 6. Get Watchdog Status (GET /api/v1/watchdog/:id)
v1Router.get('/watchdog/:id', async (req: Request, res: Response) => {
  let target: any;
  try {
    target = await watchdogRepository.getTargetById(req.params.id, (req as any).user.id, (req as any).user.role === 'ADMIN');
  } catch {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this watchdog target.' } });
  }
  if (!target) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Watchdog target not found' } });
  if (!canAccessOwnedResource(req, target.userId)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this watchdog target.' } });
  }
  res.json(target);
});

// 7. Get Shareable Report Token (POST /api/v1/reports/share)
v1Router.post('/reports/share', async (req: Request, res: Response) => {
  const { scanId, password } = req.body;
  if (typeof scanId !== 'string' || scanId.length > 128 || (password !== undefined && (typeof password !== 'string' || password.length > 256))) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid report sharing parameters.' } });
  }
  const scan = await scanRepository.getScanById(scanId);
  if (!scan) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan not found' } });
  if (!canAccessOwnedResource(req, scan.userId)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this scan.' } });
  }

  try {
    const shareToken = await reportManager.createShareableSnapshotAsync(scan as any, password);
    res.json({ shareUrl: `${req.protocol}://${req.get('host')}/report/share/${shareToken.token}`, token: shareToken.token, expiresAt: shareToken.expiresAt });
  } catch (err: any) {
    res.status(503).json({ error: { code: 'SHARE_PERSIST_FAILED', message: err?.message || 'Could not create durable share link.' } });
  }
});
