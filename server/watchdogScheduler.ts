import { watchdogRepository, WatchdogTargetDocument } from './repositories/watchdogRepository';
import { webhookRepository } from './repositories/webhookRepository';
import { executeLiveWebsiteScan } from './scannerEngine';

function calculateNextCheckTime(frequency: string = 'DAILY'): string {
  const now = Date.now();
  switch (frequency) {
    case '15MIN':
      return new Date(now + 15 * 60 * 1000).toISOString();
    case 'HOURLY':
      return new Date(now + 60 * 60 * 1000).toISOString();
    case 'WEEKLY':
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'DAILY':
    default:
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  }
}

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
      // 1. Fetch all targets across database (admin mode = true)
      const allTargets = await watchdogRepository.getTargets(undefined, undefined, true);
      const now = new Date();

      // 2. Filter strictly active, non-demo targets whose nextCheckAt has elapsed or is not yet set
      const eligibleTargets = allTargets.filter(t => {
        if (t.mode === 'DEMO') return false; // Exclude DEMO mock targets from live customer radar
        if (t.status !== 'ACTIVE_TRIAL' && t.status !== 'ACTIVE_SUBSCRIPTION') return false;

        // Check if scheduled time has arrived
        if (!t.nextCheckAt) return true;
        return new Date(t.nextCheckAt) <= now;
      });

      if (eligibleTargets.length === 0) {
        this.isRunningCheck = false;
        return;
      }

      // 3. Process eligible targets in concurrency batches of 5
      const BATCH_SIZE = 5;
      for (let i = 0; i < eligibleTargets.length; i += BATCH_SIZE) {
        const chunk = eligibleTargets.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(chunk.map(target => this.probeSingleTarget(target)));
      }
    } catch (err) {
      console.warn('[WatchdogScheduler] Periodic probe iteration error:', err);
    } finally {
      this.isRunningCheck = false;
    }
  }

  private async probeSingleTarget(target: WatchdogTargetDocument): Promise<void> {
    const nextCheckAt = calculateNextCheckTime(target.frequency);
    const checkStartTime = Date.now();

    try {
      const audit = await executeLiveWebsiteScan(target.targetUrl);
      const durationMs = Date.now() - checkStartTime;

      const hasBrokenWa = audit.whatsappLinks?.some((w: any) => !w.isValid) || false;
      const hasMissingPixel = !audit.metaPixel?.exists;
      const statusText = hasBrokenWa
        ? 'FAIL (+9191 or broken WhatsApp)'
        : (hasMissingPixel ? 'WARN (Missing Meta Pixel)' : 'PASS (Healthy)');

      // Update target in repository / Firestore
      await watchdogRepository.updateTarget(
        target.id,
        {
          lastCheckedAt: new Date().toISOString(),
          nextCheckAt,
          lastScore: audit.score,
          lastStatus: statusText,
        },
        undefined,
        true
      );

      // Log probe check history
      await watchdogRepository.addCheckLog({
        targetId: target.id,
        domain: target.domain,
        check: 'Automated 4-Pillar Watchdog Probe',
        status: statusText,
        score: audit.score,
        timestamp: new Date().toISOString(),
        durationMs,
        details: audit.allIssues?.length > 0
          ? `${audit.allIssues.length} findings detected (Score: ${audit.score}/100)`
          : 'All systems fully operational',
      });

      // If critical leak or degradation detected, trigger incident webhooks
      if (audit.score < 60 || hasBrokenWa) {
        await this.dispatchIncidentWebhooks(target, audit);
      }
    } catch (err: any) {
      // Record failure log without crashing scheduler
      await watchdogRepository.updateTarget(
        target.id,
        {
          lastCheckedAt: new Date().toISOString(),
          nextCheckAt,
          lastStatus: 'FAIL (Unreachable)',
        },
        undefined,
        true
      );

      await watchdogRepository.addCheckLog({
        targetId: target.id,
        domain: target.domain,
        check: 'Connectivity & Server Probe',
        status: 'FAIL (Unreachable)',
        timestamp: new Date().toISOString(),
        details: err?.message || 'Host did not respond during probe attempt',
      });
    }
  }

  private async dispatchIncidentWebhooks(target: WatchdogTargetDocument, audit: any): Promise<void> {
    try {
      // Get user webhooks or global webhooks
      const webhooks = await webhookRepository.getWebhooks(target.userId, !target.userId);
      const activeHooks = webhooks.filter(w => w.active && (w.events.includes('watchdog.alert') || w.events.includes('watchdog.incident_detected')));

      if (activeHooks.length === 0) return;

      const payload = {
        target: {
          id: target.id,
          domain: target.domain,
          targetUrl: target.targetUrl,
          contact: target.contact,
          channel: target.channel,
        },
        auditSummary: {
          score: audit.score,
          estimatedMonthlyLoss: audit.estimatedMonthlyLoss || 0,
          issuesCount: audit.allIssues?.length || 0,
          criticalIssues: audit.allIssues?.filter((i: any) => i.severity === 'CRITICAL').map((i: any) => i.title) || [],
        },
      };

      for (const hook of activeHooks) {
        await webhookRepository.dispatchWebhook(hook, 'watchdog.incident_detected', payload);
      }
    } catch (err) {
      console.warn(`[WatchdogScheduler] Error dispatching incident webhooks for ${target.domain}:`, err);
    }
  }
}

export const watchdogScheduler = new WatchdogScheduler();
