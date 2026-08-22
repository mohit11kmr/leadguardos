import crypto from 'crypto';
import { getAdminDb, FieldValue, isFirebaseConfigured, markFirestorePermissionDenied } from '../firebaseAdmin';
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

    this.localCache.set(scanId, docData);
    this.tokenIndex.set(publicToken, scanId);

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        await db.collection('scans').doc(scanId).set({
          ...docData,
          serverTimestamp: FieldValue.serverTimestamp(),
        });
      } catch (err: any) {
        console.warn(`[ScanRepository] Firestore write error for scan ${scanId}:`, err?.message || err);
      }
    }

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

    this.localCache.set(scan.scanId, docData);
    this.tokenIndex.set(publicToken, scan.scanId);

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        await db.collection('scans').doc(scan.scanId).set({
          ...docData,
          serverTimestamp: FieldValue.serverTimestamp(),
        });
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

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
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const docSnap = await db.collection('scans').doc(scanId).get();
        if (docSnap.exists) {
          const data = docSnap.data() as ScanDocument;
          this.localCache.set(scanId, data);
          if (data.publicToken) this.tokenIndex.set(data.publicToken, scanId);
          return data;
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    return this.localCache.get(scanId);
  }

  async getScanByToken(token: string): Promise<ScanDocument | undefined> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const snap = await db.collection('scans').where('publicToken', '==', token).limit(1).get();
        if (!snap.empty) {
          const data = snap.docs[0].data() as ScanDocument;
          this.localCache.set(data.scanId, data);
          this.tokenIndex.set(token, data.scanId);
          return data;
        }
        // Fallback check on scanId
        const directSnap = await db.collection('scans').doc(token).get();
        if (directSnap.exists) {
          const data = directSnap.data() as ScanDocument;
          this.localCache.set(data.scanId, data);
          return data;
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    const scanId = this.tokenIndex.get(token);
    if (scanId) {
      return this.localCache.get(scanId);
    }
    return this.localCache.get(token);
  }

  async getRecentScans(limit = 20, mode?: 'LIVE' | 'DEMO'): Promise<ScanDocument[]> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        let q = db.collection('scans').orderBy('scannedAt', 'desc').limit(limit);
        if (mode) {
          q = db.collection('scans').where('mode', '==', mode).orderBy('scannedAt', 'desc').limit(limit);
        }
        const snap = await q.get();
        if (!snap.empty) {
          return snap.docs.map(d => d.data() as ScanDocument);
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    const cached = Array.from(this.localCache.values());
    const filtered = mode ? cached.filter(c => c.mode === mode) : cached;
    return filtered.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()).slice(0, limit);
  }

  async getUserScans(userId: string, limit = 20, startAfterId?: string): Promise<{ items: ScanDocument[]; nextCursor?: string }> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        let q = db
          .collection('scans')
          .where('userId', '==', userId)
          .orderBy('scannedAt', 'desc')
          .limit(limit);

        if (startAfterId) {
          const lastDoc = await db.collection('scans').doc(startAfterId).get();
          if (lastDoc.exists) {
            q = q.startAfter(lastDoc);
          }
        }

        const snap = await q.get();
        const items = snap.docs.map(d => d.data() as ScanDocument);
        const nextCursor = items.length === limit ? items[items.length - 1].scanId : undefined;
        return { items, nextCursor };
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    const items = Array.from(this.localCache.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, limit);

    return { items };
  }

  async getDomainScans(domain: string, limit = 10): Promise<ScanDocument[]> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const snap = await db
          .collection('scans')
          .where('domain', '==', domain)
          .orderBy('scannedAt', 'desc')
          .limit(limit)
          .get();

        if (!snap.empty) {
          return snap.docs.map(d => d.data() as ScanDocument);
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
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

    this.localCache.delete(scanId);
    if (existing.publicToken) this.tokenIndex.delete(existing.publicToken);

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        await db.collection('scans').doc(scanId).delete();
      } catch (err) {
        console.warn(`[ScanRepository] Firestore deletion error for ${scanId}:`, err);
      }
    }

    await auditRepository.logEvent({
      action: 'SCAN_DELETED',
      userId: requestUserId,
      details: { scanId, domain: existing.domain },
      timestamp: new Date().toISOString(),
    });

    return true;
  }
}

export const scanRepository = new ScanRepository();
