import crypto from 'crypto';
import { isPgEnabled } from '../db/storageMode';
import { ScanRecord } from '../storage';
import { auditRepository } from './auditRepository';

export interface ScanDocument extends Omit<ScanRecord, 'scannedAt'> {
  scanId: string;
  publicToken: string;
  mode: 'LIVE' | 'DEMO';
  targetUrl: string;
  normalizedUrl: string;
  domain: string;
  businessName?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  overallScore: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  pillarScores: {
    leadGen: number;
    adSpend: number;
    seo: number;
    security: number;
  };
  findingsCount: number;
  criticalFindings: number;
  warningFindings: number;
  passedFindings: number;
  scannerVersion: string;
  startedAt: string;
  completedAt?: string;
  scannedAt: string;
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  serverTimestamp?: any;
}

export interface IScanRepository {
  createScan(scanData: Partial<ScanDocument>): Promise<ScanDocument>;
  saveCompletedScan(scan: ScanRecord, userId?: string, userEmail?: string, organizationId?: string): Promise<ScanDocument>;
  getScanById(scanId: string): Promise<ScanDocument | undefined>;
  getScanByToken(token: string): Promise<ScanDocument | undefined>;
  getRecentScans(limit?: number, mode?: 'LIVE' | 'DEMO'): Promise<ScanDocument[]>;
  getUserScans(userId: string, limit?: number, startAfterId?: string): Promise<{ items: ScanDocument[]; nextCursor?: string }>;
  getDomainScans(domain: string, limit?: number): Promise<ScanDocument[]>;
  deleteScan(scanId: string, requestUserId?: string, isAdmin?: boolean): Promise<boolean>;
}

export class ScanRepository implements IScanRepository {
  private localCache: Map<string, ScanDocument> = new Map();
  private tokenIndex: Map<string, string> = new Map();

  /** Persist a ScanDocument to PostgreSQL (upsert on scanId). */
  private async pgUpsertScan(doc: ScanDocument): Promise<void> {
    const { prisma } = await import('../db/prisma');
    const data = {
      id: doc.scanId,
      userId: doc.userId || null,
      targetUrl: doc.targetUrl || doc.normalizedUrl || '',
      domain: doc.domain || '',
      businessName: doc.businessName || null,
      status: doc.status === 'COMPLETED' ? 'COMPLETED' : (doc.status === 'FAILED' ? 'FAILED' : 'RUNNING'),
      mode: doc.mode === 'DEMO' ? 'DEMO' : 'LIVE',
      score: typeof doc.score === 'number' ? Math.round(doc.score) : (typeof doc.overallScore === 'number' ? Math.round(doc.overallScore) : null),
      pillarScores: (doc.pillarScores || {}) as any,
      findings: Array.isArray(doc.allIssues) ? doc.allIssues : undefined,
      whatsappResults: (doc.whatsappLinks || undefined) as any,
      phoneResults: (doc.phoneLinks || undefined) as any,
      trackingResults: (doc.metaPixel || doc.googleTag ? { metaPixel: doc.metaPixel, googleTag: doc.googleTag } : undefined) as any,
      seoResults: (doc.seoPenalty || undefined) as any,
      securityResults: (doc.cyberShield || undefined) as any,
      estimatedMonthlyLoss: typeof doc.estimatedMonthlyLoss === 'number' ? doc.estimatedMonthlyLoss : null,
      scannedLive: !!(doc as any).scannedLive,
      scannedAt: doc.scannedAt ? new Date(doc.scannedAt) : new Date(),
      completedAt: doc.completedAt ? new Date(doc.completedAt) : null,
    };
    await prisma.scan.upsert({
      where: { id: data.id },
      create: data as any,
      update: {
        status: data.status,
        score: data.score,
        pillarScores: data.pillarScores,
        findings: data.findings ?? undefined,
        estimatedMonthlyLoss: data.estimatedMonthlyLoss,
        completedAt: data.completedAt,
      } as any,
    });
  }

  /** Fetch a scan row and rehydrate the legacy ScanDocument shape. */
  private async pgGetScan(scanId: string): Promise<ScanDocument | undefined> {
    const { prisma } = await import('../db/prisma');
    const row = await prisma.scan.findUnique({ where: { id: scanId }, include: { aiReport: true } });
    if (!row) return undefined;
    return this.pgRowToDocument(row);
  }

  private pgRowToDocument(row: any): ScanDocument {
    const tracking = row.trackingResults || {};
    return {
      scanId: row.id,
      publicToken: undefined,
      userId: row.userId || undefined,
      targetUrl: row.targetUrl,
      normalizedUrl: row.targetUrl,
      domain: row.domain,
      businessName: row.businessName || undefined,
      status: row.status === 'RUNNING' ? 'IN_PROGRESS' : row.status,
      mode: row.mode,
      overallScore: row.score ?? 0,
      score: row.score ?? 0,
      pillarScores: row.pillarScores || {},
      pillars: {},
      allIssues: Array.isArray(row.findings) ? row.findings : [],
      whatsappLinks: Array.isArray(row.whatsappResults) ? row.whatsappResults : [],
      phoneLinks: Array.isArray(row.phoneResults) ? row.phoneResults : [],
      metaPixel: tracking.metaPixel,
      googleTag: tracking.googleTag,
      seoPenalty: row.seoResults || undefined,
      cyberShield: row.securityResults || undefined,
      estimatedMonthlyLoss: row.estimatedMonthlyLoss ?? 0,
      scannedLive: row.scannedLive,
      scannedAt: row.scannedAt?.toISOString?.() || String(row.scannedAt),
      completedAt: row.completedAt?.toISOString?.(),
      lockedIssuesCount: 0,
      aiRemediation: row.aiReport ? {
        status: 'COMPLETED',
        content: row.aiReport.content,
        model: row.aiReport.model,
        inputHash: row.aiReport.inputHash,
        resultHash: row.aiReport.resultHash,
        updatedAt: row.aiReport.createdAt.toISOString(),
      } : undefined,
    } as unknown as ScanDocument;
  }

  public generatePublicToken(): string {
    return crypto.randomBytes(24).toString('hex');
  }

  async createScan(scanData: Partial<ScanDocument>): Promise<ScanDocument> {
    const scanId = scanData.scanId || `scan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const publicToken = (scanData.publicToken && scanData.publicToken.length >= 32) ? scanData.publicToken : this.generatePublicToken();
    const mode = scanData.mode || 'LIVE';
    const now = new Date().toISOString();

    const docData: ScanDocument = {
      scanId,
      publicToken,
      mode,
      targetUrl: scanData.targetUrl || '',
      normalizedUrl: scanData.normalizedUrl || scanData.targetUrl || '',
      domain: scanData.domain || '',
      businessName: scanData.businessName,
      status: scanData.status || 'IN_PROGRESS',
      overallScore: scanData.overallScore ?? scanData.score ?? 0,
      score: scanData.score ?? scanData.overallScore ?? 0,
      confidence: scanData.confidence || 'HIGH',
      pillarScores: scanData.pillarScores || {
        leadGen: scanData.pillars?.leadGen?.score || 0,
        adSpend: scanData.pillars?.adSpend?.score || 0,
        seo: scanData.pillars?.seo?.score || 0,
        security: scanData.pillars?.security?.score || 0,
      },
      pillars: scanData.pillars || {},
      whatsappLinks: scanData.whatsappLinks || [],
      phoneLinks: scanData.phoneLinks || [],
      emailLinks: scanData.emailLinks || [],
      reviewLinks: scanData.reviewLinks || [],
      socialLinks: scanData.socialLinks || [],
      metaPixel: scanData.metaPixel || {},
      googleTag: scanData.googleTag || {},
      seoPenalty: scanData.seoPenalty || {},
      cyberShield: scanData.cyberShield || {},
      ecommerce: scanData.ecommerce,
      allIssues: scanData.allIssues || [],
      lockedIssuesCount: scanData.lockedIssuesCount || 0,
      freeIssue: scanData.freeIssue,
      estimatedMonthlyLoss: scanData.estimatedMonthlyLoss || 0,
      adSpendRisk: scanData.adSpendRisk || 'LOW',
      findingsCount: scanData.findingsCount || scanData.allIssues?.length || 0,
      criticalFindings: scanData.criticalFindings || (scanData.allIssues?.filter((i: any) => i.severity === 'CRITICAL').length || 0),
      warningFindings: scanData.warningFindings || (scanData.allIssues?.filter((i: any) => i.severity === 'HIGH' || i.severity === 'MEDIUM').length || 0),
      passedFindings: scanData.passedFindings || 0,
      scannerVersion: '4.2.0-prod',
      performance: scanData.performance || { fetchTimeMs: 0, parseTimeMs: 0, totalTimeMs: 0 },
      startedAt: scanData.startedAt || now,
      completedAt: scanData.completedAt,
      scannedAt: scanData.scannedAt || now,
      userId: scanData.userId,
      userEmail: scanData.userEmail,
      organizationId: scanData.organizationId,
      aiDiagnosticAdvice: scanData.aiDiagnosticAdvice,
    };

    if (isPgEnabled()) {
      await this.pgUpsertScan(docData);
      this.localCache.set(scanId, docData);
      this.tokenIndex.set(publicToken, scanId);
      return docData;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production for scan ${scanId}`);
    }

    this.localCache.set(scanId, docData);
    this.tokenIndex.set(publicToken, scanId);

    await auditRepository.logEvent({
      action: 'SCAN_CREATED',
      userId: docData.userId,
      userEmail: docData.userEmail,
      details: { scanId, domain: docData.domain, mode: docData.mode },
      timestamp: now,
    });

    return docData;
  }

  async saveCompletedScan(
    scan: ScanRecord,
    userId?: string,
    userEmail?: string,
    organizationId?: string
  ): Promise<ScanDocument> {
    const now = new Date().toISOString();
    const publicToken = (scan.publicToken && scan.publicToken.length >= 32) ? scan.publicToken : this.generatePublicToken();
    const mode = (scan as any).mode || 'LIVE';

    const criticalCount = scan.allIssues?.filter(i => i.severity === 'CRITICAL').length || 0;
    const warningCount = scan.allIssues?.filter(i => i.severity === 'HIGH' || i.severity === 'MEDIUM').length || 0;
    const passedCount = scan.allIssues?.filter(i => i.severity === 'INFO' || i.severity === 'LOW').length || 0;

    const docData: ScanDocument = {
      ...scan,
      publicToken,
      mode,
      status: 'COMPLETED',
      overallScore: scan.score,
      confidence: 'HIGH',
      pillarScores: {
        leadGen: scan.pillars?.leadGen?.score ?? 0,
        adSpend: scan.pillars?.adSpend?.score ?? 0,
        seo: scan.pillars?.seo?.score ?? 0,
        security: scan.pillars?.security?.score ?? 0,
      },
      findingsCount: scan.allIssues?.length || 0,
      criticalFindings: criticalCount,
      warningFindings: warningCount,
      passedFindings: passedCount,
      scannerVersion: '4.2.0-prod',
      startedAt: (scan as any).startedAt || scan.scannedAt || now,
      completedAt: now,
      scannedAt: scan.scannedAt || now,
      normalizedUrl: scan.targetUrl,
      userId,
      userEmail,
      organizationId,
    };

    if (isPgEnabled()) {
      const merged = { ...scan, status: 'COMPLETED', completedAt: now, userId, userEmail, organizationId } as unknown as ScanDocument;
      await this.pgUpsertScan(merged);
      this.localCache.set(scan.scanId, merged);
      this.tokenIndex.set(publicToken, scan.scanId);
      return merged;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production for scan ${scan.scanId}`);
    }

    this.localCache.set(scan.scanId, docData);
    this.tokenIndex.set(publicToken, scan.scanId);

    await auditRepository.logEvent({
      action: 'SCAN_COMPLETED',
      userId,
      userEmail,
      details: {
        scanId: scan.scanId,
        domain: scan.domain,
        score: scan.score,
        issuesCount: scan.allIssues?.length || 0,
      },
      timestamp: now,
    });

    return docData;
  }

  async getScanById(scanId: string): Promise<ScanDocument | undefined> {
    if (isPgEnabled()) {
      const doc = await this.pgGetScan(scanId);
      if (doc) this.localCache.set(scanId, doc);
      return doc;
    }

    return this.localCache.get(scanId);
  }

  async getScanByToken(token: string): Promise<ScanDocument | undefined> {
    if (!token || typeof token !== 'string') return undefined;

    const scanId = this.tokenIndex.get(token);
    if (scanId) {
      return this.localCache.get(scanId);
    }
    return undefined;
  }

  async getRecentScans(limit = 20, mode?: 'LIVE' | 'DEMO'): Promise<ScanDocument[]> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const rows = await prisma.scan.findMany({
        where: mode ? { mode } : undefined,
        orderBy: { scannedAt: 'desc' },
        take: limit,
        include: { aiReport: true },
      });
      return rows.map(r => this.pgRowToDocument(r));
    }

    const cached = Array.from(this.localCache.values());
    const filtered = mode ? cached.filter(c => c.mode === mode) : cached;
    return filtered.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()).slice(0, limit);
  }

  async getUserScans(userId: string, limit = 20, startAfterId?: string): Promise<{ items: ScanDocument[]; nextCursor?: string }> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const rows = await prisma.scan.findMany({
        where: { userId },
        orderBy: { scannedAt: 'desc' },
        take: limit,
        include: { aiReport: true },
      });
      const items = rows.map(r => this.pgRowToDocument(r));
      const nextCursor = items.length === limit ? items[items.length - 1].scanId : undefined;
      return { items, nextCursor };
    }

    const items = Array.from(this.localCache.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, limit);

    return { items };
  }

  async getDomainScans(domain: string, limit = 10): Promise<ScanDocument[]> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const rows = await prisma.scan.findMany({
        where: { domain },
        orderBy: { scannedAt: 'desc' },
        take: limit,
        include: { aiReport: true },
      });
      return rows.map(r => this.pgRowToDocument(r));
    }

    return Array.from(this.localCache.values())
      .filter(s => s.domain === domain)
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, limit);
  }

  async deleteScan(scanId: string, requestUserId?: string, isAdmin = false): Promise<boolean> {
    const existing = await this.getScanById(scanId);
    if (!existing) return false;

    if (!isAdmin && existing.userId && existing.userId !== requestUserId) {
      throw new Error(`Unauthorized: You cannot delete scan ${scanId}`);
    }

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      await prisma.scan.delete({ where: { id: scanId } }).catch((err: any) => {
        if (err?.code !== 'P2025') throw err;
      });
      this.localCache.delete(scanId);
      if (existing.publicToken) this.tokenIndex.delete(existing.publicToken);
      await auditRepository.logEvent({
        action: 'SCAN_DELETED',
        userId: requestUserId,
        details: { scanId, domain: existing.domain },
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production to delete scan ${scanId}`);
    }

    this.localCache.delete(scanId);
    if (existing.publicToken) this.tokenIndex.delete(existing.publicToken);

    await auditRepository.logEvent({
      action: 'SCAN_DELETED',
      userId: requestUserId,
      details: { scanId, domain: existing.domain },
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  public clear(): void {
    this.localCache.clear();
    this.tokenIndex.clear();
  }
}

export const scanRepository = new ScanRepository();
