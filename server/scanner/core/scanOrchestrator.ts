import crypto from 'crypto';
import { safeFetch } from '../../security/safeFetch';
import { StructuredAuditResult, ScanOptions, StandardFinding } from './types';
import { WhatsAppDetector } from '../detectors/whatsapp';
import { LinksDetector } from '../detectors/links';
import { TrackingDetector } from '../detectors/tracking';
import { SeoDetector } from '../detectors/seo';
import { FormsDetector } from '../detectors/forms';
import { SecurityDetector } from '../detectors/security';
import { PerformanceDetector } from '../detectors/performance';
import { BrowserScanner } from '../runtime/browserScanner';
import { ScoringEngine } from '../scoring/scoringEngine';
import { ImpactCalculator } from '../scoring/impactCalculator';
import { FindingBuilder } from '../reporting/findingBuilder';
import { ScanCache } from './cache';

export class ScanOrchestrator {
  public static async executeScan(rawUrl: string, options: ScanOptions = {}): Promise<StructuredAuditResult> {
    const startTime = Date.now();
    let targetUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    const domain = targetUrl.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];

    // Check TTL Cache unless forceLive option is enabled
    if (!options.forceLive) {
      const cached = ScanCache.get(targetUrl);
      if (cached) return cached;
    }

    // --- STAGE 1: Static HTTP Scan (SSRF Protected) ---
    const httpResponse = await safeFetch(targetUrl, {
      method: 'GET',
      timeoutMs: options.timeoutMs || 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 LeadGuard-Scanner/2.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const html = await httpResponse.text();
    const headers: Record<string, string> = {};
    if (httpResponse.headers && typeof (httpResponse.headers as any).forEach === 'function') {
      (httpResponse.headers as any).forEach((val: string, key: string) => {
        headers[key.toLowerCase()] = val;
      });
    } else if (httpResponse.headers) {
      Object.entries(httpResponse.headers).forEach(([key, val]) => {
        headers[key.toLowerCase()] = String(val);
      });
    }

    // Detectors Analysis
    const waResult = WhatsAppDetector.analyzeWhatsAppLinks(html);
    const linksResult = LinksDetector.analyzeLinks(html);
    const seoResult = SeoDetector.analyzeSeo(html, targetUrl, headers);
    const formsResult = FormsDetector.analyzeForms(html, targetUrl);
    const secResult = SecurityDetector.analyzeSecurity(html, headers);

    // --- STAGE 2: Optional Runtime Browser Scan ---
    let runtimePings = undefined;
    if (options.enableBrowserRuntime !== false) {
      const browserResult = await BrowserScanner.scanRuntime(targetUrl, options.browserTimeoutMs || 10000);
      if (browserResult.networkPings.metaPixel || browserResult.networkPings.ga4) {
        runtimePings = browserResult.networkPings;
      }
    }

    const trackingResult = TrackingDetector.analyzeTracking(html, runtimePings);
    const perfResult = PerformanceDetector.analyzePerformance(html.length, Date.now() - startTime);

    // Combine All Standard Findings
    const allFindings: StandardFinding[] = [
      ...waResult.findings,
      ...linksResult.findings,
      ...seoResult.findings,
      ...formsResult.findings,
      ...secResult.findings,
      ...trackingResult.findings,
      ...perfResult.findings,
    ];

    // Deterministic Scoring & Range Impact
    const { overallScore, pillars, adSpendRisk } = ScoringEngine.calculateScores(allFindings);
    const impactEstimate = ImpactCalculator.calculateImpact(allFindings);

    // Legacy Issue Format for Frontend UI Compatibility
    const legacyIssues = allFindings.map(f => FindingBuilder.convertToLegacyIssue(f));
    const scanId = `scan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const publicToken = `pub_${crypto.randomBytes(8).toString('hex')}`;

    // Extract Business Name
    const titleMatch = /<title\b[^>]*>(.*?)<\/title>/i.exec(html);
    const rawTitle = titleMatch ? titleMatch[1].trim() : domain;
    const businessName = rawTitle.split(/[-|_|•|:]/)[0].trim() || domain;

    const auditResult: StructuredAuditResult = {
      scanId,
      publicToken,
      targetUrl,
      domain,
      businessName,
      score: overallScore,
      estimatedMonthlyLoss: impactEstimate.estimatedMonthlyLossINR,
      revenueImpactRange: {
        lowEstimateINR: impactEstimate.lowEstimateINR,
        highEstimateINR: impactEstimate.highEstimateINR,
      },
      adSpendRisk,
      pillars,
      findings: allFindings,
      allIssues: legacyIssues,
      whatsappLinks: waResult.whatsappLinks,
      phoneLinks: linksResult.phoneLinks,
      emailLinks: linksResult.emailLinks,
      reviewLinks: linksResult.reviewLinks,
      socialLinks: linksResult.socialLinks,
      metaPixel: trackingResult.metaPixel,
      googleTag: trackingResult.googleTag,
      seoPenalty: seoResult.seoPenalty,
      cyberShield: secResult.cyberShield,
      lockedIssuesCount: Math.max(0, legacyIssues.length - 1),
      freeIssue: legacyIssues.length > 0 ? legacyIssues[0] : null,
      performance: perfResult.performance,
      scannedAt: new Date().toISOString(),
    };

    // Cache Result
    ScanCache.set(targetUrl, auditResult);

    return auditResult;
  }
}
