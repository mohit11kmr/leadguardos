import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { anyJobSchema, auditFindingSchema, auditRequestSchema, auditResponseEnvelopeSchema, actorContextSchema, errorResponseSchema, monitoringTargetRequestSchema, paymentWebhookPayloadSchema } from '../../packages/schemas/src/index';
import { buildAuditPayload, generateIssuesFromExtractedData, SAMPLE_PRESETS, validateWhatsAppNumber } from '../../server/scannerEngine';
import { verifyPaymentSignature, isPaymentBoundToOrder } from '../../server/services/paymentService';
import { toPublicAuditReport } from '../../server/reports/publicReport';

const rootDirectory = path.resolve(import.meta.dirname, '../..');
let passed = 0;
let failed = 0;

function assertContract(condition: boolean, name: string, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

function readFixture(relativePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(rootDirectory, relativePath), 'utf8'));
}

function testSchemas(): void {
  auditRequestSchema.parse({ url: 'https://example.com' });
  assertContract(!auditRequestSchema.safeParse({ url: '' }).success, 'rejects empty audit URL');
  actorContextSchema.parse({ authSource: 'anonymous' });
  assertContract(!errorResponseSchema.safeParse({ success: false, error: {} }).success, 'rejects incomplete error envelope');
  auditFindingSchema.parse({ id: 'finding_1', pillar: 'LEAD', category: 'whatsapp', severity: 'HIGH', title: 'Broken route', description: 'Route fails', impact: 'Lost lead' });
  assertContract(!auditFindingSchema.safeParse({ id: 'finding_1', pillar: 'LEAD', category: 'whatsapp', severity: 'HIGH' }).success, 'requires finding evidence fields');
  monitoringTargetRequestSchema.parse({ targetUrl: 'https://example.com', contact: 'alerts@example.com' });
  paymentWebhookPayloadSchema.parse({ event: 'payment.captured' });

  const auditIssues = generateIssuesFromExtractedData(SAMPLE_PRESETS['drsharmadental.in']);
  const auditResult = buildAuditPayload('https://drsharmadental.in', 'drsharmadental.in', SAMPLE_PRESETS['drsharmadental.in'], auditIssues, Date.now() - 50, 10, 2);
  const contractResult = {
    contractVersion: 'v6.audit.v1' as const,
    scanId: auditResult.scanId,
    domain: auditResult.domain,
    targetUrl: auditResult.targetUrl,
    status: 'COMPLETED' as const,
    mode: 'DEMO' as const,
    scannerVersion: 'compatibility-fixture',
    overallScore: auditResult.score,
    pillarScores: auditResult.pillars,
    findings: auditResult.allIssues,
    businessImpact: { estimatedMonthlyLoss: auditResult.estimatedMonthlyLoss, criticalIssueCount: auditResult.allIssues.filter((finding: any) => finding.severity === 'CRITICAL').length },
    createdAt: auditResult.scannedAt,
    completedAt: auditResult.scannedAt,
  };
  assertContract(auditResponseEnvelopeSchema.safeParse({ success: true, data: contractResult }).success, 'accepts versioned audit response envelope');
  assertContract(anyJobSchema.safeParse({ jobId: 'job_1', jobType: 'audit', payload: { targetUrl: 'https://example.com' }, attempt: 0, maxAttempts: 3, createdAt: new Date().toISOString(), correlationId: 'req_1', idempotencyKey: 'audit:example' }).success, 'accepts audit job contract');
}

function testScannerFixtures(): void {
  const whatsappFixture = readFixture('tests/contracts/scanner/whatsapp.json');
  const phoneFixture = readFixture('tests/contracts/scanner/phone.json');
  const pixelFixture = readFixture('tests/contracts/scanner/meta-pixel.json');
  const ga4Fixture = readFixture('tests/contracts/scanner/ga4.json');
  const seoFixture = readFixture('tests/contracts/scanner/seo.json');
  const securityFixture = readFixture('tests/contracts/scanner/security.json');
  const preset = SAMPLE_PRESETS['drsharmadental.in'];
  assertContract(preset.whatsappLinks[0].url === whatsappFixture.whatsappLinks[0].url && !preset.whatsappLinks[0].isValid, 'WhatsApp fixture matches current preset');
  assertContract(preset.phoneLinks[0].url === phoneFixture.phoneLinks[0].url && preset.phoneLinks[0].isValid, 'phone fixture matches current preset');
  assertContract(preset.metaPixel.exists === pixelFixture.metaPixel.exists && preset.metaPixel.status === 'MISSING', 'Meta Pixel fixture matches current preset');
  assertContract(preset.googleTag.tagId === ga4Fixture.googleTag.tagId, 'GA4 fixture matches current preset');
  assertContract(preset.seoPenalty.hasNoIndex === seoFixture.seoPenalty.hasNoIndex, 'SEO fixture matches current preset');
  assertContract(preset.cyberShield.score === securityFixture.cyberShield.score, 'security fixture matches current preset');
  assertContract(!validateWhatsAppNumber('91919876543210').isValid, 'scanner preserves double-country-code detection');
  assertContract(validateWhatsAppNumber('919876543210').isValid, 'scanner preserves valid Indian WhatsApp detection');
}

function testPublicAndPaymentCompatibility(): void {
  const publicReport = toPublicAuditReport({
    scanId: 'scan_contract', publicToken: 'pub_contract', targetUrl: 'https://example.com', domain: 'example.com', score: 80, estimatedMonthlyLoss: 0, adSpendRisk: 'LOW', pillars: {}, allIssues: [{ id: 'internal', pillar: 'LEAD', category: 'email', severity: 'LOW', title: 'Finding', description: 'Description', impact: 'Impact', evidence: 'private', fixSnippet: 'fix', isLocked: false }], whatsappLinks: [], phoneLinks: [], emailLinks: [], reviewLinks: [], socialLinks: [], metaPixel: {}, googleTag: {}, seoPenalty: {}, cyberShield: {}, lockedIssuesCount: 0, performance: { fetchTimeMs: 1, parseTimeMs: 1, totalTimeMs: 2 }, leadAuditData: { private: true }, aiRemediation: { status: 'COMPLETED', content: 'private', updatedAt: new Date().toISOString() }, scannedAt: new Date().toISOString(),
  } as any);
  assertContract(!('leadAuditData' in publicReport) && !('aiRemediation' in publicReport), 'public report projection excludes private fields');
  assertContract(!('evidence' in publicReport.allIssues[0]), 'public report projection excludes finding evidence');

  const secret = 'contract-only-secret';
  const validSignature = crypto.createHmac('sha256', secret).update('order_1|payment_1').digest('hex');
  assertContract(verifyPaymentSignature('order_1', 'payment_1', validSignature, secret), 'accepts valid payment signature');
  assertContract(!verifyPaymentSignature('order_1', 'payment_1', 'invalid', secret), 'rejects invalid payment signature');
  assertContract(isPaymentBoundToOrder('order_1', 'provider_1', 'provider_1'), 'accepts matching provider order');
  assertContract(!isPaymentBoundToOrder('order_1', 'provider_2', 'provider_1'), 'rejects wrong provider order');
  const paymentCases = readFixture('tests/contracts/payment/payment-cases.json');
  assertContract(paymentCases.cases.length === 8, 'payment fixture covers required replay and mismatch cases');
}

async function testLiveApiCompatibility(): Promise<void> {
  const baseUrl = process.env.V6_CONTRACT_TEST_URL;
  if (!baseUrl) {
    console.log('SKIP live API contract checks: set V6_CONTRACT_TEST_URL to a running V5 server');
    return;
  }
  const endpoints = [
    { path: '/api/health', required: ['status'] },
    { path: '/api/config', required: [] },
    { path: '/api/features', required: ['features', 'totalFeatures'] },
    { path: '/api/scans/history', required: ['history'] },
  ];
  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${endpoint.path}`);
    const body = await response.json() as Record<string, any>;
    assertContract(response.ok, `current API ${endpoint.path} returns success status`, `received ${response.status}`);
    assertContract(endpoint.required.every((field) => field in body), `current API ${endpoint.path} preserves response shape`);
  }
}

async function main(): Promise<void> {
  testSchemas();
  testScannerFixtures();
  testPublicAndPaymentCompatibility();
  await testLiveApiCompatibility();
  console.log(`Contract tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

void main();
