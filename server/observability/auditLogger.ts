import crypto from 'crypto';
import { auditRepository } from '../repositories/auditRepository';

export interface AuditEventParams {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export class AuditLogger {
  public static log(params: AuditEventParams): void {
    const logEntry = {
      id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId: params.userId,
      action: params.action as any,
      resource: params.resource,
      details: params.details || {},
      ipAddress: params.ipAddress || 'internal',
      timestamp: new Date().toISOString(),
    };

    // Forward to authoritative audit repository (Prisma AuditLog in production)
    void auditRepository.logEvent(logEntry).catch((err) => {
      console.error('[AuditLogger] Failed to persist audit event:', err?.message || err);
    });
  }
}
