import crypto from 'crypto';
import { AuditResult } from '../../src/types';
import { toPublicAuditReport } from './publicReport';
import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';
import { isPgEnabled } from '../db/storageMode';

export interface ShareableSnapshot {
  token: string;
  scanId: string;
  snapshot: AuditResult;
  passwordHash?: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}

/**
 * Durable shareable-report registry.
 *
 * Production authority: Firestore `reportShares` collection — share links
 * survive process restarts and resolve identically across horizontally
 * scaled API instances. The in-memory Map is a read-through CACHE ONLY
 * (@classification CACHE-ONLY) and is never the source of truth.
 */
export class ReportManager {
  private static instance: ReportManager | null = null;
  /** @classification CACHE-ONLY — Firestore is the authority in production */
  private snapshotsMap = new Map<string, ShareableSnapshot>();

  public static getInstance(): ReportManager {
    if (!ReportManager.instance) {
      ReportManager.instance = new ReportManager();
    }
    return ReportManager.instance;
  }

  private requireDb() {
    if (!isFirebaseConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('REPORT_SHARE_STORE_UNAVAILABLE: Firestore required in production for durable share links');
      }
      return null;
    }
    return getAdminDb();
  }

  /**
   * Durable create: AWAITS persistence so the link is guaranteed readable by
   * any instance immediately after this call resolves.
   */
  public async createShareableSnapshotAsync(auditResult: AuditResult, password?: string, ttlDays = 30): Promise<ShareableSnapshot> {
    // Generate high-entropy 64-char random token
    const token = crypto.randomBytes(32).toString('hex');
    const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : undefined;

    const snapshot: ShareableSnapshot = {
      token,
      scanId: auditResult.scanId,
      snapshot: JSON.parse(JSON.stringify(toPublicAuditReport(auditResult))),
      passwordHash,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlDays * 24 * 3600 * 1000).toISOString(),
      revoked: false,
    };

    // Durable persistence FIRST (fail-closed in production), cache second.
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      await prisma.reportShare.create({
        data: {
          token,
          scanId: snapshot.scanId,
          snapshot: snapshot.snapshot as any,
          passwordHash: snapshot.passwordHash || null,
          createdAt: new Date(snapshot.createdAt),
          expiresAt: new Date(snapshot.expiresAt),
        },
      }).catch(async (err: any) => {
        if (err?.code === 'P2002') {
          // Token collision (cryptographically negligible) — retry once via update
          await prisma.reportShare.update({
            where: { token }, data: { revoked: false },
          });
        } else throw err;
      });
      this.snapshotsMap.set(token, snapshot);
      return snapshot;
    }

    const db = this.requireDb();
    if (db) {
      try {
        await db.collection('reportShares').doc(token).set({
          token,
          scanId: snapshot.scanId,
          snapshot: snapshot.snapshot,
          passwordHash: snapshot.passwordHash ?? null,
          createdAt: snapshot.createdAt,
          expiresAt: snapshot.expiresAt,
          revoked: false,
          serverTimestamp: FieldValue.serverTimestamp(),
        });
      } catch (err: any) {
        console.error('[ReportManager] FAILED to persist share token:', err?.message || err);
        throw new Error(`REPORT_SHARE_PERSIST_FAILED: ${err?.message || err}`);
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('REPORT_SHARE_STORE_UNAVAILABLE: Firestore required in production for durable share links');
    }

    this.snapshotsMap.set(token, snapshot);
    return snapshot;
  }

  /** @deprecated Use createShareableSnapshotAsync — this variant does not await persistence. */
  public createShareableSnapshot(auditResult: AuditResult, password?: string, ttlDays = 30): ShareableSnapshot {
    void this.createShareableSnapshotAsync(auditResult, password, ttlDays).catch(() => undefined);
    // Best-effort local-only snapshot for legacy synchronous callers (dev).
    const token = crypto.randomBytes(32).toString('hex');
    const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : undefined;
    const snapshot: ShareableSnapshot = {
      token,
      scanId: auditResult.scanId,
      snapshot: JSON.parse(JSON.stringify(toPublicAuditReport(auditResult))),
      passwordHash,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlDays * 24 * 3600 * 1000).toISOString(),
      revoked: false,
    };
    this.snapshotsMap.set(token, snapshot);
    return snapshot;
  }

  public async getSnapshotAsync(token: string, password?: string): Promise<{ snapshot?: AuditResult; error?: string }> {
    let record = this.snapshotsMap.get(token);

    // Read-through to durable store when not cached
    if (!record) {
      if (isPgEnabled()) {
        try {
          const row = await (await import('../db/prisma')).prisma.reportShare.findUnique({ where: { token } });
          if (row) {
            record = {
              token: row.token,
              scanId: row.scanId,
              snapshot: row.snapshot as any,
              passwordHash: row.passwordHash || undefined,
              createdAt: row.createdAt.toISOString(),
              expiresAt: row.expiresAt.toISOString(),
              revoked: row.revoked,
            };
            this.snapshotsMap.set(token, record);
          }
        } catch {
          // fall through to invalid-link response below
        }
      }
    }
    if (!record) {
      const db = this.requireDb();
      if (db) {
        try {
          const snap = await db.collection('reportShares').doc(token).get();
          if (snap.exists) {
            record = snap.data() as ShareableSnapshot;
            this.snapshotsMap.set(token, record);
          }
        } catch {
          // Fall through to invalid-link response below
        }
      }
    }

    return this.resolve(record, password);
  }

  /** Synchronous lookup retained for cache hits and development use. */
  public getSnapshot(token: string, password?: string): { snapshot?: AuditResult; error?: string } {
    const record = this.snapshotsMap.get(token);
    return this.resolve(record, password);
  }

  private resolve(record: ShareableSnapshot | undefined, password?: string): { snapshot?: AuditResult; error?: string } {
    if (!record || record.revoked) {
      return { error: 'Report link expired or invalid.' };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return { error: 'Report link has expired.' };
    }

    if (record.passwordHash) {
      if (!password) return { error: 'Password required to view this report.' };
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (hash !== record.passwordHash) return { error: 'Incorrect password.' };
    }

    return { snapshot: record.snapshot };
  }

  public async revokeTokenAsync(token: string): Promise<boolean> {
    const record = this.snapshotsMap.get(token);

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const result = await prisma.reportShare.updateMany({
        where: { token, revoked: false },
        data: { revoked: true },
      });
      if (record) record.revoked = true;
      return result.count > 0;
    }

    const db = this.requireDb();

    if (db) {
      try {
        const ref = db.collection('reportShares').doc(token);
        const result = await db.runTransaction(async (transaction: any) => {
          const snap = await transaction.get(ref);
          if (!snap.exists) return false;
          transaction.update(ref, { revoked: true, revokedAt: new Date().toISOString() });
          return true;
        });
        if (!result && !record) return false;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') throw err;
        console.error('[ReportManager] Revoke persistence failed:', err?.message || err);
      }
    } else if (!record) {
      return false;
    }

    if (record) {
      record.revoked = true;
      return true;
    }
    return true;
  }

  /** Backward-compatible synchronous revoke (cache-first). */
  public revokeToken(token: string): boolean {
    const record = this.snapshotsMap.get(token);
    if (record) {
      record.revoked = true;
      void this.revokeTokenAsync(token).catch(() => undefined);
      return true;
    }
    // Unknown locally — attempt durable revoke for cross-instance correctness
    void this.revokeTokenAsync(token).catch(() => undefined);
    return !!this.snapshotsMap.get(token);
  }
}

export const reportManager = ReportManager.getInstance();
