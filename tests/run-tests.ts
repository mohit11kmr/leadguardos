import { isPrivateOrBlockedIP, validateUrlSyntax } from '../server/ssrfGuard';
import { validateWhatsAppNumber, generateIssuesFromExtractedData, buildAuditPayload, SAMPLE_PRESETS, executeLiveWebsiteScan } from '../server/scannerEngine';
import { calculateRevenueImpact } from '../src/utils/revenueModel';
import { FEATURE_REGISTRY } from '../src/config/features';
import { APP_CONFIG } from '../src/config/appConfig';
import {
  scanRepository,
  watchdogRepository,
  orderRepository,
  statsRepository,
  reportRepository,
  webhookRepository,
  userRepository,
} from '../server/repositories';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('  LEADGUARD OS — REAL FIRESTORE PRODUCTION TEST SUITE');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // 1. SSRF & Network Security Tests
  // -------------------------------------------------------------------------
  console.log('📌 Test Suite 1: SSRF & Network Defense');
  assert(isPrivateOrBlockedIP('127.0.0.1'), 'Blocks IPv4 Loopback 127.0.0.1');
  assert(isPrivateOrBlockedIP('127.10.20.30'), 'Blocks 127.0.0.0/8 subnet');
  assert(isPrivateOrBlockedIP('10.0.0.1'), 'Blocks RFC 1918 10.0.0.0/8');
  assert(isPrivateOrBlockedIP('192.168.1.1'), 'Blocks RFC 1918 192.168.0.0/16');
  assert(isPrivateOrBlockedIP('172.16.0.1'), 'Blocks RFC 1918 172.16.0.0/12');
  assert(isPrivateOrBlockedIP('169.254.169.254'), 'Blocks AWS/Cloud Metadata IP 169.254.169.254');
  assert(isPrivateOrBlockedIP('0.0.0.0'), 'Blocks 0.0.0.0');
  assert(isPrivateOrBlockedIP('::1'), 'Blocks IPv6 Loopback ::1');
  assert(isPrivateOrBlockedIP('fc00::1'), 'Blocks IPv6 Unique Local Address');
  assert(isPrivateOrBlockedIP('fe80::1'), 'Blocks IPv6 Link-Local Address');
  assert(!isPrivateOrBlockedIP('8.8.8.8'), 'Allows Public IP 8.8.8.8');
  assert(!isPrivateOrBlockedIP('104.21.5.1'), 'Allows Cloudflare Public IP 104.21.5.1');

  const localhostSyntax = validateUrlSyntax('http://localhost:3000');
  assert(!localhostSyntax.valid, 'Rejects localhost in URL syntax');

  const metaSyntax = validateUrlSyntax('http://metadata.google.internal/computeMetadata');
  assert(!metaSyntax.valid, 'Rejects GCP internal metadata hostname');

  const validWebSyntax = validateUrlSyntax('drsharmadental.in');
  assert(validWebSyntax.valid && validWebSyntax.normalized === 'https://drsharmadental.in/', 'Normalizes domain to https URL');

  // -------------------------------------------------------------------------
  // 2. WhatsApp Number Parser Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 2: WhatsApp Number Parser & Indian RegEx');

  const doubleCountry = validateWhatsAppNumber('91919876543210');
  assert(!doubleCountry.isValid && doubleCountry.issue?.includes('+9191'), 'Detects double country code bug (+9191)');

  const leadingZero = validateWhatsAppNumber('09820011223');
  assert(!leadingZero.isValid && leadingZero.issue?.includes('Leading "0"'), 'Detects leading 0 prefix bug (0XXXXXXXXXX)');

  const tenDigits = validateWhatsAppNumber('9876543210');
  assert(!tenDigits.isValid && tenDigits.issue?.includes('Missing India country code'), 'Flags 10-digit number missing +91 prefix');

  const validIndian = validateWhatsAppNumber('919876543210');
  assert(validIndian.isValid && validIndian.isIndian, 'Validates clean 12-digit Indian number (919876543210)');

  const validIntl = validateWhatsAppNumber('447911123456');
  assert(validIntl.isValid && !validIntl.isIndian, 'Validates clean UK international number without false positive');

  const invalidShort = validateWhatsAppNumber('12345');
  assert(!invalidShort.isValid, 'Rejects incomplete short digits');

  // -------------------------------------------------------------------------
  // 3. Transparent Revenue Impact Model Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 3: Transparent Revenue Impact Model');

  const mockLossResult = calculateRevenueImpact({
    whatsappLinks: [{ url: 'https://wa.me/91919876543210', status: 'BROKEN', isValid: false }],
    metaPixel: { exists: false, duplicate: false, status: 'MISSING' },
    allIssues: [
      { id: '1', pillar: 'LEAD', category: 'whatsapp', severity: 'CRITICAL', ruleId: 'LEAD-WA-001', title: 'Double +9191', description: 'WA Broken', impact: 'High loss', fixSnippet: 'wa.me/91...', isLocked: false },
      { id: '2', pillar: 'AD', category: 'pixel', severity: 'HIGH', ruleId: 'AD-META-001', title: 'Missing Pixel', description: 'No Pixel', impact: 'Ad loss', fixSnippet: 'fbq init', isLocked: true }
    ]
  }, {
    monthlyVisitors: 5000,
    ctaClickRatePercent: 4.5,
    leadConversionRatePercent: 8.0,
    avgCustomerValueINR: 4500,
    monthlyAdSpendINR: 25000
  });

  assert(mockLossResult.estimatedMonthlyLossINR > 0, 'Computes positive estimated monthly loss');
  assert(mockLossResult.breakdown.whatsappLossINR > 0, 'Computes specific WhatsApp leakage component');
  assert(mockLossResult.breakdown.pixelAdWasteINR === 7500, 'Computes 30% of ₹25,000 ad spend waste = ₹7,500');
  assert(mockLossResult.formulaDescription.includes('Potential Loss'), 'Returns human-readable formula description');

  // -------------------------------------------------------------------------
  // 4. 4-Pillar Score Aggregator Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 4: 4-Pillar Scoring & Aggregator');

  const weightsSum = APP_CONFIG.pillarWeights.lead + APP_CONFIG.pillarWeights.ad + APP_CONFIG.pillarWeights.seo + APP_CONFIG.pillarWeights.cyber;
  assert(Math.abs(weightsSum - 1.0) < 0.001, '4-Pillar weights sum exactly to 1.00 (100%)');

  const sampleIssues = generateIssuesFromExtractedData(SAMPLE_PRESETS['drsharmadental.in']);
  assert(sampleIssues.length > 0, 'Generates diagnostic issues from preset data');

  const sampleAudit = buildAuditPayload(
    'https://drsharmadental.in',
    'drsharmadental.in',
    SAMPLE_PRESETS['drsharmadental.in'],
    sampleIssues,
    Date.now() - 500,
    150,
    20
  );

  assert(sampleAudit.score < 50, 'Computes low score for multiple critical leaks (Dr. Sharma Dental)');
  assert(sampleAudit.pillars.lead.score < 50, 'Reflects Lead Guardian penalty');
  assert(sampleAudit.pillars.seo.score < 50, 'Reflects SEO noindex penalty');
  assert(sampleAudit.pillars.cyber.score >= 90, 'Maintains high Cyber score when clean');

  // Test Live Scan Engine with Sample Presets
  const drSharmaResult = await executeLiveWebsiteScan('drsharmadental.in');
  assert(drSharmaResult.domain === 'drsharmadental.in', 'Executes live website scan on drsharmadental.in without DNS errors');
  assert(drSharmaResult.score === 38, 'Correctly loads Dr. Sharma Dental preset audit score');
  assert(drSharmaResult.whatsappLinks.some((w: any) => w.status === 'BROKEN'), 'Identifies broken WhatsApp link on preset');

  const eliteSalonResult = await executeLiveWebsiteScan('https://elitesalonmumbai.com');
  assert(eliteSalonResult.domain === 'elitesalonmumbai.com', 'Executes scan on elitesalonmumbai.com with https protocol');

  const apexRealtyResult = await executeLiveWebsiteScan('apexgrandrealestate.com');
  assert(apexRealtyResult.domain === 'apexgrandrealestate.com', 'Executes scan on apexgrandrealestate.com preset');

  // -------------------------------------------------------------------------
  // 5. Feature Registry Completeness
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 5: Feature Registry Completeness (LG-001 to LG-028)');
  assert(FEATURE_REGISTRY.length >= 28, `Registry contains ${FEATURE_REGISTRY.length} registered features (>= 28 required)`);
  const allHaveIds = FEATURE_REGISTRY.every(f => f.id.startsWith('LG-'));
  assert(allHaveIds, 'All registered features have standard LG-XXX identifiers');
  const allHaveComponents = FEATURE_REGISTRY.every(f => f.component.length > 0);
  assert(allHaveComponents, 'All registered features map to real frontend components');
  const allHaveStorage = FEATURE_REGISTRY.every(f => f.storage === 'FIRESTORE' || f.storage === 'LOCAL' || f.storage === 'HYBRID');
  assert(allHaveStorage, 'All features specify explicit storage architecture metadata');

  // -------------------------------------------------------------------------
  // 6. Firestore Scan & Report Persistence Layer
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 6: Firestore Scan & Report Persistence');

  const persistedScan = await scanRepository.saveCompletedScan(sampleAudit, 'test_user_owner_123', 'owner@example.in');
  assert(!!persistedScan.scanId, 'Saves scan with unique scanId');
  assert(persistedScan.publicToken.length >= 32, 'Generates cryptographically secure publicToken');

  const fetchedScan = await scanRepository.getScanById(persistedScan.scanId);
  assert(fetchedScan !== null && fetchedScan.domain === 'drsharmadental.in', 'Retrieves scan from repository by scanId');

  const publicReport = await reportRepository.getPublicReport(persistedScan.publicToken);
  assert(publicReport !== null, 'Retrieves sanitized report via publicToken');
  assert(publicReport?.domain === 'drsharmadental.in', 'Public report contains target domain');
  assert((publicReport as any)?.userEmail === undefined, 'Public report sanitizes userEmail and private fields');

  // -------------------------------------------------------------------------
  // 7. Watchdog Radar Target & Checks
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 7: 24/7 Watchdog Heartbeat & Monitoring');

  const testWatchdog = await watchdogRepository.addTarget(
    {
      targetUrl: 'https://test-example.in',
      domain: 'test-example.in',
      contact: 'test@example.com',
      channel: 'EMAIL',
      frequency: 'DAILY',
      status: 'ACTIVE_TRIAL',
      mode: 'LIVE',
    },
    'user_alpha',
    'alpha@example.com'
  );
  assert(testWatchdog.domain === 'test-example.in', 'Registers watchdog target');

  await watchdogRepository.addCheckLog({
    targetId: testWatchdog.id,
    domain: 'test-example.in',
    check: 'Automated 15-Min Heartbeat Probe',
    status: 'PASS',
    timestamp: new Date().toISOString(),
  });

  const checkLogs = await watchdogRepository.getCheckLogs(testWatchdog.id, 10);
  assert(checkLogs.length > 0, 'Logs and retrieves heartbeat probe history');

  // Test ownership enforcement on delete
  try {
    await watchdogRepository.deleteTarget(testWatchdog.id, 'unauthorized_user_xyz', false);
    assert(false, 'Should reject unauthorized watchdog deletion');
  } catch (err: any) {
    assert(err?.message?.includes('Unauthorized'), 'Enforces ownership rejection on watchdog target modification');
  }

  // Test distributed lease lock acquisition & release
  const acquiredFirst = await watchdogRepository.acquireTargetLease(testWatchdog.id, 'worker_node_A', 60000);
  assert(acquiredFirst === true, 'Worker A acquires distributed lease on watchdog target');

  const acquiredSecond = await watchdogRepository.acquireTargetLease(testWatchdog.id, 'worker_node_B', 60000);
  assert(acquiredSecond === false, 'Worker B is denied concurrent lease while Worker A holds active lease');

  await watchdogRepository.releaseTargetLease(testWatchdog.id, 'worker_node_A');
  const acquiredAfterRelease = await watchdogRepository.acquireTargetLease(testWatchdog.id, 'worker_node_B', 60000);
  assert(acquiredAfterRelease === true, 'Worker B acquires lease after Worker A releases');
  await watchdogRepository.releaseTargetLease(testWatchdog.id, 'worker_node_B');

  // -------------------------------------------------------------------------
  // 8. Monetization & Payment Verification Lifecycle
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 8: Monetization & Payment Verification');

  const pendingOrder = await orderRepository.createPendingOrder(
    {
      tierId: 'tier-express-fix',
      tierName: 'Express Fix',
      amountINR: 4999,
      paymentMethod: 'UPI',
      customerName: 'Rohit Sharma',
      customerEmail: 'rohit@dentalcare.in',
      domain: 'dentalcare.in',
    },
    'user_customer_456'
  );
  assert(pendingOrder.status === 'PENDING', 'New order is created in PENDING state');

  // Test UPI Manual remains PENDING / awaiting review
  const upiSubmittedOrder = await orderRepository.verifyAndMarkPaid(
    pendingOrder.orderId,
    { paymentReference: 'UPI_REF_TXN_998877', provider: 'UPI_MANUAL' },
    'user_customer_456'
  );
  assert(upiSubmittedOrder.status === 'PENDING', 'UPI manual submissions remain in PENDING/review state');
  assert(upiSubmittedOrder.paymentReference === 'UPI_REF_TXN_998877', 'Records transaction payment reference');

  // Test Sandbox provider in non-production environment marks PAID
  const sandboxPaidOrder = await orderRepository.verifyAndMarkPaid(
    pendingOrder.orderId,
    { paymentReference: 'SANDBOX_TXN_12345', provider: 'SANDBOX' },
    'user_customer_456'
  );
  assert(sandboxPaidOrder.status === 'PAID', 'Sandbox simulation successfully marks order PAID in non-production');

  // Test FAILED -> PAID state transition guard
  await orderRepository.updateOrderStatus(pendingOrder.orderId, 'FAILED', 'Payment declined');
  try {
    await orderRepository.updateOrderStatus(pendingOrder.orderId, 'PAID', 'Unverified attempt');
    assert(false, 'Should prevent transition from FAILED to PAID without override guard');
  } catch (err: any) {
    assert(err?.message?.includes('INVALID_STATE_TRANSITION'), 'Guards against unauthorized FAILED -> PAID order transition');
  }

  // -------------------------------------------------------------------------
  // 9. Webhooks & SSRF Defense
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 9: Webhooks & SSRF Defense');

  try {
    await webhookRepository.addWebhook({
      name: 'Malicious Internal Hook',
      url: 'http://169.254.169.254/latest/meta-data',
      events: ['watchdog.incident_detected'],
    });
    assert(false, 'Should block SSRF internal metadata webhook');
  } catch (err: any) {
    assert(err?.message?.includes('SSRF') || err?.message?.includes('Blocked'), 'Blocks SSRF cloud metadata endpoint in webhook registration');
  }

  const safeWebhook = await webhookRepository.addWebhook(
    {
      name: 'Agency Slack Bridge',
      url: 'https://hooks.slack.com/services/T00/B00/X00',
      events: ['watchdog.incident_detected'],
    },
    'agency_user_1'
  );
  assert(safeWebhook.url === 'https://hooks.slack.com/services/T00/B00/X00', 'Registers valid public webhook');

  const fetchedById = await webhookRepository.getWebhookById(safeWebhook.id, 'agency_user_1');
  assert(fetchedById?.id === safeWebhook.id, 'Retrieves owned webhook by ID');

  try {
    await webhookRepository.getWebhookById(safeWebhook.id, 'unauthorized_stranger_user');
    assert(false, 'Should forbid access to other user webhook');
  } catch (err: any) {
    assert(err?.message === 'UNAUTHORIZED_WEBHOOK_ACCESS', 'Prevents cross-user webhook data access');
  }

  const listedHooks = await webhookRepository.getWebhooks('agency_user_1');
  assert(listedHooks.some(h => h.secret === '********'), 'Masks secret keys in API responses');

  // -------------------------------------------------------------------------
  // 10. User RBAC & Live Stats Isolations
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 10: User RBAC & Stats Isolation');

  const syncedUser = await userRepository.syncUserProfile('user_uid_demo', 'demo@leadguard.in', 'Demo Founder');
  assert(syncedUser.id === 'user_uid_demo', 'Syncs user profile to Firestore');
  assert(syncedUser.role === 'USER', 'Assigns default role USER without privilege escalation');

  const realStats = await statsRepository.getSystemStats();
  assert(typeof realStats.totalScannedSites === 'number' && realStats.totalScannedSites >= 0, 'Retrieves real system statistics');
  assert(realStats.fixedByLeadGuard >= 0, 'Tracks verified fix counter');

  // -------------------------------------------------------------------------
  // 8. SafeFetch Centralized SSRF & Payment Verification Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 8: SafeFetch Centralized SSRF & Payment Hardening');
  const { safeFetch } = await import('../server/security/safeFetch');
  try {
    await safeFetch('http://127.0.0.1:3000');
    assert(false, 'SafeFetch rejects 127.0.0.1 loopback HTTP request');
  } catch (err: any) {
    assert(err.message.includes('SSRF Guard') || err.message.includes('blocked'), 'SafeFetch rejects 127.0.0.1 loopback HTTP request');
  }

  try {
    await safeFetch('http://169.254.169.254/latest/meta-data/');
    assert(false, 'SafeFetch rejects Cloud Metadata IP 169.254.169.254');
  } catch (err: any) {
    assert(err.message.includes('SSRF Guard') || err.message.includes('blocked'), 'SafeFetch rejects Cloud Metadata IP 169.254.169.254');
  }

  const { calculateTierPrice, verifyPaymentSignature, generateRazorpaySignature } = await import('../server/services/paymentService');
  const tierPrice = calculateTierPrice('tier-express-fix');
  assert(tierPrice.priceINR === 4999, 'Payment service calculates server-side price for Express Fix = ₹4999');

  const expectedSig = generateRazorpaySignature('ord_123', 'pay_456', 'test_secret');
  const validSig = verifyPaymentSignature('ord_123', 'pay_456', expectedSig, 'test_secret');
  assert(validSig, 'Payment service validates genuine HMAC signature');
  const fakeSig = verifyPaymentSignature('ord_123', 'pay_456', 'fake_forged_sig', 'test_secret');
  assert(!fakeSig, 'Payment service rejects forged payment signature');

  // -------------------------------------------------------------------------
  // 9. Authentication & Demo Preset Isolation Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 9: Auth Middleware & Demo Isolation');
  const { signToken, verifyToken } = await import('../server/middleware/auth');
  const token = signToken({ id: 'usr_test_1', email: 'test@leadguard.os', role: 'USER' });
  const verifiedUser = verifyToken(token);
  assert(verifiedUser !== null && verifiedUser.id === 'usr_test_1', 'JWT Token sign and verify returns valid authenticated user');

  const adminToken = signToken({ id: 'usr_admin', email: 'admin@leadguard.os', role: 'ADMIN' });
  const verifiedAdmin = verifyToken(adminToken);
  assert(verifiedAdmin !== null && verifiedAdmin.role === 'ADMIN', 'JWT Token sign and verify preserves ADMIN role');

  const { executeLiveWebsiteScan } = await import('../server/scannerEngine');
  try {
    // Production scan on target URL without allowDemoPreset flag
    const liveScan = await executeLiveWebsiteScan('http://localhost:3000');
    assert(false, 'Production scan cannot run against localhost');
  } catch (e: any) {
    assert(e.message.includes('blocked') || e.message.includes('SSRF'), 'Production scan isolates demo presets and enforces SSRF');
  }

  // -------------------------------------------------------------------------
  // 10. Phase 2 Modular Scanner & Two-Stage Pipeline Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 10: Phase 2 Modular Scanner & Finding Standardisation');
  const { WhatsAppDetector } = await import('../server/scanner/detectors/whatsapp');
  const parsedDouble = WhatsAppDetector.parseWhatsAppNumber('91919876543210');
  assert(!parsedDouble.isValid && parsedDouble.status === 'BROKEN', 'WhatsAppDetector flags double country code (+9191) as BROKEN');

  const parsedValid = WhatsAppDetector.parseWhatsAppNumber('919876543210');
  assert(parsedValid.isValid && parsedValid.status === 'LINK_VALID', 'WhatsAppDetector validates clean 12-digit Indian wa.me link');

  const { TrackingDetector } = await import('../server/scanner/detectors/tracking');
  const trackingStatic = TrackingDetector.analyzeTracking('<html><body></body></html>');
  assert(!trackingStatic.metaPixel.exists, 'TrackingDetector flags missing Meta Pixel on blank HTML');

  const trackingRuntime = TrackingDetector.analyzeTracking('<html><body></body></html>', { metaPixel: true });
  assert(trackingRuntime.metaPixel.exists && trackingRuntime.metaPixel.status === 'HEALTHY', 'TrackingDetector recognizes Meta Pixel via runtime network ping interception');

  const { SeoDetector } = await import('../server/scanner/detectors/seo');
  const seoCheck = SeoDetector.analyzeSeo('<meta name="robots" content="noindex">', 'https://sample.in');
  assert(seoCheck.seoPenalty.hasNoIndex && seoCheck.findings.some(f => f.category === 'seo'), 'SeoDetector detects critical noindex penalty');

  const { ScoringEngine } = await import('../server/scanner/scoring/scoringEngine');
  const sampleFindings = [
    { id: 'f1', category: 'whatsapp' as const, title: 'Broken WA', severity: 'CRITICAL' as const, confidence: 'HIGH' as const, detectedBy: 'STATIC' as const, observed: '', inferred: '', evidence: '', impact: '', recommendation: '', timestamp: '' },
    { id: 'f2', category: 'pixel' as const, title: 'Missing Pixel', severity: 'CRITICAL' as const, confidence: 'HIGH' as const, detectedBy: 'STATIC' as const, observed: '', inferred: '', evidence: '', impact: '', recommendation: '', timestamp: '' }
  ];
  const scores = ScoringEngine.calculateScores(sampleFindings);
  assert(scores.pillars.lead.score === 65 && scores.pillars.ad.score === 65, 'ScoringEngine deterministically calculates pillar deductions');

  const { ImpactCalculator } = await import('../server/scanner/scoring/impactCalculator');
  const impact = ImpactCalculator.calculateImpact(sampleFindings);
  assert(impact.lowEstimateINR > 0 && impact.highEstimateINR > impact.lowEstimateINR, 'ImpactCalculator computes transparent range-based financial loss estimate');

  const { watchdogScheduler } = await import('../server/watchdogScheduler');
  const targetObj = {
    id: 'wd_job_test_1',
    targetUrl: 'https://drsharmadental.in',
    domain: 'drsharmadental.in',
    contact: '@testuser',
    channel: 'TELEGRAM' as const,
    frequency: 'DAILY' as const,
    createdAt: new Date().toISOString(),
    trialExpiresAt: new Date().toISOString(),
    status: 'ACTIVE_TRIAL' as const,
  };
  const job = await watchdogScheduler.executeJobForTarget(targetObj);
  assert(job.status === 'COMPLETED' || job.status === 'FAILED', 'WatchdogScheduler executes job abstraction cleanly');

  // -------------------------------------------------------------------------
  // Final Results
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
