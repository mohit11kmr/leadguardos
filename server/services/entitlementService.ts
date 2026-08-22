import { PlanTier, PLAN_CONFIG } from '../config/pricing';
import { AuthUser } from '../middleware/auth';

export interface UserUsage {
  scansThisMonth: number;
  watchdogTargetsCount: number;
  exportsThisMonth: number;
}

export class EntitlementService {
  public static getUserPlan(user?: AuthUser): PlanTier {
    if (!user) return 'FREE';
    if (user.role === 'ADMIN') return 'AGENCY';
    if (user.role === 'AGENCY') return 'AGENCY';
    return 'FREE';
  }

  public static canRunScan(user?: AuthUser, usage: UserUsage = { scansThisMonth: 0, watchdogTargetsCount: 0, exportsThisMonth: 0 }): { allowed: boolean; reason?: string } {
    const plan = this.getUserPlan(user);
    const config = PLAN_CONFIG[plan];

    if (usage.scansThisMonth >= config.monthlyScans) {
      return {
        allowed: false,
        reason: `Monthly scan limit reached (${usage.scansThisMonth}/${config.monthlyScans}). Upgrade to Pro for 50 scans/mo.`,
      };
    }
    return { allowed: true };
  }

  public static canCreateWatchdog(user?: AuthUser, usage: UserUsage = { scansThisMonth: 0, watchdogTargetsCount: 0, exportsThisMonth: 0 }): { allowed: boolean; reason?: string } {
    const plan = this.getUserPlan(user);
    const config = PLAN_CONFIG[plan];

    if (usage.watchdogTargetsCount >= config.maxWatchdogTargets) {
      return {
        allowed: false,
        reason: `Watchdog limit reached (${usage.watchdogTargetsCount}/${config.maxWatchdogTargets} target). Upgrade plan to monitor more domains.`,
      };
    }
    return { allowed: true };
  }

  public static canExportReport(user?: AuthUser): { allowed: boolean; reason?: string } {
    const plan = this.getUserPlan(user);
    const config = PLAN_CONFIG[plan];

    if (!config.allowExports) {
      return {
        allowed: false,
        reason: 'Report PDF & CSV export requires a Pro or Agency subscription.',
      };
    }
    return { allowed: true };
  }

  public static canUseAdvancedTool(user?: AuthUser): { allowed: boolean; reason?: string } {
    const plan = this.getUserPlan(user);
    const config = PLAN_CONFIG[plan];

    if (!config.allowAdvancedTools) {
      return {
        allowed: false,
        reason: 'Advanced tools (Sabotage Radar, Hunter Outbound) require a Pro or Agency subscription.',
      };
    }
    return { allowed: true };
  }
}
