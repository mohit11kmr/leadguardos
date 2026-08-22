import { storage, WebhookConfig } from '../storage';

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  url: string;
  event: string;
  status: 'SENT' | 'FAILED' | 'RETRYING' | 'QUEUED';
  httpStatus?: number;
  errorMessage?: string;
  timestamp: string;
  attemptCount: number;
}

export interface IWebhookRepository {
  addWebhook(config: WebhookConfig): Promise<WebhookConfig>;
  getWebhooks(): Promise<WebhookConfig[]>;
  deleteWebhook(id: string): Promise<boolean>;
  logDelivery(log: WebhookDeliveryLog): Promise<void>;
  getDeliveryLogs(webhookId?: string): Promise<WebhookDeliveryLog[]>;
}

const deliveryLogs: WebhookDeliveryLog[] = [];

export class WebhookRepository implements IWebhookRepository {
  async addWebhook(config: WebhookConfig): Promise<WebhookConfig> {
    storage.addWebhook(config);
    return config;
  }

  async getWebhooks(): Promise<WebhookConfig[]> {
    return storage.getWebhooks();
  }

  async deleteWebhook(id: string): Promise<boolean> {
    return storage.deleteWebhook(id);
  }

  async logDelivery(log: WebhookDeliveryLog): Promise<void> {
    deliveryLogs.unshift(log);
    if (deliveryLogs.length > 200) deliveryLogs.pop();
  }

  async getDeliveryLogs(webhookId?: string): Promise<WebhookDeliveryLog[]> {
    if (webhookId) return deliveryLogs.filter(d => d.webhookId === webhookId);
    return deliveryLogs.slice(0, 50);
  }
}

export const webhookRepository = new WebhookRepository();
