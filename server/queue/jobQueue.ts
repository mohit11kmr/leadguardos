import crypto from 'crypto';

export type JobType =
  | 'scanWebsite'
  | 'scanBatch'
  | 'runWatchdog'
  | 'sendWebhook'
  | 'sendNotification'
  | 'generatePdf'
  | 'aiAnalysis';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED';

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
  result?: any;
  deadLetter?: boolean;
}

export interface QueueAdapter {
  enqueue(type: JobType, data: Record<string, any>, userId?: string, maxAttempts?: number, attempt?: number): Promise<QueueJobPayload>;
  getJob(id: string): Promise<QueueJobPayload | undefined>;
  claimNext(workerId: string): Promise<QueueJobPayload | undefined>;
  updateJobStatus(id: string, updates: Partial<QueueJobPayload>): Promise<void>;
  markDeadLetter(id: string, errorReason: string): Promise<void>;
  getQueueDepth(): Promise<number>;
  clear(): Promise<void>;
}

export class JobQueueManager implements QueueAdapter {
  private static instance: JobQueueManager | null = null;
  private queue: QueueJobPayload[] = [];
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
    const job: QueueJobPayload = {
      id,
      type,
      userId,
      data,
      status: 'QUEUED',
      attempt,
      maxAttempts,
      createdAt: new Date().toISOString(),
    };

    this.queue.push(job);
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
    const job = this.queue.shift();
    if (job) {
      this.activeConcurrency++;
      job.status = 'RUNNING';
      job.workerId = workerId;
      job.attempt++;
      job.startedAt = new Date().toISOString();
    }
    return job;
  }

  public async getQueueDepth(): Promise<number> {
    return this.queue.length;
  }

  public async updateJobStatus(id: string, updates: Partial<QueueJobPayload>): Promise<void> {
    const job = this.jobMap.get(id);
    if (job) {
      if (job.status === 'RUNNING' && (updates.status === 'COMPLETED' || updates.status === 'FAILED' || updates.status === 'TIMED_OUT')) {
        if (this.activeConcurrency > 0) this.activeConcurrency--;
      }
      Object.assign(job, updates);
    }
  }

  public async markDeadLetter(id: string, errorReason: string): Promise<void> {
    const job = this.jobMap.get(id);
    if (job) {
      job.status = 'FAILED';
      job.deadLetter = true;
      job.error = errorReason;
      job.finishedAt = new Date().toISOString();
      if (this.activeConcurrency > 0) this.activeConcurrency--;
    }
  }

  public async clear(): Promise<void> {
    this.queue = [];
    this.jobMap.clear();
    this.activeConcurrency = 0;
  }
}

class FirestoreQueueAdapter implements QueueAdapter {
  private readonly collection = 'jobExecutions';

  private getDb() {
    const { getAdminDb, isFirebaseConfigured } = require('../firebaseAdmin');
    if (!isFirebaseConfigured()) throw new Error('DURABLE_QUEUE_UNAVAILABLE: Firestore is not configured');
    return getAdminDb();
  }

  async enqueue(type: JobType, data: Record<string, any>, userId?: string, maxAttempts = 3, attempt = 0) {
    const job: QueueJobPayload = { id: `job_${crypto.randomUUID()}`, type, userId, data, status: 'QUEUED', attempt, maxAttempts, createdAt: new Date().toISOString() };
    await this.getDb().collection(this.collection).doc(job.id).create({ ...job, deduplicationKey: job.id, deadLetter: false });
    return job;
  }

  async getJob(id: string) {
    const snapshot = await this.getDb().collection(this.collection).doc(id).get();
    return snapshot.exists ? snapshot.data() as QueueJobPayload : undefined;
  }

  async claimNext(workerId: string) {
    const db = this.getDb();
    const snapshot = await db.collection(this.collection).where('status', '==', 'QUEUED').orderBy('createdAt').limit(1).get();
    if (snapshot.empty) return undefined;
    const ref = snapshot.docs[0].ref;
    return db.runTransaction(async (transaction: any) => {
      const current = await transaction.get(ref);
      const data = current.data();
      if (!current.exists || data?.status !== 'QUEUED') return undefined;
      const claimed = { ...data, status: 'RUNNING', workerId, attempt: (data.attempt || 0) + 1, startedAt: new Date().toISOString(), leaseExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString() };
      transaction.update(ref, claimed);
      return claimed as QueueJobPayload;
    });
  }

  async updateJobStatus(id: string, updates: Partial<QueueJobPayload>) { await this.getDb().collection(this.collection).doc(id).set(updates, { merge: true }); }
  async markDeadLetter(id: string, errorReason: string) { await this.updateJobStatus(id, { status: 'FAILED', deadLetter: true, error: errorReason, finishedAt: new Date().toISOString() }); }
  async getQueueDepth() { return (await this.getDb().collection(this.collection).where('status', '==', 'QUEUED').count().get()).data().count; }
  async clear() { throw new Error('DURABLE_QUEUE_CLEAR_DISABLED'); }
}

export const jobQueue: QueueAdapter = process.env.NODE_ENV === 'production' ? new FirestoreQueueAdapter() : JobQueueManager.getInstance();
