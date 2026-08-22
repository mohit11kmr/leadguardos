import crypto from 'crypto';
import { storage } from '../storage';

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
      action: params.action,
      resource: params.resource,
      details: params.details || {},
      ipAddress: params.ipAddress || 'internal',
      timestamp: new Date().toISOString(),
    };

    // Store server-controlled audit event
    storage.addAuditLog(logEntry);
  }
}
