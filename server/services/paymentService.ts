import crypto from 'crypto';
import { calculateTierPrice as calculateServerTierPrice, CENTRALIZED_PRICING_CATALOG } from '../config/pricing';

export interface Order {
  orderId: string;
  userId?: string;
  tierId: string;
  tierName: string;
  amountINR: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  domain?: string;
  status: 'CREATED' | 'PAYMENT_PENDING' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  providerOrderId?: string;
  providerPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory idempotency key cache for payment webhooks
const processedPaymentEvents = new Set<string>();

export function isEventIdempotent(eventId: string): boolean {
  if (processedPaymentEvents.has(eventId)) {
    return false; // Event already processed
  }
  processedPaymentEvents.add(eventId);
  return true;
}

export function calculateTierPrice(tierId: string): { tierName: string; priceINR: number } {
  const result = calculateServerTierPrice(tierId);
  return {
    tierName: result.config.name,
    priceINR: result.amountINR,
  };
}

export function generateRazorpaySignature(orderId: string, paymentId: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature) return false;
  const expectedSig = generateRazorpaySignature(orderId, paymentId, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export function isPaymentBoundToOrder(orderId: string, providerOrderId: string, storedProviderOrderId?: string): boolean {
  return Boolean(orderId && providerOrderId && providerOrderId === (storedProviderOrderId || orderId));
}

export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) return false;
  try {
    const payloadStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadStr)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export const verifyWebhookSignature = verifyRazorpayWebhookSignature;
