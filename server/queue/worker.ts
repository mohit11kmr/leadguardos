import { jobQueue, QueueJobPayload } from './jobQueue';
import { RetryPolicy } from './retryPolicy';
import { executeLiveWebsiteScan } from '../scannerEngine';

export class BackgroundWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private activeCount = 0;
  private readonly MAX_CONCURRENCY = 5;

  public start(intervalMs = 1000) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.processNextJobs();
    }, intervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async processNextJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.activeCount < this.MAX_CONCURRENCY && jobQueue.getQueueDepth() > 0) {
        const job = jobQueue.getNextJob();
        if (!job) break;

        this.activeCount++;
        this.executeJob(job).finally(() => {
          this.activeCount = Math.max(0, this.activeCount - 1);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  public async executeJob(job: QueueJobPayload): Promise<void> {
    jobQueue.updateJobStatus(job.id, {
      status: 'RUNNING',
      attempt: job.attempt + 1,
      startedAt: new Date().toISOString(),
    });

    try {
      let result: any = null;

      switch (job.type) {
        case 'scanWebsite':
          result = await executeLiveWebsiteScan(job.data.url, job.data.options);
          break;

        case 'sendWebhook':
          const { safeFetch } = await import('../security/safeFetch');
          await safeFetch(job.data.url, {
            method: 'POST',
            body: JSON.stringify(job.data.payload),
            headers: job.data.headers,
          });
          result = { delivered: true };
          break;

        default:
          result = { status: 'PROCESSED', data: job.data };
          break;
      }

      jobQueue.updateJobStatus(job.id, {
        status: 'COMPLETED',
        finishedAt: new Date().toISOString(),
        result,
      });
    } catch (err: any) {
      const canRetry = RetryPolicy.shouldRetry(err, job.attempt + 1, job.maxAttempts);

      if (canRetry) {
        const delay = RetryPolicy.getBackoffDelayMs(job.attempt + 1);
        console.warn(`[Worker] Job ${job.id} failed (${err.message}). Retrying in ${delay}ms...`);
        setTimeout(() => {
          jobQueue.enqueue(job.type, job.data, job.userId, job.maxAttempts);
        }, delay);
      } else {
        jobQueue.updateJobStatus(job.id, {
          status: 'FAILED',
          finishedAt: new Date().toISOString(),
          error: err?.message || 'Job execution failed',
        });
      }
    }
  }
}

export const backgroundWorker = new BackgroundWorker();
