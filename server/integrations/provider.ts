import { safeFetch } from '../security/safeFetch';
import { Logger } from '../observability/logger';

export type AlertSensitivity = 'CRITICAL_ONLY' | 'IMPORTANT' | 'ALL';

export interface IntegrationAlertPayload {
  domain: string;
  previousScore: number;
  newScore: number;
  issueTitle: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reportUrl: string;
}

export abstract class IntegrationProvider {
  abstract readonly name: string;
  abstract sendAlert(webhookUrl: string, alert: IntegrationAlertPayload, sensitivity?: AlertSensitivity): Promise<boolean>;
}

export class SlackProvider extends IntegrationProvider {
  readonly name = 'Slack';

  public async sendAlert(webhookUrl: string, alert: IntegrationAlertPayload, sensitivity: AlertSensitivity = 'CRITICAL_ONLY'): Promise<boolean> {
    if (sensitivity === 'CRITICAL_ONLY' && alert.severity !== 'CRITICAL') return false;

    const slackBlocks = {
      text: `🚨 *LeadGuard OS Alert* for ${alert.domain}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🚨 LeadGuard Alert: ${alert.domain}`, emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Website:*\n<${alert.reportUrl}|${alert.domain}>` },
            { type: 'mrkdwn', text: `*Health Score:*\n${alert.previousScore} ➔ *${alert.newScore}*` },
            { type: 'mrkdwn', text: `*Detected Issue:*\n${alert.issueTitle}` },
            { type: 'mrkdwn', text: `*Severity:*\n\`${alert.severity}\`` }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Diagnostic Report' },
              url: alert.reportUrl,
              style: 'danger'
            }
          ]
        }
      ]
    };

    try {
      const res = await safeFetch(webhookUrl, {
        method: 'POST',
        body: JSON.stringify(slackBlocks),
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: 5000,
      });
      return res.ok;
    } catch (err: any) {
      Logger.warn(`[SlackProvider] Alert dispatch failed: ${err?.message}`);
      return false;
    }
  }
}

export class TeamsProvider extends IntegrationProvider {
  readonly name = 'Microsoft Teams';

  public async sendAlert(webhookUrl: string, alert: IntegrationAlertPayload, sensitivity: AlertSensitivity = 'CRITICAL_ONLY'): Promise<boolean> {
    if (sensitivity === 'CRITICAL_ONLY' && alert.severity !== 'CRITICAL') return false;

    const teamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: 'EF4444',
      summary: `LeadGuard Alert: ${alert.domain}`,
      sections: [
        {
          activityTitle: `🚨 LeadGuard Alert: ${alert.domain}`,
          activitySubtitle: `Score dropped ${alert.previousScore} ➔ ${alert.newScore}`,
          facts: [
            { name: 'Issue:', value: alert.issueTitle },
            { name: 'Severity:', value: alert.severity }
          ],
          markdown: true
        }
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'View Diagnostic Report',
          targets: [{ os: 'default', uri: alert.reportUrl }]
        }
      ]
    };

    try {
      const res = await safeFetch(webhookUrl, {
        method: 'POST',
        body: JSON.stringify(teamsCard),
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: 5000,
      });
      return res.ok;
    } catch (err: any) {
      Logger.warn(`[TeamsProvider] Alert dispatch failed: ${err?.message}`);
      return false;
    }
  }
}
