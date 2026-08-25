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

// ─── Stripe Webhook Signature Verification (official algorithm) ────────────────
// Implements Stripe's documented scheme: signed payload is
// `{timestamp}.{rawBody}`, HMAC-SHA256 with the webhook secret (whsec_...),
// compared against the v1 signature using timing-safe equality.
// Tolerance window rejects replayed events.

export interface StripeSignatureResult {
  valid: boolean;
  reason?: string;
  eventAgeSeconds?: number;
}

const STRIPE_DEFAULT_TOLERANCE_SECONDS = 300; // 5 minutes per Stripe docs

function parseStripeSecret(secret: string): { timestamp: string; signatures: string[] } | null {
  // Format: "t=1614556800,v1=5257a869...,v1=..."
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
    // Strip whsec_ prefix if present — the signing key material follows it.
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

// ─── Cashfree Webhook Signature Verification (official algorithm) ──────────────
// Cashfree App/Prod webhooks sign the RAW body with base64(HMAC-SHA256(body,
// client_secret)) delivered in `x-webhook-signature` (v2/v3) — verified
// byte-for-byte with timing-safe comparison.

export function verifyCashfreeWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  clientSecret: string,
): boolean {
  try {
    if (!rawBody || !signature || !clientSecret) return false;
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = crypto.createHmac('sha256', clientSecret).update(bodyStr).digest('base64');
    const provided = signature.trim();
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}
