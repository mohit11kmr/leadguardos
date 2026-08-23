export type LinkStatus = 'WORKING' | 'BROKEN' | 'MISSING' | 'DETECTED';
export type PillarType = 'LEAD' | 'AD' | 'SEO' | 'CYBER' | 'ECOMMERCE';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface WhatsAppLinkInfo {
  url: string;
  status: LinkStatus;
  issue?: string;
  statusNote?: string;
  isValid: boolean;
  suggestedFix?: string;
  digits?: string;
  hasPrefilledText?: boolean;
  prefilledText?: string;
  zeroIntentLeak?: boolean;
}

export interface EcommerceInfo {
  isEcommerce: boolean;
  platform?: 'Shopify' | 'WooCommerce' | 'Magento' | 'BigCommerce' | 'Custom' | 'None';
  cartLinksCount: number;
  checkoutStatus: 'HEALTHY' | 'CRITICAL_LEAK' | 'MISSING' | 'NOT_APPLICABLE';
  cartAbandonmentRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cartButtons: { text: string; href?: string; status: 'WORKING' | 'BROKEN' | 'MISSING' }[];
  issue?: string;
  suggestedFix?: string;
}

export interface CompetitorSabotageOpportunity {
  competitorUrl: string;
  domain: string;
  sabotageScore: number; // 0-100 (higher means bigger vulnerability to exploit)
  opportunities: {
    type: 'MISSING_PIXEL' | 'BROKEN_WHATSAPP' | 'NOINDEX_SEO' | 'BROKEN_DIALER' | 'ZERO_INTENT';
    title: string;
    cta: string;
    impact: string;
    severity: 'HIGH' | 'CRITICAL' | 'MEDIUM';
  }[];
  verdict: string;
}

export interface HunterProspect {
  scanId: string;
  targetUrl: string;
  domain: string;
  businessName: string;
  score: number;
  estimatedMonthlyLoss: number;
  adSpendRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  whatsappStatus: 'WORKING' | 'BROKEN' | 'ZERO_INTENT' | 'MISSING';
  metaPixelStatus: 'HEALTHY' | 'MISSING';
  ecommerceStatus?: 'HEALTHY' | 'CRITICAL_LEAK' | 'NONE';
  primaryLeak: string;
  shareableReportUrl: string;
  coldWhatsAppPitch: string;
  coldEmailPitch: string;
  scannedAt: string;
}

export interface PhoneLinkInfo {
  url: string;
  status: LinkStatus;
  issue?: string;
  isValid: boolean;
  suggestedFix?: string;
  number?: string;
}

export interface EmailLinkInfo {
  url: string;
  status: LinkStatus;
  isValid: boolean;
  issue?: string;
}

export interface ReviewLinkInfo {
  url: string;
  platform: string;
  status: LinkStatus;
  isValid: boolean;
  issue?: string;
}

export interface SocialLinkInfo {
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'other';
  url: string;
  status: LinkStatus;
  isValid: boolean;
}

export interface MetaPixelInfo {
  exists: boolean;
  pixelId?: string;
  duplicate: boolean;
  status: 'HEALTHY' | 'MISSING' | 'DUPLICATE';
  issue?: string;
  impactNote?: string;
  confidence?: number;
}

export interface GoogleTagInfo {
  exists: boolean;
  tagId?: string;
  status: 'HEALTHY' | 'MISSING';
  issue?: string;
  confidence?: number;
}

export interface SeoPenaltyInfo {
  hasNoIndex: boolean;
  hasNoFollow: boolean;
  isHttps: boolean;
  hasCanonical?: boolean;
  canonicalUrl?: string;
  hasOgTags?: boolean;
  status: 'CRITICAL_PENALTY' | 'WARNING' | 'HEALTHY';
  issue?: string;
}

export interface CyberShieldInfo {
  score: number;
  spamGamblingDetected: boolean;
  spamKeywordsFound: string[];
  obfuscatedScriptsDetected: boolean;
  base64HeavyScriptsCount: number;
  hiddenIframesCount: number;
  suspiciousRedirectDetected: boolean;
  redirectDetails?: string;
  riskLevel: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  diagnosis: string;
}

export interface PillarScoreData {
  pillar: PillarType;
  title: string;
  score: number; // 0-100
  weight: number; // e.g. 0.35, 0.20, 0.20, 0.25
  criticalCount: number;
  warningCount: number;
  validCount: number;
  diagnosis: string;
  statusText: string;
}

export interface AuditIssue {
  id: string;
  pillar: PillarType;
  category: 'whatsapp' | 'phone' | 'pixel' | 'seo' | 'reviews' | 'email' | 'ecommerce' | 'cyber';
  severity: FindingSeverity;
  ruleId?: string;
  title: string;
  description: string;
  impact: string;
  evidence?: string | Record<string, any>;
  technical?: string;
  recommendation?: string;
  fixSnippet: string;
  confidence?: number;
  isLocked: boolean;
}

export interface AuditResult {
  scanId: string;
  publicToken?: string;
  targetUrl: string;
  domain: string;
  businessName?: string;
  score: number;
  estimatedMonthlyLoss: number;
  adSpendRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  
  // 4 Pillar Scores
  pillars: {
    lead: PillarScoreData;
    ad: PillarScoreData;
    seo: PillarScoreData;
    cyber: PillarScoreData;
  };

  // Detailed channels
  whatsappLinks: WhatsAppLinkInfo[];
  phoneLinks: PhoneLinkInfo[];
  emailLinks: EmailLinkInfo[];
  reviewLinks: ReviewLinkInfo[];
  socialLinks: SocialLinkInfo[];
  metaPixel: MetaPixelInfo;
  googleTag: GoogleTagInfo;
  seoPenalty: SeoPenaltyInfo;
  cyberShield: CyberShieldInfo;
  ecommerce?: EcommerceInfo;
  
  // Findings
  allIssues: AuditIssue[];
  lockedIssuesCount: number;
  freeIssue?: AuditIssue;
  
  performance: {
    fetchTimeMs: number;
    parseTimeMs: number;
    totalTimeMs: number;
  };
  scannedAt: string;
  aiDiagnosticAdvice?: string;
  aiRemediation?: {
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    content?: string;
    error?: string;
    updatedAt: string;
  };
}

export interface WatchdogLead {
  id: string;
  targetUrl: string;
  contact: string;
  channel: 'TELEGRAM' | 'WHATSAPP' | 'EMAIL';
  frequency?: 'DAILY' | 'WEEKLY' | 'HOURLY';
  createdAt: string;
  trialExpiresAt: string;
  status: 'ACTIVE_TRIAL' | 'ACTIVE_SUBSCRIPTION' | 'EXPIRED' | 'CONVERTED';
}

export interface WidgetCustomization {
  phoneNumber: string;
  businessName: string;
  tagline: string;
  welcomeMessage: string;
  prefilledMessage: string;
  brandColor: string;
  position: 'bottom-right' | 'bottom-left';
  avatarUrl: string;
  showBadge: boolean;
  badgeText: string;
  autoOpenDelay: number;
}

export interface GlobalScanStats {
  totalScannedSites: number;
  problemsFound: number;
  healthySites: number;
  fixedByLeadGuard: number;
  lastUpdated: string;
}


