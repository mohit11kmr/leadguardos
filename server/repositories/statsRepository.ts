import { isPgEnabled } from '../db/storageMode';
import { scanRepository } from './scanRepository';
import { watchdogRepository } from './watchdogRepository';
import { orderRepository } from './orderRepository';

export interface RealSystemMetrics {
  totalScannedSites: number;
  problemsFound: number;
  healthySites: number;
  fixedByLeadGuard: number;
  activeLiveMonitors: number;
  totalLiveScans: number;
  totalUsers: number;
  totalOrders: number;
  mode: 'LIVE';
  lastUpdated: string;
  isRealDatabaseData: boolean;
}

export class StatsRepository {
  private localStats: RealSystemMetrics = {
    totalScannedSites: 0,
    problemsFound: 0,
    healthySites: 0,
    fixedByLeadGuard: 0,
    activeLiveMonitors: 0,
    totalLiveScans: 0,
    totalUsers: 0,
    totalOrders: 0,
    mode: 'LIVE',
    lastUpdated: new Date().toISOString(),
    isRealDatabaseData: true,
  };

  async getSystemStats(): Promise<RealSystemMetrics> {
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const row = await prisma.systemStats.findUnique({ where: { id: 'global' } });
      const base = { ...this.localStats };
      if (row) {
        base.totalScannedSites = row.totalScannedSites;
        base.totalLiveScans = row.totalScannedSites;
        base.problemsFound = row.problemsFound;
        base.healthySites = row.healthySites;
        base.fixedByLeadGuard = row.fixedByLeadGuard;
        base.lastUpdated = row.updatedAt.toISOString();
      }
      return base as RealSystemMetrics;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('STATS_SOURCE_UNAVAILABLE: PostgreSQL required in production for statistics');
    }

    // Dynamic recalculation from in-memory repositories in dev/test
    try {
      const recentScans = await scanRepository.getRecentScans(200, 'LIVE');
      if (recentScans) {
        this.localStats.totalLiveScans = recentScans.length;
        this.localStats.totalScannedSites = recentScans.length;
        this.localStats.problemsFound = recentScans.reduce((acc, s) => acc + (s.findingsCount || 0), 0);
        this.localStats.healthySites = recentScans.filter(s => s.score >= 80).length;
      }

      const monitors = await watchdogRepository.getTargets(undefined, undefined, true);
      if (monitors) {
        this.localStats.activeLiveMonitors = monitors.filter(m => m.mode !== 'DEMO').length;
      }

      const orders = await orderRepository.getOrders(undefined, undefined, true);
      if (orders) {
        this.localStats.totalOrders = orders.length;
      }
    } catch {
      // Keep local calculations
    }

    return { ...this.localStats, lastUpdated: new Date().toISOString() };
  }

  async recordScanCompleted(hasIssues: boolean, isHealthy: boolean, issuesCount = 1, isLiveScan = true): Promise<void> {
    if (!isLiveScan) {
      // Exclude DEMO scans from real customer statistics
      return;
    }

    this.localStats.totalScannedSites += 1;
    this.localStats.totalLiveScans += 1;
    if (hasIssues) this.localStats.problemsFound += issuesCount;
    if (isHealthy) this.localStats.healthySites += 1;
    this.localStats.lastUpdated = new Date().toISOString();

    if (isPgEnabled()) {
      void (async () => {
        try {
          const { prisma } = await import('../db/prisma');
          await prisma.systemStats.upsert({
            where: { id: 'global' },
            create: {
              totalScannedSites: 1,
              problemsFound: hasIssues ? issuesCount : 0,
              healthySites: isHealthy ? 1 : 0,
            },
            update: {
              totalScannedSites: { increment: 1 },
              problemsFound: { increment: hasIssues ? issuesCount : 0 },
              healthySites: { increment: isHealthy ? 1 : 0 },
            },
          });
        } catch (err: any) {
          console.error('[StatsRepository] PG persist failed:', err?.message);
        }
      })();
      return;
    }
  }

  async recordFixCompleted(): Promise<void> {
    this.localStats.fixedByLeadGuard += 1;
    this.localStats.lastUpdated = new Date().toISOString();

    if (isPgEnabled()) {
      void (async () => {
        try {
          const { prisma } = await import('../db/prisma');
          await prisma.systemStats.upsert({
            where: { id: 'global' },
            create: { fixedByLeadGuard: 1 },
            update: { fixedByLeadGuard: { increment: 1 } },
          });
        } catch (err: any) {
          console.error('[StatsRepository] PG persist failed:', err?.message);
        }
      })();
      return;
    }
  }

  async recordUserRegistered(): Promise<void> {
    this.localStats.totalUsers += 1;
    this.localStats.lastUpdated = new Date().toISOString();

    if (isPgEnabled()) {
      void (async () => {
        try {
          const { prisma } = await import('../db/prisma');
          await prisma.user.count().then(() => undefined);
        } catch { /* telemetry-only */ }
      })();
      return;
    }
  }

  async recordOrderCreated(): Promise<void> {
    this.localStats.totalOrders += 1;
    this.localStats.lastUpdated = new Date().toISOString();
  }

  public clear(): void {
    this.localStats = {
      totalScannedSites: 0,
      problemsFound: 0,
      healthySites: 0,
      fixedByLeadGuard: 0,
      activeLiveMonitors: 0,
      totalLiveScans: 0,
      totalUsers: 0,
      totalOrders: 0,
      mode: 'LIVE',
      lastUpdated: new Date().toISOString(),
      isRealDatabaseData: true,
    };
  }
}

export const statsRepository = new StatsRepository();
