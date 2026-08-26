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

export function isEventIdempotent(_eventId: string): boolean {
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

export interface StripeSignatureResult {
  valid: boolean;
  reason?: string;
  eventAgeSeconds?: number;
}

const STRIPE_DEFAULT_TOLERANCE_SECONDS = 300;

function parseStripeSecret(secret: string): { timestamp: string; signatures: string[] } | null {
  const parts = secret.split(',');
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (!v) continue;
    if (k === 't') timestamp = v;
    else if (k === 'v1') signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

export function verifyStripeWebhookSignature(
  rawBody: string | Buffer,
  header: string,
  webhookSecret: string,
  toleranceSeconds = STRIPE_DEFAULT_TOLERANCE_SECONDS,
): StripeSignatureResult {
  try {
    if (!rawBody || !header || !webhookSecret) {
      return { valid: false, reason: 'MISSING_INPUTS' };
    }
    const keyMaterial = webhookSecret.startsWith('whsec_') ? webhookSecret.slice(6) : webhookSecret;

    const parsed = parseStripeSecret(header);
    if (!parsed) return { valid: false, reason: 'MALFORMED_SIGNATURE_HEADER' };

    const { timestamp, signatures } = parsed;
    const signedPayload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', keyMaterial).update(signedPayload).digest('hex');

    const matched = signatures.some(sig => {
      try {
        return sig.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      } catch {
        return false;
      }
    });
    if (!matched) return { valid: false, reason: 'SIGNATURE_MISMATCH' };

    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (!Number.isFinite(age)) return { valid: false, reason: 'INVALID_TIMESTAMP' };
    if (Math.abs(age) > toleranceSeconds) {
      return { valid: false, reason: 'TIMESTAMP_OUT_OF_TOLERANCE', eventAgeSeconds: age };
    }
    return { valid: true, eventAgeSeconds: age };
  } catch {
    return { valid: false, reason: 'VERIFICATION_ERROR' };
  }
}

export interface StripeSignatureResult {
  valid: boolean;
  reason?: string;
  eventAgeSeconds?: number;
}

const STRIPE_DEFAULT_TOLERANCE_SECONDS = 300;

import crypto from 'crypto';

export interface CashfreeSignatureResult {
  valid: boolean;
  reason?: string;
  eventAgeSeconds?: number;
}

const CASHFREE_DEFAULT_TOLERANCE_SECONDS = 300;

export function verifyCashfreeWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  clientSecret: string,
  toleranceSeconds = 300,
): CashfreeSignatureResult {
  if (!rawBody || !signature || !clientSecret) {
    return { valid: false, reason: 'MISSING_INPUTS' };
  }
  const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expected = crypto.createHmac('sha256', clientSecret).update(bodyStr).digest('base64');
  const provided = signature.trim();
  if (provided.length !== expected.length) {
    return { valid: false, reason: 'SIGNATURE_LENGTH_MISMATCH' };
  }
  if (!crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    return { valid: false, reason: 'SIGNATURE_MISMATCH' };
  }

  let payload = null;
  try {
    payload = JSON.parse(bodyStr);
  } catch {
    payload = null;
  }

  if (payload) {
    const timestamp = payload?.timestamp || payload?.event_time || payload?.created_at;
    if (timestamp) {
      const eventTime = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
      if (Number.isFinite(eventTime)) {
        const age = Math.floor(Date.now() / 1000) - eventTime;
        if (Math.abs(age) > toleranceSeconds) {
          return { valid: false, reason: 'TIMESTAMP_OUT_OF_TOLERANCE', eventAgeSeconds: age };
        }
        return { valid: true, eventAgeSeconds: age };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'VERIFICATION_ERROR' };
  }
}

export interface CashfreeSignatureResult {
  valid: boolean;
  reason?: string;
  eventAgeSeconds?: number;
}

const CASHFREE_DEFAULT_TOLERANCE_SECONDS = 300;
