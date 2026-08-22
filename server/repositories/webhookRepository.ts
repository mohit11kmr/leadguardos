import crypto from 'crypto';
import { getAdminDb, FieldValue, isFirebaseConfigured, markFirestorePermissionDenied } from '../firebaseAdmin';
import { WebhookConfig } from '../storage';
import { validateAndResolveSafeUrl } from '../ssrfGuard';
import { auditRepository } from './auditRepository';

export interface WebhookDocument extends WebhookConfig {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  updatedAt?: string;
  serverTimestamp?: any;
}

export interface WebhookDeliveryRecord {
  id: string;
  webhookId: string;
  url: string;
  event: string;
  status: 'SENT' | 'FAILED' | 'RETRYING';
  httpStatus?: number;
  errorMessage?: string;
  timestamp: string;
  attemptCount: number;
  payloadDigest?: string;
  serverTimestamp?: any;
}

export interface IWebhookRepository {
  addWebhook(config: Partial<WebhookDocument>, userId?: string, userEmail?: string): Promise<WebhookDocument>;
  getWebhooks(userId?: string, isAdmin?: boolean): Promise<WebhookDocument[]>;
  getWebhookById(id: string, userId?: string, isAdmin?: boolean): Promise<WebhookDocument | undefined>;
  deleteWebhook(id: string, userId?: string, isAdmin?: boolean): Promise<boolean>;
  logDelivery(log: Partial<WebhookDeliveryRecord>): Promise<WebhookDeliveryRecord>;
  getDeliveryLogs(webhookId?: string, limit?: number): Promise<WebhookDeliveryRecord[]>;
  dispatchWebhook(webhook: WebhookDocument, event: string, payload: any): Promise<WebhookDeliveryRecord>;
}

export class WebhookRepository implements IWebhookRepository {
  private localWebhooks: Map<string, WebhookDocument> = new Map();
  private localDeliveries: WebhookDeliveryRecord[] = [];

  async addWebhook(
    config: Partial<WebhookDocument>,
    userId?: string,
    userEmail?: string
  ): Promise<WebhookDocument> {
    if (!config.url) {
      throw new Error('WEBHOOK_URL_REQUIRED');
    }

    // SSRF Guard validation
    const ssrfCheck = await validateAndResolveSafeUrl(config.url);
    if (!ssrfCheck.valid) {
      await auditRepository.logEvent({
        action: 'SSRF_BLOCKED',
        userId,
        details: { attemptedUrl: config.url, reason: ssrfCheck.error },
        timestamp: new Date().toISOString(),
      });
      throw new Error(`SSRF_BLOCKED: ${ssrfCheck.error}`);
    }

    const id = config.id || `whk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const secret = config.secret || `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();

    const docData: WebhookDocument = {
      id,
      name: config.name || 'Default Webhook',
      url: ssrfCheck.normalized || config.url,
      secret,
      events: config.events && config.events.length > 0 ? config.events : ['scan.completed', 'watchdog.alert'],
      active: config.active !== false,
      createdAt: config.createdAt || now,
      updatedAt: now,
      failureCount: 0,
      userId: config.userId || userId,
      userEmail: config.userEmail || userEmail,
      organizationId: config.organizationId,
    };

    this.localWebhooks.set(id, docData);

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        await db.collection('webhooks').doc(id).set({
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
      action: 'WEBHOOK_CREATED',
      userId: docData.userId,
      details: { webhookId: id, url: docData.url, events: docData.events },
      timestamp: now,
    });

    return docData;
  }

  async getWebhooks(userId?: string, isAdmin = false): Promise<WebhookDocument[]> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        let q = db.collection('webhooks').orderBy('createdAt', 'desc');

        if (!isAdmin && userId) {
          q = db.collection('webhooks').where('userId', '==', userId).orderBy('createdAt', 'desc');
        }

        const snap = await q.get();
        if (!snap.empty) {
          return snap.docs.map(d => {
            const data = d.data() as WebhookDocument;
            return {
              ...data,
              // Mask secret in listings
              secret: '********',
            };
          });
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    const list = Array.from(this.localWebhooks.values());
    const filtered = (isAdmin || !userId) ? list : list.filter(w => w.userId === userId);
    return filtered.map(data => ({
      ...data,
      secret: '********',
    }));
  }

  async getWebhookById(id: string, userId?: string, isAdmin = false): Promise<WebhookDocument | undefined> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const docSnap = await db.collection('webhooks').doc(id).get();
        if (docSnap.exists) {
          const data = docSnap.data() as WebhookDocument;
          if (!isAdmin && data.userId && userId && data.userId !== userId) {
            throw new Error('UNAUTHORIZED_WEBHOOK_ACCESS');
          }
          this.localWebhooks.set(id, data);
          return data;
        }
      } catch (err: any) {
        if (err?.message === 'UNAUTHORIZED_WEBHOOK_ACCESS') throw err;
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    const local = this.localWebhooks.get(id);
    if (local && !isAdmin && local.userId && userId && local.userId !== userId) {
      throw new Error('UNAUTHORIZED_WEBHOOK_ACCESS');
    }
    return local;
  }

  async deleteWebhook(id: string, userId?: string, isAdmin = false): Promise<boolean> {
    const existing = await this.getWebhookById(id, userId, isAdmin);
    if (!existing) return false;

    if (!isAdmin && existing.userId && userId && existing.userId !== userId) {
      throw new Error('UNAUTHORIZED_WEBHOOK_DELETE');
    }

    this.localWebhooks.delete(id);

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const docRef = db.collection('webhooks').doc(id);
        await docRef.delete();
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    await auditRepository.logEvent({
      action: 'WEBHOOK_DELETED',
      userId,
      details: { webhookId: id },
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  async logDelivery(log: Partial<WebhookDeliveryRecord>): Promise<WebhookDeliveryRecord> {
    const id = log.id || `del_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const record: WebhookDeliveryRecord = {
      id,
      webhookId: log.webhookId || 'unknown',
      url: log.url || '',
      event: log.event || 'generic',
      status: log.status || 'SENT',
      httpStatus: log.httpStatus,
      errorMessage: log.errorMessage,
      timestamp: log.timestamp || now,
      attemptCount: log.attemptCount || 1,
      payloadDigest: log.payloadDigest,
    };

    this.localDeliveries.unshift(record);
    if (this.localDeliveries.length > 200) this.localDeliveries.pop();

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        await db.collection('webhookDeliveries').doc(id).set({
          ...record,
          serverTimestamp: FieldValue.serverTimestamp(),
        });
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    return record;
  }

  async getDeliveryLogs(webhookId?: string, limit = 50): Promise<WebhookDeliveryRecord[]> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        let q = db.collection('webhookDeliveries').orderBy('timestamp', 'desc').limit(limit);
        if (webhookId) {
          q = db.collection('webhookDeliveries').where('webhookId', '==', webhookId).orderBy('timestamp', 'desc').limit(limit);
        }
        const snap = await q.get();
        if (!snap.empty) {
          return snap.docs.map(d => d.data() as WebhookDeliveryRecord);
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    const filtered = webhookId ? this.localDeliveries.filter(d => d.webhookId === webhookId) : this.localDeliveries;
    return filtered.slice(0, limit);
  }


  async dispatchWebhook(webhook: WebhookDocument, event: string, payload: any): Promise<WebhookDeliveryRecord> {
    // Re-validate SSRF on dispatch
    const ssrfCheck = await validateAndResolveSafeUrl(webhook.url);
    if (!ssrfCheck.valid) {
      return this.logDelivery({
        webhookId: webhook.id,
        url: webhook.url,
        event,
        status: 'FAILED',
        errorMessage: `SSRF_BLOCKED: ${ssrfCheck.error}`,
        attemptCount: 1,
      });
    }

    const jsonPayload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = crypto.createHmac('sha256', webhook.secret).update(jsonPayload).digest('hex');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LeadGuard-Webhook-Dispatcher/4.2.0',
          'X-LeadGuard-Signature': signature,
          'X-LeadGuard-Event': event,
        },
        body: jsonPayload,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const isSuccess = resp.status >= 200 && resp.status < 300;
      return this.logDelivery({
        webhookId: webhook.id,
        url: webhook.url,
        event,
        status: isSuccess ? 'SENT' : 'FAILED',
        httpStatus: resp.status,
        errorMessage: isSuccess ? undefined : `HTTP ${resp.status} ${resp.statusText}`,
        attemptCount: 1,
        payloadDigest: signature.substring(0, 12),
      });
    } catch (err: any) {
      return this.logDelivery({
        webhookId: webhook.id,
        url: webhook.url,
        event,
        status: 'FAILED',
        errorMessage: err?.message || String(err),
        attemptCount: 1,
        payloadDigest: signature.substring(0, 12),
      });
    }
  }
}

export const webhookRepository = new WebhookRepository();
