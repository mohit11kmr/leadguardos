import { jobQueue, QueueJobPayload } from './jobQueue';
import { RetryPolicy } from './retryPolicy';
import { executeLiveWebsiteScan } from '../scannerEngine';
import { storage } from '../storage';
import { generateRemediation } from '../services/ai.service';

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
      while (this.activeCount < this.MAX_CONCURRENCY && await jobQueue.getQueueDepth() > 0) {
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

  public async executeJob(job: QueueJobPayload): Promise<void> {
    if (job.status !== 'QUEUED') return;
    jobQueue.updateJobStatus(job.id, {
      status: 'RUNNING',
      attempt: job.attempt + 1,
      startedAt: new Date().toISOString(),
    });

    try {
      let result: any = null;

      switch (job.type) {
        case 'scanBatch':
        case 'sendNotification':
        case 'generatePdf':
          throw new Error(`Job type ${job.type} has no registered executor`);
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

        case 'aiAnalysis': {
          const scan = storage.getScan(job.data.scanId);
          if (!scan || (scan.userId && scan.userId !== job.userId)) {
            throw new Error('AI job is not authorized for this scan');
          }
          const remediation = await generateRemediation(job.data.findings);
          storage.updateScan(job.data.scanId, {
            aiRemediation: { ...remediation, updatedAt: new Date().toISOString() },
          });
          if (remediation.status === 'FAILED') throw new Error(remediation.error || 'AI remediation failed');
          result = remediation;
          break;
        }

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
        setTimeout(() => void jobQueue.updateJobStatus(job.id, { status: 'QUEUED', error: err?.message || 'Job execution failed' }), delay);
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
