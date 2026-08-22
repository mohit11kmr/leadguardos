import { StandardFinding } from '../core/types';
import { FindingBuilder } from '../reporting/findingBuilder';

export class LinksDetector {
  public static analyzeLinks(html: string): {
    phoneLinks: any[];
    emailLinks: any[];
    reviewLinks: any[];
    socialLinks: any[];
    findings: StandardFinding[];
  } {
    const phoneLinks: any[] = [];
    const emailLinks: any[] = [];
    const reviewLinks: any[] = [];
    const socialLinks: any[] = [];
    const findings: StandardFinding[] = [];

    // 1. Phone Links (tel:)
    const telRegex = /href=["'](tel:([^"']*))["']/gi;
    let telMatch: RegExpExecArray | null;
    while ((telMatch = telRegex.exec(html)) !== null) {
      const rawUrl = telMatch[1];
      const rawNumber = telMatch[2].replace(/\s+/g, '');
      const isShort = rawNumber.length < 8;

      const item = {
        url: rawUrl,
        number: rawNumber,
        status: isShort ? 'BROKEN' : 'WORKING',
        isValid: !isShort,
      };
      phoneLinks.push(item);

      if (isShort) {
        findings.push(
          FindingBuilder.createFinding({
            id: `tel_short_${phoneLinks.length}`,
            category: 'links',
            title: 'Malformed Click-to-Call Link (tel:)',
            severity: 'HIGH',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `Found click-to-call link '${rawUrl}' with fewer than 8 digits.`,
            inferred: 'Tapping call button on smartphone will trigger invalid number dialer error.',
            evidence: rawUrl,
            impact: 'Dropped inbound voice calls from mobile ad visitors.',
            recommendation: 'Update tel: link with full 10-digit number and country code (e.g. tel:+919876543210).',
          })
        );
      }
    }

    // 2. Email Links (mailto:)
    const mailtoRegex = /href=["'](mailto:([^"']*))["']/gi;
    let mailMatch: RegExpExecArray | null;
    while ((mailMatch = mailtoRegex.exec(html)) !== null) {
      emailLinks.push({
        url: mailMatch[1],
        email: mailMatch[2],
        status: 'WORKING',
        isValid: true,
      });
    }

    // 3. Google Business / Review Links
    const reviewRegex = /href=["']([^"']*(?:g\.page|search\.google\.com\/local\/writereview|maps\.google\.com|goo\.gl\/maps)[^"']*)["']/gi;
    let revMatch: RegExpExecArray | null;
    while ((revMatch = reviewRegex.exec(html)) !== null) {
      reviewLinks.push({
        url: revMatch[1],
        platform: 'Google Business Profile',
        status: 'WORKING',
        isValid: true,
      });
    }

    // 4. Social Links
    const socialPlatforms = [
      { name: 'instagram', regex: /href=["']([^"']*(?:instagram\.com\/[a-zA-Z0-9_\.]+)[^"']*)["']/gi },
      { name: 'facebook', regex: /href=["']([^"']*(?:facebook\.com\/[a-zA-Z0-9_\.]+)[^"']*)["']/gi },
      { name: 'youtube', regex: /href=["']([^"']*(?:youtube\.com\/[a-zA-Z0-9_\.@]+)[^"']*)["']/gi },
    ];

    for (const plat of socialPlatforms) {
      let match: RegExpExecArray | null;
      while ((match = plat.regex.exec(html)) !== null) {
        socialLinks.push({
          platform: plat.name,
          url: match[1],
          status: 'WORKING',
          isValid: true,
        });
      }
    }

    return { phoneLinks, emailLinks, reviewLinks, socialLinks, findings };
  }
}
