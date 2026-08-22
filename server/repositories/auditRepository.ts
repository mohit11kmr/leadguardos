import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';

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
  async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      if (!isFirebaseConfigured()) return;
      const db = getAdminDb();
      const col = db.collection('auditLogs');
      const docRef = col.doc();
      await docRef.set({
        ...entry,
        id: docRef.id,
        serverTimestamp: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.warn('[AuditRepository] Error writing audit log:', err);
    }
  }

  async getRecentLogs(limit = 50, actionFilter?: string): Promise<AuditLogEntry[]> {
    try {
      if (!isFirebaseConfigured()) return [];
      const db = getAdminDb();
      let q = db.collection('auditLogs').orderBy('timestamp', 'desc').limit(limit);
      if (actionFilter) {
        q = q.where('action', '==', actionFilter);
      }
      const snap = await q.get();
      return snap.docs.map(d => d.data() as AuditLogEntry);
    } catch (err) {
      console.warn('[AuditRepository] Error fetching logs:', err);
      return [];
    }
  }
}

export const auditRepository = new AuditRepository();
