import crypto from 'crypto';
import { storage, WatchdogTarget } from './storage';
import { executeLiveWebsiteScan } from './scannerEngine';
import { safeFetch } from './security/safeFetch';
import { jobQueue } from './queue/jobQueue';

export interface WatchdogJob {
  jobId: string;
  targetId: string;
  userId?: string;
  scheduledTime: string;
  attempt: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  result?: any;
}

export class WatchdogScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunningCheck = false;
  private activeJobs = new Map<string, WatchdogJob>();

  public start(intervalMs = 60000) {
    if (this.timer) clearInterval(this.timer);
    console.log(`[WatchdogScheduler] Initializing 24/7 Watchdog Heartbeat Job Queue (Interval: ${intervalMs / 1000}s)...`);

    this.timer = setInterval(() => {
      this.runPeriodicProbes();
    }, intervalMs);

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
      await this.enqueueDueSchedules();
      const targets = storage.getWatchdogTargets().filter(
        t => t.status === 'ACTIVE_TRIAL' || t.status === 'ACTIVE_SUBSCRIPTION'
      );

      if (targets.length === 0) {
        this.isRunningCheck = false;
        return;
      }

      const now = Date.now();
      const eligibleTargets = targets.filter(target => {
        if (!target.lastCheckedAt) return true;
        const elapsedMs = now - new Date(target.lastCheckedAt).getTime();

        switch (target.frequency) {
          case '15MIN': return elapsedMs >= 15 * 60 * 1000;
          case 'HOURLY': return elapsedMs >= 60 * 60 * 1000;
          case 'WEEKLY': return elapsedMs >= 7 * 24 * 60 * 60 * 1000;
          case 'DAILY':
          default:
            return elapsedMs >= 24 * 60 * 60 * 1000;
        }
      });

      // Process up to 5 jobs per interval
      for (const target of eligibleTargets.slice(0, 5)) {
        await this.executeJobForTarget(target);
      }
    } catch (err) {
      console.warn('[WatchdogScheduler] Probe iteration error:', err);
    } finally {
      this.isRunningCheck = false;
    }
  }

  private async enqueueDueSchedules() {
    const now = Date.now();
    for (const schedule of storage.getSchedules()) {
      if (!schedule.enabled) continue;
      const nextRunMs = new Date(schedule.nextRunAt).getTime();
      if (!Number.isFinite(nextRunMs)) {
        storage.updateSchedule(schedule.id, { enabled: false });
        continue;
      }
      if (nextRunMs > now) continue;
      const existingJob = schedule.jobId ? jobQueue.getJob(schedule.jobId) : undefined;
      if (existingJob?.status === 'QUEUED' || existingJob?.status === 'RUNNING') continue;
      const job = await jobQueue.enqueue('scanWebsite', { url: schedule.targetUrl, options: { forceLive: true } }, schedule.userId);
      const nextRunAt = new Date(now + (schedule.frequency === 'DAILY' ? 86400000 : 7 * 86400000)).toISOString();
      storage.updateSchedule(schedule.id, { jobId: job.id, nextRunAt });
    }
  }

  public async executeJobForTarget(target: WatchdogTarget): Promise<WatchdogJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const job: WatchdogJob = {
      jobId,
      targetId: target.id,
      userId: target.userId,
      scheduledTime: new Date().toISOString(),
      attempt: 1,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    };

    this.activeJobs.set(jobId, job);

    try {
      const currentAudit = await executeLiveWebsiteScan(target.targetUrl, { forceLive: true });
      const previousScore = target.lastScore ?? 100;
      const isRegression = currentAudit.score < previousScore - 5;

      const hasBrokenWa = currentAudit.whatsappLinks.some((w: any) => !w.isValid);
      const hasMissingPixel = !currentAudit.metaPixel?.exists;
      const statusText = hasBrokenWa
        ? "FAIL (+9191 or broken WA)"
        : isRegression
        ? `REGRESSION (Score dropped ${previousScore} -> ${currentAudit.score})`
        : hasMissingPixel
        ? "WARN (Missing Pixel)"
        : "PASS (Healthy)";

      storage.updateWatchdogTarget(target.id, {
        lastCheckedAt: new Date().toISOString(),
        lastScore: currentAudit.score,
        lastStatus: statusText,
      });

      storage.addWatchdogCheckLog({
        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        userId: target.userId,
        domain: target.domain,
        check: "Automated 4-Pillar Watchdog Probe",
        status: statusText,
        score: currentAudit.score,
        timestamp: new Date().toISOString(),
        details: isRegression
          ? `Score regression detected: ${previousScore} -> ${currentAudit.score}`
          : currentAudit.allIssues.length > 0
          ? `${currentAudit.allIssues.length} issues detected`
          : "All systems operational",
      });

      if (isRegression || currentAudit.score < 60 || hasBrokenWa) {
        await this.dispatchWebhooksForIncident(target, currentAudit, isRegression);
      }

      job.status = 'COMPLETED';
      job.finishedAt = new Date().toISOString();
      job.result = { score: currentAudit.score, isRegression };
    } catch (err: any) {
      job.status = 'FAILED';
      job.error = err?.message || 'Server did not respond';
      job.finishedAt = new Date().toISOString();

      storage.addWatchdogCheckLog({
        id: `chk_${Date.now()}`,
        userId: target.userId,
        domain: target.domain,
        check: "Connectivity & Server Probe",
        status: `FAIL (Unreachable)`,
        timestamp: new Date().toISOString(),
        details: err?.message || "Server did not respond",
      });
    }

    return job;
  }

  public async dispatchWebhooksForIncident(target: WatchdogTarget, audit: any, isRegression = false) {
    const webhooks = storage.getWebhooks().filter(
      w => w.active && (!target.userId || !w.userId || w.userId === target.userId)
    );
    if (webhooks.length === 0) return;

    const payload = {
      event: isRegression ? 'watchdog.score_regression' : 'watchdog.incident_detected',
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
        criticalIssues: audit.allIssues
          .filter((i: any) => i.severity === 'CRITICAL')
          .map((i: any) => i.title),
      },
    };

    for (const hook of webhooks) {
      try {
        const bodyStr = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', hook.secret)
          .update(bodyStr)
          .digest('hex');

        await safeFetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-LeadGuard-Signature': signature,
            'User-Agent': 'LeadGuard-Watchdog-Webhook/2.0',
          },
          body: bodyStr,
          timeoutMs: 8000,
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
