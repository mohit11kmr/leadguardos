import { StandardFinding, AuditPillars, PillarScore } from '../core/types';

export class ScoringEngine {
  public static calculateScores(findings: StandardFinding[]): {
    overallScore: number;
    pillars: AuditPillars;
    adSpendRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  } {
    let leadDeductions = 0;
    let adDeductions = 0;
    let seoDeductions = 0;
    let cyberDeductions = 0;

    let leadCount = 0;
    let adCount = 0;
    let seoCount = 0;
    let cyberCount = 0;

    for (const f of findings) {
      const deduction = f.severity === 'CRITICAL' ? 35 : f.severity === 'HIGH' ? 20 : f.severity === 'MEDIUM' ? 10 : 5;

      switch (f.category) {
        case 'whatsapp':
        case 'forms':
        case 'links':
          leadDeductions += deduction;
          leadCount++;
          break;

        case 'pixel':
        case 'ga4':
        case 'gtm':
          adDeductions += deduction;
          adCount++;
          break;

        case 'seo':
          seoDeductions += deduction;
          seoCount++;
          break;

        case 'cyber':
        case 'performance':
        default:
          cyberDeductions += deduction;
          cyberCount++;
          break;
      }
    }

    const leadScore = Math.max(10, Math.min(100, 100 - leadDeductions));
    const adScore = Math.max(10, Math.min(100, 100 - adDeductions));
    const seoScore = Math.max(10, Math.min(100, 100 - seoDeductions));
    const cyberScore = Math.max(10, Math.min(100, 100 - cyberDeductions));

    // Weighted 4-Pillar Score: Lead (35%), Ad (25%), SEO (20%), Cyber (20%)
    const overallScore = Math.round(
      leadScore * 0.35 + adScore * 0.25 + seoScore * 0.20 + cyberScore * 0.20
    );

    const pillars: AuditPillars = {
      lead: {
        score: leadScore,
        status: leadScore < 60 ? 'CRITICAL' : leadScore < 80 ? 'WARNING' : 'HEALTHY',
        findingsCount: leadCount,
      },
      ad: {
        score: adScore,
        status: adScore < 60 ? 'CRITICAL' : adScore < 80 ? 'WARNING' : 'HEALTHY',
        findingsCount: adCount,
      },
      seo: {
        score: seoScore,
        status: seoScore < 60 ? 'CRITICAL' : seoScore < 80 ? 'WARNING' : 'HEALTHY',
        findingsCount: seoCount,
      },
      cyber: {
        score: cyberScore,
        status: cyberScore < 60 ? 'CRITICAL' : cyberScore < 80 ? 'WARNING' : 'HEALTHY',
        findingsCount: cyberCount,
      },
    };

    const adSpendRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
      adScore < 40 || leadScore < 40 ? 'CRITICAL' :
      adScore < 70 || leadScore < 70 ? 'HIGH' :
      overallScore < 80 ? 'MEDIUM' : 'LOW';

    return { overallScore, pillars, adSpendRisk };
  }
}
