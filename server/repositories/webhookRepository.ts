import crypto from 'crypto';
import { isPgEnabled } from '../db/storageMode';
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

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      await prisma.webhook.upsert({
        where: { id },
        create: {
          id,
          userId: docData.userId || null,
          name: docData.name,
          url: docData.url,
          secret: docData.secret,
          events: docData.events,
          active: docData.active,
        },
        update: {
          name: docData.name,
          url: docData.url,
          events: docData.events,
          active: docData.active,
        },
      });
      this.localWebhooks.set(id, docData);
      await auditRepository.logEvent({
        action: 'WEBHOOK_CREATED',
        userId: docData.userId,
        details: { webhookId: id, url: docData.url, events: docData.events },
        timestamp: now,
      });
      return docData;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_UNAVAILABLE: PostgreSQL is required in production for webhooks');
    }

    this.localWebhooks.set(id, docData);

    await auditRepository.logEvent({
      action: 'WEBHOOK_CREATED',
      userId: docData.userId,
      details: { webhookId: id, url: docData.url, events: docData.events },
      timestamp: now,
    });

    return docData;
  }

  async getWebhooks(userId?: string, isAdmin = false): Promise<WebhookDocument[]> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const rows = await prisma.webhook.findMany({
        where: (!isAdmin && userId) ? { userId } : undefined,
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(r => ({
        id: r.id,
        userId: r.userId || undefined,
        name: r.name,
        url: r.url,
        secret: '********',
        events: r.events,
        active: r.active,
        failureCount: r.failureCount,
        createdAt: r.createdAt.toISOString(),
      })) as unknown as WebhookDocument[];
    }

    const list = Array.from(this.localWebhooks.values());
    const filtered = (isAdmin || !userId) ? list : list.filter(w => w.userId === userId);
    return filtered.map(data => ({
      ...data,
      secret: '********',
    }));
  }

  async getWebhookById(id: string, userId?: string, isAdmin = false): Promise<WebhookDocument | undefined> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const row = await prisma.webhook.findUnique({ where: { id } });
      if (row) {
        if (!isAdmin && row.userId && userId && row.userId !== userId) {
          throw new Error('UNAUTHORIZED_WEBHOOK_ACCESS');
        }
        return {
          id: row.id,
          userId: row.userId || undefined,
          name: row.name,
          url: row.url,
          secret: row.secret,
          events: row.events,
          active: row.active,
          failureCount: row.failureCount,
          createdAt: row.createdAt.toISOString(),
        } as unknown as WebhookDocument;
      }
      return undefined;
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

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      await prisma.webhook.delete({ where: { id } }).catch((err: any) => {
        if (err?.code !== 'P2025') throw err;
      });
      this.localWebhooks.delete(id);
      await auditRepository.logEvent({
        action: 'WEBHOOK_DELETED',
        userId,
        details: { webhookId: id },
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_UNAVAILABLE: PostgreSQL is required in production to delete webhooks');
    }

    this.localWebhooks.delete(id);

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

    if (isPgEnabled()) {
      void (async () => {
        const { prisma } = await import('../db/prisma');
        try {
          await prisma.webhookDelivery.create({
            data: {
              id,
              webhookId: record.webhookId,
              event: record.event,
              statusCode: record.httpStatus ?? null,
              success: record.status === 'SENT',
              attempt: record.attemptCount,
              error: record.errorMessage ?? null,
              payloadHash: record.payloadDigest ?? null,
            },
          });
        } catch { /* non-critical logging */ }
      })();
    }

    this.localDeliveries.unshift(record);
    if (this.localDeliveries.length > 200) this.localDeliveries.pop();

    return record;
  }

  async getDeliveryLogs(webhookId?: string, limit = 50): Promise<WebhookDeliveryRecord[]> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const rows = await prisma.webhookDelivery.findMany({
        where: webhookId ? { webhookId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return rows.map(r => ({
        id: r.id,
        webhookId: r.webhookId,
        url: '',
        event: r.event,
        status: r.success ? 'SENT' : 'FAILED',
        httpStatus: r.statusCode ?? undefined,
        errorMessage: r.error ?? undefined,
        timestamp: r.createdAt.toISOString(),
        attemptCount: r.attempt,
        payloadDigest: r.payloadHash ?? undefined,
      }));
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

  public clear(): void {
    this.localWebhooks.clear();
    this.localDeliveries = [];
  }
}

export const webhookRepository = new WebhookRepository();
