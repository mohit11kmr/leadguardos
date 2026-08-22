import { getAdminDb, FieldValue, isFirebaseConfigured, markFirestorePermissionDenied } from '../firebaseAdmin';

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

    try {
      if (!isFirebaseConfigured()) return;
      const db = getAdminDb();
      const col = db.collection('auditLogs');
      const docRef = col.doc();
      await docRef.set({
        ...record,
        id: docRef.id,
        serverTimestamp: FieldValue.serverTimestamp(),
      });
    } catch (err: any) {
      if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
        markFirestorePermissionDenied();
      }
    }
  }

  async getRecentLogs(limit = 50, actionFilter?: string): Promise<AuditLogEntry[]> {
    try {
      if (isFirebaseConfigured()) {
        const db = getAdminDb();
        let q = db.collection('auditLogs').orderBy('timestamp', 'desc').limit(limit);
        if (actionFilter) {
          q = q.where('action', '==', actionFilter);
        }
        const snap = await q.get();
        if (!snap.empty) {
          return snap.docs.map(d => d.data() as AuditLogEntry);
        }
      }
    } catch (err: any) {
      if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
        markFirestorePermissionDenied();
      }
    }

    const filtered = actionFilter
      ? this.localLogs.filter(l => l.action === actionFilter)
      : this.localLogs;
    return filtered.slice(0, limit);
  }
}

export const auditRepository = new AuditRepository();

