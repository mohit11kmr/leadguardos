export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
  aiReady?: boolean;
  monitorsCount?: number;
}

export interface FeatureRegistryResponse {
  features: Array<Record<string, unknown>>;
  totalFeatures: number;
  productionReady?: number;
}

export interface AuditRequest {
  url: string;
}

export interface AuditHistoryResponse {
  history: unknown[];
}

export interface MonitoringListResponse {
  activeMonitors: unknown[];
  totalCount: number;
  recentChecks: unknown[];
}

export interface PublicReportResponse {
  scanId: string;
  domain: string;
  score: number;
  pillars: Record<string, unknown>;
  allIssues: unknown[];
  scannedAt: string;
}
