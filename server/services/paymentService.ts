import crypto from 'crypto';

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
  status: 'CREATED' | 'PAYMENT_PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  providerOrderId?: string;
  providerPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export const TIER_PRICING: Record<string, { tierName: string; priceINR: number }> = {
  'tier-express-fix': { tierName: 'Express 15-Min Lead Leak Fix', priceINR: 4999 },
  'tier-agency-pro': { tierName: 'Agency Pro Radar & White Label', priceINR: 14999 },
  'tier-watchdog-annual': { tierName: '24/7 Watchdog Annual Shield', priceINR: 9999 },
};

export function calculateTierPrice(tierId: string): { tierName: string; priceINR: number } {
  const item = TIER_PRICING[tierId];
  if (!item) {
    return { tierName: 'Custom Audit Shield', priceINR: 4999 };
  }
  return item;
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
