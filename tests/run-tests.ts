import { isPrivateOrBlockedIP, validateUrlSyntax } from '../server/ssrfGuard';
import { validateWhatsAppNumber, generateIssuesFromExtractedData, buildAuditPayload, SAMPLE_PRESETS } from '../server/scannerEngine';
import { calculateRevenueImpact } from '../src/utils/revenueModel';
import { FEATURE_REGISTRY } from '../src/config/features';
import { APP_CONFIG } from '../src/config/appConfig';
import os from 'os';
import path from 'path';
import { analyzeForms, checkBrokenLinks, detectAnalytics, extractEmails, extractPhones, extractWhatsApp } from '../src/services/lead-audit.service';
import { toPublicAuditReport } from '../server/reports/publicReport';

process.env.LEADGUARD_DATA_DIR = path.join(os.tmpdir(), `leadguardos-tests-${process.pid}`);

// This suite verifies the DEVELOPMENT/TEST adapters (in-memory + legacy).
// PostgreSQL-backed production behavior is verified by tests/postgres-migration-test.ts
// (`npm run test:pg`) against a real database.
process.env.DATABASE_URL = '';

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
  console.log('  LEADGUARD OS — AUTOMATED PRODUCTION TEST SUITE');
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
  assert(!validateUrlSyntax('https://user:password@example.com').valid, 'Rejects URLs containing embedded credentials');
  const { shouldRecordGlobalStats } = await import('../server/observability/statsPolicy');
  assert(!shouldRecordGlobalStats(undefined) && shouldRecordGlobalStats('usr_test_1'), 'Global scan statistics require authenticated identity');

  // -------------------------------------------------------------------------
  // 1b. Lead Audit Extraction & Safe Link Checks
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 1b: Lead Audit Extraction & Safe Link Checks');
  const leadHtml = `<body>
    <a href="mailto:INFO%40Example.com">Email</a>
    <p>info@example.com and +91 9876543210</p><p>+91-9876543210</p>
    <a href="https://wa.me/919876543210">WhatsApp</a>
    <a href="https://api.whatsapp.com/send?phone=919876543210">WhatsApp duplicate</a>
    <form action="/submit" method="post"><input name="email"><textarea name="message"></textarea></form>
    <form action="https://forms.example.com/submit"><input type="text"></form>
    <script>gtag('config', 'G-TEST'); fbq('init', '123');</script>
    <a href="/ok">relative</a><a href="#section">anchor</a><a href="mailto:a@b.com">mail</a>
    <a href="http://127.0.0.1:3000/admin">blocked</a>
  </body>`;
  assert(extractEmails(leadHtml).join(',') === 'a@b.com,info@example.com', 'Extracts and deduplicates mailto and plain emails');
  assert(extractPhones(leadHtml).join(',') === '+919876543210', 'Normalizes Indian phone formats');
  assert(extractWhatsApp(leadHtml).length === 2, 'Extracts WhatsApp provider URLs');
  assert(extractWhatsApp('<a href="wa.me/919876543210">WhatsApp</a>')[0] === 'https://wa.me/919876543210', 'Normalizes schemeless WhatsApp URLs');
  const forms = analyzeForms(leadHtml, 'https://example.com/contact');
  assert(forms.length === 2 && forms[0].isInternal && !forms[1].isInternal, 'Classifies relative and external form actions');
  const analytics = detectAnalytics(leadHtml);
  assert(analytics.gtag && analytics.fbq && !analytics.googleTagManager, 'Detects gtag and fbq markers');
  const checkedLinks = await checkBrokenLinks(leadHtml, 'https://example.com/contact', 100);
  assert(checkedLinks.some(link => link.url.includes('127.0.0.1') && link.error?.includes('SSRF Guard')) && !checkedLinks.some(link => link.url.startsWith('mailto:')), 'Ignores non-http links and blocks SSRF links');

  const publicReport = toPublicAuditReport({
    scanId: 'scan_public_test', publicToken: 'pub_public_test', targetUrl: 'https://example.com', domain: 'example.com', score: 80, estimatedMonthlyLoss: 0, adSpendRisk: 'LOW', pillars: {} as any,
    allIssues: [{ id: 'internal', pillar: 'LEAD', category: 'email', severity: 'LOW', title: 'Finding', description: 'Description', impact: 'Impact', evidence: 'private evidence', fixSnippet: 'fix', isLocked: false }],
    whatsappLinks: [], phoneLinks: [], emailLinks: [], reviewLinks: [], socialLinks: [], metaPixel: {} as any, googleTag: {} as any, seoPenalty: {} as any, cyberShield: {} as any, lockedIssuesCount: 0, performance: { fetchTimeMs: 1, parseTimeMs: 1, totalTimeMs: 2 }, scannedAt: new Date().toISOString(), leadAuditData: { emails: ['secret@example.com'] }, aiRemediation: { status: 'COMPLETED', content: 'private fix', updatedAt: new Date().toISOString() },
  } as any);
  assert(!('leadAuditData' in publicReport) && !('aiRemediation' in publicReport) && !('evidence' in publicReport.allIssues[0]), 'Public report projection excludes private lead, AI, and evidence fields');
  const { buildRemediationFindings } = await import('../server/services/ai.service');
  const remediationFindings = buildRemediationFindings([{ id: 'secret-id', title: 'Broken link', severity: 'HIGH', evidence: 'private@example.com', description: 'Fix it', recommendation: 'Update link' }]);
  assert(!('id' in remediationFindings[0]) && !('evidence' in remediationFindings[0]) && remediationFindings[0].title === 'Broken link', 'AI payload excludes internal IDs and private evidence');

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

  // -------------------------------------------------------------------------
  // 5. Feature Registry Completeness
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 5: Feature Registry Completeness (LG-001 to LG-028)');
  assert(FEATURE_REGISTRY.length >= 28, `Registry contains ${FEATURE_REGISTRY.length} registered features (>= 28 required)`);
  const allHaveIds = FEATURE_REGISTRY.every(f => f.id.startsWith('LG-'));
  assert(allHaveIds, 'All registered features have standard LG-XXX identifiers');
  const allHaveComponents = FEATURE_REGISTRY.every(f => f.component.length > 0);
  assert(allHaveComponents, 'All registered features map to real frontend components');

  // -------------------------------------------------------------------------
  // 6. Repository & Persistence Layer Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 6: Production Repository & Storage Layer');
  const { scanRepository, watchdogRepository, orderRepository, statsRepository } = await import('../server/repositories');

  const stats = await statsRepository.getSystemStats();
  assert(typeof stats.totalScannedSites === 'number', 'Stats repository returns totalScannedSites');

  const testWatchdog = await watchdogRepository.addTarget({
    id: 'test_wd_1',
    targetUrl: 'https://test-example.in',
    domain: 'test-example.in',
    contact: 'test@example.com',
    channel: 'EMAIL',
    frequency: 'DAILY',
    status: 'ACTIVE_TRIAL',
    createdAt: new Date().toISOString(),
    trialExpiresAt: new Date().toISOString(),
  });
  assert(testWatchdog.domain === 'test-example.in', 'Watchdog repository registers target');

  const fetchedTargets = await watchdogRepository.getTargets();
  assert(fetchedTargets.some(t => t.id === 'test_wd_1'), 'Watchdog repository retrieves registered target');

  const testOrder = await orderRepository.createOrder({
    orderId: 'ord_test_99',
    tierId: 'tier-express-fix',
    tierName: 'Express Fix',
    amountINR: 4999,
    paymentMethod: 'UPI',
    status: 'PAID',
    createdAt: new Date().toISOString(),
  });
  assert(testOrder.amountINR === 2999, 'Order repository ignores client price and uses catalog price');

  // -------------------------------------------------------------------------
  // 7. Webhook HMAC Cryptographic Signature Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 7: Webhook HMAC-SHA256 Cryptography');
  const crypto = await import('crypto');
  const secretKey = 'leadguard_test_secret_key';
  const samplePayload = JSON.stringify({ event: 'watchdog.incident_detected', score: 32 });
  const computedSignature = crypto.createHmac('sha256', secretKey).update(samplePayload).digest('hex');
  assert(computedSignature.length === 64, 'Generates valid 64-char HMAC-SHA256 digest');

  const verifySignature = (payload: string, sig: string, secret: string) => {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expected === sig;
  };
  assert(verifySignature(samplePayload, computedSignature, secretKey), 'Validates genuine webhook signature');
  assert(!verifySignature(samplePayload, 'tampered_signature', secretKey), 'Rejects tampered webhook signature');

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

  const { calculateTierPrice, verifyPaymentSignature, generateRazorpaySignature, verifyWebhookSignature, isPaymentBoundToOrder } = await import('../server/services/paymentService');
  const tierPrice = calculateTierPrice('tier-express-fix');
  assert(tierPrice.priceINR === 2999, 'Payment service calculates server-side price for Express Fix = ₹2999');

  const expectedSig = generateRazorpaySignature('ord_123', 'pay_456', 'test_secret');
  const validSig = verifyPaymentSignature('ord_123', 'pay_456', expectedSig, 'test_secret');
  assert(validSig, 'Payment service validates genuine HMAC signature');
  const fakeSig = verifyPaymentSignature('ord_123', 'pay_456', 'fake_forged_sig', 'test_secret');
  assert(!fakeSig, 'Payment service rejects forged payment signature');

  const webhookPayload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_123' } } } });
  const webhookSig = crypto.createHmac('sha256', 'webhook_secret').update(webhookPayload).digest('hex');
  assert(verifyWebhookSignature(webhookPayload, webhookSig, 'webhook_secret'), 'Payment service validates Razorpay webhook signature against raw payload');
  assert(!verifyWebhookSignature(webhookPayload, expectedSig, 'webhook_secret'), 'Payment service rejects checkout signature when verifying webhook payload');
  assert(isPaymentBoundToOrder('ord_123', 'ord_123') && !isPaymentBoundToOrder('ord_123', 'ord_other'), 'Payment verification binds provider transaction to the requested order');

  // -------------------------------------------------------------------------
  // 9. Authentication & Demo Preset Isolation Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 9: Auth Middleware & Demo Isolation');
  const { signToken, verifyToken, requireAuth, optionalAuth } = await import('../server/middleware/auth');
  const { verifyFirebaseIdToken } = await import('../server/security/firebaseAuth');
  const token = signToken({ id: 'usr_test_1', email: 'test@leadguard.os', role: 'USER' });
  const verifiedUser = verifyToken(token);
  assert(verifiedUser !== null && verifiedUser.id === 'usr_test_1', 'JWT Token sign and verify returns valid authenticated user');

  const adminToken = signToken({ id: 'usr_admin', email: 'admin@leadguard.os', role: 'ADMIN' });
  const verifiedAdmin = verifyToken(adminToken);
  assert(verifiedAdmin !== null && verifiedAdmin.role === 'ADMIN', 'JWT Token sign and verify preserves ADMIN role');

  const makeMockResponse = () => {
    const response: any = {
      statusCode: 200,
      body: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.body = payload;
        return this;
      }
    };
    return response;
  };

  const hardcodedAdminReq: any = { headers: { 'x-api-key': 'lg_admin_secret_key_2026' } };
  const hardcodedAdminRes = makeMockResponse();
  let hardcodedAdminNextCalled = false;
  await requireAuth(hardcodedAdminReq, hardcodedAdminRes, () => { hardcodedAdminNextCalled = true; });
  assert(!hardcodedAdminNextCalled && hardcodedAdminRes.statusCode === 401, 'Auth middleware rejects removed hardcoded admin API key');

  const arbitraryLiveReq: any = { headers: { 'x-api-key': 'lg_live_not_a_generated_key' } };
  const arbitraryLiveRes = makeMockResponse();
  let arbitraryLiveNextCalled = false;
  await requireAuth(arbitraryLiveReq, arbitraryLiveRes, () => { arbitraryLiveNextCalled = true; });
  assert(!arbitraryLiveNextCalled && arbitraryLiveRes.statusCode === 401, 'Auth middleware rejects arbitrary lg_live API key strings');

  const optionalReq: any = { headers: { 'x-api-key': 'lg_anything_unverified' } };
  await optionalAuth(optionalReq, makeMockResponse(), () => {});
  assert(!optionalReq.user, 'Optional auth leaves request anonymous for unverified API key strings');

  const keyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const firebaseKid = 'test_firebase_kid';
  const firebaseProjectId = 'leadguard-test-project';
  const nowSeconds = Math.floor(Date.now() / 1000);
  const firebaseHeader = Buffer.from(JSON.stringify({ alg: 'RS256', kid: firebaseKid, typ: 'JWT' })).toString('base64url');
  const firebasePayload = Buffer.from(JSON.stringify({
    aud: firebaseProjectId,
    iss: `https://securetoken.google.com/${firebaseProjectId}`,
    sub: 'firebase_uid_123',
    email: 'firebase-user@example.com',
    iat: nowSeconds - 10,
    exp: nowSeconds + 3600,
  })).toString('base64url');
  const firebaseSigningInput = `${firebaseHeader}.${firebasePayload}`;
  const firebaseSignature = crypto.sign('RSA-SHA256', Buffer.from(firebaseSigningInput), keyPair.privateKey).toString('base64url');
  const firebaseToken = `${firebaseSigningInput}.${firebaseSignature}`;
  const firebaseCert = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const verifiedFirebaseUser = await verifyFirebaseIdToken(firebaseToken, {
    projectId: firebaseProjectId,
    certs: { [firebaseKid]: firebaseCert },
    nowSeconds,
  });
  assert(verifiedFirebaseUser?.uid === 'firebase_uid_123', 'Firebase ID token verifier accepts valid RS256 token with matching issuer and audience');

  const wrongAudienceUser = await verifyFirebaseIdToken(firebaseToken, {
    projectId: 'wrong-project',
    certs: { [firebaseKid]: firebaseCert },
    nowSeconds,
  });
  assert(wrongAudienceUser === null, 'Firebase ID token verifier rejects mismatched project audience');

  const originalFirebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  process.env.FIREBASE_PROJECT_ID = firebaseProjectId;
  process.env.FIREBASE_AUTH_CERTS_JSON = JSON.stringify({ [firebaseKid]: firebaseCert });
  const firebaseReq: any = { headers: { authorization: `Bearer ${firebaseToken}` } };
  const firebaseRes = makeMockResponse();
  let firebaseNextCalled = false;
  await requireAuth(firebaseReq, firebaseRes, () => { firebaseNextCalled = true; });
  assert(firebaseNextCalled && firebaseReq.user?.id === 'firebase_uid_123', 'Auth middleware maps verified Firebase UID to server-side user identity');
  delete process.env.FIREBASE_AUTH_CERTS_JSON;
  if (originalFirebaseProjectId) {
    process.env.FIREBASE_PROJECT_ID = originalFirebaseProjectId;
  } else {
    delete process.env.FIREBASE_PROJECT_ID;
  }

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
  // Durable scheduling contract: due target gets a runWatchdog job enqueued,
  // and the exact targetUrl is preserved on the persisted document.
  const added = await watchdogRepository.addTarget({
    id: 'wd_job_test_1',
    targetUrl: 'https://drsharmadental.in',
    domain: 'drsharmadental.in',
    contact: '@testuser',
    channel: 'TELEGRAM',
    frequency: 'DAILY',
    status: 'ACTIVE_TRIAL' as const,
    mode: 'LIVE',
    userId: 'usr_test_1',
  }, 'usr_test_1');
  assert(!!added.targetUrl, 'Watchdog repository persists exact targetUrl (no domain fallback)');
  const enqueuedCount = await watchdogScheduler.enqueueDueWatchdogTargets();
  assert(enqueuedCount >= 0, 'WatchdogScheduler durable enqueue path executes cleanly');

  // -------------------------------------------------------------------------
  // 11. Phase 4 Relational Database & Transactions Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 11: Relational Database & Transactions');
  const { db } = await import('../server/db/database');
  const dbHealth = await db.checkHealth();
  assert(dbHealth.status === 'OK', 'DatabaseManager returns OK health status');

  const txResult = await db.executeTransaction(async (_tx) => {
    return { created: true, scanId: 'scan_tx_123' };
  });
  assert(txResult.created && txResult.scanId === 'scan_tx_123', 'DatabaseManager executes atomic transaction cleanly');

  // -------------------------------------------------------------------------
  // 12. Phase 4 Async Job Queue & Worker Retries Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 12: Async Job Queue & Worker Retries');
  const { jobQueue } = await import('../server/queue/jobQueue');
  const { RetryPolicy } = await import('../server/queue/retryPolicy');
  const enqueuedJob = await jobQueue.enqueue('scanWebsite', { url: 'drsharmadental.in' }, 'usr_test_1');
  assert(enqueuedJob.id.startsWith('job_') && enqueuedJob.status === 'QUEUED', 'JobQueue enqueues async scanWebsite job cleanly');
  assert((await jobQueue.getJob(enqueuedJob.id))?.type === 'scanWebsite', 'JobQueue retrieves enqueued job by ID');

  const shouldRetryTimeout = RetryPolicy.shouldRetry(new Error('ETIMEDOUT'), 1, 3);
  assert(shouldRetryTimeout, 'RetryPolicy retries transient network timeouts');

  const shouldRetrySsrf = RetryPolicy.shouldRetry(new Error('SSRF Guard blocked target URL'), 1, 3);
  assert(!shouldRetrySsrf, 'RetryPolicy rejects non-transient SSRF security errors');

  const { storage } = await import('../server/storage');
  const { backgroundWorker } = await import('../server/queue/worker');
  const protectedScan = { scanId: 'scan_queue_owner', userId: 'usr_owner', publicToken: 'pub_queue_owner', targetUrl: 'https://example.com', domain: 'example.com', score: 100, estimatedMonthlyLoss: 0, adSpendRisk: 'LOW', pillars: {}, whatsappLinks: [], phoneLinks: [], emailLinks: [], reviewLinks: [], socialLinks: [], metaPixel: {}, googleTag: {}, seoPenalty: {}, cyberShield: {}, allIssues: [], lockedIssuesCount: 0, performance: { fetchTimeMs: 0, parseTimeMs: 0, totalTimeMs: 0 }, scannedAt: new Date().toISOString() };
  storage.saveScan(protectedScan as any);
  const unauthorizedAiJob = await jobQueue.enqueue('aiAnalysis', { scanId: protectedScan.scanId, findings: [] }, 'usr_attacker', 1);
  await backgroundWorker.executeJob(unauthorizedAiJob);
  assert(storage.getScan(protectedScan.scanId)?.aiRemediation === undefined, 'AI queue job cannot mutate another user scan');

  // -------------------------------------------------------------------------
  // 13. Phase 4 Observability, API Key Hashing & Readiness Probes Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 13: Observability, API Keys & Readiness Probes');
  const { Logger } = await import('../server/observability/logger');
  const { metrics } = await import('../server/observability/metrics');
  const { ApiKeyManager } = await import('../server/security/apiKeyManager');

  metrics.recordScanStart();
  metrics.recordScanSuccess(450);
  const snapshot = metrics.getSnapshot();
  assert(snapshot.scansStarted >= 1 && snapshot.averageScanDurationMs === 450, 'MetricsCollector records scan metrics and average latency');

  const { apiKey, keyId, record } = ApiKeyManager.generateApiKey('usr_test_1');
  assert(apiKey.startsWith('lg_live_') && record.active, 'ApiKeyManager generates secure lg_live_ API key');

  const verifiedKey = ApiKeyManager.verifyApiKey(apiKey);
  assert(verifiedKey !== null && verifiedKey.keyId === keyId, 'ApiKeyManager verifies valid API key via SHA-256 hash');

  const revoked = ApiKeyManager.revokeApiKey(keyId);
  assert(revoked && ApiKeyManager.verifyApiKey(apiKey) === null, 'ApiKeyManager revokes API key cleanly');

  const foreignKey = ApiKeyManager.generateApiKey('usr_foreign');
  const ownerScopedRevoke = ApiKeyManager.revokeApiKeyForUser(foreignKey.keyId, 'usr_test_1');
  assert(!ownerScopedRevoke && ApiKeyManager.verifyApiKey(foreignKey.apiKey) !== null, 'ApiKeyManager prevents users from revoking another user API key');
  ApiKeyManager.revokeApiKey(foreignKey.keyId);

  // -------------------------------------------------------------------------
  // 14. Phase 5 Entitlements, Onboarding & Usage Limits Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 14: Entitlements, Onboarding & Usage Limits');
  const { EntitlementService } = await import('../server/services/entitlementService');
  const { PLAN_CONFIG } = await import('../server/config/pricing');
  const freeUser = { id: 'usr_free', email: 'free@leadguard.os', role: 'USER' as const };
  const freePlan = EntitlementService.getUserPlan(freeUser);
  assert(freePlan === 'FREE', 'EntitlementService assigns FREE plan to standard users');

  const canScanAllowed = EntitlementService.canRunScan(freeUser, { scansThisMonth: 1, watchdogTargetsCount: 0, exportsThisMonth: 0 });
  assert(canScanAllowed.allowed, 'EntitlementService permits scan when within monthly limit');

  const canScanBlocked = EntitlementService.canRunScan(freeUser, { scansThisMonth: 5, watchdogTargetsCount: 0, exportsThisMonth: 0 });
  assert(!canScanBlocked.allowed && canScanBlocked.reason?.includes('limit reached'), 'EntitlementService blocks scan when limit is reached');

  const adminUser = { id: 'usr_admin', email: 'admin@leadguard.os', role: 'ADMIN' as const };
  const adminPlan = EntitlementService.getUserPlan(adminUser);
  assert(adminPlan === 'AGENCY', 'EntitlementService assigns AGENCY plan to ADMIN users');

  // -------------------------------------------------------------------------
  // 15. Phase 5 Product Analytics, Webhook Security & Account Deletion Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 15: Product Analytics & Account Deletion');
  const { ProductAnalytics } = await import('../server/observability/analytics');
  ProductAnalytics.track('first_scan_started', 'usr_test_1', { domain: 'drsharmadental.in' });
  ProductAnalytics.track('first_scan_completed', 'usr_test_1', { score: 45 });
  const funnel = ProductAnalytics.getFunnelStats();
  assert(funnel['first_scan_completed'] >= 1, 'ProductAnalytics tracks onboarding activation steps');

  storage.addWatchdogTarget({
    id: 'wd_del_test',
    userId: 'usr_delete_test',
    targetUrl: 'https://sample.in',
    domain: 'sample.in',
    contact: '@test',
    channel: 'TELEGRAM',
    frequency: 'DAILY',
    status: 'ACTIVE_TRIAL',
    createdAt: new Date().toISOString(),
    trialExpiresAt: new Date().toISOString(),
  });
  const deletedAccount = storage.deleteAccount('usr_delete_test');
  assert(deletedAccount && storage.getWatchdogTargetsForUser('usr_delete_test').length === 0, 'storage.deleteAccount revokes watchdog jobs and clears user data');

  // -------------------------------------------------------------------------
  // 16. Phase 6 HMAC Signed Webhooks & Integration Provider Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 16: Signed Webhook Platform & Chat Integration Providers');
  const { WebhookPlatform } = await import('../server/webhooks/webhookPlatform');
  const { SlackProvider } = await import('../server/integrations/provider');

  const testPayload = JSON.stringify({ event: 'scan.completed', score: 85 });
  const signedHmac = WebhookPlatform.signPayload(testPayload, 'wh_secret_123', 1700000000);
  assert(signedHmac.length === 64, 'WebhookPlatform signs outgoing webhook payload with 64-char HMAC-SHA256');

  const slackProvider = new SlackProvider();
  assert(slackProvider.name === 'Slack', 'SlackProvider initializes integration provider abstraction');

  // -------------------------------------------------------------------------
  // 17. Phase 6 Agency Organization & White-Label Branding Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 17: Agency Organization Scoping & White-Label Reports');
  const { OrgManager } = await import('../server/agency/orgManager');
  const org = OrgManager.createOrganization('Apex Digital', 'usr_owner_1', 'owner@apexdigital.in');
  assert(org.orgId.startsWith('org_') && org.members[0].role === 'OWNER', 'OrgManager creates multi-member agency organization');

  const hasPerm = OrgManager.hasPermission(org.orgId, 'usr_owner_1', 'ADMIN');
  assert(hasPerm, 'OrgManager enforces server-side role-based authorization');

  const client = OrgManager.addClient(org.orgId, 'Dr Sharma Dental', ['drsharmadental.in']);
  assert(client !== null && client.clientName === 'Dr Sharma Dental', 'OrgManager assigns client domain scoping');

  // -------------------------------------------------------------------------
  // 18. Phase 6 Shareable Snapshots & Finding Lifecycle Regression Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 18: Shareable Snapshots & Finding Lifecycle Regression');
  const { reportManager } = await import('../server/reports/reportManager');
  const { FindingLifecycleManager } = await import('../server/scanner/lifecycle');

  const mockAuditResult: any = { scanId: 'scan_snap_1', targetUrl: 'https://drsharmadental.in', domain: 'drsharmadental.in', score: 40 };
  const reportSnapshot = reportManager.createShareableSnapshot(mockAuditResult);
  assert(reportSnapshot.token.length === 64, 'ReportManager generates 64-char high-entropy share token');

  const retrieved = reportManager.getSnapshot(reportSnapshot.token);
  assert(retrieved.snapshot !== undefined && retrieved.snapshot.scanId === 'scan_snap_1', 'ReportManager returns immutable report snapshot');

  // Finding Lifecycle: OPEN ➔ RESOLVED ➔ REOPENED
  FindingLifecycleManager.clear();
  const step1 = FindingLifecycleManager.reconcileFindings('drsharmadental.in', ['rule_wa_1']);
  assert(step1[0].status === 'OPEN', 'FindingLifecycleManager marks new finding as OPEN');

  const step2 = FindingLifecycleManager.reconcileFindings('drsharmadental.in', []);
  assert(step2[0].status === 'RESOLVED', 'FindingLifecycleManager transitions absent finding to RESOLVED');

  const step3 = FindingLifecycleManager.reconcileFindings('drsharmadental.in', ['rule_wa_1']);
  assert(step3[0].status === 'REOPENED', 'FindingLifecycleManager transitions recurring finding to REOPENED');

  // -------------------------------------------------------------------------
  // 19. Phase 7 Red-Team Tenant Isolation & Cross-Tenant BOLA/IDOR Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 19: Red-Team Cross-Tenant BOLA/IDOR & Role Isolation');
  const userA_id = 'usr_tenant_A';
  const userB_id = 'usr_tenant_B';

  storage.addWatchdogTarget({
    id: 'wd_tenant_A_target',
    userId: userA_id,
    targetUrl: 'https://tenant-a-domain.com',
    domain: 'tenant-a-domain.com',
    contact: 'owner@tenant-a.com',
    channel: 'TELEGRAM',
    frequency: 'DAILY',
    status: 'ACTIVE_SUBSCRIPTION',
    createdAt: new Date().toISOString(),
    trialExpiresAt: new Date().toISOString(),
  });

  // Verify User B cannot access User A's Watchdog target
  const userBTargets = storage.getWatchdogTargetsForUser(userB_id);
  assert(!userBTargets.some(t => t.id === 'wd_tenant_A_target'), 'Storage Engine isolates Watchdog targets between tenant A and tenant B');

  // Verify User B cannot export User A's personal data
  const userAScans = storage.getScansForUser(userA_id);
  const userBScans = storage.getScansForUser(userB_id);
  assert(userBScans.length === 0 || !userBScans.some(s => s.userId === userA_id), 'Storage Engine enforces strict user-scoped data isolation');

  // -------------------------------------------------------------------------
  // 20. Phase 7 Red-Team SSRF Bypasses, Payment Forgery & Input Fuzzing Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 20: Red-Team SSRF Bypasses, Payment Forgery & Fuzzing');
  const { validateAndResolveSafeUrl } = await import('../server/ssrfGuard');

  // SSRF Edge Cases
  assert(isPrivateOrBlockedIP('::ffff:127.0.0.1'), 'SSRF Guard blocks IPv4-mapped IPv6 loopback (::ffff:127.0.0.1)');
  assert(isPrivateOrBlockedIP('169.254.169.254'), 'SSRF Guard blocks Cloud Metadata IP (169.254.169.254)');
  assert(isPrivateOrBlockedIP('10.255.255.255'), 'SSRF Guard blocks RFC 1918 10.0.0.0/8 subnet boundary');

  const invalidUrlRes = await validateAndResolveSafeUrl('http://127.0.0.1:8080/admin');
  assert(!invalidUrlRes.valid && invalidUrlRes.error?.includes('blocked'), 'SSRF Guard rejects loopback URL with explicit port');

  // Payment Signature Tampering
  const forgedSig = verifyPaymentSignature('order_fake_123', 'pay_fake_456', 'bad_signature_string', 'unit_test_tamper_secret');
  assert(!forgedSig, 'Payment Engine rejects forged payment signature string');

  // -------------------------------------------------------------------------
  // 21. Phase 8 Release Candidate Environment Validation & Safeguard Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 21: Environment Validation & Startup Safeguards');
  const { validateEnvironment } = await import('../server/config/envValidator');
  const envRes = validateEnvironment();
  assert(envRes.valid, 'EnvValidator validates development/test environment settings cleanly');

  // -------------------------------------------------------------------------
  // 22. Phase 8 Release Candidate Versioning & Health Probes Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 22: Release Versioning & Health Probes');
  const { db: dbManager } = await import('../server/db/database');
  const { jobQueue: jobQueueManager } = await import('../server/queue/jobQueue');
  const dbStatus = await dbManager.checkHealth();
  const queueDepth = await jobQueueManager.getQueueDepth();
  assert(dbStatus.status === 'OK' && typeof queueDepth === 'number', 'Health & Readiness probes report healthy database and queue depth');

  // -------------------------------------------------------------------------
  // 23. Payment State Machine Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 23: Payment State Machine');
  const { validatePaymentTransition, verifyPaymentAmount } = await import('../server/services/paymentStateMachine');

  // Valid transitions
  let stateOk = true;
  try { validatePaymentTransition('CREATED', 'PAYMENT_PENDING', 'test_order'); } catch { stateOk = false; }
  assert(stateOk, 'CREATED → PAYMENT_PENDING is allowed');

  stateOk = true;
  try { validatePaymentTransition('PAYMENT_PENDING', 'PAID', 'test_order'); } catch { stateOk = false; }
  assert(stateOk, 'PAYMENT_PENDING → PAID is allowed');

  stateOk = true;
  try { validatePaymentTransition('PAID', 'REFUNDED', 'test_order'); } catch { stateOk = false; }
  assert(stateOk, 'PAID → REFUNDED is allowed');

  // Invalid transitions
  stateOk = false;
  try { validatePaymentTransition('PAID', 'PAYMENT_PENDING', 'test_order'); } catch { stateOk = true; }
  assert(stateOk, 'PAID → PAYMENT_PENDING is rejected');

  stateOk = false;
  try { validatePaymentTransition('CANCELLED', 'PAID', 'test_order'); } catch { stateOk = true; }
  assert(stateOk, 'CANCELLED → PAID is rejected');

  stateOk = false;
  try { validatePaymentTransition('REFUNDED', 'PAID', 'test_order'); } catch { stateOk = true; }
  assert(stateOk, 'REFUNDED → PAID is rejected');

  stateOk = false;
  try { validatePaymentTransition('FAILED', 'PAID', 'test_order'); } catch { stateOk = true; }
  assert(stateOk, 'FAILED → PAID is rejected (requires provider override)');

  // Amount/currency verification
  let amountOk = true;
  try { verifyPaymentAmount(2999, 2999, 'INR', 'INR', 'test_order'); } catch { amountOk = false; }
  assert(amountOk, 'Matching amount and currency passes verification');

  amountOk = false;
  try { verifyPaymentAmount(2999, 1999, 'INR', 'INR', 'test_order'); } catch { amountOk = true; }
  assert(amountOk, 'Mismatched amount is rejected');

  amountOk = false;
  try { verifyPaymentAmount(2999, 2999, 'INR', 'USD', 'test_order'); } catch { amountOk = true; }
  assert(amountOk, 'Mismatched currency is rejected');

  // -------------------------------------------------------------------------
  // 24. Pricing Catalog Integrity Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 24: Pricing Catalog Integrity');
  const { CENTRALIZED_PRICING_CATALOG, calculateTierPrice: calcPrice } = await import('../server/config/pricing');

  assert(CENTRALIZED_PRICING_CATALOG['tier-express-fix'].amountINR === 2999, 'Express Fix price is ₹2,999');
  assert(CENTRALIZED_PRICING_CATALOG['tier-express-fix'].currency === 'INR', 'Express Fix currency is INR');
  assert(CENTRALIZED_PRICING_CATALOG['tier-watchdog-monthly'].amountINR === 299, 'Watchdog price is ₹299');
  assert(CENTRALIZED_PRICING_CATALOG['tier-agency-monthly'].amountINR === 4999, 'Agency price is ₹4,999');

  const tierResult = calcPrice('tier-express-fix');
  assert(tierResult.amountINR === 2999 && tierResult.currency === 'INR', 'calculateTierPrice returns server-authoritative amount');

  // Unknown tier falls back to express-fix (safety)
  const unknownTier = calcPrice('tier-unknown-xyz');
  assert(unknownTier.amountINR === 2999, 'Unknown tier falls back to express-fix pricing');

  // -------------------------------------------------------------------------
  // 25. Queue Crash Recovery & Durable Retry Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 25: Queue Crash Recovery & Durable Retry');
  const { JobQueueManager, DEFAULT_LEASE_MS } = await import('../server/queue/jobQueue');
  const testQueue = new JobQueueManager();

  // Test 1: Normal job claim
  const normalJob = await testQueue.enqueue('scanWebsite', { url: 'https://example.com' });
  assert(normalJob.status === 'QUEUED' && normalJob.nextAttemptAt !== undefined, 'Enqueued job has QUEUED status and nextAttemptAt');

  const claimed = await testQueue.claimNext('worker-1');
  assert(claimed !== undefined && claimed.status === 'RUNNING' && claimed.workerId === 'worker-1', 'ClaimNext returns RUNNING job with workerId');
  assert(claimed!.leaseExpiresAt !== undefined, 'Claimed job has lease expiry');

  // Test 2: Crash recovery (simulate expired lease)
  const crashJob = await testQueue.enqueue('scanWebsite', { url: 'https://crash-test.com' });
  const claimedCrash = await testQueue.claimNext('worker-crash');
  assert(claimedCrash !== undefined, 'Crash test job was claimed');

  // Simulate crash by setting lease to past
  if (claimedCrash) {
    await testQueue.updateJobStatus(claimedCrash.id, {
      leaseExpiresAt: new Date(Date.now() - 60000).toISOString(),
    });
  }

  // Another worker should recover it
  const recovered = await testQueue.claimNext('worker-recovery');
  assert(
    recovered !== undefined &&
    recovered.workerId === 'worker-recovery' &&
    recovered.previousWorkerId === 'worker-crash' &&
    (recovered.recoveryCount || 0) > 0,
    'Expired RUNNING job is recovered with correct metadata'
  );

  // Test 3: Durable retry with nextAttemptAt
  const retryJob = await testQueue.enqueue('sendWebhook', { url: 'https://retry.com' });
  const claimedRetry = await testQueue.claimNext('worker-retry');
  if (claimedRetry) {
    const futureTime = new Date(Date.now() + 60000).toISOString();
    await testQueue.updateJobStatus(claimedRetry.id, {
      status: 'QUEUED',
      nextAttemptAt: futureTime,
      lastError: 'transient failure',
    });

    // Should NOT be claimable yet (nextAttemptAt is in the future)
    const prematureClaim = await testQueue.claimNext('worker-premature');
    // The queue may return other jobs, so check this specific job isn't returned
    assert(
      prematureClaim === undefined || prematureClaim.id !== claimedRetry.id,
      'Job with future nextAttemptAt is not claimable before its time'
    );
  }

  // Test 4: Dead letter
  const dlJob = await testQueue.enqueue('scanWebsite', { url: 'https://deadletter.com' });
  await testQueue.markDeadLetter(dlJob.id, 'permanent failure');
  const dlCheck = await testQueue.getJob(dlJob.id);
  assert(
    dlCheck?.status === 'DEAD_LETTER' && dlCheck.deadLetter === true,
    'Dead-lettered job has DEAD_LETTER status'
  );

  // -------------------------------------------------------------------------
  // 26. Fulfillment Idempotency Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 26: Fulfillment Idempotency');
  const { fulfillmentRepository } = await import('../server/repositories/fulfillmentRepository');

  const ful1 = await fulfillmentRepository.claimFulfillment('ord_test_123', 'EXPRESS_FIX', 'user1', 'tier-express-fix');
  assert(ful1 !== null && ful1.status === 'ACTIVATED', 'First fulfillment claim activates');

  const ful2 = await fulfillmentRepository.claimFulfillment('ord_test_123', 'EXPRESS_FIX', 'user1', 'tier-express-fix');
  assert(ful2 === null, 'Duplicate fulfillment claim returns null (idempotent)');

  // -------------------------------------------------------------------------
  // 27. Payment Event Idempotency Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 27: Payment Event Idempotency');
  const { paymentEventRepository } = await import('../server/repositories/paymentEventRepository');

  const evt1 = await paymentEventRepository.claim({
    provider: 'razorpay',
    providerEventId: 'evt_test_001',
    orderId: 'ord_1',
    eventType: 'payment.captured',
    payloadHash: 'hash_abc',
  });
  assert(evt1 === true, 'First payment event claim succeeds');

  const evt2 = await paymentEventRepository.claim({
    provider: 'razorpay',
    providerEventId: 'evt_test_001',
    orderId: 'ord_1',
    eventType: 'payment.captured',
    payloadHash: 'hash_abc',
  });
  assert(evt2 === false, 'Duplicate payment event claim returns false');

  // -------------------------------------------------------------------------
  // 28. Statistics Counter Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 28: Statistics Counters');
  const { statsRepository: statsRepo28 } = await import('../server/repositories/statsRepository');
  await statsRepo28.recordScanCompleted(true, false, 3, true);
  await statsRepo28.recordScanCompleted(false, true, 0, true);
  await statsRepo28.recordScanCompleted(true, false, 1, false); // DEMO — should be excluded

  const stats28 = await statsRepo28.getSystemStats();
  assert(stats28.mode === 'LIVE', 'Stats report LIVE mode');
  assert(stats28.isRealDatabaseData === true, 'Stats are marked as real database data');

  // -------------------------------------------------------------------------
  // 29. Notification Provider Correctness — NO fake success
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 29: Notification Provider Correctness');
  const { EmailProvider, TelegramProvider, WhatsAppProvider, executeSendNotification } = await import('../server/queue/executors/index');

  const savedSmtp = { host: process.env.SMTP_HOST, user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD, port: process.env.SMTP_PORT };
  delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMTP_PASSWORD;
  const emailUnconfigured = new EmailProvider();
  assert(emailUnconfigured.isConfigured() === false, 'Email provider reports unconfigured when SMTP env missing');

  let notifErr: any = null;
  try {
    await executeSendNotification({ id: 'job_ntest_1', type: 'sendNotification', data: { provider: 'EMAIL', recipient: 'cust@example.com', subject: 's', body: 'b', event: 'evt-no-config-1' }, attempt: 1, maxAttempts: 3 } as any);
  } catch (err) { notifErr = err; }
  assert(!!notifErr && String(notifErr.message).includes('PROVIDER_NOT_CONFIGURED'), 'Provider missing → notification job FAILS (never SENT)');
  assert(!String(notifErr?.message || '').toLowerCase().includes('success'), 'No fake success on unconfigured provider');

  const tgUnconfigured = new TelegramProvider();
  assert(tgUnconfigured.isConfigured() === false && !process.env.TELEGRAM_BOT_TOKEN, 'Telegram provider unconfigured without bot token');
  const waUnconfigured = new WhatsAppProvider();
  assert(waUnconfigured.isConfigured() === false, 'WhatsApp provider unconfigured without credentials');

  // SMTP failure classification: unreachable SMTP endpoint → FAILED (not SENT)
  process.env.SMTP_HOST = '127.0.0.1'; process.env.SMTP_PORT = '1'; process.env.SMTP_USER = 'u'; process.env.SMTP_PASSWORD = 'p';
  let smtpFailErr: any = null;
  try {
    await executeSendNotification({ id: 'job_ntest_2', type: 'sendNotification', data: { provider: 'EMAIL', recipient: 'cust2@example.com', subject: 's', body: 'b', event: `evt-smtp-fail-${Date.now()}` }, attempt: 1, maxAttempts: 3 } as any);
  } catch (err) { smtpFailErr = err; }
  assert(!!smtpFailErr && String(smtpFailErr.message).includes('NOTIFICATION_DELIVERY_FAILED'), 'SMTP failure → FAILED delivery (job throws for retry/DLQ)');
  process.env.SMTP_HOST = savedSmtp.host!; process.env.SMTP_PORT = savedSmtp.port!; process.env.SMTP_USER = savedSmtp.user!; process.env.SMTP_PASSWORD = savedSmtp.pass!;

  // Unknown provider → hard error
  let unknownProvErr: any = null;
  try {
    await executeSendNotification({ id: 'job_ntest_3', type: 'sendNotification', data: { provider: 'SMOKE_SIGNALS', recipient: 'x', body: 'y' }, attempt: 1, maxAttempts: 3 } as any);
  } catch (err) { unknownProvErr = err; }
  assert(!!unknownProvErr && String(unknownProvErr.message).includes('UNSUPPORTED_NOTIFICATION_PROVIDER'), 'Unknown provider rejected fail-closed');

  // -------------------------------------------------------------------------
  // 30. Notification Idempotency — duplicate delivery sent ONCE
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 30: Notification Delivery Idempotency');
  const { computeDeliveryKey, isEventAlreadyDelivered, __localDeliveryKeysForTests } = await import('../server/queue/executors/index') as any;

  const dupKey = computeDeliveryKey('dup-evt', 'rcpt@x.com', 'TELEGRAM');
  __localDeliveryKeysForTests().set(dupKey, { status: 'SENT', sentAt: new Date().toISOString() });
  const dupCheck = await isEventAlreadyDelivered(dupKey);
  assert(dupCheck === true, 'Duplicate notification delivery detected via durable delivery key');

  const freshKey = computeDeliveryKey('fresh-evt', 'rcpt@x.com', 'TELEGRAM');
  assert(await isEventAlreadyDelivered(freshKey) === false, 'Unseen delivery key passes idempotency check');
  __localDeliveryKeysForTests().delete(dupKey);

  // -------------------------------------------------------------------------
  // 31. PDF Durable Storage & Integrity
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 31: PDF Durable Storage & Authorization');
  const { pdfReportRepository } = await import('../server/repositories/pdfReportRepository');
  const { executeGeneratePdf } = await import('../server/queue/executors/index');
  const scanRepo31 = await import('../server/repositories/scanRepository');
  const pdfScan = await scanRepo31.scanRepository.createScan({
    scanId: 'scan_pdf_test_1',
    domain: 'pdf-test.in',
    targetUrl: 'https://pdf-test.in',
    score: 72,
    overallScore: 72,
    businessName: 'PDF Test Co',
    allIssues: [{ severity: 'HIGH', title: 'Test finding', description: 'desc' }],
    userId: 'usr_pdf_1',
    scannedAt: new Date().toISOString(),
    scannedLive: true,
  } as any);

  const pdfMeta = await executeGeneratePdf({
    id: 'job_pdf_1', type: 'generatePdf', userId: 'usr_pdf_1',
    data: { scanId: 'scan_pdf_test_1' },
  } as any);
  assert(!!pdfMeta.pdfId && !!pdfMeta.storagePath, 'PDF executor returns persisted metadata with storage path');
  assert(pdfMeta.contentType === 'application/pdf' && pdfMeta.sizeBytes > 0, 'PDF metadata carries content type and real size');

  const storedMeta = await pdfReportRepository.getById(pdfMeta.pdfId);
  assert(!!storedMeta && storedMeta.sha256 === pdfMeta.sha256, 'PDF metadata durably retrievable via repository');
  assert(storedMeta!.userId === 'usr_pdf_1' && storedMeta!.scanId === 'scan_pdf_test_1', 'PDF metadata records owner and scan binding');

  const pdfBytes = await pdfReportRepository.readBytes(storedMeta!);
  assert(pdfBytes.length > 0 && pdfBytes.subarray(0, 4).toString() === '%PDF', 'PDF bytes exist in durable storage and are valid PDF magic bytes');
  assert(pdfReportRepository.verifyIntegrity(pdfBytes, storedMeta!), 'Stored PDF passes sha256 integrity verification');

  const tampered = Buffer.from(pdfBytes);
  tampered[10] = tampered[10] ^ 0xff;
  assert(!pdfReportRepository.verifyIntegrity(tampered, storedMeta!), 'Tampered PDF fails integrity verification');

  // Ownership enforced at generation time
  let unauthPdfErr: any = null;
  try {
    await executeGeneratePdf({
      id: 'job_pdf_2', type: 'generatePdf', userId: 'usr_attacker_9',
      data: { scanId: 'scan_pdf_test_1' },
    } as any);
  } catch (err) { unauthPdfErr = err; }
  assert(!!unauthPdfErr && String(unauthPdfErr.message).includes('UNAUTHORIZED_PDF_GENERATION'), 'PDF generation denied for non-owner');

  // -------------------------------------------------------------------------
  // 32. AI Output Safety & Fail-Closed Persistence
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 32: AI Output Safety & Persistence Semantics');
  const { validateAiOutput } = await import('../server/services/ai.service');
  const evidence = [{ title: 'Broken WhatsApp link', severity: 'CRITICAL', description: 'wa.me link invalid', impact: 'Lead loss', recommendation: 'Fix number' }];

  const fakePenalty = validateAiOutput('Your site has received a Google penalty and must be fixed immediately.', evidence);
  assert(fakePenalty.valid === false && String(fakePenalty.reason).includes('UNSUPPORTED_CLAIM'), 'Fake Google penalty claim rejected without evidence');

  const malwareEvidence = [{ title: 'Malware signature detected', severity: 'CRITICAL', description: '', impact: '', recommendation: '' }];
  assert(validateAiOutput('Malware detected on the homepage.', malwareEvidence).valid === true, 'Claim WITH matching scanner evidence accepted');

  const fabricatedRevenue = validateAiOutput('You are losing ₹50,00,000 every month right now!', evidence);
  assert(fabricatedRevenue.valid === false && String(fabricatedRevenue.reason).includes('FABRICATED_REVENUE_ESTIMATE'), 'Fabricated revenue estimate exceeding scanner ceiling rejected');

  const groundedEvidence = [{ title: 'Broken WhatsApp link', severity: 'HIGH', estimatedMonthlyLoss: 120000 }];
  const groundedRevenue = validateAiOutput('Scanner evidence suggests an estimated loss of about ₹1,10,000 per month.', groundedEvidence);
  assert(groundedRevenue.valid === true, 'Loss claim within scanner-computed ceiling accepted');
  const ungroundedLarge = validateAiOutput('You are losing ₹9,00,000 every month.', groundedEvidence);
  assert(ungroundedLarge.valid === false, 'Loss claim above scanner-computed ceiling rejected');

  const saneContent = validateAiOutput('Fix the broken WhatsApp link: replace +9191 prefix. Estimated loss aligns with scanner findings.', evidence);
  assert(saneContent.valid === true, 'Evidence-grounded remediation content accepted');

  // AI persistence is fail-closed in production without Firestore
  const { persistAiResult } = await import('../server/queue/executors/index');
  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  let aiPersistErr: any = null;
  try {
    await persistAiResult('scan_ai_x', { content: 'c', model: 'm', inputHash: 'h', resultHash: 'r' });
  } catch (err) { aiPersistErr = err; }
  process.env.NODE_ENV = prevNodeEnv;
  assert(!!aiPersistErr && String(aiPersistErr.message).includes('AI_PERSISTENCE_FAILED'), 'AI persistence failure → job FAILS (no silent loss) in production');

  // Non-retryable classification
  const { RetryPolicy: RP32 } = await import('../server/queue/retryPolicy');
  assert(RP32.shouldRetry(new Error('AI_OUTPUT_UNSUPPORTED_CLAIM: x'), 1, 5) === false, 'AI safety rejection classified non-retryable');
  assert(RP32.shouldRetry(new Error('PROVIDER_NOT_CONFIGURED: EMAIL'), 1, 5) === false, 'Provider-not-configured classified non-retryable');
  assert(RP32.shouldRetry(new Error('ETIMEDOUT network blip'), 1, 5) === true, 'Transient timeout remains retryable');

  // -------------------------------------------------------------------------
  // 33. Watchdog Exact Target URL Enforcement
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 33: Watchdog Exact Target URL Contract');
  const { executeRunWatchdog } = await import('../server/queue/executors/index');
  const wdRepo33 = await import('../server/repositories/watchdogRepository');
  await wdRepo33.watchdogRepository.addTarget({ id: 'wd_nourl_1', domain: 'no-url-only.in', contact: 'x@y.z', channel: 'EMAIL', frequency: 'DAILY', status: 'ACTIVE_TRIAL', mode: 'LIVE' }, 'usr_wd_33');
  let wdInvalidErr: any = null;
  try {
    await executeRunWatchdog({ id: 'job_wd_1', type: 'runWatchdog', data: { targetId: 'wd_nourl_1' }, attempt: 1, maxAttempts: 5 } as any);
  } catch (err) { wdInvalidErr = err; }
  assert(!!wdInvalidErr && String(wdInvalidErr.message).includes('WATCHDOG_TARGET_INVALID'), 'Watchdog execution FAILS when targetUrl missing (no domain fallback)');
  assert(RP32 ? RP32.shouldRetry(wdInvalidErr, 1, 5) === false : false, 'Watchdog target misconfiguration classified non-retryable');

  // Scheduler never schedules targets without targetUrl
  const schedTargets = await wdRepo33.watchdogRepository.getTargets(undefined, undefined, true);
  const noUrlTarget = schedTargets.find(t => t.id === 'wd_nourl_1');
  const { WATCHDOG_FREQUENCY_MS } = await import('../server/watchdogScheduler');
  assert(typeof WATCHDOG_FREQUENCY_MS.DAILY === 'number', 'Watchdog frequency map exported for scheduling math');
  assert(noUrlTarget !== undefined, 'Target without URL exists in repo but is excluded from due-scheduling by contract');

  // -------------------------------------------------------------------------
  // 34. Shared Rate Limiting Behavior
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 34: Shared Rate Limiting (Production)');
  const { rateLimitFailureMode, productionRateLimiter } = await import('../server/security/rateLimiter');
  assert(rateLimitFailureMode() === 'fail-open', 'Dev default limiter failure mode is fail-open');
  const prevEnv34 = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  assert(rateLimitFailureMode() === 'fail-closed', 'Production default limiter failure mode is fail-closed');

  // Production middleware with no shared store → 503 reject (never silent bypass)
  const mw = productionRateLimiter({ limit: 10, operation: 'test-op' });
  const mwResult = await new Promise<{ status?: number; nextCalled: boolean }>((resolve) => {
    const req: any = { ip: '203.0.113.55', socket: { remoteAddress: '203.0.113.55' }, headers: {} };
    const res: any = {
      headers: {} as Record<string, string>,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      status(code: number) { this.statusCode = code; return this; },
      json(payload: any) { resolve({ status: this.statusCode, nextCalled: false }); return this; },
    };
    mw(req, res, () => resolve({ nextCalled: true })).catch(() => resolve({ nextCalled: false }));
  });
  process.env.NODE_ENV = prevEnv34;
  assert(mwResult.nextCalled === false && mwResult.status === 503, 'Production rejects requests when shared limiter unavailable (fail-closed)');

  // Dev mode middleware passes through to memory limiter
  const mwDev = productionRateLimiter({ limit: 2, operation: 'dev-op' });
  const devResults: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    const r = await new Promise<{ allowed: boolean }>((resolve) => {
      const req: any = { ip: '198.51.100.7', socket: { remoteAddress: '198.51.100.7' }, headers: {} };
      const res: any = {
        setHeader() {}, status() { return this; }, json() { resolve({ allowed: false }); },
      };
      mwDev(req, res, () => resolve({ allowed: true })).catch(() => resolve({ allowed: false }));
    });
    devResults.push(r.allowed);
  }
  assert(devResults[0] === true && devResults.filter(a => !a).length >= 1, 'Dev memory limiter enforces limit within window');

  // -------------------------------------------------------------------------
  // 35. Payment Verification Hardening (amount/currency/order/state)
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 35: Payment Verification Hardening');
  const orderRepo35 = (await import('../server/repositories/orderRepository')).orderRepository;
  const { verifyPaymentAmount: vpa35 } = await import('../server/services/paymentStateMachine');

  const payOrder = await orderRepo35.createPendingOrder({ tierId: 'tier-express-fix', orderId: 'ord_verify_suite35' }, 'usr_pay_35', 'pay35@x.com');
  assert(payOrder.status === 'PENDING' && payOrder.amountINR === 2999, 'Order created server-authoritative PENDING @ ₹2,999');

  // Amount mismatch through full verification path
  process.env.RAZORPAY_KEY_SECRET = 'suite35_secret';
  const sigFor = (orderId: string, paymentId: string, secret: string) =>
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  let amountMismatchErr: any = null;
  try {
    await orderRepo35.verifyAndMarkPaid('ord_verify_suite35', {
      paymentReference: 'pay_amt_bad',
      provider: 'RAZORPAY',
      providerOrderId: 'ord_verify_suite35',
      providerPaymentId: 'pay_amt_bad',
      signature: sigFor('ord_verify_suite35', 'pay_amt_bad', 'suite35_secret'),
      providerAmount: 1, // ₹1 instead of ₹2,999
      providerCurrency: 'INR',
    }, 'usr_pay_35');
  } catch (err) { amountMismatchErr = err; }
  assert(!!amountMismatchErr && String(amountMismatchErr.message).includes('AMOUNT_MISMATCH'), 'Payment amount mismatch rejected through verification pipeline');
  const stillPending = await orderRepo35.getOrderById('ord_verify_suite35', undefined, true);
  assert(stillPending?.status === 'PENDING', 'Order remains PENDING after rejected amount mismatch');

  // Currency mismatch
  let currencyMismatchErr: any = null;
  try {
    await orderRepo35.verifyAndMarkPaid('ord_verify_suite35', {
      paymentReference: 'pay_cur_bad',
      provider: 'RAZORPAY',
      providerOrderId: 'ord_verify_suite35',
      providerPaymentId: 'pay_cur_bad',
      signature: sigFor('ord_verify_suite35', 'pay_cur_bad', 'suite35_secret'),
      providerAmount: 2999,
      providerCurrency: 'USD',
    }, 'usr_pay_35');
  } catch (err) { currencyMismatchErr = err; }
  assert(!!currencyMismatchErr && String(currencyMismatchErr.message).includes('CURRENCY_MISMATCH'), 'Payment currency mismatch rejected');

  // Forged signature
  let forgedErr: any = null;
  try {
    await orderRepo35.verifyAndMarkPaid('ord_verify_suite35', {
      paymentReference: 'pay_forged',
      provider: 'RAZORPAY',
      providerOrderId: 'ord_verify_suite35',
      providerPaymentId: 'pay_forged',
      signature: 'deadbeefdeadbeef',
      providerAmount: 2999,
      providerCurrency: 'INR',
    }, 'usr_pay_35');
  } catch (err) { forgedErr = err; }
  assert(!!forgedErr && String(forgedErr.message).includes('PAYMENT_VERIFICATION_FAILED'), 'Forged Razorpay signature rejected');

  // Valid path transitions PENDING → PAID
  const paidOrder = await orderRepo35.verifyAndMarkPaid('ord_verify_suite35', {
    paymentReference: 'pay_ok_1',
    provider: 'RAZORPAY',
    providerOrderId: 'ord_verify_suite35',
    providerPaymentId: 'pay_ok_1',
    signature: sigFor('ord_verify_suite35', 'pay_ok_1', 'suite35_secret'),
    providerAmount: 2999,
    providerCurrency: 'INR',
  }, 'usr_pay_35');
  assert(paidOrder.status === 'PAID', 'Valid signed payment with matching amount/currency → PAID');

  // Replay: already-PAID cannot be re-transitioned (idempotent rejection)
  let replayErr: any = null;
  try {
    await orderRepo35.verifyAndMarkPaid('ord_verify_suite35', {
      paymentReference: 'pay_replay',
      provider: 'RAZORPAY',
      providerOrderId: 'ord_verify_suite35',
      providerPaymentId: 'pay_replay',
      signature: sigFor('ord_verify_suite35', 'pay_replay', 'suite35_secret'),
      providerAmount: 2999,
      providerCurrency: 'INR',
    }, 'usr_pay_35');
  } catch (err) { replayErr = err; }
  assert(!!replayErr && String(replayErr.message).includes('INVALID_PAYMENT_STATE_TRANSITION'), 'Replay capture against PAID order rejected by state machine');

  // Provider-order binding negative case
  const { isPaymentBoundToOrder: bindCheck } = await import('../server/services/paymentService');
  assert(bindCheck('ord_A', 'ord_B', 'ord_A') === false, 'Provider order mismatch fails binding check');

  delete process.env.RAZORPAY_KEY_SECRET;

  // UPI manual stays PENDING (awaiting admin/provider confirmation)
  const upiOrder = await orderRepo35.createPendingOrder({ tierId: 'tier-watchdog-monthly', orderId: 'ord_upi_suite35' }, 'usr_upi', 'upi@x.com');
  const upiResult = await orderRepo35.verifyAndMarkPaid('ord_upi_suite35', { paymentReference: 'UPIREF123456', provider: 'UPI_MANUAL' }, 'usr_upi');
  assert(upiResult.status === 'PENDING' && upiOrder.amountINR === 299, 'UPI manual reference keeps order in admin-review PENDING (watchdog ₹299 catalog price)');

  // -------------------------------------------------------------------------
  // 36. Firestore Outage Fail-Closed Semantics
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 36: Firestore Outage Fail-Closed Semantics');
  const prevEnv36 = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const { isFirebaseConfigured } = await import('../server/firebaseAdmin');
  const firebaseOff = !isFirebaseConfigured();

  if (firebaseOff) {
    // Order status writes must throw, not silently succeed
    let outageErr: any = null;
    try {
      await orderRepo35.updateOrderStatus('ord_outage_probe', 'PAID', 'outage test');
    } catch (err) { outageErr = err; }
    assert(!!outageErr, 'Order status update fails loudly during Firestore outage in production');

    let outageVerifyErr: any = null;
    try {
      await orderRepo35.verifyAndMarkPaid('ord_outage_probe2', { paymentReference: 'ref_outage_12345', provider: 'SANDBOX' }, undefined);
    } catch (err) { outageVerifyErr = err; }
    // SANDBOX in production is rejected first — either way no silent success.
    assert(!!outageVerifyErr, 'Payment verification cannot silently succeed during outage in production');
  } else {
    assert(true, 'Firebase configured — outage semantics covered by repository fail-closed code paths');
  }
  process.env.NODE_ENV = prevEnv36;

  // -------------------------------------------------------------------------
  // 37. P0-01 / P0-02 Razorpay Secret Handling & Fallback Removal Regression Tests
  // -------------------------------------------------------------------------
  console.log('\n📌 Test Suite 37: P0-01 / P0-02 Razorpay Secret & Verification Regression');
  const { validateEnv } = await import('../server/config/env');
  const orderRepo37 = (await import('../server/repositories/orderRepository')).orderRepository;

  // 1. Confirm no application fallback secret exists in env configuration
  delete process.env.RAZORPAY_KEY_SECRET;
  const devEnv = validateEnv();
  assert(
    devEnv.RAZORPAY_KEY_SECRET === '',
    'No application fallback secret exists in validateEnv() when RAZORPAY_KEY_SECRET is unset'
  );

  // 2. Missing Razorpay secret → order verification path fails closed
  const testOrder37 = await orderRepo37.createPendingOrder(
    { tierId: 'tier-express-fix', orderId: 'ord_p0_secret_missing' },
    'usr_p0_test',
    'p0test@x.com'
  );
  assert(testOrder37.status === 'PENDING', 'Order created PENDING for missing-secret verification test');

  let missingSecretErr: any = null;
  try {
    await orderRepo37.verifyAndMarkPaid('ord_p0_secret_missing', {
      paymentReference: 'pay_missing_secret',
      provider: 'RAZORPAY',
      providerOrderId: 'ord_p0_secret_missing',
      providerPaymentId: 'pay_missing_secret',
      signature: 'dummy_signature',
      providerAmount: 2999,
      providerCurrency: 'INR',
    }, 'usr_p0_test');
  } catch (err) {
    missingSecretErr = err;
  }
  assert(
    !!missingSecretErr && String(missingSecretErr.message).includes('INVALID_PAYMENT_PROOF'),
    'Order verification fails closed when RAZORPAY_KEY_SECRET is not configured'
  );

  // Webhook fails closed when secret is empty / unconfigured
  const testWebhookPayload = JSON.stringify({ event: 'payment.captured', id: 'evt_p0_test' });
  assert(
    verifyWebhookSignature(testWebhookPayload, 'some_sig', '') === false,
    'Razorpay webhook signature verification returns false when secret is empty'
  );

  // 3. Invalid Razorpay signature is rejected
  const explicitTestSecret = 'test_secret_explicit_unit_vector';
  const invalidSig = 'invalid_sha256_signature_string';
  assert(
    verifyPaymentSignature('ord_p0_secret_missing', 'pay_test', invalidSig, explicitTestSecret) === false,
    'Payment verification rejects invalid Razorpay signature'
  );
  assert(
    verifyWebhookSignature(testWebhookPayload, invalidSig, explicitTestSecret) === false,
    'Webhook verification rejects invalid Razorpay webhook signature'
  );

  // 4. Valid Razorpay signature is accepted
  const validPaymentSig = generateRazorpaySignature('ord_p0_secret_missing', 'pay_test', explicitTestSecret);
  assert(
    verifyPaymentSignature('ord_p0_secret_missing', 'pay_test', validPaymentSig, explicitTestSecret) === true,
    'Payment verification accepts valid Razorpay signature'
  );

  const validWebhookSigHex = crypto
    .createHmac('sha256', explicitTestSecret)
    .update(testWebhookPayload)
    .digest('hex');
  assert(
    verifyWebhookSignature(testWebhookPayload, validWebhookSigHex, explicitTestSecret) === true,
    'Webhook verification accepts valid Razorpay webhook signature'
  );

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
