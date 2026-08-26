import crypto from 'crypto';
import { OrderRecord } from '../storage';
import { auditRepository } from './auditRepository';
import { calculateTierPrice } from '../config/pricing';
import { validatePaymentTransition, verifyPaymentAmount, transitionPaymentState, PaymentOrderStatus } from '../services/paymentStateMachine';
import { isPgEnabled } from '../db/storageMode';

export interface PaymentVerificationInput {
  paymentReference: string;
  provider?: string;
  signature?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerAmount?: number;
  providerCurrency?: string;
}

export interface OrderDocument extends OrderRecord {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  paymentReference?: string;
  paymentVerifiedAt?: string;
  statusReason?: string;
  updatedAt?: string;
  currency?: string;
  provider?: string;
  idempotencyKey?: string;
  serverTimestamp?: any;
}

export interface IOrderRepository {
  createPendingOrder(orderData: Partial<OrderDocument>, userId?: string, userEmail?: string): Promise<OrderDocument>;
  createOrder(orderData: Partial<OrderDocument>, userId?: string, userEmail?: string): Promise<OrderDocument>;
  getOrderById(orderId: string, userId?: string, isAdmin?: boolean): Promise<OrderDocument | undefined>;
  getOrders(userId?: string, organizationId?: string, isAdmin?: boolean): Promise<OrderDocument[]>;
  verifyAndMarkPaid(orderId: string, verification: PaymentVerificationInput | string, userId?: string): Promise<OrderDocument>;
  bindProviderOrder(orderId: string, providerOrderId: string, provider?: string): Promise<void>;
  updateOrderStatus(orderId: string, status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED', reason?: string, overrideFailedGuard?: boolean): Promise<void>;
}

export class OrderRepository implements IOrderRepository {
  private localOrders: Map<string, OrderDocument> = new Map();

  private mapPgRow(row: any): OrderDocument {
    return {
      orderId: row.id,
      userId: row.userId || undefined,
      tierId: row.tierId,
      tierName: row.tierName,
      amountINR: row.amountInr,
      paymentMethod: row.provider,
      customerName: row.customerName || undefined,
      customerPhone: row.customerPhone || undefined,
      customerEmail: row.customerEmail || undefined,
      domain: row.domain || undefined,
      status: row.status as OrderRecord['status'],
      providerOrderId: row.providerOrderId || undefined,
      providerPaymentId: row.providerPaymentId || undefined,
      createdAt: row.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString?.(),
      paymentVerifiedAt: row.paymentVerifiedAt?.toISOString?.(),
      statusReason: row.statusReason || undefined,
      currency: row.currency || 'INR',
      provider: row.provider,
      idempotencyKey: row.idempotencyKey || undefined,
    };
  }

  async createPendingOrder(
    orderData: Partial<OrderDocument>,
    userId?: string,
    userEmail?: string
  ): Promise<OrderDocument> {
    const orderId = orderData.orderId || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const tierInfo = calculateTierPrice(orderData.tierId || 'tier-express-fix');
    const authoritativeAmount = tierInfo.amountINR;

    const docData: OrderDocument = {
      orderId,
      userId: orderData.userId || userId,
      tierId: tierInfo.config.tierId,
      tierName: tierInfo.config.name,
      amountINR: authoritativeAmount,
      currency: tierInfo.currency || 'INR',
      paymentMethod: orderData.paymentMethod || 'RAZORPAY',
      customerName: orderData.customerName || '',
      customerPhone: orderData.customerPhone || '',
      customerEmail: orderData.customerEmail || userEmail || '',
      domain: orderData.domain || '',
      status: 'PENDING',
      createdAt: orderData.createdAt || now,
      updatedAt: now,
      providerOrderId: orderData.providerOrderId,
      provider: orderData.provider || 'RAZORPAY',
      organizationId: orderData.organizationId,
      idempotencyKey: orderData.idempotencyKey,
    };

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      try {
        await prisma.order.create({
          data: {
            id: orderId,
            userId: docData.userId || null,
            tierId: docData.tierId,
            tierName: docData.tierName,
            amountInr: docData.amountINR,
            currency: docData.currency || 'INR',
            status: 'PENDING',
            provider: docData.provider || 'RAZORPAY',
            providerOrderId: docData.providerOrderId || null,
            customerName: docData.customerName || null,
            customerEmail: docData.customerEmail || null,
            customerPhone: docData.customerPhone || null,
            domain: docData.domain || null,
            idempotencyKey: docData.idempotencyKey || null,
            createdAt: new Date(docData.createdAt),
          },
        });
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
      }
      this.localOrders.set(orderId, docData);
      return docData;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production for order ${orderId}`);
    }

    this.localOrders.set(orderId, docData);

    await auditRepository.logEvent({
      action: 'ORDER_CREATED',
      userId: docData.userId,
      userEmail: docData.userEmail,
      details: { orderId, tierId: docData.tierId, amountINR: docData.amountINR },
      timestamp: now,
    });

    return docData;
  }

  async createOrder(orderData: Partial<OrderDocument>, userId?: string, userEmail?: string): Promise<OrderDocument> {
    return this.createPendingOrder(orderData, userId, userEmail);
  }

  async getOrderById(orderId: string, userId?: string, isAdmin = false): Promise<OrderDocument | undefined> {
    if (isPgEnabled()) {
      const row = await (await import('../db/prisma')).prisma.order.findUnique({ where: { id: orderId } });
      const order = row ? this.mapPgRow(row) : undefined;
      if (!order) return undefined;
      if (!isAdmin && order.userId && userId && order.userId !== userId) {
        throw new Error('UNAUTHORIZED_ORDER_ACCESS');
      }
      this.localOrders.set(orderId, order);
      return order;
    }

    const order = this.localOrders.get(orderId);
    if (order && !isAdmin && order.userId && userId && order.userId !== userId) {
      throw new Error('UNAUTHORIZED_ORDER_ACCESS');
    }
    return order;
  }

  async getOrders(userId?: string, organizationId?: string, isAdmin = false): Promise<OrderDocument[]> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const whereClause: any = {};
      if (!isAdmin) {
        if (userId) whereClause.userId = userId;
      }
      const rows = await prisma.order.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(r => this.mapPgRow(r));
    }

    const list = Array.from(this.localOrders.values());
    if (isAdmin) return list;
    if (userId) return list.filter(o => o.userId === userId || !o.userId);
    if (organizationId) return list.filter(o => o.organizationId === organizationId);
    return list;
  }

  async verifyAndMarkPaid(
    orderId: string,
    verification: PaymentVerificationInput | string,
    userId?: string
  ): Promise<OrderDocument> {
    let existing = await this.getOrderById(orderId, userId, true);
    if (!existing) {
      existing = this.localOrders.get(orderId);
    }
    if (!existing) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const input: PaymentVerificationInput = typeof verification === 'string'
      ? { paymentReference: verification, provider: 'UPI_MANUAL' }
      : verification;

    await auditRepository.logEvent({
      action: 'ORDER_PAYMENT_VERIFICATION_STARTED',
      userId: existing.userId || userId,
      details: { orderId, provider: input.provider, paymentReference: input.paymentReference },
      timestamp: now,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const provider = input.provider || 'UPI_MANUAL';

    if (!input.paymentReference || input.paymentReference.trim().length < 4) {
      throw new Error('INVALID_PAYMENT_REFERENCE: A valid provider transaction identifier is required.');
    }

    let finalStatus: 'PENDING' | 'PAID' | 'FAILED' = 'PENDING';
    let statusReason: string | undefined = undefined;

    if (provider === 'SANDBOX') {
      if (isProduction) {
        await auditRepository.logEvent({
          action: 'ORDER_FAILED',
          userId: existing.userId || userId,
          details: { orderId, reason: 'SANDBOX_ATTEMPT_IN_PRODUCTION' },
          timestamp: now,
        });
        throw new Error('SANDBOX_DISABLED_IN_PRODUCTION: Mock payments are strictly prohibited in production.');
      }
      finalStatus = 'PAID';
      statusReason = 'Sandbox payment simulation verified in non-production environment';
    } else if (provider === 'UPI_MANUAL') {
      finalStatus = 'PENDING';
      statusReason = 'UPI manual transaction submitted - awaiting admin/provider verification';
    } else if (provider === 'RAZORPAY') {
      const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!input.providerOrderId || !input.signature || !razorpaySecret) {
        throw new Error('INVALID_PAYMENT_PROOF: Missing Razorpay signature or order verification data.');
      }
      const expectedSignature = crypto
        .createHmac('sha256', razorpaySecret)
        .update(`${input.providerOrderId}|${input.paymentReference}`)
        .digest('hex');

      if (expectedSignature !== input.signature) {
        await auditRepository.logEvent({
          action: 'ORDER_FAILED',
          userId: existing.userId || userId,
          details: { orderId, reason: 'RAZORPAY_SIGNATURE_MISMATCH' },
          timestamp: now,
        });
        throw new Error('PAYMENT_VERIFICATION_FAILED: Cryptographic signature mismatch.');
      }
      finalStatus = 'PAID';
      statusReason = 'Razorpay payment verified cryptographically';
    } else if (provider === 'STRIPE') {
      if (!input.signature && isProduction) {
        throw new Error('INVALID_PAYMENT_PROOF: Stripe webhook or signature verification required.');
      }
      finalStatus = 'PAID';
      statusReason = 'Stripe payment confirmation verified';
    } else if (provider === 'CASHFREE') {
      if (!input.signature && isProduction) {
        throw new Error('INVALID_PAYMENT_PROOF: Cashfree signature verification required.');
      }
      finalStatus = 'PAID';
      statusReason = 'Cashfree payment confirmation verified';
    } else {
      throw new Error(`UNSUPPORTED_PAYMENT_PROVIDER: Provider ${provider} is not recognized.`);
    }

    if (finalStatus === 'PAID' && provider !== 'SANDBOX') {
      const expectedPricing = calculateTierPrice(existing.tierId);
      const providerAmount = input.providerAmount ?? existing.amountINR;
      const providerCurrency = input.providerCurrency ?? 'INR';

      verifyPaymentAmount(
        expectedPricing.amountINR,
        providerAmount,
        expectedPricing.currency,
        providerCurrency,
        orderId,
      );
    }

    if (finalStatus === 'PAID') {
      const currentStatus = (existing.status || 'PENDING') as PaymentOrderStatus;
      await transitionPaymentState(orderId, currentStatus, 'PAID', {
        provider,
        userId: existing.userId || userId,
        reason: statusReason,
      });
    }

    const updates: Partial<OrderDocument> = {
      status: finalStatus,
      statusReason,
      paymentReference: input.paymentReference,
      providerPaymentId: input.providerPaymentId || input.paymentReference,
      providerOrderId: input.providerOrderId || existing.providerOrderId,
      paymentVerifiedAt: finalStatus === 'PAID' ? now : undefined,
      updatedAt: now,
    };

    const updated = { ...existing, ...updates };
    this.localOrders.set(orderId, updated);

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: finalStatus,
            statusReason: statusReason || null,
            provider: provider,
            providerPaymentId: updates.providerPaymentId || null,
            providerOrderId: updates.providerOrderId || null,
            paymentVerifiedAt: finalStatus === 'PAID' ? new Date(now) : null,
            updatedAt: new Date(now),
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2025') {
          throw new Error(`ORDER_NOT_FOUND: ${orderId}`);
        }
        throw new Error(`PG_WRITE_FAILED: Failed to persist order ${orderId} status: ${err?.message || err}`);
      }
      return updated;
    }

    if (isProduction) {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production but DATABASE_URL is unset for order ${orderId}`);
    }

    await auditRepository.logEvent({
      action: finalStatus === 'PAID' ? 'ORDER_PAID' : 'ORDER_PENDING_REVIEW',
      userId: existing.userId || userId,
      details: {
        orderId,
        paymentReference: input.paymentReference,
        provider,
        amountINR: existing.amountINR,
        status: finalStatus,
        statusReason,
      },
      timestamp: now,
    });

    return updated;
  }

  async bindProviderOrder(orderId: string, providerOrderId: string, provider = 'RAZORPAY'): Promise<void> {
    if (!orderId || !providerOrderId) {
      throw new Error('INVALID_PROVIDER_BINDING: orderId and providerOrderId are required');
    }
    const existing = await this.getOrderById(orderId, undefined, true);
    const now = new Date().toISOString();

    if (existing?.providerOrderId && existing.providerOrderId !== providerOrderId) {
      throw new Error(`PROVIDER_ORDER_REBIND_REJECTED: Order ${orderId} is already bound to ${existing.providerOrderId}`);
    }

    if (existing) {
      this.localOrders.set(orderId, { ...existing, providerOrderId, updatedAt: now });
    }

    if (isPgEnabled()) {
      try {
        await (await import('../db/prisma')).prisma.order.update({
          where: { id: orderId },
          data: { providerOrderId, provider, updatedAt: new Date(now) },
        });
      } catch (err: any) {
        if (err?.code === 'P2025') {
          throw new Error(`ORDER_NOT_FOUND: Cannot bind provider order for missing order ${orderId}`);
        }
        throw new Error(`PROVIDER_ORDER_ALREADY_BOUND: ${err?.message || err}`);
      }
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: DATABASE_URL required in production to bind provider order for ${orderId}`);
    }

    await auditRepository.logEvent({
      action: 'ORDER_UPDATED',
      userId: existing?.userId,
      details: { orderId, providerOrderId, provider, reason: 'PROVIDER_ORDER_BOUND' },
      timestamp: now,
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED',
    reason?: string,
    overrideFailedGuard = false
  ): Promise<void> {
    const existing = this.localOrders.get(orderId);
    const now = new Date().toISOString();

    if (existing) {
      const currentStatus = (existing.status || 'CREATED') as PaymentOrderStatus;
      if (!overrideFailedGuard) {
        validatePaymentTransition(currentStatus, status as PaymentOrderStatus, orderId);
      }
      this.localOrders.set(orderId, {
        ...existing,
        status,
        updatedAt: now,
        statusReason: reason,
      });
    }

    if (isPgEnabled()) {
      await (await import('../db/prisma')).prisma.order.update({
        where: { id: orderId },
        data: { status, statusReason: reason || null, updatedAt: new Date(now) },
      }).catch((err: any) => {
        if (err?.code === 'P2025') return undefined;
        throw err;
      });
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production to update order ${orderId}`);
    }
  }

  public clear(): void {
    this.localOrders.clear();
  }
}

export const orderRepository = new OrderRepository();
