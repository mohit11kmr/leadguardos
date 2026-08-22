import crypto from 'crypto';
import { ScanOrchestrator } from './scanner/core/scanOrchestrator';
import type { ScanOptions } from './scanner/core/types';
import { WhatsAppDetector } from './scanner/detectors/whatsapp';

export type { ScanOptions };

// Curated presets for offline testing & demo fallback
export const SAMPLE_PRESETS: Record<string, any> = {
  "drsharmadental.in": {
    domain: "drsharmadental.in",
    businessName: "Dr. Sharma Dental & Implant Center",
    score: 38,
    estimatedMonthlyLoss: 24500,
    adSpendRisk: "CRITICAL",
    whatsappLinks: [
      {
        url: "https://wa.me/91919876543210",
        status: "BROKEN",
        isValid: false,
        issue: "Double Country Code prefix detected (+9191). WhatsApp fails on mobile with 'Invalid Phone Number'.",
        suggestedFix: "Change to https://wa.me/919876543210?text=Hi%20Dr.%20Sharma,%20I%20need%20an%20appointment",
        digits: "91919876543210",
      }
    ],
    phoneLinks: [{ url: "tel:9876543210", status: "WORKING", isValid: true, number: "+91 98765 43210" }],
    emailLinks: [{ url: "mailto:info@drsharmadental.in", status: "WORKING", isValid: true }],
    metaPixel: { exists: false, status: "MISSING" },
    googleTag: { exists: true, tagId: "G-DRSHARMA99", status: "HEALTHY" },
    seoPenalty: { hasNoIndex: true, isHttps: true, status: "CRITICAL_PENALTY" },
    cyberShield: { score: 95, riskLevel: "CLEAN" },
    diagnosticSummary: "High-value patient inquiries bounce due to double +9191 on WhatsApp button, while Meta Ads run blind without a Pixel.",
  },
  "elitesalonmumbai.com": {
    domain: "elitesalonmumbai.com",
    businessName: "Elite Unisex Salon & Luxury Spa",
    score: 45,
    estimatedMonthlyLoss: 18500,
    adSpendRisk: "HIGH",
    whatsappLinks: [
      {
        url: "https://api.whatsapp.com/send?phone=09820011223",
        status: "BROKEN",
        isValid: false,
        issue: "Leading '0' prefix (09820011223) causes WhatsApp to crash or show incorrect country dialer on iOS.",
      }
    ],
    metaPixel: { exists: true, pixelId: "9832948201948", status: "HEALTHY" },
    googleTag: { exists: false, status: "MISSING" },
    seoPenalty: { hasNoIndex: false, isHttps: true, status: "HEALTHY" },
    cyberShield: { score: 100, riskLevel: "CLEAN" },
    diagnosticSummary: "Leading 0 in WhatsApp link prevents iOS clients from booking salon treatments.",
  },
  "leadguard.ai": {
    domain: "leadguard.ai",
    businessName: "LeadGuard OS — Revenue & Ad Shield",
    score: 100,
    estimatedMonthlyLoss: 0,
    adSpendRisk: "NONE",
    whatsappLinks: [
      {
        url: "https://wa.me/918307070605?text=Hello%20LeadGuard%20Team",
        status: "WORKING",
        isValid: true,
        digits: "918307070605",
      }
    ],
    metaPixel: { exists: true, pixelId: "918307070605123", status: "HEALTHY" },
    googleTag: { exists: true, tagId: "G-LEADGUARD99", status: "HEALTHY" },
    seoPenalty: { hasNoIndex: false, isHttps: true, status: "HEALTHY" },
    cyberShield: { score: 100, riskLevel: "CLEAN" },
    diagnosticSummary: "100/100 Flawless Setup! Verified WhatsApp channel, active Meta Pixel, GA4, and zero revenue leakage.",
  }
};

/**
 * Validates whether a phone string or digits represent a valid Indian or International number.
 */
export function validateWhatsAppNumber(digits: string): any {
  return WhatsAppDetector.parseWhatsAppNumber(digits);
}

/**
 * Main 4-Pillar Website Scanner Execution Entrypoint
 * Delegated to the modular ScanOrchestrator
 */
export async function executeLiveWebsiteScan(targetUrl: string, options: ScanOptions = {}): Promise<any> {
  if (options.allowDemoPreset && !options.forceLive) {
    const presetKey = targetUrl.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    const preset = SAMPLE_PRESETS[presetKey];
    if (preset) {
      const issues = generateIssuesFromExtractedData(preset);
      return buildAuditPayload(targetUrl, presetKey, preset, issues, Date.now() - 150, 150, 20);
    }
  }

  return await ScanOrchestrator.executeScan(targetUrl, options);
}

export function generateIssuesFromExtractedData(extracted: any): any[] {
  const issues: any[] = [];

  if (extracted.whatsappLinks) {
    extracted.whatsappLinks.forEach((w: any) => {
      if (!w.isValid) {
        issues.push({
          id: `wa_leak_${Math.random().toString(36).substring(2, 6)}`,
          pillar: 'LEAD',
          category: 'whatsapp',
          severity: 'CRITICAL',
          confidence: 'HIGH',
          ruleId: 'LG-001',
          title: w.issue || 'Broken WhatsApp Direct Chat Routing',
          description: w.issue || 'Double +9191 prefix or malformed digits prevent mobile visitors from initiating a chat.',
          evidence: w.url,
          impact: 'Estimated 65% drop in mobile lead conversions.',
          fixSnippet: w.suggestedFix || 'Update WhatsApp URL to wa.me/91XXXXXXXXXX format',
          isLocked: false,
        });
      }
    });
  }

  if (extracted.metaPixel && !extracted.metaPixel.exists) {
    issues.push({
      id: 'pixel_missing',
      pillar: 'AD',
      category: 'pixel',
      severity: 'CRITICAL',
      confidence: 'HIGH',
      ruleId: 'LG-002',
      title: 'Meta Pixel (Facebook/Instagram Ads) Missing',
      description: 'No fbq("init") event script found. Meta Ads run without conversion optimization or custom audience targeting.',
      evidence: 'Missing connect.facebook.net/fbevents.js',
      impact: 'Up to 3x-4x higher Cost Per Lead (CPL) on Meta Ads.',
      fixSnippet: '<script>!function(f,b,e,v,n,t,s)...</script>',
      isLocked: true,
    });
  }

  if (extracted.seoPenalty && extracted.seoPenalty.hasNoIndex) {
    issues.push({
      id: 'seo_noindex',
      pillar: 'SEO',
      category: 'seo',
      severity: 'CRITICAL',
      confidence: 'HIGH',
      ruleId: 'LG-003',
      title: 'Critical SEO Penalty: Active "noindex" Meta Tag',
      description: 'Found <meta name="robots" content="noindex"> tag blocking Google search indexing.',
      evidence: '<meta name="robots" content="noindex">',
      impact: '100% loss of organic Google Search traffic.',
      fixSnippet: 'Remove noindex rule from SEO settings.',
      isLocked: true,
    });
  }

  return issues;
}

export function buildAuditPayload(
  targetUrl: string,
  domain: string,
  extracted: any,
  issues: any[],
  startTime: number,
  fetchMs: number,
  parseMs: number
): any {
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const publicToken = `pub_${crypto.randomBytes(8).toString('hex')}`;

  const leadPillarIssues = issues.filter(i => i.pillar === 'LEAD');
  const adPillarIssues = issues.filter(i => i.pillar === 'AD');
  const seoPillarIssues = issues.filter(i => i.pillar === 'SEO');
  const cyberPillarIssues = issues.filter(i => i.pillar === 'CYBER');

  const leadScore = Math.max(10, 100 - leadPillarIssues.length * 60);
  const adScore = Math.max(10, 100 - adPillarIssues.length * 60);
  const seoScore = Math.max(10, 100 - seoPillarIssues.length * 60);
  const cyberScore = extracted.cyberShield?.score || 100;

  const score = extracted.score ?? Math.round(leadScore * 0.35 + adScore * 0.25 + seoScore * 0.20 + cyberScore * 0.20);

  return {
    scanId,
    publicToken,
    targetUrl,
    domain,
    businessName: extracted.businessName || domain,
    score,
    estimatedMonthlyLoss: extracted.estimatedMonthlyLoss ?? (issues.length * 8500),
    adSpendRisk: extracted.adSpendRisk || (score < 50 ? 'CRITICAL' : score < 75 ? 'HIGH' : 'LOW'),
    pillars: {
      lead: { score: leadScore, status: leadScore < 60 ? 'CRITICAL' : 'HEALTHY', findingsCount: leadPillarIssues.length },
      ad: { score: adScore, status: adScore < 60 ? 'CRITICAL' : 'HEALTHY', findingsCount: adPillarIssues.length },
      seo: { score: seoScore, status: seoScore < 60 ? 'CRITICAL' : 'HEALTHY', findingsCount: seoPillarIssues.length },
      cyber: { score: cyberScore, status: cyberScore < 60 ? 'CRITICAL' : 'HEALTHY', findingsCount: cyberPillarIssues.length },
    },
    whatsappLinks: extracted.whatsappLinks || [],
    phoneLinks: extracted.phoneLinks || [],
    emailLinks: extracted.emailLinks || [],
    reviewLinks: extracted.reviewLinks || [],
    socialLinks: extracted.socialLinks || [],
    metaPixel: extracted.metaPixel || { exists: false, status: 'MISSING' },
    googleTag: extracted.googleTag || { exists: false, status: 'MISSING' },
    seoPenalty: extracted.seoPenalty || { hasNoIndex: false, status: 'HEALTHY' },
    cyberShield: extracted.cyberShield || { score: 100, riskLevel: 'CLEAN' },
    allIssues: issues,
    lockedIssuesCount: Math.max(0, issues.length - 1),
    freeIssue: issues.length > 0 ? issues[0] : null,
    performance: {
      fetchTimeMs: fetchMs,
      parseTimeMs: parseMs,
      totalTimeMs: Date.now() - startTime,
    },
    scannedAt: new Date().toISOString(),
    aiDiagnosticAdvice: extracted.diagnosticSummary,
  };
}
