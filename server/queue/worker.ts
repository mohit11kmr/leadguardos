import { jobQueue, QueueJobPayload } from './jobQueue';
import { RetryPolicy } from './retryPolicy';
import { executeJobByType } from './executors/index';

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
      while (this.activeCount < this.MAX_CONCURRENCY) {
        const job = await jobQueue.claimNext(`embedded-worker-${process.pid}`);
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

  /**
   * Execute a claimed job through the central executor registry.
   * On failure: persist nextAttemptAt for durable retry (no setTimeout).
   * On terminal failure: dead-letter the job.
   */
  public async executeJob(job: QueueJobPayload): Promise<void> {
    try {
      const result = await executeJobByType(job);

      await jobQueue.updateJobStatus(job.id, {
        status: 'COMPLETED',
        finishedAt: new Date().toISOString(),
        result,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Job execution failed';
      const canRetry = RetryPolicy.shouldRetry(err, job.attempt, job.maxAttempts);

      if (canRetry) {
        // Durable retry: persist nextAttemptAt directly — no setTimeout
        const delayMs = RetryPolicy.getBackoffDelayMs(job.attempt);
        const nextAttemptAt = new Date(Date.now() + delayMs).toISOString();
        console.warn(`[Worker] Job ${job.id} failed (${errorMessage}). Durable retry scheduled at ${nextAttemptAt}`);

        await jobQueue.updateJobStatus(job.id, {
          status: 'QUEUED',
          lastError: errorMessage,
          error: errorMessage,
          nextAttemptAt,
        });
      } else {
        console.error(`[Worker] Job ${job.id} permanently failed. Dead-lettering.`);
        await jobQueue.markDeadLetter(job.id, errorMessage);
      }
    }
  }
}

export const backgroundWorker = new BackgroundWorker();
