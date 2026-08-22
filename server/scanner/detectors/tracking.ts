import { StandardFinding, DetectionSource } from '../core/types';
import { FindingBuilder } from '../reporting/findingBuilder';

export class TrackingDetector {
  public static analyzeTracking(html: string, runtimePings?: { metaPixel?: boolean; ga4?: boolean }): {
    metaPixel: any;
    googleTag: any;
    findings: StandardFinding[];
  } {
    const findings: StandardFinding[] = [];

    // 1. Meta Pixel Detection
    const hasFbqInit = /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]\)/i.exec(html) || /connect\.facebook\.net\/[a-zA-Z_]+\/fbevents\.js/i.test(html);
    const pixelIdMatch = /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]\)/i.exec(html);
    const pixelId = pixelIdMatch ? pixelIdMatch[1] : undefined;

    const metaPixelDetected = hasFbqInit || (runtimePings && runtimePings.metaPixel === true);
    const metaSource: DetectionSource = (hasFbqInit && runtimePings?.metaPixel) ? 'BOTH' : (runtimePings?.metaPixel ? 'RUNTIME' : 'STATIC');

    const metaPixel = {
      exists: !!metaPixelDetected,
      pixelId,
      duplicate: false,
      status: metaPixelDetected ? 'HEALTHY' : 'MISSING',
    };

    if (!metaPixelDetected) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'meta_pixel_absent',
          category: 'pixel',
          title: 'Meta Pixel Conversion Tracking Missing',
          severity: 'CRITICAL',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: 'No Meta Pixel initialization script (fbq) or Facebook event tracking snippet was detected.',
          inferred: 'If running Instagram or Facebook Ads campaigns, ad budget is being spent without conversion optimization or retargeting data.',
          evidence: 'Searched page HTML for connect.facebook.net/fbevents.js and fbq("init") calls.',
          impact: 'Meta algorithm cannot learn target audience profiles, raising Cost Per Lead (CPL) up to 3x-4x.',
          recommendation: 'Install base Meta Pixel script before launch to capture custom audiences and conversion events.',
        })
      );
    }

    // 2. Google Analytics 4 & GTM Detection
    const ga4Match = /gtag\s*\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]+)['"]\)/i.exec(html) || /googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/i.exec(html);
    const gtmMatch = /googletagmanager\.com\/gtm\.js\?id=(GTM-[A-Z0-9]+)/i.exec(html);

    const ga4TagId = ga4Match ? ga4Match[1] : gtmMatch ? gtmMatch[1] : undefined;
    const googleTagDetected = !!ga4TagId || (runtimePings && runtimePings.ga4 === true);

    const googleTag = {
      exists: googleTagDetected,
      tagId: ga4TagId || 'GA4_ACTIVE',
      status: googleTagDetected ? 'HEALTHY' : 'MISSING',
    };

    if (!googleTagDetected) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'ga4_tag_absent',
          category: 'ga4',
          title: 'Google Analytics 4 / GTM Tag Absent',
          severity: 'HIGH',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: 'No GA4 tag (G-XXXXX) or Google Tag Manager container (GTM-XXXXX) was found.',
          inferred: 'Traffic analytics, scroll depth, and bounce rates are unmonitored.',
          evidence: 'Searched HTML for googletagmanager.com snippets.',
          impact: 'Zero visibility on mobile visitor drop-offs and campaign traffic attribution.',
          recommendation: 'Add GA4 tag script snippet to site <head> to track visitor behavior.',
        })
      );
    }

    return { metaPixel, googleTag, findings };
  }
}
