import { z } from 'zod';
import { apiResponseSchema } from './common';

export const reportSchema = z.object({
  reportId: z.string().min(1),
  scanId: z.string().min(1),
  format: z.enum(['WEB', 'PDF', 'PUBLIC_SHARE', 'JSON']),
  status: z.enum(['READY', 'PENDING', 'FAILED']),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
}).strict();

export const reportShareSchema = z.object({
  token: z.string().min(1),
  scanId: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
  passwordProtected: z.boolean().optional(),
}).strict();

export const billingPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  currency: z.literal('INR'),
  priceINR: z.number().nonnegative(),
  monthlyScans: z.number().int().nonnegative().optional(),
  maxWatchdogTargets: z.number().int().nonnegative().optional(),
  allowExports: z.boolean().optional(),
  allowAdvancedTools: z.boolean().optional(),
}).strict();

export const orderSchema = z.object({
  orderId: z.string().min(1),
  userId: z.string().optional(),
  tierId: z.string().min(1),
  tierName: z.string().min(1),
  amountINR: z.number().nonnegative(),
  currency: z.string().min(1),
  status: z.enum(['CREATED', 'PAYMENT_PENDING', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED']),
  provider: z.string().optional(),
  providerOrderId: z.string().optional(),
  providerPaymentId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
}).strict();

export const paymentWebhookPayloadSchema = z.object({
  id: z.string().min(1).optional(),
  event: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const reportResponseSchema = apiResponseSchema(reportSchema);
export const orderResponseSchema = apiResponseSchema(orderSchema);
