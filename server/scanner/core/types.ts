export type FindingCategory = 'whatsapp' | 'pixel' | 'ga4' | 'gtm' | 'seo' | 'forms' | 'links' | 'cyber' | 'performance' | 'ecommerce';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type FindingConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type DetectionSource = 'STATIC' | 'RUNTIME' | 'BOTH';

export interface StandardFinding {
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
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ScanOptions {
  allowDemoPreset?: boolean;
  forceLive?: boolean;
  timeoutMs?: number;
  enableBrowserRuntime?: boolean;
  browserTimeoutMs?: number;
}

export interface WhatsAppLinkFinding {
  url: string;
  digits: string;
  status: 'FORMAT_VALID' | 'LINK_VALID' | 'DESTINATION_DETECTED' | 'RUNTIME_INTERACTION_TESTED' | 'BROKEN';
  isValid: boolean;
  issue?: string;
  suggestedFix?: string;
  statusNote?: string;
  isIndian: boolean;
  hasPrefilledText?: boolean;
  prefilledText?: string;
}

export interface PillarScore {
  score: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  findingsCount: number;
}

export interface AuditPillars {
  lead: PillarScore;
  ad: PillarScore;
  seo: PillarScore;
  cyber: PillarScore;
}

export interface RevenueImpactEstimate {
  estimatedMonthlyLossINR: number;
  lowEstimateINR: number;
  highEstimateINR: number;
  breakdown: {
    whatsappLossINR: number;
    phoneLossINR: number;
    pixelAdWasteINR: number;
    seoDeindexLossINR: number;
    ecommerceCartLossINR: number;
    otherLossINR: number;
  };
  assumptions: {
    monthlyVisitors: number;
    ctaClickRatePercent: number;
    leadConversionRatePercent: number;
    avgCustomerValueINR: number;
    monthlyAdSpendINR: number;
  };
  confidence: FindingConfidence;
  formulaDescription: string;
  disclaimer: string;
}

export interface StructuredAuditResult {
  scanId: string;
  userId?: string;
  publicToken: string;
  targetUrl: string;
  domain: string;
  businessName?: string;
  score: number;
  estimatedMonthlyLoss: number;
  revenueImpactRange: {
    lowEstimateINR: number;
    highEstimateINR: number;
  };
  adSpendRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  pillars: AuditPillars;
  findings: StandardFinding[];
  allIssues: any[]; // Backward compatibility helper for frontend
  whatsappLinks: WhatsAppLinkFinding[];
  phoneLinks: any[];
  emailLinks: any[];
  reviewLinks: any[];
  socialLinks: any[];
  metaPixel: any;
  googleTag: any;
  seoPenalty: any;
  cyberShield: any;
  ecommerce?: any;
  lockedIssuesCount: number;
  freeIssue?: any;
  performance: {
    fetchTimeMs: number;
    parseTimeMs: number;
    totalTimeMs: number;
  };
  scannedAt: string;
  aiDiagnosticAdvice?: string;
  isDemo?: boolean;
}
