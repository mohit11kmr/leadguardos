import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';
import { auditRepository } from './auditRepository';

export interface FulfillmentRecord {
  fulfillmentId: string;
  orderId: string;
  type: 'EXPRESS_FIX' | 'WATCHDOG_SUBSCRIPTION' | 'AGENCY_LICENSE' | 'GENERIC';
  status: 'PENDING' | 'ACTIVATED' | 'FAILED';
  activatedAt?: string;
  createdAt: string;
  userId?: string;
  tierId?: string;
}

/**
 * Durable fulfillment repository.
 * Ensures each paid order triggers fulfillment ONLY ONCE, even across
 * process restarts and duplicate webhook deliveries.
 */
class FulfillmentRepository {
  /** @classification CACHE-ONLY — Firestore is the authority in production */
  private localFulfillments = new Map<string, FulfillmentRecord>();

  /**
   * Attempt to claim fulfillment for an order.
   * Returns the fulfillment record if this is the FIRST claim.
   * Returns null if fulfillment was already activated (idempotent).
   *
   * Uses Firestore transactional create-if-not-exists in production.
   */
  async claimFulfillment(
    orderId: string,
    type: FulfillmentRecord['type'],
    userId?: string,
    tierId?: string,
  ): Promise<FulfillmentRecord | null> {
    const fulfillmentId = `ful_${orderId}`;
    const now = new Date().toISOString();

    if (isFirebaseConfigured()) {
      const db = getAdminDb();
      const ref = db.collection('fulfillments').doc(fulfillmentId);

      const claimed = await db.runTransaction(async (transaction: any) => {
        const existing = await transaction.get(ref);
        if (existing.exists) {
          return null; // Already fulfilled — idempotent success
        }

        const record: FulfillmentRecord = {
          fulfillmentId,
          orderId,
          type,
          status: 'ACTIVATED',
          activatedAt: now,
          createdAt: now,
          userId,
          tierId,
        };

        transaction.create(ref, {
          ...record,
          serverTimestamp: FieldValue.serverTimestamp(),
        });

        return record;
      });

      if (claimed) {
        this.localFulfillments.set(fulfillmentId, claimed);
        await auditRepository.logEvent({
          action: 'FULFILLMENT_ACTIVATED',
          userId,
          details: { fulfillmentId, orderId, type, tierId },
          timestamp: now,
        });
      }

      return claimed;
    }

    // Development fallback
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FULFILLMENT_STORE_UNAVAILABLE: Firestore required in production');
    }

    if (this.localFulfillments.has(fulfillmentId)) {
      return null; // Already fulfilled
    }

    const record: FulfillmentRecord = {
      fulfillmentId,
      orderId,
      type,
      status: 'ACTIVATED',
      activatedAt: now,
      createdAt: now,
      userId,
      tierId,
    };

    this.localFulfillments.set(fulfillmentId, record);
    return record;
  }

  async getFulfillment(orderId: string): Promise<FulfillmentRecord | undefined> {
    const fulfillmentId = `ful_${orderId}`;

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const snap = await db.collection('fulfillments').doc(fulfillmentId).get();
        if (snap.exists) return snap.data() as FulfillmentRecord;
      } catch {
        // Fallback to local
      }
    }

    return this.localFulfillments.get(fulfillmentId);
  }
}

export const fulfillmentRepository = new FulfillmentRepository();
