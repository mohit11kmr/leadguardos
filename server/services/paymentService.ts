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

/**
 * Payment event idempotency is handled durably by paymentEventRepository.claim().
 * The previous in-memory Set has been removed — it was lost on process restart.
 *
 * @see server/repositories/paymentEventRepository.ts
 * @deprecated Use paymentEventRepository.claim() directly
 */
export function isEventIdempotent(_eventId: string): boolean {
  // This function is retained for backward compatibility but is a NO-OP.
  // All callers should use paymentEventRepository.claim() instead.
  console.warn('[PaymentService] isEventIdempotent() is deprecated. Use paymentEventRepository.claim() for durable idempotency.');
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
