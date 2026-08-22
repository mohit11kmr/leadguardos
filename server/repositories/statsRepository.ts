import { storage, SystemStats } from '../storage';

export class StatsRepository {
  async getSystemStats(): Promise<SystemStats> {
    return storage.getStats();
  }

  async recordScanCompleted(hasIssues: boolean, isHealthy: boolean, issuesCount = 1): Promise<void> {
    storage.incrementScanStats(hasIssues, isHealthy, issuesCount);
  }

  async recordFixCompleted(): Promise<void> {
    storage.incrementFixes();
  }
}

export const statsRepository = new StatsRepository();
