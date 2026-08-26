import { isPgEnabled } from '../db/storageMode';

export interface AuditLogEntry {
  id?: string;
  action:
    | 'SCAN_CREATED'
    | 'SCAN_COMPLETED'
    | 'SCAN_FAILED'
    | 'SCAN_DELETED'
    | 'WATCHDOG_CREATED'
    | 'WATCHDOG_UPDATED'
    | 'WATCHDOG_DELETED'
    | 'WEBHOOK_CREATED'
    | 'WEBHOOK_DELETED'
    | 'WEBHOOK_DELIVERY'
    | 'ORDER_CREATED'
    | 'ORDER_PAYMENT_VERIFICATION_STARTED'
    | 'ORDER_PENDING_REVIEW'
    | 'ORDER_PAID'
    | 'ORDER_FAILED'
    | 'ORDER_UPDATED'
    | 'AUTH_LOGIN'
    | 'AUTH_FAILURE'
    | 'ADMIN_ACTION'
    | 'PAYMENT_STATE_TRANSITION'
    | 'FULFILLMENT_ACTIVATED'
    | 'SSRF_BLOCKED';
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  details: Record<string, any>;
  timestamp: string;
}

export class AuditRepository {
  private localLogs: AuditLogEntry[] = [];

  async logEvent(entry: AuditLogEntry): Promise<void> {
    const record = {
      ...entry,
      id: entry.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    this.localLogs.unshift(record);
    if (this.localLogs.length > 500) this.localLogs.pop();

    // ── PostgreSQL authority (security-sensitive events are durable) ─────────
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          userId: entry.userId || null,
          userEmail: entry.userEmail || null,
          ipAddress: entry.ipAddress || null,
          details: (entry.details || {}) as any,
          timestamp: new Date(entry.timestamp || Date.now()),
        },
      });
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_UNAVAILABLE: PostgreSQL is required in production for audit logs');
    }
  }

  async getRecentLogs(limit = 50, actionFilter?: string): Promise<AuditLogEntry[]> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const rows = await prisma.auditLog.findMany({
        where: actionFilter ? { action: actionFilter } : undefined,
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
      return rows.map(r => ({
        id: r.id,
        action: r.action as AuditLogEntry['action'],
        userId: r.userId || undefined,
        userEmail: r.userEmail || undefined,
        ipAddress: r.ipAddress || undefined,
        details: (r.details || {}) as Record<string, any>,
        timestamp: r.timestamp.toISOString(),
      }));
    }

    const filtered = actionFilter
      ? this.localLogs.filter(l => l.action === actionFilter)
      : this.localLogs;
    return filtered.slice(0, limit);
  }

  public clear(): void {
    this.localLogs = [];
  }
}

export const auditRepository = new AuditRepository();
