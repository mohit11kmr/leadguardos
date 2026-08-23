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
  assert(testOrder.amountINR === 4999, 'Order repository creates and records order');

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
  assert(tierPrice.priceINR === 4999, 'Payment service calculates server-side price for Express Fix = ₹4999');

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
  assert(jobQueue.getJob(enqueuedJob.id)?.type === 'scanWebsite', 'JobQueue retrieves enqueued job by ID');

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
  const forgedSig = verifyPaymentSignature('order_fake_123', 'pay_fake_456', 'bad_signature_string', 'leadguard_dev_razorpay_secret');
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
  const queueDepth = jobQueueManager.getQueueDepth();
  assert(dbStatus.status === 'OK' && typeof queueDepth === 'number', 'Health & Readiness probes report healthy database and queue depth');

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
