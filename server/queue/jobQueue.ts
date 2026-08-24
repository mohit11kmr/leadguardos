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
  error?: string;
  result?: any;
  deadLetter?: boolean;
}

export class JobQueueManager {
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

  public getJob(id: string): QueueJobPayload | undefined {
    return this.jobMap.get(id);
  }

  public getNextJob(): QueueJobPayload | undefined {
    if (this.activeConcurrency >= this.maxConcurrency) {
      return undefined;
    }
    const job = this.queue.shift();
    if (job) {
      this.activeConcurrency++;
      job.status = 'RUNNING';
      job.startedAt = new Date().toISOString();
    }
    return job;
  }

  public getQueueDepth(): number {
    return this.queue.length;
  }

  public updateJobStatus(id: string, updates: Partial<QueueJobPayload>): void {
    const job = this.jobMap.get(id);
    if (job) {
      if (job.status === 'RUNNING' && (updates.status === 'COMPLETED' || updates.status === 'FAILED' || updates.status === 'TIMED_OUT')) {
        if (this.activeConcurrency > 0) this.activeConcurrency--;
      }
      Object.assign(job, updates);
    }
  }

  public markDeadLetter(id: string, errorReason: string): void {
    const job = this.jobMap.get(id);
    if (job) {
      job.status = 'FAILED';
      job.deadLetter = true;
      job.error = errorReason;
      job.finishedAt = new Date().toISOString();
      if (this.activeConcurrency > 0) this.activeConcurrency--;
    }
  }

  public clear(): void {
    this.queue = [];
    this.jobMap.clear();
    this.activeConcurrency = 0;
  }
}

export const jobQueue = JobQueueManager.getInstance();
