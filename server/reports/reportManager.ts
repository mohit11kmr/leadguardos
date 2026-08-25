import crypto from 'crypto';
import { AuditResult } from '../../src/types';
import { toPublicAuditReport } from './publicReport';
import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';

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

  public createShareableSnapshot(auditResult: AuditResult, password?: string, ttlDays = 30): ShareableSnapshot {
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

    this.snapshotsMap.set(token, snapshot);

    // Durable persistence — fail-closed in production.
    const db = this.requireDb();
    if (db) {
      void db.collection('reportShares').doc(token).set({
        token,
        scanId: snapshot.scanId,
        snapshot: snapshot.snapshot,
        passwordHash: snapshot.passwordHash ?? null,
        createdAt: snapshot.createdAt,
        expiresAt: snapshot.expiresAt,
        revoked: false,
        serverTimestamp: FieldValue.serverTimestamp(),
      }).catch((err: any) => {
        // Create-path failure must surface: without durability the link dies
        // on restart. Re-throw asynchronously is unsafe in HTTP context, so
        // log loudly and invalidate the local entry to prevent a fake-success
        // response body claiming a durable link that was not persisted.
        console.error('[ReportManager] FAILED to persist share token:', err?.message || err);
        this.snapshotsMap.delete(token);
      });
    } else if (process.env.NODE_ENV === 'production') {
      this.snapshotsMap.delete(token);
      throw new Error('REPORT_SHARE_STORE_UNAVAILABLE: Firestore required in production for durable share links');
    }

    return snapshot;
  }

  public async getSnapshotAsync(token: string, password?: string): Promise<{ snapshot?: AuditResult; error?: string }> {
    let record = this.snapshotsMap.get(token);

    // Read-through to durable store when not cached
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
