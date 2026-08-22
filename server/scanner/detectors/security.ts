import { StandardFinding } from '../core/types';
import { FindingBuilder } from '../reporting/findingBuilder';

export class SecurityDetector {
  public static analyzeSecurity(html: string, headers?: Record<string, string>): {
    cyberShield: any;
    findings: StandardFinding[];
  } {
    const findings: StandardFinding[] = [];
    const spamKeywordsFound: string[] = [];

    // Heuristic detection: Spam gambling / adult keywords
    const spamRegex = /\b(online-casino|satta-matka|slot-gacor|buy-pills-online|gambling-bonus)\b/gi;
    let match: RegExpExecArray | null;
    while ((match = spamRegex.exec(html)) !== null) {
      if (!spamKeywordsFound.includes(match[1])) {
        spamKeywordsFound.push(match[1]);
      }
    }

    const obfuscatedScriptsDetected = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)/i.test(html);
    const hiddenIframesCount = (html.match(/<iframe\b[^>]*style=["'][^"']*display:\s*none[^"']*["']/gi) || []).length;

    const hasSpam = spamKeywordsFound.length > 0;
    const score = hasSpam ? 45 : obfuscatedScriptsDetected ? 60 : 98;

    const cyberShield = {
      score,
      spamGamblingDetected: hasSpam,
      spamKeywordsFound,
      obfuscatedScriptsDetected,
      base64HeavyScriptsCount: 0,
      hiddenIframesCount,
      suspiciousRedirectDetected: false,
      riskLevel: hasSpam ? 'CRITICAL_RISK' : obfuscatedScriptsDetected ? 'SUSPICIOUS' : 'CLEAN',
      diagnosis: hasSpam ? 'Suspicious keyword patterns associated with spam/gambling detected.' : 'Clean security signature.',
    };

    if (hasSpam) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'security_spam_keywords',
          category: 'cyber',
          title: 'Suspicious Keyword Pattern Detected in Page Content',
          severity: 'HIGH',
          confidence: 'MEDIUM',
          detectedBy: 'STATIC',
          observed: `Detected keywords: [${spamKeywordsFound.join(', ')}].`,
          inferred: 'Content signature matches patterns associated with SEO spam injections or compromised scripts.',
          evidence: spamKeywordsFound.join(', '),
          impact: 'Risk of Google search penalty or security blacklist.',
          recommendation: 'Audit page source and CMS plugins for compromised script injections.',
        })
      );
    }

    return { cyberShield, findings };
  }
}
