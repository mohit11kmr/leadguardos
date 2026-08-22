import crypto from 'crypto';
import { safeFetch } from '../security/safeFetch';
import { Logger } from '../observability/logger';

export type WebhookEventType =
  | 'scan.completed'
  | 'scan.failed'
  | 'finding.created'
  | 'score.changed'
  | 'watchdog.regression'
  | 'watchdog.down'
  | 'payment.completed';

export interface WebhookDeliveryLog {
  deliveryId: string;
  webhookId: string;
  eventType: WebhookEventType;
  url: string;
  status: 'DELIVERED' | 'FAILED';
  responseCode?: number;
  errorMessage?: string;
  timestamp: string;
}

export class WebhookPlatform {
  private static deliveryLogs: WebhookDeliveryLog[] = [];

  public static signPayload(payload: string, secret: string, timestamp: number): string {
    return crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
  }

  public static async dispatchEvent(
    webhookId: string,
    targetUrl: string,
    secret: string,
    eventType: WebhookEventType,
    resourceId: string,
    data: Record<string, any>
  ): Promise<WebhookDeliveryLog> {
    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payloadObject = {
      event_id: eventId,
      event_type: eventType,
      created_at: new Date().toISOString(),
      resource_id: resourceId,
      data,
    };
    const payloadString = JSON.stringify(payloadObject);
    const signature = this.signPayload(payloadString, secret, timestamp);

    const deliveryId = `del_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let status: 'DELIVERED' | 'FAILED' = 'FAILED';
    let responseCode: number | undefined;
    let errorMessage: string | undefined;

    try {
      const res = await safeFetch(targetUrl, {
        method: 'POST',
        body: payloadString,
        headers: {
          'Content-Type': 'application/json',
          'X-LeadGuard-Signature': signature,
          'X-LeadGuard-Timestamp': timestamp.toString(),
          'X-LeadGuard-Event': eventType,
        },
        timeoutMs: 5000,
      });

      responseCode = res.status;
      if (res.ok) {
        status = 'DELIVERED';
      } else {
        errorMessage = `HTTP ${res.status} ${res.statusText}`;
      }
    } catch (err: any) {
      errorMessage = err?.message || 'Delivery request failed';
    }

    const log: WebhookDeliveryLog = {
      deliveryId,
      webhookId,
      eventType,
      url: targetUrl,
      status,
      responseCode,
      errorMessage,
      timestamp: new Date().toISOString(),
    };

    this.deliveryLogs.unshift(log);
    if (this.deliveryLogs.length > 500) this.deliveryLogs.pop();

    Logger.info(`[WebhookPlatform] Dispatched ${eventType} to ${targetUrl}`, { operation: eventType, statusCode: responseCode });
    return log;
  }

  public static getDeliveryLogs(webhookId?: string, limit = 20): WebhookDeliveryLog[] {
    if (webhookId) {
      return this.deliveryLogs.filter(l => l.webhookId === webhookId).slice(0, limit);
    }
    return this.deliveryLogs.slice(0, limit);
  }
}
