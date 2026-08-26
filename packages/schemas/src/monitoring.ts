import { z } from 'zod';
import { apiResponseSchema } from './common';

export const monitoringTargetSchema = z.object({
  id: z.string().min(1),
  targetUrl: z.string().url().max(2048),
  domain: z.string().min(1),
  contact: z.string().max(255),
  channel: z.enum(['TELEGRAM', 'WHATSAPP', 'EMAIL']),
  frequency: z.enum(['DAILY', 'HOURLY', 'WEEKLY', '15MIN']),
  status: z.enum(['ACTIVE_TRIAL', 'ACTIVE_SUBSCRIPTION', 'EXPIRED', 'CONVERTED', 'PAUSED', 'CANCELLED']),
  nextCheckAt: z.string().datetime().optional(),
  lastCheckedAt: z.string().datetime().optional(),
  lastScore: z.number().int().min(0).max(100).optional(),
  lastStatus: z.string().optional(),
}).strict();

export const monitoringTargetRequestSchema = z.object({
  targetUrl: z.string().min(1).max(2048),
  contact: z.string().min(1).max(255),
  channel: z.enum(['TELEGRAM', 'WHATSAPP', 'EMAIL']).default('TELEGRAM'),
  frequency: z.enum(['DAILY', 'HOURLY', 'WEEKLY', '15MIN']).default('DAILY'),
}).strict();

export const monitoringTargetResponseSchema = apiResponseSchema(monitoringTargetSchema);
