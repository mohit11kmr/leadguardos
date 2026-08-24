import { jobQueue, QueueJobPayload } from './server/queue/jobQueue';
import { executeLiveWebsiteScan } from './server/scannerEngine';
import { watchdogRepository } from './server/repositories/watchdogRepository';

console.log('🚀 LeadGuard OS Standalone Production Background Worker Started');
console.log('📡 Listening for async scan, watchdog, webhook, and AI jobs...');

let isRunning = true;

async function processJob(job: QueueJobPayload): Promise<void> {
  console.log(`[Worker] Processing Job ID: ${job.id} (Type: ${job.type})`);

  try {
    switch (job.type) {
      case 'scanWebsite': {
        const { domain, url, options } = job.data;
        const result = await executeLiveWebsiteScan(domain || url, options);
        jobQueue.updateJobStatus(job.id, {
          status: 'COMPLETED',
          result,
          finishedAt: new Date().toISOString(),
        });
        break;
      }

      case 'runWatchdog': {
        const { targetId } = job.data;
        const target = await watchdogRepository.getTargetById(targetId, undefined, true);
        if (target) {
          const scanResult = await executeLiveWebsiteScan(target.domain);
          await watchdogRepository.addCheckLog({
            targetId,
            scanId: scanResult.id,
            status: scanResult.overallScore >= 70 ? 'HEALTHY' : 'INCIDENT_OPEN',
            durationMs: scanResult.metadata.scanDurationMs,
            details: JSON.stringify({
              whatsappOk: !scanResult.findings.some((f: any) => f.category === 'WHATSAPP'),
              pixelOk: !scanResult.findings.some((f: any) => f.category === 'META_PIXEL'),
              callOk: !scanResult.findings.some((f: any) => f.category === 'CLICK_TO_CALL'),
              seoOk: !scanResult.findings.some((f: any) => f.category === 'SEO_NOINDEX'),
            }),
          });
        }
          await jobQueue.updateJobStatus(job.id, { status: 'COMPLETED', finishedAt: new Date().toISOString() });
        break;
      }

      case 'scanBatch':
      case 'sendWebhook':
      case 'sendNotification':
      case 'generatePdf':
      case 'aiAnalysis':
        throw new Error(`Job type ${job.type} is not registered in standalone worker`);
      default:
        throw new Error(`Unknown job type: ${String(job.type)}`);
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    if (job.attempt < job.maxAttempts) {
      console.warn(`[Worker] Job ${job.id} failed attempt ${job.attempt + 1}. Retrying...`);
        await jobQueue.updateJobStatus(job.id, { status: 'QUEUED', attempt: job.attempt + 1, error: errorMsg });
    } else {
      console.error(`[Worker] Job ${job.id} failed permanently. Sending to dead-letter queue.`);
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
