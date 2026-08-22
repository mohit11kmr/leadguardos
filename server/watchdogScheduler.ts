import crypto from 'crypto';
import { storage, WatchdogTarget, WebhookConfig } from './storage';
import { executeLiveWebsiteScan } from './scannerEngine';

export class WatchdogScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunningCheck = false;

  public start(intervalMs = 60000) {
    if (this.timer) clearInterval(this.timer);
    console.log(`[WatchdogScheduler] Initializing 24/7 Watchdog Heartbeat Radar (Interval: ${intervalMs / 1000}s)...`);
    
    this.timer = setInterval(() => {
      this.runPeriodicProbes();
    }, intervalMs);

    // Initial warm-up run after 5 seconds
    setTimeout(() => {
      this.runPeriodicProbes();
    }, 5000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async runPeriodicProbes() {
    if (this.isRunningCheck) return;
    this.isRunningCheck = true;

    try {
      const targets = storage.getWatchdogTargets().filter(t => t.status === 'ACTIVE_TRIAL' || t.status === 'ACTIVE_SUBSCRIPTION');
      if (targets.length === 0) {
        this.isRunningCheck = false;
        return;
      }

      for (const target of targets.slice(0, 3)) { // Check up to 3 targets per interval
        try {
          const audit = await executeLiveWebsiteScan(target.targetUrl);
          const hasBrokenWa = audit.whatsappLinks.some((w: any) => !w.isValid);
          const hasMissingPixel = !audit.metaPixel?.exists;
          const statusText = hasBrokenWa ? "FAIL (+9191 or broken WA)" : (hasMissingPixel ? "WARN (Missing Pixel)" : "PASS (Healthy)");

          storage.updateWatchdogTarget(target.id, {
            lastCheckedAt: new Date().toISOString(),
            lastScore: audit.score,
            lastStatus: statusText,
          });

          storage.addWatchdogCheckLog({
            id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            domain: target.domain,
            check: "Automated 4-Pillar Watchdog Probe",
            status: statusText,
            score: audit.score,
            timestamp: new Date().toISOString(),
            details: audit.allIssues.length > 0 ? `${audit.allIssues.length} issues detected` : "All systems operational",
          });

          // If a critical leak is found, trigger registered webhooks
          if (audit.score < 60 || hasBrokenWa) {
            await this.dispatchWebhooksForIncident(target, audit);
          }
        } catch (err: any) {
          storage.addWatchdogCheckLog({
            id: `chk_${Date.now()}`,
            domain: target.domain,
            check: "Connectivity & Server Probe",
            status: `FAIL (Unreachable)`,
            timestamp: new Date().toISOString(),
            details: err?.message || "Server did not respond",
          });
        }
      }
    } catch (err) {
      console.warn('[WatchdogScheduler] Probe iteration error:', err);
    } finally {
      this.isRunningCheck = false;
    }
  }

  public async dispatchWebhooksForIncident(target: WatchdogTarget, audit: any) {
    const webhooks = storage.getWebhooks().filter(w => w.active);
    if (webhooks.length === 0) return;

    const payload = {
      event: 'watchdog.incident_detected',
      timestamp: new Date().toISOString(),
      target: {
        id: target.id,
        domain: target.domain,
        targetUrl: target.targetUrl,
        contact: target.contact,
        channel: target.channel,
      },
      auditSummary: {
        score: audit.score,
        estimatedMonthlyLoss: audit.estimatedMonthlyLoss,
        issuesCount: audit.allIssues.length,
        criticalIssues: audit.allIssues.filter((i: any) => i.severity === 'CRITICAL').map((i: any) => i.title),
      },
    };

    for (const hook of webhooks) {
      try {
        const bodyStr = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', hook.secret || 'leadguard_secret').update(bodyStr).digest('hex');

        await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-LeadGuard-Signature': signature,
            'User-Agent': 'LeadGuard-Watchdog-Webhook/2.0',
          },
          body: bodyStr,
        });

        hook.lastTriggeredAt = new Date().toISOString();
        hook.failureCount = 0;
      } catch (e) {
        hook.failureCount = (hook.failureCount || 0) + 1;
        console.warn(`[Webhook] Failed to dispatch to ${hook.url}:`, e);
      }
    }
    storage.saveToDisk();
  }
}

export const watchdogScheduler = new WatchdogScheduler();
