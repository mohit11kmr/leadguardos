import { StandardFinding } from '../core/types';
import { FindingBuilder } from '../reporting/findingBuilder';

export class PerformanceDetector {
  public static analyzePerformance(htmlLength: number, totalTimeMs: number): {
    performance: { fetchTimeMs: number; parseTimeMs: number; totalTimeMs: number };
    findings: StandardFinding[];
  } {
    const findings: StandardFinding[] = [];
    const htmlSizeKB = Math.round(htmlLength / 1024);

    if (totalTimeMs > 4000) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'perf_slow_server_response',
          category: 'performance',
          title: 'Slow Server Response Time (> 4.0 Seconds)',
          severity: 'HIGH',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: `Initial HTML fetch completed in ${(totalTimeMs / 1000).toFixed(2)} seconds.`,
          inferred: 'Mobile visitors on 4G networks experience long blank screen delays before seeing CTA content.',
          evidence: `${totalTimeMs}ms initial response time`,
          impact: 'Bounce rates increase by up to 50% for load times exceeding 3 seconds.',
          recommendation: 'Enable server page caching, gzip compression, and CDN hosting.',
        })
      );
    }

    return {
      performance: {
        fetchTimeMs: Math.round(totalTimeMs * 0.8),
        parseTimeMs: Math.round(totalTimeMs * 0.2),
        totalTimeMs,
      },
      findings,
    };
  }
}
