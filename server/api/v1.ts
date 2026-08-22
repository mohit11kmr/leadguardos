import { Router, Request, Response } from 'express';
import { ApiKeyManager } from '../security/apiKeyManager';
import { executeLiveWebsiteScan } from '../scannerEngine';
import { storage } from '../storage';
import { EntitlementService } from '../services/entitlementService';
import { reportManager } from '../reports/reportManager';

export const v1Router = Router();

// Middleware: Verify API Key
function requireApiKey(req: Request, res: Response, next: any) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing X-API-Key header.' } });
  }

  const record = ApiKeyManager.verifyApiKey(apiKey);
  if (!record) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked X-API-Key.' } });
  }

  (req as any).apiKeyRecord = record;
  (req as any).user = { id: record.userId, role: 'USER' };
  next();
}

v1Router.use(requireApiKey);

// 1. Create Scan (POST /api/v1/scans)
v1Router.post('/scans', async (req: Request, res: Response) => {
  try {
    const { url, options } = req.body;
    if (!url) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'url is required' } });

    const user = (req as any).user;
    const usage = storage.getUserUsage(user.id);
    const entitlement = EntitlementService.canRunScan(user, usage);

    if (!entitlement.allowed) {
      return res.status(403).json({ error: { code: 'QUOTA_EXCEEDED', message: entitlement.reason } });
    }

    const result = await executeLiveWebsiteScan(url, options);
    storage.incrementUserScanUsage(user.id);

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
v1Router.get('/scans/:id', (req: Request, res: Response) => {
  const scan = storage.getScan(req.params.id);
  if (!scan) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan not found' } });
  res.json(scan);
});

// 3. List Scans (GET /api/v1/scans)
v1Router.get('/scans', (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const scans = storage.getScansForUser(userId);
  res.json({ data: scans, total: scans.length });
});

// 4. Get Findings (GET /api/v1/scans/:id/findings)
v1Router.get('/scans/:id/findings', (req: Request, res: Response) => {
  const scan = storage.getScan(req.params.id);
  if (!scan) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan not found' } });
  res.json({ scanId: scan.scanId, issues: scan.allIssues || [] });
});

// 5. Create Watchdog Target (POST /api/v1/watchdog)
v1Router.post('/watchdog', (req: Request, res: Response) => {
  const { url, contact, channel, frequency } = req.body;
  if (!url) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'url is required' } });

  const userId = (req as any).user.id;
  const domain = url.replace(/^https?:\/\//i, '').split('/')[0];
  const target = {
    id: `wd_v1_${Date.now()}`,
    userId,
    targetUrl: url,
    domain,
    contact: contact || 'API User',
    channel: channel || 'TELEGRAM',
    frequency: frequency || 'DAILY',
    status: 'ACTIVE_TRIAL' as const,
    createdAt: new Date().toISOString(),
    trialExpiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
  };

  storage.addWatchdogTarget(target);
  res.status(201).json(target);
});

// 6. Get Watchdog Status (GET /api/v1/watchdog/:id)
v1Router.get('/watchdog/:id', (req: Request, res: Response) => {
  const target = storage.getWatchdogTarget(req.params.id);
  if (!target) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Watchdog target not found' } });
  res.json(target);
});

// 7. Get Shareable Report Token (POST /api/v1/reports/share)
v1Router.post('/reports/share', (req: Request, res: Response) => {
  const { scanId, password } = req.body;
  const scan = storage.getScan(scanId);
  if (!scan) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scan not found' } });

  const shareToken = reportManager.createShareableSnapshot(scan, password);
  res.json({ shareUrl: `${req.protocol}://${req.get('host')}/report/share/${shareToken.token}`, token: shareToken.token, expiresAt: shareToken.expiresAt });
});
