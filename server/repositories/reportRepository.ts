import { scanRepository } from './scanRepository';
import { ScanRecord } from '../storage';

export interface IPublicReportSummary {
  scanId: string;
  publicToken: string;
  domain: string;
  businessName?: string;
  score: number;
  pillars: any;
  allIssues: any[];
  scannedAt: string;
  estimatedMonthlyLoss: number;
  adSpendRisk: string;
  aiDiagnosticAdvice?: string;
}

export class ReportRepository {
  async getPublicReport(idOrToken: string): Promise<IPublicReportSummary | null> {
    const scan = (await scanRepository.getScanById(idOrToken)) || (await scanRepository.getScanByToken(idOrToken));
    if (!scan) return null;

    // Sanitize any internal secrets before sending
    return {
      scanId: scan.scanId,
      publicToken: scan.publicToken || scan.scanId,
      domain: scan.domain,
      businessName: scan.businessName,
      score: scan.score,
      pillars: scan.pillars,
      allIssues: scan.allIssues,
      scannedAt: scan.scannedAt,
      estimatedMonthlyLoss: scan.estimatedMonthlyLoss,
      adSpendRisk: scan.adSpendRisk,
      aiDiagnosticAdvice: scan.aiDiagnosticAdvice,
    };
  }
}

export const reportRepository = new ReportRepository();
