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
}

export class JobQueueManager {
  private static instance: JobQueueManager | null = null;
  private queue: QueueJobPayload[] = [];
  private jobMap = new Map<string, QueueJobPayload>();

  public static getInstance(): JobQueueManager {
    if (!JobQueueManager.instance) {
      JobQueueManager.instance = new JobQueueManager();
    }
    return JobQueueManager.instance;
  }

  public async enqueue(type: JobType, data: Record<string, any>, userId?: string, maxAttempts = 3): Promise<QueueJobPayload> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: QueueJobPayload = {
      id,
      type,
      userId,
      data,
      status: 'QUEUED',
      attempt: 0,
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
    return this.queue.shift();
  }

  public getQueueDepth(): number {
    return this.queue.length;
  }

  public updateJobStatus(id: string, updates: Partial<QueueJobPayload>): void {
    const job = this.jobMap.get(id);
    if (job) {
      Object.assign(job, updates);
    }
  }

  public clear(): void {
    this.queue = [];
    this.jobMap.clear();
  }
}

export const jobQueue = JobQueueManager.getInstance();
