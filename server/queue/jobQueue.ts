import crypto from 'crypto';

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

    // Priority 2: RUNNING jobs with expired lease (crash recovery)
    for (const job of this.jobMap.values()) {
      if (job.status === 'RUNNING' && job.leaseExpiresAt) {
        const leaseExp = new Date(job.leaseExpiresAt).getTime();
        if (leaseExp < now) {
          this.activeConcurrency++;
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
      if (job.status === 'RUNNING' && (updates.status === 'COMPLETED' || updates.status === 'FAILED' || updates.status === 'TIMED_OUT' || updates.status === 'DEAD_LETTER')) {
        if (this.activeConcurrency > 0) this.activeConcurrency--;
      }
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
class FirestoreQueueAdapter implements QueueAdapter {
  private readonly collection = 'jobExecutions';

  private getDb() {
    const { getAdminDb, isFirebaseConfigured } = require('../firebaseAdmin');
    if (!isFirebaseConfigured()) throw new Error('DURABLE_QUEUE_UNAVAILABLE: Firestore is not configured');
    return getAdminDb();
  }

  async enqueue(type: JobType, data: Record<string, any>, userId?: string, maxAttempts = 3, attempt = 0) {
    const now = new Date().toISOString();
    const job: QueueJobPayload = {
      id: `job_${crypto.randomUUID()}`,
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
    await this.getDb().collection(this.collection).doc(job.id).create({
      ...job,
      deduplicationKey: job.id,
      deadLetter: false,
    });
    return job;
  }

  async getJob(id: string) {
    const snapshot = await this.getDb().collection(this.collection).doc(id).get();
    return snapshot.exists ? snapshot.data() as QueueJobPayload : undefined;
  }

  /**
   * Claims the next available job, implementing two-phase lookup:
   * 1. QUEUED jobs where nextAttemptAt <= now (normal + retry)
   * 2. RUNNING jobs where leaseExpiresAt < now (crash recovery)
   *
   * Both operations are transactional to prevent double-claiming.
   */
  async claimNext(workerId: string): Promise<QueueJobPayload | undefined> {
    const db = this.getDb();
    const nowISO = new Date().toISOString();
    const leaseExpiresAt = new Date(Date.now() + DEFAULT_LEASE_MS).toISOString();

    // Phase 1: Try to claim a QUEUED job that is ready (nextAttemptAt <= now)
    const queuedSnap = await db.collection(this.collection)
      .where('status', '==', 'QUEUED')
      .where('nextAttemptAt', '<=', nowISO)
      .orderBy('nextAttemptAt')
      .limit(1)
      .get();

    if (!queuedSnap.empty) {
      const ref = queuedSnap.docs[0].ref;
      const claimed = await db.runTransaction(async (transaction: any) => {
        const current = await transaction.get(ref);
        const data = current.data();
        if (!current.exists || data?.status !== 'QUEUED') return undefined;
        // Re-check nextAttemptAt inside transaction
        const nextAt = data.nextAttemptAt ? new Date(data.nextAttemptAt).getTime() : 0;
        if (nextAt > Date.now()) return undefined;

        const updates = {
          status: 'RUNNING',
          workerId,
          attempt: (data.attempt || 0) + 1,
          startedAt: nowISO,
          leaseExpiresAt,
        };
        transaction.update(ref, updates);
        return { ...data, ...updates } as QueueJobPayload;
      });
      if (claimed) return claimed;
    }

    // Phase 2: Try to recover an expired RUNNING job (crash recovery)
    const expiredSnap = await db.collection(this.collection)
      .where('status', '==', 'RUNNING')
      .where('leaseExpiresAt', '<', nowISO)
      .orderBy('leaseExpiresAt')
      .limit(1)
      .get();

    if (!expiredSnap.empty) {
      const ref = expiredSnap.docs[0].ref;
      const recovered = await db.runTransaction(async (transaction: any) => {
        const current = await transaction.get(ref);
        const data = current.data();
        if (!current.exists || data?.status !== 'RUNNING') return undefined;
        // Re-check lease expiry inside transaction
        const leaseExp = data.leaseExpiresAt ? new Date(data.leaseExpiresAt).getTime() : Infinity;
        if (leaseExp >= Date.now()) return undefined;

        const updates = {
          workerId,
          previousWorkerId: data.workerId,
          attempt: (data.attempt || 0) + 1,
          startedAt: nowISO,
          leaseExpiresAt,
          recoveryCount: (data.recoveryCount || 0) + 1,
          recoveredAt: nowISO,
        };
        transaction.update(ref, updates);
        return { ...data, ...updates } as QueueJobPayload;
      });
      if (recovered) return recovered;
    }

    return undefined;
  }

  async updateJobStatus(id: string, updates: Partial<QueueJobPayload>) {
    await this.getDb().collection(this.collection).doc(id).set(updates, { merge: true });
  }

  async markDeadLetter(id: string, errorReason: string) {
    await this.updateJobStatus(id, {
      status: 'DEAD_LETTER',
      deadLetter: true,
      error: errorReason,
      finishedAt: new Date().toISOString(),
    });
  }

  async getQueueDepth() {
    return (await this.getDb().collection(this.collection).where('status', '==', 'QUEUED').count().get()).data().count;
  }

  async clear() {
    throw new Error('DURABLE_QUEUE_CLEAR_DISABLED');
  }
}

export const jobQueue: QueueAdapter = process.env.NODE_ENV === 'production' ? new FirestoreQueueAdapter() : JobQueueManager.getInstance();
