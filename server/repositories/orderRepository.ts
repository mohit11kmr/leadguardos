import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';
import { OrderRecord } from '../storage';
import { auditRepository } from './auditRepository';

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
  verifyAndMarkPaid(orderId: string, paymentReference: string, userId?: string): Promise<OrderDocument>;
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
        console.warn(`[OrderRepository] Firestore sync notice for order ${orderId}:`, err?.message || err);
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
        console.warn(`[OrderRepository] Error fetching order ${orderId} from Firestore:`, err);
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
      } catch (err) {
        console.warn('[OrderRepository] Error fetching orders from Firestore:', err);
      }
    }

    const list = Array.from(this.localOrders.values());
    if (isAdmin) return list;
    if (userId) return list.filter(o => o.userId === userId || !o.userId);
    if (organizationId) return list.filter(o => o.organizationId === organizationId);
    return list;
  }

  async verifyAndMarkPaid(orderId: string, paymentReference: string, userId?: string): Promise<OrderDocument> {
    let existing = await this.getOrderById(orderId, userId, true);
    if (!existing) {
      existing = this.localOrders.get(orderId);
    }
    if (!existing) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const updates: Partial<OrderDocument> = {
      status: 'PAID',
      paymentReference,
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
      } catch (err) {
        console.warn(`[OrderRepository] Firestore error marking order paid:`, err);
      }
    }

    await auditRepository.logEvent({
      action: 'ORDER_PAID',
      userId: existing.userId || userId,
      details: { orderId, paymentReference, amountINR: existing.amountINR },
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
    } catch (err) {
      console.warn(`[OrderRepository] Error updating order ${orderId}:`, err);
    }
  }
}

export const orderRepository = new OrderRepository();
