import { z } from 'zod';

const actorSchema = z.object({
  actorId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  authSource: z.enum(['app-jwt', 'legacy-jwt', 'firebase', 'api-key', 'anonymous']),
}).strict().optional();

const jobEnvelope = z.object({
  jobId: z.string().min(1),
  attempt: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  createdAt: z.string().datetime(),
  correlationId: z.string().min(1),
  idempotencyKey: z.string().min(1),
}).strict();

export const auditJobSchema = jobEnvelope.extend({
  jobType: z.literal('audit'),
  payload: z.object({ targetUrl: z.string().min(1).max(2048), scanId: z.string().optional(), options: z.record(z.string(), z.unknown()).optional(), actor: actorSchema }).strict(),
});
export const watchdogJobSchema = jobEnvelope.extend({
  jobType: z.literal('watchdog'),
  payload: z.object({ targetId: z.string().min(1), targetUrl: z.string().url(), scheduledFor: z.string().datetime() }).strict(),
});
export const aiJobSchema = jobEnvelope.extend({
  jobType: z.literal('ai'),
  payload: z.object({ scanId: z.string().min(1), findings: z.array(z.record(z.string(), z.unknown())), promptVersion: z.string().min(1) }).strict(),
});
export const pdfJobSchema = jobEnvelope.extend({
  jobType: z.literal('pdf'),
  payload: z.object({ scanId: z.string().min(1), reportVersion: z.string().optional(), actor: actorSchema }).strict(),
});
export const notificationJobSchema = jobEnvelope.extend({
  jobType: z.literal('notification'),
  payload: z.object({ provider: z.enum(['EMAIL', 'TELEGRAM', 'WHATSAPP']), recipient: z.string().min(1), subject: z.string().optional(), body: z.string().min(1), event: z.string().min(1), deliveryKey: z.string().min(1) }).strict(),
});
export const webhookDeliveryJobSchema = jobEnvelope.extend({
  jobType: z.literal('webhook_delivery'),
  payload: z.object({ webhookId: z.string().min(1), eventId: z.string().min(1), url: z.string().url(), event: z.string().min(1), payload: z.record(z.string(), z.unknown()), payloadHash: z.string().min(1) }).strict(),
});

export const anyJobSchema = z.discriminatedUnion('jobType', [auditJobSchema, watchdogJobSchema, aiJobSchema, pdfJobSchema, notificationJobSchema, webhookDeliveryJobSchema]);
