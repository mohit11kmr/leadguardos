/**
 * LeadGuard OS — Durable Queue Load Test (REAL Firestore backend)
 *
 * Runs the production FirestoreQueueAdapter under load. Every enqueue,
 * transactional claim, and status write is a real Firestore round-trip.
 * Works against the Firebase Emulator or a real project.
 *
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=<pid> \
 *   NODE_ENV=production STORAGE_MODE=firestore \
 *   npx tsx tests/queue-load-firestore.ts --jobs=200 --workers=8
 */

const args = process.argv.slice(2).reduce((acc, a) => {
  const [k, v] = a.replace('--', '').split('=');
  acc[k] = v;
  return acc;
}, {} as Record<string, string>);

const TOTAL_JOBS = parseInt(args['jobs'] || '200', 10);
const NUM_WORKERS = parseInt(args['workers'] || '8', 10);

interface Metrics {
  completed: number; deadLettered: number; recovered: number; retried: number;
  execLatencies: number[]; queueWaits: number[];
}

async function main() {
  const { jobQueue } = await import('../server/queue/jobQueue');
  const { RetryPolicy } = await import('../server/queue/retryPolicy');

  if ((jobQueue as any).jobMap) {
    console.error('❌ Not using the Firestore queue adapter. Set NODE_ENV=production STORAGE_MODE=firestore (+ emulator host).');
    process.exit(2);
  }

  console.log(`\n🔥 Durable Queue Load Test — ${TOTAL_JOBS} jobs / ${NUM_WORKERS} workers (real Firestore round-trips)\n`);

  // Enqueue phase
  const t0 = Date.now();
  for (let i = 0; i < TOTAL_JOBS; i++) {
    await jobQueue.enqueue('scanWebsite', { url: `https://load-${i}.example.com`, simulated: true }, 'usr_load', 3);
  }
  const enqueueMs = Date.now() - t0;
  console.log(`⏳ Enqueued ${TOTAL_JOBS} durable jobs in ${enqueueMs}ms (${(TOTAL_JOBS / (enqueueMs / 1000)).toFixed(1)}/sec)`);

  const metrics: Metrics = { completed: 0, deadLettered: 0, recovered: 0, retried: 0, execLatencies: [], queueWaits: [] };
  const start = Date.now();
  let stop = false;

  async function worker(id: string) {
    while (!stop) {
      const job = await jobQueue.claimNext(`load-worker-${id}`);
      if (!job) { await new Promise(r => setTimeout(r, 25)); continue; }
      const tExec = Date.now();
      metrics.queueWaits.push(tExec - new Date(job.createdAt).getTime());
      if ((job.recoveryCount || 0) > 0) metrics.recovered++;

      // Simulated work: tiny sleep + 8% transient failure injection
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 10)));
      try {
        if (Math.random() < 0.08 && (job.attempt || 1) < (job.maxAttempts || 3)) {
          throw new Error('TRANSIENT_EMULATED_TIMEOUT');
        }
        metrics.execLatencies.push(Date.now() - tExec);
        await jobQueue.updateJobStatus(job.id, { status: 'COMPLETED', finishedAt: new Date().toISOString(), result: { ok: true } });
        metrics.completed++;
      } catch (err: any) {
        if (RetryPolicy.shouldRetry(err, job.attempt, job.maxAttempts)) {
          metrics.retried++;
          await jobQueue.updateJobStatus(job.id, {
            status: 'QUEUED', lastError: err.message,
            nextAttemptAt: new Date(Date.now() + 150).toISOString(),
          });
        } else {
          metrics.deadLettered++;
          await jobQueue.markDeadLetter(job.id, err.message);
        }
      }
    }
  }

  const deadline = start + 240_000; // 4 min cap
  const monitor = setInterval(() => {
    const done = metrics.completed + metrics.deadLettered;
    process.stdout.write(`\r  progress: ${done}/${TOTAL_JOBS} completed=${metrics.completed} retried=${metrics.retried} dlq=${metrics.deadLettered}`);
    if (done >= TOTAL_JOBS || Date.now() > deadline) stop = true;
  }, 500);

  await Promise.all(Array.from({ length: NUM_WORKERS }, (_, i) => worker(String(i))));
  clearInterval(monitor);

  const totalMs = Date.now() - start;
  const pct = (arr: number[], p: number) => arr.length ? [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.ceil(p / 100 * arr.length) - 1)] : 0;

  console.log('\n\n═══════════════ REAL BACKEND RESULTS ═══════════════');
  console.log(`  Total wall time:     ${(totalMs / 1000).toFixed(2)}s`);
  console.log(`  Throughput:          ${(metrics.completed / (totalMs / 1000)).toFixed(1)} jobs/sec (incl. Firestore latency)`);
  console.log(`  Completed:           ${metrics.completed}/${TOTAL_JOBS}`);
  console.log(`  Retried:             ${metrics.retried} | Dead-lettered: ${metrics.deadLettered} | Crash-recovered: ${metrics.recovered}`);
  console.log(`  Exec latency  P50/P95/P99: ${pct(metrics.execLatencies, 50)} / ${pct(metrics.execLatencies, 95)} / ${pct(metrics.execLatencies, 99)} ms`);
  console.log(`  Queue wait    P50/P95/P99: ${pct(metrics.queueWaits, 50)} / ${pct(metrics.queueWaits, 95)} / ${pct(metrics.queueWaits, 99)} ms`);
  const dailyCapacity = Math.round(metrics.completed / (totalMs / 1000) * 86400);
  console.log(`  Measured daily capacity @ this worker count: ~${dailyCapacity.toLocaleString()} jobs/day`);
  console.log(`  → 100k/month requires ≥ ${(100000 / 30).toLocaleString()}/day: ${dailyCapacity >= Math.ceil(100000 / 30) ? '✅ SUFFICIENT' : '⚠️ SCALE OUT WORKERS'}`);
  console.log('════════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
