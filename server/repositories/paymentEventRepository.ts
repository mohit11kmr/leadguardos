import crypto from 'crypto';
import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';

export interface PaymentEventInput {
  provider: string;
  providerEventId: string;
  orderId?: string;
  eventType: string;
  payloadHash: string;
}

class PaymentEventRepository {
  private local = new Set<string>();

  async claim(event: PaymentEventInput): Promise<boolean> {
    if (!event.providerEventId || !event.payloadHash) throw new Error('INVALID_PAYMENT_EVENT');
    if (!isFirebaseConfigured()) {
      if (process.env.NODE_ENV === 'production') throw new Error('PAYMENT_EVENT_STORE_UNAVAILABLE');
      if (this.local.has(`${event.provider}:${event.providerEventId}`)) return false;
      this.local.add(`${event.provider}:${event.providerEventId}`);
      return true;
    }

    const id = crypto.createHash('sha256').update(`${event.provider}:${event.providerEventId}`).digest('hex');
    const ref = getAdminDb().collection('paymentEvents').doc(id);
    return getAdminDb().runTransaction(async (transaction: any) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return false;
      transaction.create(ref, {
        ...event,
        status: 'CLAIMED',
        createdAt: new Date().toISOString(),
        processedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
  }
}

export const paymentEventRepository = new PaymentEventRepository();
