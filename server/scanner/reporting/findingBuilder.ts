import { StandardFinding, FindingCategory, FindingSeverity, FindingConfidence, DetectionSource } from '../core/types';

export interface CreateFindingParams {
  id: string;
  category: FindingCategory;
  title: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  detectedBy: DetectionSource;
  observed: string;
  inferred: string;
  evidence: string;
  impact: string;
  recommendation: string;
  metadata?: Record<string, any>;
}

export class FindingBuilder {
  public static createFinding(params: CreateFindingParams): StandardFinding {
    return {
      id: params.id,
      category: params.category,
      title: params.title,
      severity: params.severity,
      confidence: params.confidence,
      detectedBy: params.detectedBy,
      observed: params.observed,
      inferred: params.inferred,
      evidence: params.evidence,
      impact: params.impact,
      recommendation: params.recommendation,
      timestamp: new Date().toISOString(),
      metadata: params.metadata || {},
    };
  }

  public static convertToLegacyIssue(finding: StandardFinding): any {
    return {
      id: finding.id,
      pillar: finding.category === 'whatsapp' || finding.category === 'forms' || finding.category === 'links' ? 'LEAD' :
              finding.category === 'pixel' || finding.category === 'ga4' || finding.category === 'gtm' ? 'AD' :
              finding.category === 'seo' ? 'SEO' : 'CYBER',
      category: finding.category,
      severity: finding.severity,
      confidence: finding.confidence,
      ruleId: `RULE-${finding.id.toUpperCase()}`,
      title: finding.title,
      description: `${finding.observed} ${finding.inferred}`,
      evidence: finding.evidence,
      impact: finding.impact,
      fixSnippet: finding.recommendation,
      isLocked: finding.severity === 'CRITICAL' ? false : true,
    };
  }
}
