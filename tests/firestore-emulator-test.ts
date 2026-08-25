/**
 * LeadGuard OS — Firestore Durable-Semantics Integration Suite
 *
 * Runs the REAL production code paths (FirestoreQueueAdapter, transactional
 * idempotency repos, shared rate limiter, durable share registry) against a
 * LIVE Firestore backend — either the Firebase Emulator or a real project.
 *
 * Prerequisites:
 *   1. Java JRE installed (emulator requirement)
 *   2. npx firebase-tools emulators:start --only firestore
 *
 * Run (production-mode semantics against emulator):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_PROJECT_ID=leadguardos-emulator \
 *   NODE_ENV=production STORAGE_MODE=firestore \
 *   npx tsx tests/firestore-emulator-test.ts
 *
 * Against a REAL project instead: set FIREBASE_PROJECT_ID +
 * FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ optional FIRESTORE_DATABASE_ID)
 * WITHOUT FIRESTORE_EMULATOR_HOST.
 */

import path from 'path';

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`  ✅ PASS: ${name}`); passed++; }
  else { console.error(`  ❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`); failed++; }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  LeadGuard OS — Firestore Durable-Semantics Suite');
  console.log('═══════════════════════════════════════════════════════\n');

  const { isFirebaseConfigured } = await import('../server/firebaseAdmin');
  if (!isFirebaseConfigured()) {
    console.error('❌ Firestore backend not reachable.');
    console.error('   Start the emulator first:');
    console.error('     npx firebase-tools emulators:start --only firestore');
    console.error('   Then run this suite with FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 NODE_ENV=production STORAGE_MODE=firestore');
    process.exit(2);
  }
  console.log(`  Backend: ${process.env.FIRESTORE_EMULATOR_HOST ? 'Firestore EMULATOR' : 'REAL Firestore project'} | NODE_ENV=${process.env.NODE_ENV}\n`);

  // ─── 1. Durable Queue (FirestoreQueueAdapter) ──────────────────────────────
  console.log('📌 Section 1: Durable Queue Persistence & Crash Recovery');
  const { jobQueue } = await import('../server/queue/jobQueue');
  // In production mode this MUST be the Firestore adapter
  const isDurable = !(jobQueue as any).jobMap;
  assert(isDurable, 'Production mode uses Firestore-backed queue adapter (not in-memory Map)');

  const job = await jobQueue.enqueue('sendWebhook', { url: 'https://emulator-test.example/hook' }, 'usr_emu_1', 3);
  const fetched = await jobQueue.getJob(job.id);
  assert(!!fetched && fetched.status === 'QUEUED', 'Enqueued job PERSISTS in jobExecutions collection');

  const claimedA = await jobQueue.claimNext('worker-instance-A');
  assert(!!claimedA && claimedA.id === job.id && claimedA.workerId === 'worker-instance-A' && claimedA.status === 'RUNNING', 'Worker A claims job transactionally');

  // Simulate crash: lease expired while RUNNING
  await jobQueue.updateJobStatus(job.id, { leaseExpiresAt: new Date(Date.now() - 60_000).toISOString() });
  const recovered = await jobQueue.claimNext('worker-instance-B');
  assert(
    !!recovered && recovered.id === job.id && recovered.workerId === 'worker-instance-B' &&
    recovered.previousWorkerId === 'worker-instance-A' && (recovered.recoveryCount || 0) >= 1,
    'Expired lease recovered by Worker B with previousWorkerId + recoveryCount'
  );

  await jobQueue.updateJobStatus(job.id, { status: 'COMPLETED', finishedAt: new Date().toISOString(), result: { ok: true } });
  const done = await jobQueue.getJob(job.id);
  assert(done?.status === 'COMPLETED' && done?.result?.ok === true, 'Terminal status + result persisted durably');

  // Dead letter path
  const dl = await jobQueue.enqueue('scanWebsite', { url: 'https://dead.example' }, undefined, 1);
  await jobQueue.markDeadLetter(dl.id, 'permanent failure evidence');
  const dlDoc = await jobQueue.getJob(dl.id);
  assert(dlDoc?.status === 'DEAD_LETTER' && dlDoc?.error === 'permanent failure evidence', 'Dead-letter persisted with reason');

  // ─── 2. Payment Event Idempotency ──────────────────────────────────────────
  console.log('\n📌 Section 2: Payment Event Deduplication');
  const { paymentEventRepository } = await import('../server/repositories/paymentEventRepository');
  const evtHash = `emu-${Date.now()}`;
  const c1 = await paymentEventRepository.claim({ provider: 'razorpay', providerEventId: evtHash, eventType: 'payment.captured', payloadHash: 'ph1' });
  const c2 = await paymentEventRepository.claim({ provider: 'razorpay', providerEventId: evtHash, eventType: 'payment.captured', payloadHash: 'ph1' });
  assert(c1 === true && c2 === false, 'Duplicate provider event rejected via transactional claim');

  // ─── 3. Fulfillment Exactly-Once ───────────────────────────────────────────
  console.log('\n📌 Section 3: Fulfillment Exactly-Once');
  const { fulfillmentRepository } = await import('../server/repositories/fulfillmentRepository');
  const orderId = `ord_emu_${Date.now()}`;
  const f1 = await fulfillmentRepository.claimFulfillment(orderId, 'EXPRESS_FIX', 'usr_emu_9', 'tier-express-fix');
  const f2 = await fulfillmentRepository.claimFulfillment(orderId, 'EXPRESS_FIX', 'usr_emu_9', 'tier-express-fix');
  assert(f1 !== null && f2 === null, 'Second fulfillment claim returns null (exactly-once)');

  // ─── 4. Shared Rate Limiting (cross-instance semantics) ────────────────────
  console.log('\n📌 Section 4: Shared Rate Counter Lives in Firestore');
  const { productionRateLimiter } = await import('../server/security/rateLimiter');
  const mw = productionRateLimiter({ limit: 3, windowMs: 60_000, operation: 'emu-shared' });
  const results: number[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await new Promise<number>((resolve) => {
      const req: any = { ip: `198.51.100.${i % 2 === 0 ? '7' : '7'}`, headers: {} }; // SAME IP both times
      const res: any = { headers: {}, setHeader() {}, status(c: number) { return this; }, json() { resolve(429); } };
      Promise.resolve(mw(req, res, () => resolve(200))).catch(() => resolve(500));
    });
    results.push(r);
  }
  assert(results.filter(r => r === 200).length === 3 && results.filter(r => r === 429).length === 2,
    'Same IP across repeated middleware invocations hits ONE shared global limit (3 pass, then 429)');
  const db = (await import('../server/firebaseAdmin')).getAdminDb();
  const windows = await db.collection('rateLimits').where('key', '>=', 'ip:198.51.100.7').limit(5).get();
  assert(!windows.empty, 'Counter documents exist in rateLimits collection (shared store, not process Map)');

  // ─── 5. Order State Machine Persistence ────────────────────────────────────
  console.log('\n📌 Section 5: Order Repository Durability');
  const { orderRepository } = await import('../server/repositories/orderRepository');
  const ord = await orderRepository.createPendingOrder({ tierId: 'tier-express-fix', orderId: `ord_state_${Date.now()}` }, 'usr_emu_5', 'emu@x.in');
  await orderRepository.bindProviderOrder(ord.orderId, `order_provider_${Date.now()}`);
  const rebound = await orderRepository.getOrderById(ord.orderId, undefined, true);
  assert(!!rebound?.providerOrderId, 'Provider-order binding persists to Firestore');
  let rebindErr: any = null;
  try { await orderRepository.bindProviderOrder(ord.orderId, 'order_other_attempt'); } catch (e) { rebindErr = e; }
  assert(!!rebindErr && String(rebindErr.message).includes('REBIND_REJECTED'), 'Rebinding to different provider order rejected');

  // ─── 6. PDF Metadata Durability ─────────────────────────────────────────────
  console.log('\n📌 Section 6: PDF Metadata Registry');
  const crypto = await import('crypto');
  const { pdfReportRepository } = await import('../server/repositories/pdfReportRepository');
  const pdfId = `pdf_emu_${Date.now()}`;
  await pdfReportRepository.save({
    pdfId, scanId: 'scan_emu_1', userId: 'usr_emu_5',
    storagePath: `reports/usr_emu_5/scan_emu_1/${pdfId}.pdf`,
    contentType: 'application/pdf', sizeBytes: 1024,
    sha256: crypto.createHash('sha256').update('emu-bytes').digest('hex'),
    generatedAt: new Date().toISOString(),
  });
  const meta = await pdfReportRepository.getById(pdfId);
  assert(!!meta && meta.scanId === 'scan_emu_1', 'PDF metadata persists and retrieves from pdfReports collection');

  // ─── 7. Share Link Durability Across "Instances" ────────────────────────────
  console.log('\n📌 Section 7: Public Share Link Survives Instance Loss');
  const { ReportManager } = await import('../server/reports/reportManager');
  const { AuditResult } = await import('../src/types') as any;
  const instanceA = new ReportManager(); // simulates API instance A
  const snap = await instanceA.createShareableSnapshotAsync({
    scanId: 'scan_share_emu', domain: 'share-test.in', score: 70, allIssues: [],
  } as any);
  // Simulate instance B: FRESH manager with empty local cache — must read through to Firestore
  const instanceB = new ReportManager();
  const resolvedB = await instanceB.getSnapshotAsync(snap.token);
  assert(!resolvedB.error && (resolvedB.snapshot as any)?.scanId === 'scan_share_emu',
    'Fresh instance resolves share link from durable store (not process memory)');
  await instanceB.revokeTokenAsync(snap.token);
  const revokedCheck = await instanceB.getSnapshotAsync(snap.token);
  assert(!!revokedCheck.error, 'Revoked link returns error after durability round-trip');

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Suite error:', err); process.exit(1); });
