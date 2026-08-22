import { scanRepository, ScanDocument } from './scanRepository';
import { getAdminDb, isFirebaseConfigured } from '../firebaseAdmin';

export interface SanitizedPublicReport {
  scanId: string;
  publicToken: string;
  mode: 'LIVE' | 'DEMO';
  targetUrl: string;
  domain: string;
  businessName?: string;
  score: number;
  overallScore: number;
  confidence: string;
  pillarScores: {
    leadGen: number;
    adSpend: number;
    seo: number;
    security: number;
  };
  pillars: any;
  whatsappLinks: any[];
  phoneLinks: any[];
  emailLinks: any[];
  reviewLinks: any[];
  socialLinks: any[];
  metaPixel: any;
  googleTag: any;
  seoPenalty: any;
  cyberShield: any;
  ecommerce?: any;
  allIssues: any[];
  lockedIssuesCount: number;
  freeIssue?: any;
  estimatedMonthlyLoss: number;
  adSpendRisk: string;
  scannedAt: string;
  performance: {
    fetchTimeMs: number;
    parseTimeMs: number;
    totalTimeMs: number;
  };
  aiDiagnosticAdvice?: string;
  isPublicReport: true;
}

export class ReportRepository {
  async getPublicReport(token: string): Promise<SanitizedPublicReport | null> {
    if (!token || typeof token !== 'string') return null;

    let scan: ScanDocument | undefined = await scanRepository.getScanByToken(token);

    if (!scan) {
      // Direct lookup in Firestore if token matches scanId as legacy fallback
      scan = await scanRepository.getScanById(token);
    }

    if (!scan) return null;

    // Sanitize any private server or user specific fields before sending over public API
    const sanitized: SanitizedPublicReport = {
      scanId: scan.scanId,
      publicToken: scan.publicToken,
      mode: scan.mode || 'LIVE',
      targetUrl: scan.targetUrl,
      domain: scan.domain,
      businessName: scan.businessName,
      score: scan.overallScore ?? scan.score ?? 0,
      overallScore: scan.overallScore ?? scan.score ?? 0,
      confidence: scan.confidence || 'HIGH',
      pillarScores: scan.pillarScores || {
        leadGen: scan.pillars?.leadGen?.score || 0,
        adSpend: scan.pillars?.adSpend?.score || 0,
        seo: scan.pillars?.seo?.score || 0,
        security: scan.pillars?.security?.score || 0,
      },
      pillars: scan.pillars,
      whatsappLinks: scan.whatsappLinks || [],
      phoneLinks: scan.phoneLinks || [],
      emailLinks: scan.emailLinks || [],
      reviewLinks: scan.reviewLinks || [],
      socialLinks: scan.socialLinks || [],
      metaPixel: scan.metaPixel || {},
      googleTag: scan.googleTag || {},
      seoPenalty: scan.seoPenalty || {},
      cyberShield: scan.cyberShield || {},
      ecommerce: scan.ecommerce,
      allIssues: scan.allIssues || [],
      lockedIssuesCount: scan.lockedIssuesCount || 0,
      freeIssue: scan.freeIssue,
      estimatedMonthlyLoss: scan.estimatedMonthlyLoss || 0,
      adSpendRisk: scan.adSpendRisk || 'LOW',
      scannedAt: scan.scannedAt,
      performance: scan.performance || { fetchTimeMs: 0, parseTimeMs: 0, totalTimeMs: 0 },
      aiDiagnosticAdvice: scan.aiDiagnosticAdvice,
      isPublicReport: true,
    };

    return sanitized;
  }
}

export const reportRepository = new ReportRepository();
