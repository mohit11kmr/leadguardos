import { jobQueue, QueueJobPayload } from './server/queue/jobQueue';
import { RetryPolicy } from './server/queue/retryPolicy';
import { executeJobByType } from './server/queue/executors/index';

console.log('🚀 LeadGuard OS Standalone Production Background Worker Started');
console.log('📡 Listening for async scan, watchdog, webhook, notification, PDF, and AI jobs...');

let isRunning = true;

async function processJob(job: QueueJobPayload): Promise<void> {
  console.log(`[Worker] Processing Job ID: ${job.id} (Type: ${job.type}, Attempt: ${job.attempt})`);

  try {
    const result = await executeJobByType(job);

    await jobQueue.updateJobStatus(job.id, {
      status: 'COMPLETED',
      result,
      finishedAt: new Date().toISOString(),
    });

    console.log(`[Worker] Job ${job.id} completed successfully.`);
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    const canRetry = RetryPolicy.shouldRetry(err, job.attempt, job.maxAttempts);

    if (canRetry) {
      const delayMs = RetryPolicy.getBackoffDelayMs(job.attempt);
      const nextAttemptAt = new Date(Date.now() + delayMs).toISOString();
      console.warn(`[Worker] Job ${job.id} failed attempt ${job.attempt}. Durable retry at ${nextAttemptAt}`);

      await jobQueue.updateJobStatus(job.id, {
        status: 'QUEUED',
        lastError: errorMsg,
        error: errorMsg,
        nextAttemptAt,
      });
    } else {
      console.error(`[Worker] Job ${job.id} failed permanently. Dead-lettering.`);
      await jobQueue.markDeadLetter(job.id, errorMsg);
    }
  }
}

async function workerLoop(): Promise<void> {
  while (isRunning) {
    const job = await jobQueue.claimNext(`worker-${process.pid}`);
    if (job) {
      await processJob(job);
    } else {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

process.on('SIGINT', () => {
  console.log('[Worker] Gracefully shutting down worker loop...');
  isRunning = false;
  process.exit(0);
});

workerLoop().catch((err) => {
  console.error('[Worker Fatal Error]:', err);
  process.exit(1);
});
