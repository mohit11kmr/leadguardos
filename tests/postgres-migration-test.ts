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
