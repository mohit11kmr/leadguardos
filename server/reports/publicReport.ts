import type { AuditResult } from '../../src/types';

export interface PublicAuditReport {
  scanId: string;
  publicToken: string;
  targetUrl: string;
  domain: string;
  businessName?: string;
  score: number;
  estimatedMonthlyLoss: number;
  adSpendRisk: string;
  pillars: AuditResult['pillars'];
  allIssues: Array<Pick<AuditResult['allIssues'][number], 'pillar' | 'category' | 'severity' | 'title' | 'description' | 'impact' | 'recommendation' | 'fixSnippet'>>;
  scannedAt: string;
  aiDiagnosticAdvice?: string;
}

export function toPublicAuditReport(report: AuditResult): PublicAuditReport {
  return {
    scanId: report.scanId,
    publicToken: report.publicToken || report.scanId,
    targetUrl: report.targetUrl,
    domain: report.domain,
    businessName: report.businessName,
    score: report.score,
    estimatedMonthlyLoss: report.estimatedMonthlyLoss,
    adSpendRisk: report.adSpendRisk,
    pillars: report.pillars,
    allIssues: (report.allIssues || []).map(issue => ({
      pillar: issue.pillar,
      category: issue.category,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      impact: issue.impact,
      recommendation: issue.recommendation,
      fixSnippet: issue.fixSnippet,
    })),
    scannedAt: report.scannedAt,
    aiDiagnosticAdvice: report.aiDiagnosticAdvice,
  };
}