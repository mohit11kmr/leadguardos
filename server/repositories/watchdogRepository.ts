import { storage, WatchdogTarget, WatchdogCheckLog } from '../storage';

export interface IWatchdogRepository {
  addTarget(target: WatchdogTarget): Promise<WatchdogTarget>;
  getTargetById(id: string): Promise<WatchdogTarget | undefined>;
  getTargets(userId?: string): Promise<WatchdogTarget[]>;
  updateTarget(id: string, updates: Partial<WatchdogTarget>): Promise<void>;
  addCheckLog(log: WatchdogCheckLog): Promise<void>;
  getCheckLogs(limit?: number): Promise<WatchdogCheckLog[]>;
}

export class WatchdogRepository implements IWatchdogRepository {
  async addTarget(target: WatchdogTarget): Promise<WatchdogTarget> {
    storage.addWatchdogTarget(target);
    return target;
  }

  async getTargetById(id: string): Promise<WatchdogTarget | undefined> {
    return storage.getWatchdogTarget(id);
  }

  async getTargets(userId?: string): Promise<WatchdogTarget[]> {
    const targets = storage.getWatchdogTargets();
    if (userId) {
      return targets.filter((t: any) => !t.userId || t.userId === userId);
    }
    return targets;
  }

  async updateTarget(id: string, updates: Partial<WatchdogTarget>): Promise<void> {
    storage.updateWatchdogTarget(id, updates);
  }

  async addCheckLog(log: WatchdogCheckLog): Promise<void> {
    storage.addWatchdogCheckLog(log);
  }

  async getCheckLogs(limit = 25): Promise<WatchdogCheckLog[]> {
    return storage.getWatchdogCheckLogs(limit);
  }
}

export const watchdogRepository = new WatchdogRepository();
