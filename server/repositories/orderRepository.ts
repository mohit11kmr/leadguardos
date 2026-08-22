import { storage, OrderRecord } from '../storage';

export interface IOrderRepository {
  createOrder(order: OrderRecord): Promise<OrderRecord>;
  getOrders(userId?: string): Promise<OrderRecord[]>;
  getOrderById(orderId: string): Promise<OrderRecord | undefined>;
  updateOrderStatus(orderId: string, status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'): Promise<void>;
}

export class OrderRepository implements IOrderRepository {
  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    storage.addOrder(order);
    return order;
  }

  async getOrders(userId?: string): Promise<OrderRecord[]> {
    const orders = storage.getOrders();
    if (userId) return orders.filter((o: any) => o.userId === userId);
    return orders;
  }

  async getOrderById(orderId: string): Promise<OrderRecord | undefined> {
    return storage.getOrders().find(o => o.orderId === orderId);
  }

  async updateOrderStatus(orderId: string, status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'): Promise<void> {
    const order = storage.getOrders().find(o => o.orderId === orderId);
    if (order) {
      order.status = status;
      storage.saveToDisk();
    }
  }
}

export const orderRepository = new OrderRepository();
