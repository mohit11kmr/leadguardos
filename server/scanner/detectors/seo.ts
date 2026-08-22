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

    // 2. Canonical Tag Consistency Check
    const canonicalMatch = /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i.exec(html);
    const canonicalUrl = canonicalMatch ? canonicalMatch[1] : undefined;

    const seoPenalty = {
      hasNoIndex,
      hasNoFollow: /<meta\s+name=["']robots["']\s+content=["'][^"']*nofollow[^"']*["']/i.test(html),
      isHttps,
      canonicalUrl,
      status: hasNoIndex ? 'CRITICAL_PENALTY' : 'HEALTHY',
    };

    if (hasNoIndex) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'seo_noindex_penalty',
          category: 'seo',
          title: 'Critical SEO Penalty: Active "noindex" Meta Tag Detected',
          severity: 'CRITICAL',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: 'Observed <meta name="robots" content="noindex"> tag or X-Robots-Tag HTTP header.',
          inferred: 'Google Search crawler is instructed to actively remove and hide this website from search engine results.',
          evidence: hasNoIndexMeta ? 'Found <meta name="robots" content="noindex"> in page HTML.' : 'Found X-Robots-Tag: noindex in server headers.',
          impact: '100% loss of organic Google Search traffic and local brand discovery.',
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
