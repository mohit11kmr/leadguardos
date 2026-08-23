import { scanRepository } from './scanRepository';
import { ScanRecord } from '../storage';
import { toPublicAuditReport } from '../reports/publicReport';

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
    return toPublicAuditReport(scan as any);
  }
}

export const reportRepository = new ReportRepository();
