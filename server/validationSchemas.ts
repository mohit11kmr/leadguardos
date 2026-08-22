import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const scanRequestSchema = z.object({
  url: z.string().trim().min(3, 'URL must be at least 3 characters').max(2048, 'URL exceeds maximum length'),
});

export const authSyncRequestSchema = z.object({
  displayName: z.string().trim().max(100).optional(),
  photoURL: z.string().url().max(1000).optional().or(z.literal('')),
});

export const watchdogSubscribeSchema = z.object({
  targetUrl: z.string().trim().min(3, 'Target URL is required').max(2048),
  contact: z.string().trim().min(3, 'Contact destination is required').max(200),
  channel: z.enum(['TELEGRAM', 'WHATSAPP', 'EMAIL', 'SLACK']).default('TELEGRAM'),
  frequency: z.enum(['15MIN', 'HOURLY', 'DAILY', 'WEEKLY']).default('DAILY'),
});

export const watchdogUpdateSchema = z.object({
  contact: z.string().trim().min(3).max(200).optional(),
  channel: z.enum(['TELEGRAM', 'WHATSAPP', 'EMAIL', 'SLACK']).optional(),
  frequency: z.enum(['15MIN', 'HOURLY', 'DAILY', 'WEEKLY']).optional(),
  status: z.enum(['ACTIVE_TRIAL', 'ACTIVE_SUBSCRIPTION', 'PAUSED', 'EXPIRED']).optional(),
});

export const webhookRegisterSchema = z.object({
  name: z.string().trim().min(1, 'Webhook name is required').max(100),
  url: z.string().trim().url('Valid destination HTTP/HTTPS URL is required').max(2048),
  events: z.array(z.string().min(1)).min(1, 'At least one event trigger is required').default(['watchdog.incident_detected']),
});

export const webhookTestSchema = z.object({
  webhookId: z.string().trim().optional(),
  url: z.string().trim().url('Valid destination URL is required').max(2048).optional(),
  secret: z.string().trim().max(200).optional(),
}).refine(data => !!data.webhookId || !!data.url, {
  message: 'Either webhookId or a valid destination URL is required',
  path: ['url'],
});

export const orderCreateSchema = z.object({
  tierId: z.string().trim().min(1).default('tier-express-fix'),
  tierName: z.string().trim().min(1).default('Express Fix'),
  amountINR: z.number().positive('Amount must be positive').default(4999),
  paymentMethod: z.string().trim().default('UPI'),
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z.string().trim().max(30).optional(),
  customerEmail: z.string().trim().email('Valid customer email is required').optional(),
  domain: z.string().trim().max(200).optional(),
});

export const orderVerifySchema = z.object({
  orderId: z.string().trim().min(1, 'Order ID is required'),
  paymentReference: z.string().trim().min(1, 'Payment reference is required'),
  provider: z.enum(['RAZORPAY', 'STRIPE', 'CASHFREE', 'UPI_MANUAL', 'SANDBOX']).default('UPI_MANUAL'),
  signature: z.string().trim().optional(),
  providerOrderId: z.string().trim().optional(),
});

export const competitorScanSchema = z.object({
  myUrl: z.string().trim().min(3, 'Your website URL is required').max(2048),
  competitorUrls: z.array(z.string().trim().min(3).max(2048)).min(1, 'At least 1 competitor URL is required').max(10, 'Maximum 10 competitor URLs allowed per batch'),
});

export const batchScanSchema = z.object({
  urls: z.array(z.string().trim().min(3).max(2048)).min(1, 'At least 1 URL required').max(500, 'Maximum 500 URLs per batch'),
});

export const pitchGeneratorSchema = z.object({
  clientName: z.string().trim().max(100).default('Founder'),
  businessName: z.string().trim().max(150).default('your business'),
  auditSummary: z.string().trim().max(1000).default('Conversion funnel and tracking leaks'),
  tone: z.string().trim().max(50).default('direct_urgent'),
  language: z.string().trim().max(50).default('hinglish'),
});

export const adminSetRoleSchema = z.object({
  uid: z.string().trim().min(1, 'Target UID is required'),
  role: z.enum(['USER', 'AGENCY', 'ADMIN']),
});

// ---------------------------------------------------------------------------
// Validation Middleware Helper
// ---------------------------------------------------------------------------
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          details: result.error.issues,
        },
      });
    }
    req.body = result.data;
    next();
  };
}
