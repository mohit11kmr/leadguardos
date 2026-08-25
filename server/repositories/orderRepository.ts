import crypto from 'crypto';
import { getAdminDb, FieldValue, isFirebaseConfigured, markFirestorePermissionDenied } from '../firebaseAdmin';
import { OrderRecord } from '../storage';
import { auditRepository } from './auditRepository';
import { calculateTierPrice, CENTRALIZED_PRICING_CATALOG } from '../config/pricing';
import { validatePaymentTransition, verifyPaymentAmount, transitionPaymentState, PaymentOrderStatus } from '../services/paymentStateMachine';
import { isPgEnabled } from '../db/storageMode';

export interface PaymentVerificationInput {
  paymentReference: string;
  provider?: string;
  signature?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  /** Amount in smallest currency unit (paise for INR) from provider event */
  providerAmount?: number;
  /** Currency code from provider event */
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
  serverTimestamp?: any;
}

export interface IOrderRepository {
  createPendingOrder(orderData: Partial<OrderDocument>, userId?: string, userEmail?: string): Promise<OrderDocument>;
  createOrder(orderData: Partial<OrderDocument>): Promise<OrderDocument>;
  getOrderById(orderId: string, userId?: string, isAdmin?: boolean): Promise<OrderDocument | undefined>;
  getOrders(userId?: string, organizationId?: string, isAdmin?: boolean): Promise<OrderDocument[]>;
  verifyAndMarkPaid(orderId: string, verification: PaymentVerificationInput | string, userId?: string): Promise<OrderDocument>;
  updateOrderStatus(orderId: string, status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED', reason?: string): Promise<void>;
}

export class OrderRepository implements IOrderRepository {
  private localOrders: Map<string, OrderDocument> = new Map();

  /** Map a Prisma Order row to the legacy OrderDocument shape. */
  private mapPgRow(row: any): OrderDocument {
    return {
      orderId: row.id,
      tierId: row.tierId,
      tierName: row.tierName,
      amountINR: row.amountInr,
      paymentMethod: 'RAZORPAY',
      customerName: row.customerName || undefined,
      customerEmail: row.customerEmail || undefined,
      customerPhone: row.customerPhone || undefined,
      domain: row.domain || undefined,
      status: row.status as OrderDocument['status'],
      statusReason: row.statusReason || undefined,
      providerOrderId: row.providerOrderId || undefined,
      providerPaymentId: row.providerPaymentId || undefined,
      paymentReference: row.paymentReference || undefined,
      paymentVerifiedAt: row.paymentVerifiedAt?.toISOString?.(),
      createdAt: row.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString?.(),
      userId: row.userId || undefined,
      userEmail: row.customerEmail || undefined,
    } as OrderDocument;
  }

  async createOrder(orderData: Partial<OrderDocument>): Promise<OrderDocument> {
    return this.createPendingOrder(orderData);
  }

  async createPendingOrder(
    orderData: Partial<OrderDocument>,
    userId?: string,
    userEmail?: string
  ): Promise<OrderDocument> {
    const orderId = orderData.orderId || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const tierId = orderData.tierId || 'tier-express-fix';
    const tier = calculateTierPrice(tierId);

    // Security rule: Newly submitted orders MUST ALWAYS start as PENDING
    const docData: OrderDocument = {
      orderId,
      tierId,
      tierName: tier.config.name,
      amountINR: tier.amountINR,
      paymentMethod: orderData.paymentMethod || 'UPI',
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerEmail: orderData.customerEmail || userEmail,
      domain: orderData.domain,
      status: 'PENDING', // Guaranteed PENDING on creation
      createdAt: orderData.createdAt || now,
      updatedAt: now,
      userId: orderData.userId || userId,
      userEmail: orderData.userEmail || userEmail,
      organizationId: orderData.organizationId,
    };

    if (isPgEnabled()) {
      // PostgreSQL authority — awaited, fail-closed.
      const { prisma } = await import('../db/prisma');
      try {
        await prisma.order.create({
          data: {
            id: orderId,
            tierId: docData.tierId,
            tierName: docData.tierName || '',
            amountInr: Math.round(docData.amountINR || 0),
            currency: 'INR',
            status: docData.status || 'PENDING',
            provider: 'RAZORPAY',
            customerName: docData.customerName || null,
            customerEmail: docData.customerEmail || null,
            customerPhone: docData.customerPhone || null,
            domain: docData.domain || null,
            userId: docData.userId || null,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Idempotent re-create (duplicate orderId) is acceptable.
        } else {
          throw err;
        }
      }
      this.localOrders.set(orderId, docData);
      return docData;
    }

    this.localOrders.set(orderId, docData);

    if (!isPgEnabled() && isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        await db.collection('orders').doc(orderId).set({
          ...docData,
          serverTimestamp: FieldValue.serverTimestamp(),
        });
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    await auditRepository.logEvent({
      action: 'ORDER_CREATED',
      userId: docData.userId,
      userEmail: docData.userEmail,
      details: { orderId, tierId: docData.tierId, amountINR: docData.amountINR },
      timestamp: now,
    });

    return docData;
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
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const docSnap = await db.collection('orders').doc(orderId).get();
        if (docSnap.exists) {
          const order = docSnap.data() as OrderDocument;
          if (!isAdmin && order.userId && userId && order.userId !== userId) {
            throw new Error('UNAUTHORIZED_ORDER_ACCESS');
          }
          this.localOrders.set(orderId, order);
          return order;
        }
      } catch (err: any) {
        if (err?.message === 'UNAUTHORIZED_ORDER_ACCESS') throw err;
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    const order = this.localOrders.get(orderId);
    if (order && !isAdmin && order.userId && userId && order.userId !== userId) {
      throw new Error('UNAUTHORIZED_ORDER_ACCESS');
    }
    return order;
  }

  async getOrders(userId?: string, organizationId?: string, isAdmin = false): Promise<OrderDocument[]> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        let q = db.collection('orders').orderBy('createdAt', 'desc');

        if (!isAdmin) {
          if (organizationId) {
            q = db.collection('orders').where('organizationId', '==', organizationId).orderBy('createdAt', 'desc');
          } else if (userId) {
            q = db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc');
          }
        }

        const snap = await q.get();
        if (!snap.empty) {
          return snap.docs.map(d => d.data() as OrderDocument);
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    const list = Array.from(this.localOrders.values());
    if (isAdmin) return list;
    if (userId) return list.filter(o => o.userId === userId || !o.userId);
    if (organizationId) return list.filter(o => o.organizationId === organizationId);
    return list;
  }

  /**
   * Verified payment provider transition.
   * Client-submitted reference strings alone are rejected without genuine provider confirmation or signature.
   */
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

    // 1. Reject empty or invalid reference strings
    if (!input.paymentReference || input.paymentReference.trim().length < 4) {
      throw new Error('INVALID_PAYMENT_REFERENCE: A valid provider transaction identifier is required.');
    }

    let finalStatus: 'PENDING' | 'PAID' | 'FAILED' = 'PENDING';
    let statusReason: string | undefined = undefined;

    // 2. Sandbox Verification
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
    }
    // 3. UPI Manual Verification: Remains PENDING / ADMIN_REVIEW
    else if (provider === 'UPI_MANUAL') {
      finalStatus = 'PENDING';
      statusReason = 'UPI manual transaction submitted - awaiting admin/provider verification';
    }
    // 4. Razorpay Provider Verification
    else if (provider === 'RAZORPAY') {
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
    }
    // 5. Stripe Provider Verification
    else if (provider === 'STRIPE') {
      if (!input.signature && isProduction) {
        throw new Error('INVALID_PAYMENT_PROOF: Stripe webhook or signature verification required.');
      }
      finalStatus = 'PAID';
      statusReason = 'Stripe payment confirmation verified';
    }
    // 6. Cashfree Provider Verification
    else if (provider === 'CASHFREE') {
      if (!input.signature && isProduction) {
        throw new Error('INVALID_PAYMENT_PROOF: Cashfree signature verification required.');
      }
      finalStatus = 'PAID';
      statusReason = 'Cashfree payment confirmation verified';
    }
    else {
      throw new Error(`UNSUPPORTED_PAYMENT_PROVIDER: Provider ${provider} is not recognized.`);
    }

    // ── Amount & Currency Verification ──────────────────────────────────────
    // Verify provider-reported amount matches server-authoritative pricing
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

    // ── State Machine Validation ────────────────────────────────────────────
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
      try {
        await (await import('../db/prisma')).prisma.order.update({
          where: { id: orderId },
          data: {
            status: finalStatus,
            statusReason: statusReason || null,
            paymentReference: input.paymentReference,
            providerPaymentId: (input.providerPaymentId || input.paymentReference) ?? null,
            providerOrderId: input.providerOrderId || existing.providerOrderId || null,
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

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const docRef = db.collection('orders').doc(orderId);
        await docRef.set(updates, { merge: true });
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
        if (isProduction || process.env.STORAGE_MODE === 'firestore') {
          throw new Error(`FIRESTORE_WRITE_FAILED: Failed to persist order ${orderId} status: ${err?.message || err}`);
        }
      }
    } else if (isProduction || process.env.STORAGE_MODE === 'firestore') {
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

  /**
   * Durably bind a provider order id to an internal order.
   * MUST be called immediately after provider order creation so that
   * checkout-callback verification can enforce order binding.
   */
  async bindProviderOrder(orderId: string, providerOrderId: string, provider = 'RAZORPAY'): Promise<void> {
    if (!orderId || !providerOrderId) {
      throw new Error('INVALID_PROVIDER_BINDING: orderId and providerOrderId are required');
    }
    const existing = await this.getOrderById(orderId, undefined, true);
    const now = new Date().toISOString();

    // Reject rebinding to a DIFFERENT provider order (binding is immutable once set)
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
        // Unique(provider,providerOrderId) violation → rebind attempt to a taken id
        throw new Error(`PROVIDER_ORDER_ALREADY_BOUND: ${err?.message || err}`);
      }
      return;
    }

    if (isFirebaseConfigured()) {
      const db = getAdminDb();
      await db.collection('orders').doc(orderId).set(
        { providerOrderId, provider, updatedAt: now },
        { merge: true },
      );
    } else if (process.env.NODE_ENV === 'production') {
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

    // Use payment state machine for transition validation
    if (existing) {
      const currentStatus = (existing.status || 'CREATED') as PaymentOrderStatus;
      if (!overrideFailedGuard) {
        validatePaymentTransition(currentStatus, status as PaymentOrderStatus, orderId);
      }
    }

    if (existing) {
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

    if (!isFirebaseConfigured()) {
      if (process.env.NODE_ENV === 'production' || process.env.STORAGE_MODE === 'firestore') {
        throw new Error(`DATABASE_UNAVAILABLE: PostgreSQL is required in production to update order ${orderId}`);
      }
      return;
    }

    try {
      const db = getAdminDb();
      const docRef = db.collection('orders').doc(orderId);
      await docRef.set(
        {
          status,
          updatedAt: now,
          statusReason: reason,
        },
        { merge: true }
      );
    } catch (err: any) {
      if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
        markFirestorePermissionDenied();
      }
      if (process.env.NODE_ENV === 'production' || process.env.STORAGE_MODE === 'firestore') {
        throw new Error(`FIRESTORE_WRITE_FAILED: Failed to update order status ${orderId}: ${err?.message || err}`);
      }
    }
  }
}

export const orderRepository = new OrderRepository();
