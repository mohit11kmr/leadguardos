export type ActorRole = 'USER' | 'AGENCY' | 'ADMIN';
export type AuthSource = 'app-jwt' | 'legacy-jwt' | 'firebase' | 'api-key' | 'anonymous';
export type AuditMode = 'LIVE' | 'DEMO';
export type AuditStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type FindingCategory = 'whatsapp' | 'phone' | 'pixel' | 'ga4' | 'seo' | 'cyber' | 'performance' | 'forms' | 'reviews' | 'email' | 'ecommerce';
export type PillarName = 'lead' | 'ad' | 'seo' | 'cyber';

export interface ActorContext {
  actorId?: string;
  email?: string;
  role?: ActorRole;
  organizationId?: string;
  sessionId?: string;
  authSource: AuthSource;
  requestId?: string;
}

export interface PillarScore {
  score: number;
  status?: string;
  findingsCount?: number;
  weight?: number;
}

export interface AuditFinding {
  id: string;
  pillar: Uppercase<PillarName> | 'ECOMMERCE';
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  impact: string;
  evidence?: string | Record<string, unknown>;
  affectedUrls?: string[];
  recommendation?: string;
  ruleId?: string;
  confidence?: number | string;
  detectedBy?: string;
  isLocked?: boolean;
  fixSnippet?: string;
}

export interface BusinessImpact {
  estimatedMonthlyLoss?: number;
  estimatedLeadsAtRisk?: number;
  criticalIssueCount: number;
  measured?: Record<string, number>;
  estimated?: Record<string, number>;
  derived?: Record<string, number | string>;
}

export interface AuditResult {
  contractVersion: 'v6.audit.v1';
  scanId: string;
  domain: string;
  targetUrl: string;
  status: AuditStatus;
  mode: AuditMode;
  scannerVersion: string;
  overallScore: number;
  pillarScores: Record<PillarName, PillarScore>;
  findings: AuditFinding[];
  businessImpact: BusinessImpact;
  createdAt: string;
  completedAt?: string;
}

export interface ScanContext {
  scanId?: string;
  targetUrl: string;
  normalizedUrl?: string;
  domain?: string;
  mode: AuditMode;
  actor?: ActorContext;
  timeoutMs?: number;
  requestId?: string;
}

export interface DetectorInput {
  context: ScanContext;
  html?: string;
  responseHeaders?: Record<string, string>;
  extractedData?: Record<string, unknown>;
}

export interface DetectorOutput {
  detector: string;
  findings: AuditFinding[];
  evidence?: Record<string, unknown>;
  completedAt: string;
}

export interface ScoreInput {
  findings: AuditFinding[];
  pillarScores?: Record<PillarName, PillarScore>;
  measured?: Record<string, number>;
}

export interface ScoreResult {
  overallScore: number;
  pillarScores: Record<PillarName, PillarScore>;
  businessImpact: BusinessImpact;
}

export interface MonitoringTarget {
  id: string;
  targetUrl: string;
  domain: string;
  contact: string;
  channel: 'TELEGRAM' | 'WHATSAPP' | 'EMAIL';
  frequency: 'DAILY' | 'HOURLY' | 'WEEKLY' | '15MIN';
  status: 'ACTIVE_TRIAL' | 'ACTIVE_SUBSCRIPTION' | 'EXPIRED' | 'CONVERTED' | 'PAUSED' | 'CANCELLED';
  nextCheckAt?: string;
  lastCheckedAt?: string;
  lastScore?: number;
  lastStatus?: string;
}

export type MonitoringStatus = 'OK' | 'INCIDENT_OPEN' | 'COOLDOWN';

export interface Report {
  reportId: string;
  scanId: string;
  format: 'WEB' | 'PDF' | 'PUBLIC_SHARE' | 'JSON';
  status: 'READY' | 'PENDING' | 'FAILED';
  createdAt: string;
  expiresAt?: string;
}

export interface ReportShare {
  token: string;
  scanId: string;
  expiresAt?: string;
  passwordProtected?: boolean;
}

export interface BillingPlan {
  id: string;
  name: string;
  currency: 'INR';
  priceINR: number;
  monthlyScans?: number;
  maxWatchdogTargets?: number;
  allowExports?: boolean;
  allowAdvancedTools?: boolean;
}

export interface Order {
  orderId: string;
  userId?: string;
  tierId: string;
  tierName: string;
  amountINR: number;
  currency: string;
  status: 'CREATED' | 'PAYMENT_PENDING' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  provider?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  provider: string;
  providerPaymentId: string;
  amountExpected: number;
  amountReceived?: number;
  currency: string;
  status: 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  signatureValid: boolean;
}

export interface Entitlement {
  id: string;
  subjectId: string;
  feature: string;
  source: 'PURCHASE' | 'SUBSCRIPTION' | 'TRIAL' | 'ADMIN_GRANT';
  granted: boolean;
  expiresAt?: string;
}

export interface Webhook {
  id: string;
  ownerId?: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
}
