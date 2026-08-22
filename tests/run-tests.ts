import { isPrivateOrBlockedIP, validateUrlSyntax } from '../server/ssrfGuard';
import { validateWhatsAppNumber, generateIssuesFromExtractedData, buildAuditPayload, SAMPLE_PRESETS } from '../server/scannerEngine';
import { calculateRevenueImpact } from '../src/utils/revenueModel';
import { FEATURE_REGISTRY } from '../src/config/features';
import { APP_CONFIG } from '../src/config/appConfig';

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
    Date.now() - 500
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
