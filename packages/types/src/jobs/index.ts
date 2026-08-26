import type { ActorContext, AuditFinding } from '../audit';

export type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'RETRYING' | 'DEAD_LETTER' | 'CANCELLED';
export type CurrentJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED' | 'DEAD_LETTER';
export type JobType = 'audit' | 'watchdog' | 'ai' | 'pdf' | 'notification' | 'webhook_delivery';

export interface JobEnvelope<TType extends JobType, TPayload> {
  jobId: string;
  jobType: TType;
  payload: TPayload;
  attempt: number;
  maxAttempts: number;
  createdAt: string;
  correlationId: string;
  idempotencyKey: string;
}

export interface AuditJobPayload {
  targetUrl: string;
  scanId?: string;
  options?: Record<string, unknown>;
  actor?: ActorContext;
}

export interface WatchdogJobPayload {
  targetId: string;
  targetUrl: string;
  scheduledFor: string;
}

export interface AIJobPayload {
  scanId: string;
  findings: AuditFinding[];
  promptVersion: string;
}

export interface PdfJobPayload {
  scanId: string;
  reportVersion?: string;
  actor?: ActorContext;
}

export interface NotificationJobPayload {
  provider: 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';
  recipient: string;
  subject?: string;
  body: string;
  event: string;
  deliveryKey: string;
}

export interface WebhookDeliveryJobPayload {
  webhookId: string;
  eventId: string;
  url: string;
  event: string;
  payload: Record<string, unknown>;
  payloadHash: string;
}

export type AuditJob = JobEnvelope<'audit', AuditJobPayload>;
export type WatchdogJob = JobEnvelope<'watchdog', WatchdogJobPayload>;
export type AIJob = JobEnvelope<'ai', AIJobPayload>;
export type PdfJob = JobEnvelope<'pdf', PdfJobPayload>;
export type NotificationJob = JobEnvelope<'notification', NotificationJobPayload>;
export type WebhookDeliveryJob = JobEnvelope<'webhook_delivery', WebhookDeliveryJobPayload>;
