import crypto from 'crypto';
import { isPgEnabled } from '../db/storageMode';

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
 * Production authority: PostgreSQL transactional claim (unique constraint on PaymentEvent table).
 */
class PaymentEventRepository {
  /** @classification DEV-ONLY fallback cache — never used when DATABASE_URL is set */
  private local = new Map<string, PaymentEventRecord>();

  /**
   * Attempt to claim a payment event for processing.
   * Returns true if this is the first time (event claimed).
   * Returns false if the event was already processed (idempotent duplicate).
   */
  async claim(event: PaymentEventInput): Promise<boolean> {
    if (!event.providerEventId || !event.payloadHash) {
      throw new Error('INVALID_PAYMENT_EVENT: providerEventId and payloadHash are required');
    }

    const compositeKey = `${event.provider}:${event.providerEventId}`;
    const id = crypto.createHash('sha256').update(compositeKey).digest('hex');

    // ── PostgreSQL authority ────────────────────────────────────────────────
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      try {
        await prisma.paymentEvent.create({
          data: {
            id,
            provider: event.provider,
            providerEventId: event.providerEventId,
            eventType: event.eventType,
            payloadHash: event.payloadHash,
            status: 'CLAIMED',
          },
        });
        return true; // insert won → first claim
      } catch (err: any) {
        if (err?.code === 'P2002') return false; // unique violation → duplicate
        throw err;
      }
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('PAYMENT_EVENT_STORE_UNAVAILABLE: DATABASE_URL required in production');
    }

    if (this.local.has(id)) return false;
    this.local.set(id, { ...event, id, status: 'CLAIMED', createdAt: new Date().toISOString() });
    return true;
  }

  async markProcessed(providerEventId: string, provider: string): Promise<void> {
    const compositeKey = `${provider}:${providerEventId}`;
    const id = crypto.createHash('sha256').update(compositeKey).digest('hex');

    if (isPgEnabled()) {
      await (await import('../db/prisma')).prisma.paymentEvent.update({
        where: { id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      }).catch((err: any) => { if (err?.code !== 'P2025') throw err; });
      return;
    }

    const local = this.local.get(id);
    if (local) {
      local.status = 'PROCESSED';
      local.processedAt = new Date().toISOString();
    }
  }

  public clear(): void {
    this.local.clear();
  }
}

export const paymentEventRepository = new PaymentEventRepository();
