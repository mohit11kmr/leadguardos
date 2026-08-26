import crypto from 'crypto';
import { isPgEnabled } from '../db/storageMode';

export type JobType =
  | 'scanWebsite'
  | 'scanBatch'
  | 'runWatchdog'
  | 'sendWebhook'
  | 'sendNotification'
  | 'generatePdf'
  | 'aiAnalysis';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED' | 'DEAD_LETTER';

export interface QueueJobPayload {
  id: string;
  type: JobType;
  userId?: string;
  data: Record<string, any>;
  status: JobStatus;
  attempt: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  leaseExpiresAt?: string;
  workerId?: string;
  error?: string;
  lastError?: string;
  result?: any;
  deadLetter?: boolean;
  /** ISO timestamp — job not claimable before this time (durable backoff) */
  nextAttemptAt?: string;
  /** Number of times this job was recovered from an expired RUNNING lease */
  recoveryCount?: number;
  /** workerId that held the job before crash recovery */
  previousWorkerId?: string;
  /** ISO timestamp when crash recovery last occurred */
  recoveredAt?: string;
}

/** Default lease duration: 5 minutes */
export const DEFAULT_LEASE_MS = 5 * 60_000;

export interface QueueAdapter {
  enqueue(type: JobType, data: Record<string, any>, userId?: string, maxAttempts?: number, attempt?: number): Promise<QueueJobPayload>;
  getJob(id: string): Promise<QueueJobPayload | undefined>;
  claimNext(workerId: string): Promise<QueueJobPayload | undefined>;
  updateJobStatus(id: string, updates: Partial<QueueJobPayload>): Promise<void>;
  markDeadLetter(id: string, errorReason: string): Promise<void>;
  getQueueDepth(): Promise<number>;
  clear(): Promise<void>;
}

/**
 * In-memory queue adapter for development and testing.
 * @classification DEV-ONLY — NOT used when NODE_ENV=production.
 */
export class JobQueueManager implements QueueAdapter {
  private static instance: JobQueueManager | null = null;
  private jobMap = new Map<string, QueueJobPayload>();
  private activeConcurrency = 0;
  private readonly maxConcurrency = 10;

  public static getInstance(): JobQueueManager {
    if (!JobQueueManager.instance) {
      JobQueueManager.instance = new JobQueueManager();
    }
    return JobQueueManager.instance;
  }

  public async enqueue(type: JobType, data: Record<string, any>, userId?: string, maxAttempts = 3, attempt = 0): Promise<QueueJobPayload> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const job: QueueJobPayload = {
      id,
      type,
      userId,
      data,
      status: 'QUEUED',
      attempt,
      maxAttempts,
      createdAt: now,
      nextAttemptAt: now,
      recoveryCount: 0,
    };

    this.jobMap.set(id, job);
    return job;
  }

  public async getJob(id: string): Promise<QueueJobPayload | undefined> {
    return this.jobMap.get(id);
  }

  public async claimNext(workerId: string): Promise<QueueJobPayload | undefined> {
    if (this.activeConcurrency >= this.maxConcurrency) {
      return undefined;
    }
    const now = Date.now();
    const nowISO = new Date().toISOString();

    // Priority 1: QUEUED jobs where nextAttemptAt <= now
    for (const job of this.jobMap.values()) {
      if (job.status === 'QUEUED') {
        const nextAt = job.nextAttemptAt ? new Date(job.nextAttemptAt).getTime() : 0;
        if (nextAt <= now) {
          this.activeConcurrency++;
          job.status = 'RUNNING';
          job.workerId = workerId;
          job.attempt = (job.attempt || 0) + 1;
          job.startedAt = nowISO;
          job.leaseExpiresAt = new Date(now + DEFAULT_LEASE_MS).toISOString();
          return job;
        }
      }
    }

    // Priority 2: RUNNING jobs with expired lease (crash recovery).
    // Concurrency note: the crashed worker's slot is implicitly reclaimed here
    // (no increment) — otherwise every crash would permanently leak a slot.
    for (const job of this.jobMap.values()) {
      if (job.status === 'RUNNING' && job.leaseExpiresAt) {
        const leaseExp = new Date(job.leaseExpiresAt).getTime();
        if (leaseExp < now) {
          job.previousWorkerId = job.workerId;
          job.workerId = workerId;
          job.attempt = (job.attempt || 0) + 1;
          job.startedAt = nowISO;
          job.leaseExpiresAt = new Date(now + DEFAULT_LEASE_MS).toISOString();
          job.recoveryCount = (job.recoveryCount || 0) + 1;
          job.recoveredAt = nowISO;
          return job;
        }
      }
    }

    return undefined;
  }

  public async getQueueDepth(): Promise<number> {
    let count = 0;
    for (const job of this.jobMap.values()) {
      if (job.status === 'QUEUED') count++;
    }
    return count;
  }

  public async updateJobStatus(id: string, updates: Partial<QueueJobPayload>): Promise<void> {
    const job = this.jobMap.get(id);
    if (job) {
      // Release the concurrency slot whenever the job LEAVES RUNNING
      // (terminal state OR back to QUEUED for durable retry).
      const leavingRunning = job.status === 'RUNNING'
        && ['COMPLETED', 'FAILED', 'TIMED_OUT', 'DEAD_LETTER', 'QUEUED'].includes(updates.status as string);
      if (leavingRunning && this.activeConcurrency > 0) this.activeConcurrency--;
      Object.assign(job, updates);
    }
  }

  public async markDeadLetter(id: string, errorReason: string): Promise<void> {
    const job = this.jobMap.get(id);
    if (job) {
      job.status = 'DEAD_LETTER';
      job.deadLetter = true;
      job.error = errorReason;
      job.finishedAt = new Date().toISOString();
      if (this.activeConcurrency > 0) this.activeConcurrency--;
    }
  }

  public async clear(): Promise<void> {
    this.jobMap.clear();
    this.activeConcurrency = 0;
  }
}

/**
 * Firestore-backed durable queue adapter.
 * Production authority for job state, retry scheduling, and crash recovery.
 */
/**
 * PostgreSQL-backed durable queue adapter (production authority).
 *
 * Claiming uses `FOR UPDATE SKIP LOCKED` — the canonical Postgres pattern for
 * multi-worker queues: atomic, contention-free, no double-claiming across
 * instances. Implements the same two-phase lookup as before:
 *   Phase 1: QUEUED jobs past nextAttemptAt (normal + durable retry)
 *   Phase 2: RUNNING jobs past leaseExpiresAt (crash recovery)
 */
class PrismaQueueAdapter implements QueueAdapter {
  private async db() {
    const { prisma } = await import('../db/prisma');
    return prisma;
  }

  async enqueue(type: JobType, data: Record<string, any>, userId?: string, maxAttempts = 3, attempt = 0): Promise<QueueJobPayload> {
    const prisma = await this.db();
    const now = new Date();
    const job: QueueJobPayload = {
      id: `job_${crypto.randomUUID()}`,
      type,
      userId,
      data,
      status: 'QUEUED',
      attempt,
      maxAttempts,
      createdAt: now.toISOString(),
      nextAttemptAt: now.toISOString(),
      recoveryCount: 0,
    };
    await prisma.jobExecution.create({
      data: {
        id: job.id,
        type: job.type,
        userId: userId || null,
        data: job.data as any,
        status: 'QUEUED',
        attempt: job.attempt,
        maxAttempts: job.maxAttempts,
        nextAttemptAt: now,
        recoveryCount: 0,
        deduplicationKey: job.id,
        createdAt: now,
      },
    });
    return job;
  }

  async getJob(id: string): Promise<QueueJobPayload | undefined> {
    const prisma = await this.db();
    const row = await prisma.jobExecution.findUnique({ where: { id } });
    return row ? this.toPayload(row) : undefined;
  }

  private toPayload(row: any): QueueJobPayload {
    return {
      id: row.id,
      type: row.type as JobType,
      userId: row.userId || undefined,
      data: (row.data || {}) as Record<string, any>,
      status: row.status as QueueJobPayload['status'],
      attempt: row.attempt,
      maxAttempts: row.maxAttempts,
      createdAt: row.createdAt?.toISOString?.() || String(row.createdAt),
      startedAt: row.startedAt?.toISOString?.(),
      finishedAt: row.finishedAt?.toISOString?.(),
      leaseExpiresAt: row.leaseExpiresAt?.toISOString?.(),
      workerId: row.workerId || undefined,
      error: row.error || undefined,
      lastError: row.lastError || undefined,
      result: row.result ?? undefined,
      deadLetter: row.deadLetter,
      nextAttemptAt: row.nextAttemptAt?.toISOString?.(),
      recoveryCount: row.recoveryCount,
      previousWorkerId: row.previousWorkerId || undefined,
      recoveredAt: row.recoveredAt?.toISOString?.(),
    };
  }

  async claimNext(workerId: string): Promise<QueueJobPayload | undefined> {
    const prisma = await this.db();
    const leaseInterval = `${DEFAULT_LEASE_MS} milliseconds`;

    // Phase 1: claim a due QUEUED job atomically.
    const claimed = await prisma.$queryRaw<any[]>`
      UPDATE "JobExecution"
      SET "status" = 'RUNNING',
          "workerId" = ${workerId},
          "attempt" = "attempt" + 1,
          "startedAt" = (NOW() AT TIME ZONE 'utc'),
          "leaseExpiresAt" = NOW() + ${leaseInterval}::interval
      WHERE "id" = (
        SELECT "id" FROM "JobExecution"
        WHERE "status" = 'QUEUED' AND "nextAttemptAt" <= (NOW() AT TIME ZONE 'utc')
        ORDER BY "nextAttemptAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;
    if (claimed.length > 0) return this.toPayload(claimed[0]);

    // Phase 2: recover a crashed RUNNING job whose lease expired.
    const recovered = await prisma.$queryRaw<any[]>`
      UPDATE "JobExecution"
      SET "status" = 'RUNNING',
          "workerId" = ${workerId},
          "previousWorkerId" = "workerId",
          "attempt" = "attempt" + 1,
          "startedAt" = (NOW() AT TIME ZONE 'utc'),
          "leaseExpiresAt" = NOW() + ${leaseInterval}::interval,
          "recoveryCount" = "recoveryCount" + 1,
          "recoveredAt" = (NOW() AT TIME ZONE 'utc')
      WHERE "id" = (
        SELECT "id" FROM "JobExecution"
        WHERE "status" = 'RUNNING' AND "leaseExpiresAt" < (NOW() AT TIME ZONE 'utc')
        ORDER BY "leaseExpiresAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;
    if (recovered.length > 0) return this.toPayload(recovered[0]);

    return undefined;
  }

  async updateJobStatus(id: string, updates: Partial<QueueJobPayload>): Promise<void> {
    const prisma = await this.db();
    const data: Record<string, unknown> = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.attempt !== undefined) data.attempt = updates.attempt;
    if (updates.workerId !== undefined) data.workerId = updates.workerId;
    if (updates.startedAt !== undefined) data.startedAt = new Date(updates.startedAt);
    if (updates.finishedAt !== undefined) data.finishedAt = new Date(updates.finishedAt);
    if (updates.leaseExpiresAt !== undefined) data.leaseExpiresAt = new Date(updates.leaseExpiresAt);
    if (updates.nextAttemptAt !== undefined) data.nextAttemptAt = new Date(updates.nextAttemptAt);
    if (updates.error !== undefined) data.error = updates.error;
    if (updates.lastError !== undefined) data.lastError = updates.lastError;
    if (updates.result !== undefined) data.result = updates.result as any;
    if (updates.recoveryCount !== undefined) data.recoveryCount = updates.recoveryCount;
    if (updates.previousWorkerId !== undefined) data.previousWorkerId = updates.previousWorkerId;
    if (Object.keys(data).length === 0) return;
    try {
      await prisma.jobExecution.update({ where: { id }, data: data as any });
    } catch (err: any) {
      // Job may have been hard-deleted in test cleanup; surface real errors otherwise.
      if (err?.code !== 'P2025') throw err;
    }
  }

  async markDeadLetter(id: string, errorReason: string): Promise<void> {
    const prisma = await this.db();
    await prisma.jobExecution.update({
      where: { id },
      data: {
        status: 'DEAD_LETTER',
        deadLetter: true,
        error: errorReason,
        finishedAt: new Date(),
      },
    });
  }

  async getQueueDepth(): Promise<number> {
    const prisma = await this.db();
    return prisma.jobExecution.count({ where: { status: 'QUEUED' } });
  }

  async clear(): Promise<void> {
    throw new Error('DURABLE_QUEUE_CLEAR_DISABLED');
  }
}

/** Fail-fast placeholder used ONLY when production boots without DATABASE_URL. */
class UnavailableQueueAdapter implements QueueAdapter {
  private reject(): never {
    throw new Error('FATAL: DATABASE_URL is required for the durable queue in production.');
  }
  enqueue(): Promise<never> { return Promise.reject(this.reject()); }
  getJob(): Promise<never> { return Promise.reject(this.reject()); }
  claimNext(): Promise<never> { return Promise.reject(this.reject()); }
  updateJobStatus(): Promise<void> { return Promise.reject(this.reject()); }
  markDeadLetter(): Promise<void> { return Promise.reject(this.reject()); }
  getQueueDepth(): Promise<number> { return Promise.reject(this.reject()); }
  clear(): Promise<void> { return Promise.reject(this.reject()); }
}

function selectQueueAdapter(): QueueAdapter {
  if (isPgEnabled()) return new PrismaQueueAdapter();
  if (process.env.NODE_ENV === 'production') return new UnavailableQueueAdapter();
  return JobQueueManager.getInstance(); // dev/test only
}

export const jobQueue: QueueAdapter = selectQueueAdapter();
