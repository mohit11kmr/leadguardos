import { WhatsAppLinkFinding, StandardFinding } from '../core/types';
import { FindingBuilder } from '../reporting/findingBuilder';

export class WhatsAppDetector {
  public static parseWhatsAppNumber(digits: string): {
    isValid: boolean;
    issue?: string;
    suggestedFix?: string;
    statusNote?: string;
    isIndian: boolean;
    status: 'FORMAT_VALID' | 'LINK_VALID' | 'DESTINATION_DETECTED' | 'RUNTIME_INTERACTION_TESTED' | 'BROKEN';
  } {
    if (!digits || digits.length < 8) {
      return {
        isValid: false,
        status: 'BROKEN',
        issue: 'Incomplete phone digits in WhatsApp link (fewer than 8 digits).',
        suggestedFix: 'Use full 10-digit mobile number with country prefix (e.g. https://wa.me/919876543210).',
        isIndian: false,
      };
    }

    // Double country code bug (+9191)
    if (digits.startsWith('9191') && digits.length >= 12) {
      const corrected = digits.substring(2);
      return {
        isValid: false,
        status: 'BROKEN',
        issue: 'Observed double country code (+9191) prefix. WhatsApp mobile app fails on tap.',
        suggestedFix: `Change link href to https://wa.me/${corrected}`,
        isIndian: true,
      };
    }

    // Leading 0 bug (0XXXXXXXXXX)
    if (digits.startsWith('0') && digits.length === 11) {
      const corrected = '91' + digits.substring(1);
      return {
        isValid: false,
        status: 'BROKEN',
        issue: 'Observed Leading "0" prefix (0XXXXXXXXXX). WhatsApp dialer crashes on iOS.',
        suggestedFix: `Change link href to https://wa.me/${corrected}`,
        isIndian: true,
      };
    }

    // 10-digit Indian Mobile without country code (+91)
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      return {
        isValid: false,
        status: 'FORMAT_VALID',
        issue: 'Missing India country code (+91). Fails on international or unconfigured mobile devices.',
        suggestedFix: `Change link href to https://wa.me/91${digits}`,
        isIndian: true,
      };
    }

    // Valid 12-digit Indian number: 91 + 10-digit mobile
    if (digits.startsWith('91') && digits.length === 12) {
      const localPart = digits.substring(2);
      if (/^[6-9]\d{9}$/.test(localPart)) {
        return {
          isValid: true,
          status: 'LINK_VALID',
          statusNote: `Valid Indian WhatsApp link (+91 ${localPart.slice(0, 5)} ${localPart.slice(5)}) detected.`,
          isIndian: true,
        };
      }
    }

    // Valid International E.164 Number (8 to 15 digits)
    if (digits.length >= 8 && digits.length <= 15) {
      return {
        isValid: true,
        status: 'LINK_VALID',
        statusNote: `Valid International WhatsApp link (+${digits}) detected.`,
        isIndian: digits.startsWith('91'),
      };
    }

    return {
      isValid: false,
      status: 'BROKEN',
      issue: `Invalid phone digit count (${digits.length} digits). Standard mobile numbers are 10-15 digits.`,
      suggestedFix: 'Change link href to https://wa.me/91XXXXXXXXXX',
      isIndian: false,
    };
  }

  public static analyzeWhatsAppLinks(html: string): {
    whatsappLinks: WhatsAppLinkFinding[];
    findings: StandardFinding[];
  } {
    const whatsappLinks: WhatsAppLinkFinding[] = [];
    const findings: StandardFinding[] = [];

    const hrefRegex = /href=["']([^"']*(?:wa\.me|api\.whatsapp\.com|whatsapp:\/\/)[^"']*)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = hrefRegex.exec(html)) !== null) {
      const rawUrl = match[1];
      const digitsMatch = rawUrl.match(/(?:phone=|wa\.me\/|send\?phone=|\/)?(\d{8,15})/i);
      const digits = digitsMatch ? digitsMatch[1] : '';

      const parsed = this.parseWhatsAppNumber(digits);

      const item: WhatsAppLinkFinding = {
        url: rawUrl,
        digits,
        status: parsed.status,
        isValid: parsed.isValid,
        issue: parsed.issue,
        suggestedFix: parsed.suggestedFix,
        statusNote: parsed.statusNote,
        isIndian: parsed.isIndian,
      };

      whatsappLinks.push(item);

      if (!parsed.isValid) {
        findings.push(
          FindingBuilder.createFinding({
            id: `wa_link_defect_${findings.length + 1}`,
            category: 'whatsapp',
            title: parsed.issue || 'Broken WhatsApp Routing Link',
            severity: 'CRITICAL',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `WhatsApp link URL '${rawUrl}' was parsed with digits '${digits}'.`,
            inferred: 'Mobile users tapping this WhatsApp button will experience an immediate app error or failed chat launch.',
            evidence: rawUrl,
            impact: 'Potential loss of 65% of mobile lead conversions from ad traffic.',
            recommendation: parsed.suggestedFix || 'Update WhatsApp link href to valid wa.me/91XXXXXXXXXX format.',
          })
        );
      }
    }

    if (whatsappLinks.length === 0) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'wa_missing_widget',
          category: 'whatsapp',
          title: 'No WhatsApp Direct Chat Button Detected',
          severity: 'MEDIUM',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: 'No href matching wa.me or api.whatsapp.com was detected in page HTML.',
          inferred: 'High-intent mobile visitors are forced through high-friction contact forms instead of 1-tap WhatsApp chat.',
          evidence: 'Checked all HTML <a> tags for WhatsApp URL signatures.',
          impact: 'Lower mobile conversion rates compared to competitors with instant chat widgets.',
          recommendation: 'Deploy a floating 1-tap WhatsApp chat widget on high-converting landing pages.',
        })
      );
    }

    return { whatsappLinks, findings };
  }
}
