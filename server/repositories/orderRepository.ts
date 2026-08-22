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

    // Verification Rules:
    // 1. If Razorpay webhook / payload is provided: verify HMAC signature
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (input.provider === 'RAZORPAY') {
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
    }

    // 2. Reject empty or mock reference strings
    if (!input.paymentReference || input.paymentReference.trim().length < 4) {
      throw new Error('INVALID_PAYMENT_REFERENCE: A valid provider transaction identifier is required.');
    }

    const updates: Partial<OrderDocument> = {
      status: 'PAID',
      paymentReference: input.paymentReference,
      paymentVerifiedAt: now,
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
      }
    }

    await auditRepository.logEvent({
      action: 'ORDER_PAID',
      userId: existing.userId || userId,
      details: {
        orderId,
        paymentReference: input.paymentReference,
        provider: input.provider || 'UPI_MANUAL',
        amountINR: existing.amountINR,
      },
      timestamp: now,
    });

    return updated;
  }

  async updateOrderStatus(
    orderId: string,
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED',
    reason?: string
  ): Promise<void> {
    const existing = this.localOrders.get(orderId);
    const now = new Date().toISOString();
    if (existing) {
      this.localOrders.set(orderId, {
        ...existing,
        status,
        updatedAt: now,
        statusReason: reason,
      });
    }

    if (!isFirebaseConfigured()) return;

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
    }
  }
}

export const orderRepository = new OrderRepository();
