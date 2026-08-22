import crypto from 'crypto';
import { AuditResult } from '../../src/types';

export interface ShareableSnapshot {
  token: string;
  scanId: string;
  snapshot: AuditResult;
  passwordHash?: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}

export class ReportManager {
  private static instance: ReportManager | null = null;
  private snapshotsMap = new Map<string, ShareableSnapshot>();

  public static getInstance(): ReportManager {
    if (!ReportManager.instance) {
      ReportManager.instance = new ReportManager();
    }
    return ReportManager.instance;
  }

  public createShareableSnapshot(auditResult: AuditResult, password?: string, ttlDays = 30): ShareableSnapshot {
    // Generate high-entropy 64-char random token
    const token = crypto.randomBytes(32).toString('hex');
    const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : undefined;

    const snapshot: ShareableSnapshot = {
      token,
      scanId: auditResult.scanId,
      snapshot: JSON.parse(JSON.stringify(auditResult)), // Immutable deep clone
      passwordHash,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlDays * 24 * 3600 * 1000).toISOString(),
      revoked: false,
    };

    this.snapshotsMap.set(token, snapshot);
    return snapshot;
  }

  public getSnapshot(token: string, password?: string): { snapshot?: AuditResult; error?: string } {
    const record = this.snapshotsMap.get(token);
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

  public revokeToken(token: string): boolean {
    const record = this.snapshotsMap.get(token);
    if (record) {
      record.revoked = true;
      return true;
    }
    return false;
  }
}

export const reportManager = ReportManager.getInstance();
