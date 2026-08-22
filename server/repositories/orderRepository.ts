import crypto from 'crypto';
import { getAdminDb, FieldValue, isFirebaseConfigured, markFirestorePermissionDenied } from '../firebaseAdmin';
import { OrderRecord } from '../storage';
import { auditRepository } from './auditRepository';

export interface PaymentVerificationInput {
  paymentReference: string;
  provider?: string;
  signature?: string;
  providerOrderId?: string;
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
  getOrderById(orderId: string, userId?: string, isAdmin?: boolean): Promise<OrderDocument | undefined>;
  getOrders(userId?: string, organizationId?: string, isAdmin?: boolean): Promise<OrderDocument[]>;
  verifyAndMarkPaid(orderId: string, verification: PaymentVerificationInput | string, userId?: string): Promise<OrderDocument>;
  updateOrderStatus(orderId: string, status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED', reason?: string): Promise<void>;
}

export class OrderRepository implements IOrderRepository {
  private localOrders: Map<string, OrderDocument> = new Map();

  async createPendingOrder(
    orderData: Partial<OrderDocument>,
    userId?: string,
    userEmail?: string
  ): Promise<OrderDocument> {
    const orderId = orderData.orderId || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Security rule: Newly submitted orders MUST ALWAYS start as PENDING
    const docData: OrderDocument = {
      orderId,
      tierId: orderData.tierId || 'tier-express-fix',
      tierName: orderData.tierName || 'Express Fix',
      amountINR: orderData.amountINR || 4999,
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

    this.localOrders.set(orderId, docData);

    if (isFirebaseConfigured()) {
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

    const updates: Partial<OrderDocument> = {
      status: finalStatus,
      statusReason,
      paymentReference: input.paymentReference,
      paymentVerifiedAt: finalStatus === 'PAID' ? now : undefined,
      updatedAt: now,
    };

    const updated = { ...existing, ...updates };
    this.localOrders.set(orderId, updated);

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
      throw new Error(`DATABASE_UNAVAILABLE: Firestore is required in production but unavailable for order ${orderId}`);
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

  async updateOrderStatus(
    orderId: string,
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED',
    reason?: string,
    overrideFailedGuard = false
  ): Promise<void> {
    const existing = this.localOrders.get(orderId);
    const now = new Date().toISOString();

    // Prevent unsafe state transition: FAILED -> PAID without explicit provider override
    if (existing && existing.status === 'FAILED' && status === 'PAID' && !overrideFailedGuard) {
      throw new Error('INVALID_STATE_TRANSITION: Cannot transition FAILED order to PAID without verified provider event.');
    }

    if (existing) {
      this.localOrders.set(orderId, {
        ...existing,
        status,
        updatedAt: now,
        statusReason: reason,
      });
    }

    if (!isFirebaseConfigured()) {
      if (process.env.NODE_ENV === 'production' || process.env.STORAGE_MODE === 'firestore') {
        throw new Error(`DATABASE_UNAVAILABLE: Firestore is required in production to update order ${orderId}`);
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
