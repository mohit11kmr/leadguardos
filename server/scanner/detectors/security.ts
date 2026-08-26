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

    // CSP Response Header & Meta Tag Analysis
    let cspHeader: string | undefined;
    if (headers) {
      const lowerKeys = Object.keys(headers).reduce((acc, k) => {
        acc[k.toLowerCase()] = headers[k];
        return acc;
      }, {} as Record<string, string>);
      cspHeader = lowerKeys['content-security-policy'];
    }
    if (!cspHeader) {
      const metaCsp = /<meta\s+http-equiv=["']content-security-policy["']\s+content=["']([^"']+)["']/i.exec(html);
      if (metaCsp) cspHeader = metaCsp[1];
    }

    let cspStatus: 'MISSING' | 'WEAK' | 'STRONG' | 'MALFORMED' = 'MISSING';
    const weakReasons: string[] = [];

    if (!cspHeader || !cspHeader.trim()) {
      cspStatus = 'MISSING';
      findings.push(
        FindingBuilder.createFinding({
          id: 'security_missing_csp',
          category: 'cyber',
          title: 'Content Security Policy (CSP) Header Missing',
          severity: 'MEDIUM',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: 'No Content-Security-Policy HTTP header or meta tag detected.',
          inferred: 'Browsers cannot restrict script execution origins, increasing vulnerability to Cross-Site Scripting (XSS).',
          evidence: 'Content-Security-Policy: [not present]',
          impact: 'Higher exposure to unauthorized third-party script execution and data exfiltration.',
          recommendation: 'Configure Content-Security-Policy response header restricting script-src and object-src directives.',
        })
      );
    } else {
      const trimmed = cspHeader.trim();
      const directives = trimmed.split(';').map(d => d.trim()).filter(Boolean);
      if (directives.length === 0) {
        cspStatus = 'MALFORMED';
        findings.push(
          FindingBuilder.createFinding({
            id: 'security_malformed_csp',
            category: 'cyber',
            title: 'Malformed Content Security Policy (CSP) Header',
            severity: 'LOW',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `Content-Security-Policy header contains no valid directives: "${trimmed.slice(0, 100)}".`,
            inferred: 'Browsers may ignore invalid CSP headers.',
            evidence: trimmed.slice(0, 200),
            impact: 'Security policy is non-functional.',
            recommendation: 'Fix CSP header syntax to use standard directive names (e.g. default-src, script-src).',
          })
        );
      } else {
        if (/['"]unsafe-inline['"]/i.test(trimmed)) weakReasons.push("'unsafe-inline' allowed");
        if (/['"]unsafe-eval['"]/i.test(trimmed)) weakReasons.push("'unsafe-eval' allowed");
        if (/(?:default-src|script-src)\s+[^;]*\*/i.test(trimmed)) weakReasons.push('wildcard (*) source permitted');
        if (/script-src\s+[^;]*data:/i.test(trimmed)) weakReasons.push('data: URI permitted in script-src');

        if (weakReasons.length > 0) {
          cspStatus = 'WEAK';
          findings.push(
            FindingBuilder.createFinding({
              id: 'security_weak_csp',
              category: 'cyber',
              title: 'Permissive Content Security Policy (CSP) Directives Detected',
              severity: 'LOW',
              confidence: 'HIGH',
              detectedBy: 'STATIC',
              observed: `CSP contains permissive rules: ${weakReasons.join(', ')}.`,
              inferred: 'Permissive directives allow inline scripts or dynamic code execution, reducing XSS mitigation strength.',
              evidence: trimmed.slice(0, 300),
              impact: 'Reduced defense-in-depth protection against cross-site script injection.',
              recommendation: 'Remove unsafe-inline/unsafe-eval directives and adopt nonce-based or hash-based CSP.',
            })
          );
        } else {
          cspStatus = 'STRONG';
        }
      }
    }

    const hasSpam = spamKeywordsFound.length > 0;
    let score = hasSpam ? 45 : obfuscatedScriptsDetected ? 60 : 98;
    if (cspStatus === 'MISSING') score = Math.max(30, score - 8);
    else if (cspStatus === 'WEAK') score = Math.max(30, score - 3);

    const cyberShield = {
      score,
      spamGamblingDetected: hasSpam,
      spamKeywordsFound,
      obfuscatedScriptsDetected,
      base64HeavyScriptsCount: 0,
      hiddenIframesCount,
      suspiciousRedirectDetected: false,
      cspStatus,
      cspHeaderValue: cspHeader ? cspHeader.slice(0, 500) : undefined,
      riskLevel: hasSpam ? 'CRITICAL_RISK' : obfuscatedScriptsDetected ? 'SUSPICIOUS' : cspStatus === 'MISSING' ? 'ATTENTION_NEEDED' : 'CLEAN',
      diagnosis: hasSpam
        ? 'Suspicious keyword patterns associated with spam/gambling detected.'
        : obfuscatedScriptsDetected
        ? 'Obfuscated script patterns detected.'
        : cspStatus === 'MISSING'
        ? 'Clean content signature, but Content Security Policy (CSP) header is missing.'
        : 'Clean security signature with active Content Security Policy.',
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
