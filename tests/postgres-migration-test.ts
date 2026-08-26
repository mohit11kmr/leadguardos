/**
 * LeadGuard OS — PostgreSQL Migration Verification Suite
 *
 * Runs against a REAL PostgreSQL database (local dev or staging).
 * Verifies: connection, migrations, auth lifecycle, refresh-token rotation +
 * reuse detection, durable API keys across "restart", and real payment
 * provider signature verification vectors.
 *
 *   npm run test:pg
 */

import path from 'path';

let passed = 0, failed = 0;
function assert(cond: boolean, name: string, detail?: string) {
  if (cond) { console.log(`  ✅ PASS: ${name}`); passed++; }
  else { console.error(`  ❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`); failed++; }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  LeadGuard OS — PostgreSQL Migration Verification');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!process.env.DATABASE_URL) {
    // Load .env for local runs
    try { (await import('dotenv')).config(); } catch { /* noop */ }
  }
  assert(!!process.env.DATABASE_URL, 'DATABASE_URL configured');

  const { prisma, checkDatabaseHealth } = await import('../server/db/prisma');

  // ─── 1. Connection & Migrations ──────────────────────────────────────────────
  console.log('\n📌 Section 1: PostgreSQL Connection & Schema');
  const health = await checkDatabaseHealth();
  assert(health.status === 'OK', `Database reachable (${health.latencyMs}ms)`, health.error);

  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  assert(applied.some(m => m.migration_name.includes('init')), 'Init migration applied');

  const tableCount = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT count(*)::bigint as count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
  assert(Number(tableCount[0]?.count ?? 0) >= 23, `All domain tables present (${tableCount[0]?.count} tables)`);

  // ─── 2. Auth Lifecycle ───────────────────────────────────────────────────────
  console.log('\n📌 Section 2: Authentication (register / login / JWT / rotation)');
  const authService = await import('../server/auth/authService');
  const email = `pgtest_${Date.now()}@leadguard.test`;

  const reg = await authService.register({ email, password: 'S3curePass!2026', displayName: 'PG Test' });
  assert(!!reg.accessToken && !!reg.refreshToken, 'User created; token pair issued');
  const accessDecoded = authService.verifyAccessToken(reg.accessToken);
  assert(!!accessDecoded?.sub, 'Access JWT verifies with minimal claims');
  const dbUser = await prisma.user.findUnique({ where: { email } });
  assert(!!dbUser?.passwordHash && dbUser.passwordHash.startsWith('$2'), 'Password stored as bcrypt hash (never plaintext)');
  assert(dbUser?.passwordHash !== 'S3curePass!2026', 'Plaintext password absent from database');

  let badLoginErr: any = null;
  try { await authService.login(email, 'WrongPassword1!'); } catch (e) { badLoginErr = e; }
  assert(badLoginErr?.message === 'INVALID_CREDENTIALS', 'Wrong password rejected uniformly');

  // Rotation
  const rotated = await authService.rotateRefreshToken(reg.refreshToken);
  assert(!!rotated.accessToken && rotated.refreshToken !== reg.refreshToken, 'Refresh rotation issues NEW tokens');
  const oldRecord = await prisma.refreshToken.findFirst({
    where: { user: { email }, tokenHash: { not: '' } },
    orderBy: { createdAt: 'asc' },
  });
  assert(!!oldRecord?.revokedAt, 'Old refresh token revoked in database');

  // Reuse detection: replaying the OLD token must kill the whole family
  let reuseErr: any = null;
  try { await authService.rotateRefreshToken(reg.refreshToken); } catch (e) { reuseErr = e; }
  assert(reuseErr?.message === 'REFRESH_TOKEN_REUSE_DETECTED', 'Replayed refresh token triggers reuse detection');
  const activeInFamily = await prisma.refreshToken.count({
    where: { familyId: oldRecord!.familyId, revokedAt: null },
  });
  assert(activeInFamily === 0, 'Entire token family revoked after theft detection');

  const meCheck = authService.verifyAccessToken(rotated.accessToken);
  assert(meCheck?.sub === dbUser?.id, 'Rotated access token maps to correct user');

  // ─── 3. Durable API Keys Across Restart ─────────────────────────────────────
  console.log('\n📌 Section 3: API Keys Persist Across Process Restart');
  const { ApiKeyManager } = await import('../server/security/apiKeyManager');
  const { apiKey, record } = await ApiKeyManager.generateApiKeyAsync(dbUser!.id, 'migration-test');
  assert(apiKey.startsWith('lg_live_'), 'API key generated with lg_live_ prefix');

  const storedRow = await prisma.apiKey.findUnique({ where: { keyHash: record.keyHash } });
  assert(!!storedRow, 'API key hash persisted to PostgreSQL');
  const rawLeak = JSON.stringify(storedRow);
  assert(!rawLeak.includes(apiKey), 'Raw API key never stored in database');

  // Simulate process restart: wipe in-memory cache, verify from DB only
  ApiKeyManager.clear();
  const verifiedAfterRestart = await ApiKeyManager.verifyApiKeyAsync(apiKey);
  assert(verifiedAfterRestart?.keyId === record.keyId, 'API key verifies AFTER cache wipe (restart survival)');

  await ApiKeyManager.revokeApiKeyAsync(record.keyId);
  ApiKeyManager.clear();
  const revokedVerify = await ApiKeyManager.verifyApiKeyAsync(apiKey);
  assert(revokedVerify === null, 'Revoked key rejected after restart');

  // ─── 4. Payment Signature Vectors ────────────────────────────────────────────
  console.log('\n📌 Section 4: Stripe / Cashfree Signature Verification');
  const pay = await import('../server/services/paymentService');
  const crypto = await import('crypto');

  const stripeSecret = 'whsec_' + crypto.randomBytes(24).toString('hex');
  const body = JSON.stringify({ id: 'evt_test_1', type: 'payment_intent.succeeded' });
  const ts = Math.floor(Date.now() / 1000);
  const keyMaterial = stripeSecret.slice(6);
  const sig = crypto.createHmac('sha256', keyMaterial).update(`${ts}.${body}`).digest('hex');
  const headerGood = `t=${ts},v1=${sig}`;

  assert(pay.verifyStripeWebhookSignature(body, headerGood, stripeSecret).valid === true, 'Stripe valid signature accepted');
  const tamperedBody = body.replace('succeeded', 'failed');
  assert(pay.verifyStripeWebhookSignature(tamperedBody, headerGood, stripeSecret).reason === 'SIGNATURE_MISMATCH', 'Stripe tampered payload rejected');
  const oldTs = ts - 3600;
  const oldHeader = `t=${oldTs},v1=` + crypto.createHmac('sha256', keyMaterial).update(`${oldTs}.${body}`).digest('hex');
  assert(pay.verifyStripeWebhookSignature(body, oldHeader, stripeSecret).reason === 'TIMESTAMP_OUT_OF_TOLERANCE', 'Stripe replayed event outside tolerance rejected');

  const cashfreeSecret = crypto.randomBytes(32).toString('hex');
  const cfSig = crypto.createHmac('sha256', cashfreeSecret).update(body).digest('base64');
  assert(pay.verifyCashfreeWebhookSignature(body, cfSig, cashfreeSecret) === true, 'Cashfree valid signature accepted');
  assert(pay.verifyCashfreeWebhookSignature(tamperedBody, cfSig, cashfreeSecret) === false, 'Cashfree tampered payload rejected');

  // ─── 4b. Repository fixtures for ownership/queue sections ────────────────────
  const orderRepo = (await import('../server/repositories/orderRepository')).orderRepository;
  const payOrderRow = await orderRepo.createPendingOrder({ tierId: 'tier-express-fix', orderId: `ord_pg_${Date.now()}` }, dbUser!.id, email);
  await orderRepo.bindProviderOrder(payOrderRow.orderId, `order_pg_${Date.now()}`);

  const wdRepo = (await import('../server/repositories/watchdogRepository')).watchdogRepository;
  await wdRepo.addTarget({
    id: 'wd_pg_owned',
    targetUrl: 'https://pg-owned.example.com',
    domain: 'pg-owned.example.com',
    contact: 'owner@x.in', channel: 'EMAIL', frequency: 'DAILY',
    status: 'ACTIVE_TRIAL' as const, mode: 'LIVE',
    userId: dbUser!.id,
    nextCheckAt: new Date(Date.now() + 60_000).toISOString(),
  }, dbUser!.id);

  // ─── 5. Durable Queue on PostgreSQL (SKIP LOCKED) ────────────────────────────
  console.log('\n📌 Section 5: Prisma Queue Adapter — Claim / Recovery / Dead-letter');
  const { pdfRepo } = { pdfRepo: (await import('../server/repositories/pdfReportRepository')).pdfReportRepository };
  const { jobQueue } = await import('../server/queue/jobQueue');
  const isPrismaQueue = !(jobQueue as any).jobMap;
  assert(isPrismaQueue, 'DATABASE_URL set → Prisma-backed queue adapter selected');

  await prisma.jobExecution.deleteMany({});

  const qj = await jobQueue.enqueue('sendWebhook', { url: 'https://pg-test/hook' }, dbUser!.id, 3);
  const qFetched = await jobQueue.getJob(qj.id);
  assert(qFetched?.status === 'QUEUED', 'Job persisted to jobExecutions table');

  const claimA = await jobQueue.claimNext('pg-worker-A');
  assert(claimA?.id === qj.id && claimA.status === 'RUNNING' && claimA.attempt === 1, 'Atomic claim via FOR UPDATE SKIP LOCKED');

  // Simultaneous second worker must NOT get the same job
  await jobQueue.enqueue('sendWebhook', { url: 'https://pg-test/second' }, undefined, 3);
  const claimB = await jobQueue.claimNext('pg-worker-B');
  assert(claimB !== undefined && claimB.id !== qj.id, 'Second worker claims a DIFFERENT job (no double-claim)');

  // Crash recovery
  await jobQueue.updateJobStatus(qj.id, { leaseExpiresAt: new Date(Date.now() - 60_000).toISOString() });
  const recoveredQ = await jobQueue.claimNext('pg-worker-C');
  assert(
    recoveredQ?.id === qj.id && recoveredQ.previousWorkerId === 'pg-worker-A' &&
    (recoveredQ.recoveryCount || 0) >= 1,
    'Expired lease recovered with previousWorkerId + recoveryCount',
  );

  // Durable retry scheduling
  await jobQueue.updateJobStatus(qj.id, {
    status: 'QUEUED',
    nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
    lastError: 'transient',
  });
  const premature = await jobQueue.claimNext('pg-worker-D');
  assert(premature?.id !== qj.id, 'Job with future nextAttemptAt NOT claimable early');

  // Dead letter
  await jobQueue.markDeadLetter(qj.id, 'pg-suite evidence');
  const dlq = await jobQueue.getJob(qj.id);
  assert(dlq?.status === 'DEAD_LETTER' && dlq.deadLetter === true, 'Dead-letter persisted');

  // ─── 6. Ownership enforcement at repository level ─────────────────────────────
  console.log('\n📌 Section 6: Ownership / Authorization');
  let ownershipErr: any = null;
  try {
    await orderRepo.getOrderById(payOrderRow.orderId, 'usr_attacker_other', false);
  } catch (e) { ownershipErr = e; }
  assert(ownershipErr?.message === 'UNAUTHORIZED_ORDER_ACCESS', 'Order access denied for non-owner');

  const wdOwnerErr: any = { message: null };
  try {
    await wdRepo.getTargetById('wd_pg_owned', 'different-user', false);
  } catch (e: any) { wdOwnerErr.message = e?.message; }
  assert(!!wdOwnerErr.message, 'Watchdog access denied for non-owner');

  // ─── 6b. Order / PDF / Share durability ─────────────────────────────────────
  console.log('\n📌 Section 6b: Order Binding, PDF Registry, Share Links');
  await orderRepo.bindProviderOrder(payOrderRow.orderId, payOrderRow.orderId + '_rebind_probe').catch(() => undefined);
  const reboundRow = await prisma.order.findUnique({ where: { id: payOrderRow.orderId } });
  assert(!!reboundRow?.providerOrderId, 'Provider-order binding persists in orders table');

  const cryptoMod = await import('crypto');
  // Create the parent scan first — FK integrity requires it
  const scanRepoPg = (await import('../server/repositories/scanRepository')).scanRepository;
  await scanRepoPg.createScan({
    scanId: 'scan_pg_meta', targetUrl: 'https://pg-meta.example.com',
    domain: 'pg-meta.example.com', score: 88, overallScore: 88,
    status: 'COMPLETED' as any, mode: 'LIVE', userId: dbUser!.id,
  } as any);
  await pdfRepo.save({
    pdfId: `pdf_pg_${Date.now()}`, scanId: 'scan_pg_meta', userId: dbUser!.id,
    storagePath: 'reports/pg/test.pdf', contentType: 'application/pdf',
    sizeBytes: 2048, sha256: cryptoMod.createHash('sha256').update('pg').digest('hex'),
    generatedAt: new Date().toISOString(),
  });
  assert(!!await pdfRepo.getById((await prisma.pdfReport.findFirst({ where: { scanId: 'scan_pg_meta' } }))!.id),
    'PDF metadata persists in pdfReports table');

  const rm = await import('../server/reports/reportManager');
  const instanceA = new rm.ReportManager();
  const snap = await instanceA.createShareableSnapshotAsync({
    scanId: 'scan_share_emu', domain: 'share-test.in', score: 70, allIssues: [],
  } as any);
  const pgShare = await prisma.reportShare.findUnique({ where: { token: snap.token } });
  assert(!!pgShare && pgShare.scanId === 'scan_share_emu', 'Share snapshot persisted in reportShares table');
  const instanceB = new rm.ReportManager();
  const resolvedB = await instanceB.getSnapshotAsync(snap.token);
  assert(!resolvedB.error && (resolvedB.snapshot as any)?.scanId === 'scan_share_emu',
    'Fresh instance resolves share link from PostgreSQL (not process memory)');
  await instanceB.revokeTokenAsync(snap.token);
  const revokedCheck = await instanceB.getSnapshotAsync(snap.token);
  assert(!!revokedCheck.error, 'Revoked share link rejected');

  // ─── 8. Domain Repositories Consolidated in PostgreSQL ────────────────────────
  console.log('\n📌 Section 8: Domain Repositories Consolidated in PostgreSQL');
  // 8.1 ScanRepository
  const testScan = await scanRepoPg.createScan({
    scanId: `scan_test_${Date.now()}`,
    targetUrl: 'https://consolidated.example.com',
    domain: 'consolidated.example.com',
    score: 95,
    overallScore: 95,
    status: 'COMPLETED' as any,
    mode: 'LIVE',
    userId: dbUser!.id,
    pillarScores: { leadGen: 90, adSpend: 95, seo: 100, security: 95 },
  } as any);
  const fetchedScan = await scanRepoPg.getScanById(testScan.scanId);
  assert(fetchedScan?.scanId === testScan.scanId && fetchedScan?.overallScore === 95, 'ScanRepository persists and fetches from PostgreSQL');
  const userScans = await scanRepoPg.getUserScans(dbUser!.id);
  assert(userScans.items.some(s => s.scanId === testScan.scanId), 'ScanRepository getUserScans returns user scans from PostgreSQL');

  // 8.2 WatchdogRepository & Distributed Lease
  const { watchdogRepository } = await import('../server/repositories/watchdogRepository');
  const testWd = await watchdogRepository.addTarget({
    id: `wd_test_${Date.now()}`,
    targetUrl: 'https://consolidated.example.com',
    domain: 'consolidated.example.com',
    channel: 'EMAIL',
    frequency: 'DAILY',
    userId: dbUser!.id,
    status: 'ACTIVE_TRIAL',
  }, dbUser!.id);
  const fetchedWd = await watchdogRepository.getTargetById(testWd.id, dbUser!.id, false);
  assert(fetchedWd?.id === testWd.id, 'WatchdogRepository persists and fetches from PostgreSQL');

  const leaseWorker1 = await watchdogRepository.acquireTargetLease(testWd.id, 'worker_1', 60000);
  assert(leaseWorker1 === true, 'Worker 1 acquires distributed watchdog lease');
  const leaseWorker2 = await watchdogRepository.acquireTargetLease(testWd.id, 'worker_2', 60000);
  assert(leaseWorker2 === false, 'Worker 2 rejected while Worker 1 holds active lease');
  await watchdogRepository.releaseTargetLease(testWd.id, 'worker_1');
  const leaseWorker2AfterRelease = await watchdogRepository.acquireTargetLease(testWd.id, 'worker_2', 60000);
  assert(leaseWorker2AfterRelease === true, 'Worker 2 acquires lease after Worker 1 releases');
  await watchdogRepository.releaseTargetLease(testWd.id, 'worker_2');

  // 8.3 WebhookRepository
  const { webhookRepository } = await import('../server/repositories/webhookRepository');
  const testWh = await webhookRepository.addWebhook({
    id: `whk_test_${Date.now()}`,
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    userId: dbUser!.id,
  }, dbUser!.id);
  const fetchedWh = await webhookRepository.getWebhookById(testWh.id, dbUser!.id);
  assert(fetchedWh?.id === testWh.id, 'WebhookRepository persists and fetches from PostgreSQL');
  const whDelivery = await webhookRepository.logDelivery({
    webhookId: testWh.id,
    url: 'https://example.com/webhook',
    event: 'scan.completed',
    status: 'SENT',
    httpStatus: 200,
  });
  assert(whDelivery.status === 'SENT', 'Webhook delivery logged to PostgreSQL');

  // 8.4 StatsRepository
  const { statsRepository } = await import('../server/repositories/statsRepository');
  await statsRepository.recordScanCompleted(true, false, 3, true);
  await statsRepository.recordFixCompleted();
  const currentStats = await statsRepository.getSystemStats();
  assert(currentStats.totalScannedSites >= 1 && currentStats.problemsFound >= 3, 'StatsRepository updates SystemStats table in PostgreSQL');

  // 8.5 AuditRepository
  const { auditRepository } = await import('../server/repositories/auditRepository');
  await auditRepository.logEvent({
    action: 'ADMIN_ACTION',
    userId: dbUser!.id,
    details: { test: 'consolidation_verification' },
    timestamp: new Date().toISOString(),
  });
  const recentAudit = await auditRepository.getRecentLogs(10, 'ADMIN_ACTION');
  assert(recentAudit.some(l => l.userId === dbUser!.id), 'AuditRepository logs to AuditLog table in PostgreSQL');

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Suite error:', err);
  process.exit(1);
});
