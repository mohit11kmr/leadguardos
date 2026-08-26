import { storage } from './storage';
import { jobQueue } from './queue/jobQueue';
import { watchdogRepository, WatchdogTargetDocument } from './repositories/watchdogRepository';

/**
 * Durable Watchdog Scheduler.
 *
 * Production semantics (Phase 11):
 *   nextCheckAt due → acquire lease (idempotent, multi-instance safe)
 *   → enqueue durable `runWatchdog` job → worker executes probe
 *   → worker persists result + computes nextCheckAt.
 *
 * The scheduler NEVER runs scans inline in the API process and NEVER
 * duplicates monitoring jobs: a target with a live QUEUED/RUNNING job is
 * skipped until that job reaches a terminal state.
 */

/** Single source of truth for watchdog frequency intervals. */
export const WATCHDOG_FREQUENCY_MS: Record<string, number> = {
  '15MIN': 15 * 60 * 1000,
  HOURLY: 60 * 60 * 1000,
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};

export function computeNextCheckAt(frequency: string | undefined): string {
  const interval = WATCHDOG_FREQUENCY_MS[frequency || 'DAILY'] || WATCHDOG_FREQUENCY_MS.DAILY;
  return new Date(Date.now() + interval).toISOString();
}

function isDue(target: WatchdogTargetDocument): boolean {
  if (!(target.status === 'ACTIVE_TRIAL' || target.status === 'ACTIVE_SUBSCRIPTION')) return false;
  if (target.mode === 'DEMO') return false;
  // Exact-target contract: a monitor without targetUrl is invalid and must
  // never be silently probed via its domain.
  if (!target.targetUrl) return false;

  // Already scheduled? Wait for the pending run to finish.
  if (target.pendingRunJobId) return false;

  if (!target.nextCheckAt && !target.lastCheckedAt) return true;
  const reference = target.nextCheckAt || target.lastCheckedAt || '';
  const refMs = new Date(reference).getTime();
  return Number.isFinite(refMs) && Date.now() >= refMs;
}

export class WatchdogScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunningCheck = false;
  private readonly instanceId = `sched_${process.pid}_${Math.random().toString(36).substring(2, 8)}`;

  public start(intervalMs = 60000) {
    if (this.timer) clearInterval(this.timer);
    console.log(`[WatchdogScheduler] Durable heartbeat active (interval ${intervalMs / 1000}s, instance ${this.instanceId})`);

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

  /**
   * Enqueue due watchdog targets onto the durable queue.
   * Lease-protected so horizontally-scaled API instances never double-enqueue.
   */
  public async enqueueDueWatchdogTargets(): Promise<number> {
    let targets: any[] = [];
    try {
      targets = await watchdogRepository.getTargets(undefined, undefined, true);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        return 0;
      }
      throw err;
    }
    const due = targets.filter(isDue);
    let enqueued = 0;

    for (const target of due.slice(0, 25)) {
      try {
        // Distributed lease prevents duplicate scheduling across instances.
        const leased = await watchdogRepository.acquireTargetLease(target.id!, `${this.instanceId}-enqueue`, 120000);
        if (!leased) continue;

        // Re-read after lease: another instance may have just scheduled it.
        const fresh = await watchdogRepository.getTargetById(target.id!, undefined, true);
        if (!fresh || fresh.pendingRunJobId || !isDue(fresh)) continue;

        const job = await jobQueue.enqueue('runWatchdog', { targetId: target.id }, fresh.userId, 5);
        await watchdogRepository.updateTarget(target.id!, {
          pendingRunJobId: job.id,
          nextCheckAt: computeNextCheckAt(fresh.frequency),
        }, undefined, true);
        enqueued++;
      } catch (err: any) {
        console.warn(`[WatchdogScheduler] Failed to schedule target ${target.id}:`, err?.message);
        await watchdogRepository.releaseTargetLease(target.id!, `${this.instanceId}-enqueue`).catch(() => undefined);
      }
    }
    return enqueued;
  }

  /** Legacy recurring scan schedules (dev feature). Idempotent via jobId check. */
  private async enqueueDueSchedules() {
    for (const schedule of storage.getSchedules()) {
      if (!schedule.enabled) continue;
      const nextRunMs = new Date(schedule.nextRunAt).getTime();
      if (!Number.isFinite(nextRunMs)) {
        storage.updateSchedule(schedule.id, { enabled: false });
        continue;
      }
      if (nextRunMs > Date.now()) continue;
      const existingJob = schedule.jobId ? await jobQueue.getJob(schedule.jobId) : undefined;
      if (existingJob?.status === 'QUEUED' || existingJob?.status === 'RUNNING') continue;
      const job = await jobQueue.enqueue('scanWebsite', { url: schedule.targetUrl, options: { forceLive: true } }, schedule.userId);
      const nextRunAt = new Date(Date.now() + (schedule.frequency === 'DAILY' ? 86400000 : 7 * 86400000)).toISOString();
      storage.updateSchedule(schedule.id, { jobId: job.id, nextRunAt });
    }
  }

  public async runPeriodicProbes() {
    if (this.isRunningCheck) return;
    this.isRunningCheck = true;

    try {
      await this.enqueueDueSchedules();
      const enqueued = await this.enqueueDueWatchdogTargets();
      if (enqueued > 0) {
        console.log(`[WatchdogScheduler] Enqueued ${enqueued} durable watchdog run(s).`);
      }
    } catch (err) {
      console.warn('[WatchdogScheduler] Probe iteration error:', err);
    } finally {
      this.isRunningCheck = false;
    }
  }
}

export const watchdogScheduler = new WatchdogScheduler();
