import { isPgEnabled } from '../db/storageMode';
import { WatchdogTarget, WatchdogCheckLog } from '../storage';
import { auditRepository } from './auditRepository';

export interface WatchdogTargetDocument extends WatchdogTarget {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  mode: 'LIVE' | 'DEMO';
  nextCheckAt?: string;
  /** Durable queue job currently responsible for this target's next probe */
  pendingRunJobId?: string;
  updatedAt?: string;
  leaseOwner?: string;
  leaseExpiresAt?: string;
  lastRunId?: string;
  lastIncidentFingerprint?: string;
  lastIncidentAt?: string;
  failureCount?: number;
  alertState?: 'OK' | 'INCIDENT_OPEN' | 'COOLDOWN';
  serverTimestamp?: any;
}

export interface WatchdogCheckDocument extends WatchdogCheckLog {
  targetId?: string;
  scanId?: string;
  durationMs?: number;
  mode?: 'LIVE' | 'DEMO';
  serverTimestamp?: any;
}

export interface IWatchdogRepository {
  addTarget(target: Partial<WatchdogTargetDocument>, userId?: string, userEmail?: string): Promise<WatchdogTargetDocument>;
  getTargetById(id: string, userId?: string, isAdmin?: boolean): Promise<WatchdogTargetDocument | undefined>;
  getTargets(userId?: string, organizationId?: string, isAdmin?: boolean): Promise<WatchdogTargetDocument[]>;
  updateTarget(id: string, updates: Partial<WatchdogTargetDocument>, userId?: string, isAdmin?: boolean): Promise<WatchdogTargetDocument | undefined>;
  deleteTarget(id: string, userId?: string, isAdmin?: boolean): Promise<boolean>;
  addCheckLog(log: Partial<WatchdogCheckDocument>): Promise<WatchdogCheckDocument>;
  getCheckLogs(targetId?: string, limit?: number): Promise<WatchdogCheckDocument[]>;
}

export class WatchdogRepository implements IWatchdogRepository {
  private localTargets: Map<string, WatchdogTargetDocument> = new Map();
  private localLogs: WatchdogCheckDocument[] = [];

  private mapPgRow(row: any): WatchdogTargetDocument {
    return {
      id: row.id,
      targetUrl: row.targetUrl,
      domain: row.domain,
      contact: row.contact,
      channel: row.channel,
      frequency: row.frequency,
      status: row.status as WatchdogTargetDocument['status'],
      mode: row.mode === 'DEMO' ? 'DEMO' : 'LIVE',
      createdAt: row.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString?.(),
      trialExpiresAt: row.trialExpiresAt?.toISOString?.(),
      lastCheckedAt: row.lastCheckedAt?.toISOString?.(),
      nextCheckAt: row.nextCheckAt?.toISOString?.(),
      lastScore: row.lastScore ?? undefined,
      lastStatus: row.lastStatus || undefined,
      userId: row.userId || undefined,
      organizationId: row.organizationId || undefined,
      pendingRunJobId: row.pendingRunJobId || undefined,
      leaseOwner: row.leaseOwner || undefined,
      leaseExpiresAt: row.leaseExpiresAt?.toISOString?.(),
      failureCount: row.failureCount ?? 0,
      alertState: row.alertState || 'OK',
    } as WatchdogTargetDocument;
  }

  async addTarget(
    target: Partial<WatchdogTargetDocument>,
    userId?: string,
    userEmail?: string
  ): Promise<WatchdogTargetDocument> {
    const id = target.id || `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const docData: WatchdogTargetDocument = {
      id,
      targetUrl: target.targetUrl || '',
      domain: target.domain || '',
      contact: target.contact || '',
      channel: target.channel || 'EMAIL',
      frequency: target.frequency || 'DAILY',
      status: target.status || 'ACTIVE_TRIAL',
      mode: target.mode || 'LIVE',
      createdAt: target.createdAt || now,
      updatedAt: now,
      trialExpiresAt: target.trialExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastCheckedAt: target.lastCheckedAt,
      nextCheckAt: target.nextCheckAt,
      lastScore: target.lastScore,
      lastStatus: target.lastStatus,
      userId: target.userId || userId,
      userEmail: target.userEmail || userEmail,
      organizationId: target.organizationId,
    };

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      await prisma.watchdog.upsert({
        where: { id },
        create: {
          id,
          userId: docData.userId || null,
          targetUrl: docData.targetUrl,
          domain: docData.domain,
          contact: docData.contact || '',
          channel: docData.channel || 'EMAIL',
          frequency: docData.frequency || 'DAILY',
          status: docData.status || 'ACTIVE_TRIAL',
          mode: docData.mode === 'DEMO' ? 'DEMO' : 'LIVE',
          nextCheckAt: docData.nextCheckAt ? new Date(docData.nextCheckAt) : null,
          trialExpiresAt: docData.trialExpiresAt ? new Date(docData.trialExpiresAt) : null,
        },
        update: {},
      });
      this.localTargets.set(id, docData);
      await auditRepository.logEvent({
        action: 'WATCHDOG_CREATED',
        userId: docData.userId,
        userEmail: docData.userEmail,
        details: { targetId: id, domain: docData.domain, channel: docData.channel },
        timestamp: now,
      });
      return docData;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production for watchdog target ${id}`);
    }

    this.localTargets.set(id, docData);

    await auditRepository.logEvent({
      action: 'WATCHDOG_CREATED',
      userId: docData.userId,
      userEmail: docData.userEmail,
      details: { targetId: id, domain: docData.domain, channel: docData.channel },
      timestamp: now,
    });

    return docData;
  }

  async getTargetById(id: string, userId?: string, isAdmin = false): Promise<WatchdogTargetDocument | undefined> {
    if (isPgEnabled()) {
      const row = await (await import('../db/prisma')).prisma.watchdog.findUnique({ where: { id } });
      if (!row) return undefined;
      const target = this.mapPgRow(row);
      if (!isAdmin && target.userId && userId && target.userId !== userId) {
        throw new Error('Unauthorized: You do not own this watchdog monitor');
      }
      this.localTargets.set(id, target);
      return target;
    }

    const local = this.localTargets.get(id);
    if (local && !isAdmin && local.userId && userId && local.userId !== userId) {
      throw new Error('Unauthorized: You do not own this watchdog monitor');
    }
    return local;
  }

  async getTargets(userId?: string, organizationId?: string, isAdmin = false): Promise<WatchdogTargetDocument[]> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const whereClause: any = {};
      if (!isAdmin && userId) {
        whereClause.userId = userId;
      } else if (!isAdmin && organizationId) {
        whereClause.organizationId = organizationId;
      }
      const rows = await prisma.watchdog.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        orderBy: { createdAt: 'desc' },
      });
      const targets = rows.map(r => this.mapPgRow(r));
      targets.forEach(t => this.localTargets.set(t.id, t));
      return targets;
    }

    const list = Array.from(this.localTargets.values());
    if (isAdmin) return list;
    if (userId) return list.filter(t => t.userId === userId || !t.userId);
    if (organizationId) return list.filter(t => t.organizationId === organizationId);
    return list;
  }

  async updateTarget(
    id: string,
    updates: Partial<WatchdogTargetDocument>,
    userId?: string,
    isAdmin = false
  ): Promise<WatchdogTargetDocument | undefined> {
    const existing = await this.getTargetById(id, userId, isAdmin);
    if (!existing) {
      throw new Error(`Watchdog monitor ${id} not found.`);
    }

    const updatedData: WatchdogTargetDocument = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      try {
        await prisma.watchdog.update({
          where: { id },
          data: {
            status: updatedData.status,
            lastCheckedAt: updatedData.lastCheckedAt ? new Date(updatedData.lastCheckedAt) : undefined,
            nextCheckAt: updatedData.nextCheckAt ? new Date(updatedData.nextCheckAt) : undefined,
            lastScore: updatedData.lastScore ?? undefined,
            lastStatus: updatedData.lastStatus || undefined,
            pendingRunJobId: updatedData.pendingRunJobId !== undefined ? (updatedData.pendingRunJobId || null) : undefined,
            failureCount: updatedData.failureCount,
            alertState: updatedData.alertState || undefined,
            leaseOwner: updatedData.leaseOwner !== undefined ? (updatedData.leaseOwner || null) : undefined,
            leaseExpiresAt: updatedData.leaseExpiresAt ? new Date(updatedData.leaseExpiresAt) : undefined,
          },
        });
      } catch (err: any) {
        if (err?.code !== 'P2025') throw err;
      }
      this.localTargets.set(id, updatedData);
      return updatedData;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production to update watchdog ${id}`);
    }

    this.localTargets.set(id, updatedData);

    await auditRepository.logEvent({
      action: 'WATCHDOG_UPDATED',
      userId,
      details: { targetId: id, domain: updatedData.domain, updates: Object.keys(updates) },
      timestamp: new Date().toISOString(),
    });

    return updatedData;
  }

  async deleteTarget(id: string, userId?: string, isAdmin = false): Promise<boolean> {
    const existing = await this.getTargetById(id, userId, isAdmin);
    if (!existing) return false;

    if (!isAdmin && existing.userId && existing.userId !== userId) {
      throw new Error(`Unauthorized: You cannot delete watchdog target ${id}`);
    }

    if (isPgEnabled()) {
      await (await import('../db/prisma')).prisma.watchdog.delete({ where: { id } }).catch((err: any) => {
        if (err?.code !== 'P2025') throw err;
      });
      this.localTargets.delete(id);
      await auditRepository.logEvent({
        action: 'WATCHDOG_DELETED',
        userId,
        details: { targetId: id, domain: existing.domain },
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production to delete watchdog ${id}`);
    }

    this.localTargets.delete(id);

    await auditRepository.logEvent({
      action: 'WATCHDOG_DELETED',
      userId,
      details: { targetId: id, domain: existing.domain },
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  async addCheckLog(log: Partial<WatchdogCheckDocument>): Promise<WatchdogCheckDocument> {
    const id = log.id || `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const docData: WatchdogCheckDocument = {
      id,
      targetId: log.targetId,
      domain: log.domain || '',
      check: log.check || 'Watchdog Heartbeat Probe',
      status: log.status || 'PASS',
      score: log.score ?? 100,
      timestamp: log.timestamp || now,
      details: log.details || '',
      durationMs: log.durationMs,
      mode: log.mode || 'LIVE',
    };

    if (isPgEnabled()) {
      void (async () => {
        const { prisma } = await import('../db/prisma');
        try {
          await prisma.watchdogCheckLog.create({
            data: {
              watchdogId: String(docData.targetId || ''),
              scanId: docData.scanId || null,
              check: docData.check || 'Watchdog Heartbeat Probe',
              status: docData.status || 'PASS',
              score: docData.score ?? 100,
              durationMs: docData.durationMs ?? null,
              details: docData.details || null,
              mode: docData.mode === 'DEMO' ? 'DEMO' : 'LIVE',
            },
          });
        } catch (err: any) {
          console.error('[WatchdogRepository] check log persist failed:', err?.message);
        }
      })();
    }

    this.localLogs.unshift(docData);
    if (this.localLogs.length > 500) this.localLogs.pop();

    return docData;
  }

  async getCheckLogs(targetId?: string, limit = 25): Promise<WatchdogCheckDocument[]> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const rows = await prisma.watchdogCheckLog.findMany({
        where: targetId ? { watchdogId: targetId } : undefined,
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
      return rows.map(r => ({
        id: r.id,
        targetId: r.watchdogId,
        domain: '',
        scanId: r.scanId || undefined,
        check: r.check,
        status: r.status,
        score: r.score,
        durationMs: r.durationMs || undefined,
        details: r.details || undefined,
        mode: r.mode as 'LIVE' | 'DEMO',
        timestamp: r.timestamp.toISOString(),
      }));
    }

    const filtered = targetId ? this.localLogs.filter(l => l.targetId === targetId) : this.localLogs;
    return filtered.slice(0, limit);
  }

  /**
   * Acquire a distributed execution lease for target probe.
   * Prevents multiple worker instances from running concurrent probes on the same target.
   */
  async acquireTargetLease(targetId: string, workerId: string, leaseDurationMs = 180000): Promise<boolean> {
    const now = Date.now();
    const expiresAt = new Date(now + leaseDurationMs).toISOString();

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const leaseInterval = `${leaseDurationMs} milliseconds`;
      const result = await prisma.$queryRaw<any[]>`
        UPDATE "Watchdog"
        SET "leaseOwner" = ${workerId},
            "leaseExpiresAt" = (NOW() AT TIME ZONE 'utc') + ${leaseInterval}::interval
        WHERE "id" = ${targetId}
          AND (
            "leaseOwner" IS NULL
            OR "leaseOwner" = ${workerId}
            OR "leaseExpiresAt" < (NOW() AT TIME ZONE 'utc')
          )
        RETURNING "id";
      `;
      return result.length > 0;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production to acquire watchdog lease`);
    }

    // Local in-memory lease checking for development / offline
    const local = this.localTargets.get(targetId);
    if (local) {
      const currentLeaseExp = local.leaseExpiresAt ? new Date(local.leaseExpiresAt).getTime() : 0;
      if (local.leaseOwner && local.leaseOwner !== workerId && currentLeaseExp > now) {
        return false;
      }
      this.localTargets.set(targetId, {
        ...local,
        leaseOwner: workerId,
        leaseExpiresAt: expiresAt,
      });
      return true;
    }

    return true;
  }

  /**
   * Release the distributed execution lease after probe completion.
   * Ensures only the owning worker can release its active lease.
   */
  async releaseTargetLease(targetId: string, workerId: string): Promise<void> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      await prisma.$queryRaw<any[]>`
        UPDATE "Watchdog"
        SET "leaseOwner" = NULL,
            "leaseExpiresAt" = NULL
        WHERE "id" = ${targetId} AND "leaseOwner" = ${workerId};
      `;
      return;
    }

    const local = this.localTargets.get(targetId);
    if (local && local.leaseOwner === workerId) {
      delete local.leaseOwner;
      delete local.leaseExpiresAt;
    }
  }

  public clear(): void {
    this.localTargets.clear();
    this.localLogs = [];
  }
}

export const watchdogRepository = new WatchdogRepository();
