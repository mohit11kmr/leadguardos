import { auditRepository } from './auditRepository';
import { isPgEnabled } from '../db/storageMode';

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
 * Durable fulfillment repository — PostgreSQL is the production authority.
 * Each paid order activates fulfillment EXACTLY ONCE via the unique
 * constraint on Fulfillment.orderId (ful_<orderId> claim key).
 */
class FulfillmentRepository {
  /** @classification DEV-ONLY fallback cache — unused when DATABASE_URL is set */
  private localFulfillments = new Map<string, FulfillmentRecord>();

  /**
   * Claim fulfillment for an order.
   * Returns record if FIRST claim; null if already activated (idempotent).
   */
  async claimFulfillment(
    orderId: string,
    type: FulfillmentRecord['type'],
    userId?: string,
    tierId?: string,
  ): Promise<FulfillmentRecord | null> {
    const fulfillmentId = `ful_${orderId}`;
    const now = new Date().toISOString();

    // ── PostgreSQL authority ────────────────────────────────────────────────
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      try {
        await prisma.fulfillment.create({
          data: {
            id: fulfillmentId,
            orderId,
            type,
            status: 'ACTIVATED',
            userId: userId || null,
            tierId: tierId || null,
            activatedAt: new Date(now),
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') return null; // already fulfilled
        throw err;
      }
      const claimed: FulfillmentRecord = {
        fulfillmentId, orderId, type, status: 'ACTIVATED',
        activatedAt: now, createdAt: now, userId, tierId,
      };
      this.localFulfillments.set(fulfillmentId, claimed);
      await auditRepository.logEvent({
        action: 'FULFILLMENT_ACTIVATED',
        userId,
        details: { fulfillmentId, orderId, type, tierId },
        timestamp: now,
      });
      return claimed;
    }

    // ── Development cache-only fallback ─────────────────────────────────────
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FULFILLMENT_STORE_UNAVAILABLE: DATABASE_URL required in production');
    }

    if (this.localFulfillments.has(fulfillmentId)) {
      return null;
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

    if (isPgEnabled()) {
      const row = await (await import('../db/prisma')).prisma.fulfillment.findUnique({
        where: { orderId },
      });
      if (row) {
        return {
          fulfillmentId: row.id,
          orderId: row.orderId,
          type: row.type as FulfillmentRecord['type'],
          status: row.status as FulfillmentRecord['status'],
          activatedAt: row.activatedAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
          userId: row.userId || undefined,
          tierId: row.tierId || undefined,
        };
      }
      return this.localFulfillments.get(fulfillmentId);
    }

    return this.localFulfillments.get(fulfillmentId);
  }

  public clear(): void {
    this.localFulfillments.clear();
  }
}

export const fulfillmentRepository = new FulfillmentRepository();
