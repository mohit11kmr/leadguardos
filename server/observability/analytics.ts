import { Logger } from './logger';

export type ProductEventType =
  | 'signup'
  | 'first_scan_started'
  | 'first_scan_completed'
  | 'finding_viewed'
  | 'fix_viewed'
  | 'watchdog_created'
  | 'report_exported'
  | 'checkout_started'
  | 'payment_completed';

export interface ProductEvent {
  event: ProductEventType;
  userId?: string;
  domain?: string;
  meta?: Record<string, any>;
  timestamp: string;
}

export class ProductAnalytics {
  private static eventsLog: ProductEvent[] = [];

  public static track(event: ProductEventType, userId?: string, meta: Record<string, any> = {}): void {
    const logEntry: ProductEvent = {
      event,
      userId: userId || 'anonymous',
      meta,
      timestamp: new Date().toISOString(),
    };

    this.eventsLog.unshift(logEntry);
    if (this.eventsLog.length > 1000) this.eventsLog.pop();

    Logger.info(`[Analytics] ${event}`, { userId, operation: event });
  }

  public static getEvents(limit = 100): ProductEvent[] {
    return this.eventsLog.slice(0, limit);
  }

  public static getFunnelStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const item of this.eventsLog) {
      stats[item.event] = (stats[item.event] || 0) + 1;
    }
    return stats;
  }
}
