import { StandardFinding } from '../core/types';
import { FindingBuilder } from '../reporting/findingBuilder';

export class SeoDetector {
  public static analyzeSeo(html: string, targetUrl: string, headers?: Record<string, string>): {
    seoPenalty: any;
    findings: StandardFinding[];
  } {
    const findings: StandardFinding[] = [];
    const isHttps = targetUrl.toLowerCase().startsWith('https://');

    // 1. Google Indexing Check (<meta name="robots" content="noindex">)
    const hasNoIndexMeta = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex[^"']*["']/i.test(html);
    const hasNoIndexHeader = headers && headers['x-robots-tag'] && headers['x-robots-tag'].toLowerCase().includes('noindex');
    const hasNoIndex = hasNoIndexMeta || !!hasNoIndexHeader;

    // 2. Comprehensive Canonical Tag Validation
    const canonicalTags: string[] = [];
    const linkRegex = /<link\b[^>]*>/gi;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const tag = linkMatch[0];
      if (/rel=["']canonical["']/i.test(tag)) {
        const hrefMatch = /href=["']([^"']*)["']/i.exec(tag);
        if (hrefMatch) {
          canonicalTags.push(hrefMatch[1].trim());
        }
      }
    }

    let canonicalStatus: 'MISSING' | 'MULTIPLE' | 'MALFORMED' | 'RELATIVE' | 'CROSS_ORIGIN' | 'MISMATCH' | 'CONSISTENT' = 'MISSING';
    const primaryCanonical = canonicalTags[0];

    if (canonicalTags.length === 0) {
      canonicalStatus = 'MISSING';
      findings.push(
        FindingBuilder.createFinding({
          id: 'seo_missing_canonical',
          category: 'seo',
          title: 'Canonical URL Link Tag Missing',
          severity: 'LOW',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: 'No <link rel="canonical"> tag detected in page head.',
          inferred: 'Search engines may index duplicate URL variations (HTTP vs HTTPS, tracking parameters, trailing slash variations) as separate pages.',
          evidence: '<link rel="canonical">: [not present]',
          impact: 'INDEXABILITY RISK: Potential dilution of search ranking signals across duplicate URLs.',
          recommendation: 'Add a self-referential canonical URL tag <link rel="canonical" href="https://example.com/page"> inside <head>.',
        })
      );
    } else if (canonicalTags.length > 1) {
      canonicalStatus = 'MULTIPLE';
      findings.push(
        FindingBuilder.createFinding({
          id: 'seo_multiple_canonical',
          category: 'seo',
          title: 'Multiple Conflicting Canonical Tags Detected',
          severity: 'HIGH',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: `Detected ${canonicalTags.length} distinct canonical link tags: [${canonicalTags.join(', ')}].`,
          inferred: 'Search engine crawlers (Googlebot) may ignore conflicting canonical tags completely or choose an unintended URL.',
          evidence: canonicalTags.join(', '),
          impact: 'CANONICAL CONFIGURATION ISSUE: Unpredictable URL indexing and canonicalization failure.',
          recommendation: 'Remove duplicate canonical link tags so that exactly one canonical directive exists per page.',
        })
      );
    } else {
      const cUrl = primaryCanonical;
      if (!cUrl || cUrl.includes(' ') || (!cUrl.startsWith('http://') && !cUrl.startsWith('https://') && !cUrl.startsWith('/'))) {
        canonicalStatus = 'MALFORMED';
        findings.push(
          FindingBuilder.createFinding({
            id: 'seo_malformed_canonical',
            category: 'seo',
            title: 'Malformed Canonical URL Link Tag',
            severity: 'MEDIUM',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `Canonical href value is malformed: "${cUrl}".`,
            inferred: 'Search crawlers cannot parse the canonical URL.',
            evidence: cUrl,
            impact: 'CANONICAL CONFIGURATION ISSUE: Crawlers will discard invalid canonical link.',
            recommendation: 'Specify a valid absolute URL for the canonical tag (e.g. https://yourdomain.com/path).',
          })
        );
      } else if (cUrl.startsWith('/') || !cUrl.includes('://')) {
        canonicalStatus = 'RELATIVE';
        findings.push(
          FindingBuilder.createFinding({
            id: 'seo_relative_canonical',
            category: 'seo',
            title: 'Relative Canonical URL Specified',
            severity: 'LOW',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `Canonical URL uses relative path: "${cUrl}".`,
            inferred: 'Search engine standards recommend absolute URLs for canonical tags to avoid cross-subdomain ambiguity.',
            evidence: cUrl,
            impact: 'CANONICAL CONFIGURATION ISSUE: Potential ambiguity across protocols or subdomains.',
            recommendation: 'Use a full absolute URL including scheme and domain in the canonical tag.',
          })
        );
      } else {
        try {
          const parsedCanonical = new URL(cUrl);
          const parsedTarget = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);

          if (parsedCanonical.hostname.toLowerCase() !== parsedTarget.hostname.toLowerCase()) {
            canonicalStatus = 'CROSS_ORIGIN';
            findings.push(
              FindingBuilder.createFinding({
                id: 'seo_cross_origin_canonical',
                category: 'seo',
                title: 'Cross-Origin Canonical URL Detected',
                severity: 'MEDIUM',
                confidence: 'HIGH',
                detectedBy: 'STATIC',
                observed: `Canonical URL points to external domain "${parsedCanonical.hostname}" while target is "${parsedTarget.hostname}".`,
                inferred: 'Search engine indexing authority is redirected to the external origin.',
                evidence: `Target: ${targetUrl} → Canonical: ${cUrl}`,
                impact: 'INDEXABILITY RISK: Current domain will not rank if canonical points to another domain.',
                recommendation: 'Verify if cross-domain canonicalization is intentional for syndicated content.',
              })
            );
          } else {
            const normCanonical = `${parsedCanonical.origin}${parsedCanonical.pathname.replace(/\/$/, '')}`;
            const normTarget = `${parsedTarget.origin}${parsedTarget.pathname.replace(/\/$/, '')}`;
            if (normCanonical.toLowerCase() !== normTarget.toLowerCase()) {
              canonicalStatus = 'MISMATCH';
            } else {
              canonicalStatus = 'CONSISTENT';
            }
          }
        } catch {
          canonicalStatus = 'MALFORMED';
        }
      }
    }

    const seoPenalty = {
      hasNoIndex,
      hasNoFollow: /<meta\s+name=["']robots["']\s+content=["'][^"']*nofollow[^"']*["']/i.test(html),
      isHttps,
      canonicalUrl: primaryCanonical,
      canonicalStatus,
      canonicalTags,
      status: hasNoIndex ? 'CRITICAL_PENALTY' : 'HEALTHY',
    };

    if (hasNoIndex) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'seo_noindex_penalty',
          category: 'seo',
          title: 'Critical SEO Indexing Restriction: Active "noindex" Meta Tag Detected',
          severity: 'CRITICAL',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: 'Observed <meta name="robots" content="noindex"> tag or X-Robots-Tag HTTP header.',
          inferred: 'Google Search crawler is instructed to remove this website from search engine results.',
          evidence: hasNoIndexMeta ? 'Found <meta name="robots" content="noindex"> in page HTML.' : 'Found X-Robots-Tag: noindex in server headers.',
          impact: 'INDEXABILITY RISK: Complete suppression of organic search traffic and discovery.',
          recommendation: 'Remove noindex rule from site SEO configuration / CMS settings immediately.',
        })
      );
    }

    if (!isHttps) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'seo_insecure_http',
          category: 'seo',
          title: 'Website Not Served Over Secure HTTPS Encryption',
          severity: 'HIGH',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: `Target URL '${targetUrl}' uses unencrypted HTTP protocol.`,
          inferred: 'Browsers display a prominent "Not Secure" warning in address bar, causing visitor drop-off.',
          evidence: targetUrl,
          impact: 'Lower search engine rankings and visitor mistrust on contact forms.',
          recommendation: 'Install SSL Certificate (Let\'s Encrypt) and force HTTPS redirection.',
        })
      );
    }

    return { seoPenalty, findings };
  }
}
