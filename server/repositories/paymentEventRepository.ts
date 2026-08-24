import crypto from 'crypto';
import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';

export interface PaymentEventInput {
  provider: string;
  providerEventId: string;
  orderId?: string;
  eventType: string;
  payloadHash: string;
}

export interface PaymentEventRecord extends PaymentEventInput {
  id: string;
  status: 'CLAIMED' | 'PROCESSED';
  createdAt: string;
  processedAt?: string;
}

/**
 * Durable payment event idempotency store.
 * Production authority: Firestore transactional claim.
 * Development fallback: in-memory Map (NOT a Set — stores full record).
 */
class PaymentEventRepository {
  /** @classification CACHE-ONLY in dev, not used in production */
  private local = new Map<string, PaymentEventRecord>();

  /**
   * Attempt to claim a payment event for processing.
   * Returns true if this is the first time (event claimed).
   * Returns false if the event was already processed (idempotent duplicate).
   *
   * In production, uses Firestore transactional create-if-not-exists.
   */
  async claim(event: PaymentEventInput): Promise<boolean> {
    if (!event.providerEventId || !event.payloadHash) {
      throw new Error('INVALID_PAYMENT_EVENT: providerEventId and payloadHash are required');
    }

    const compositeKey = `${event.provider}:${event.providerEventId}`;
    const id = crypto.createHash('sha256').update(compositeKey).digest('hex');

    if (!isFirebaseConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('PAYMENT_EVENT_STORE_UNAVAILABLE: Firestore required in production for payment event idempotency');
      }
      // Development fallback using Map
      if (this.local.has(id)) return false;
      this.local.set(id, {
        ...event,
        id,
        status: 'CLAIMED',
        createdAt: new Date().toISOString(),
      });
      return true;
    }

    const ref = getAdminDb().collection('paymentEvents').doc(id);
    return getAdminDb().runTransaction(async (transaction: any) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return false; // Duplicate — already processed

      const record: PaymentEventRecord = {
        ...event,
        id,
        status: 'CLAIMED',
        createdAt: new Date().toISOString(),
      };

      transaction.create(ref, {
        ...record,
        processedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
  }

  /**
   * Mark a claimed event as fully processed.
   */
  async markProcessed(providerEventId: string, provider: string): Promise<void> {
    const compositeKey = `${provider}:${providerEventId}`;
    const id = crypto.createHash('sha256').update(compositeKey).digest('hex');

    if (isFirebaseConfigured()) {
      await getAdminDb().collection('paymentEvents').doc(id).set(
        { status: 'PROCESSED', processedAt: new Date().toISOString() },
        { merge: true },
      );
    }

    const local = this.local.get(id);
    if (local) {
      local.status = 'PROCESSED';
      local.processedAt = new Date().toISOString();
    }
  }
}

export const paymentEventRepository = new PaymentEventRepository();
