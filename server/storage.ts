import fs from 'fs';
import path from 'path';

export interface ScanRecord {
  scanId: string;
  userId?: string;
  publicToken: string;
  targetUrl: string;
  domain: string;
  businessName?: string;
  score: number;
  estimatedMonthlyLoss: number;
  adSpendRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  pillars: any;
  whatsappLinks: any[];
  phoneLinks: any[];
  emailLinks: any[];
  reviewLinks: any[];
  socialLinks: any[];
  metaPixel: any;
  googleTag: any;
  seoPenalty: any;
  cyberShield: any;
  ecommerce?: any;
  allIssues: any[];
  lockedIssuesCount: number;
  freeIssue?: any;
  performance: {
    fetchTimeMs: number;
    parseTimeMs: number;
    totalTimeMs: number;
  };
  scannedAt: string;
  aiDiagnosticAdvice?: string;
  leadAuditData?: any;
  aiRemediation?: {
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    content?: string;
    error?: string;
    updatedAt: string;
  };
}

export interface WatchdogTarget {
  id: string;
  userId?: string;
  targetUrl: string;
  domain: string;
  contact: string;
  channel: 'TELEGRAM' | 'WHATSAPP' | 'EMAIL';
  frequency: 'DAILY' | 'HOURLY' | 'WEEKLY' | '15MIN';
  createdAt: string;
  trialExpiresAt: string;
  status: 'ACTIVE_TRIAL' | 'ACTIVE_SUBSCRIPTION' | 'EXPIRED' | 'CONVERTED' | 'PAUSED';
  lastCheckedAt?: string;
  lastScore?: number;
  lastStatus?: string;
}

export interface WatchdogCheckLog {
  id: string;
  userId?: string;
  domain: string;
  check: string;
  status: string;
  score?: number;
  timestamp: string;
  details?: string;
}

export interface ScanSchedule {
  id: string;
  userId: string;
  targetUrl: string;
  frequency: 'DAILY' | 'WEEKLY';
  cronExpression: string;
  enabled: boolean;
  jobId?: string;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookConfig {
  id: string;
  userId?: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
}

export interface OrderRecord {
  orderId: string;
  userId?: string;
  tierId: string;
  tierName: string;
  amountINR: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  domain?: string;
  status: 'CREATED' | 'PAYMENT_PENDING' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  providerOrderId?: string;
  providerPaymentId?: string;
  createdAt: string;
}

export interface SystemStats {
  totalScannedSites: number;
  problemsFound: number;
  healthySites: number;
  fixedByLeadGuard: number;
  lastUpdated: string;
}

export interface UserAccount {
  id: string;
  email: string;
  role: 'USER' | 'AGENCY' | 'ADMIN';
  apiKey?: string;
  createdAt: string;
}

class StorageEngine {
  private dataFilePath: string;
  private scans: Map<string, ScanRecord> = new Map();
  private watchdogTargets: Map<string, WatchdogTarget> = new Map();
  private watchdogChecks: WatchdogCheckLog[] = [];
  private schedules: Map<string, ScanSchedule> = new Map();
  private webhooks: Map<string, WebhookConfig> = new Map();
  private orders: OrderRecord[] = [];
  private users: Map<string, UserAccount> = new Map();
  private stats: SystemStats = {
    totalScannedSites: 14820,
    problemsFound: 38490,
    healthySites: 2940,
    fixedByLeadGuard: 11260,
    lastUpdated: new Date().toISOString(),
  };

  constructor() {
    const dataDir = process.env.LEADGUARD_DATA_DIR || path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.warn('Could not create data directory, using in-memory only:', err);
      }
    }
    this.dataFilePath = path.join(dataDir, 'leadguard-db.json');
    this.loadFromDisk();
    this.seedDefaultsIfEmpty();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.scans && Array.isArray(parsed.scans)) {
          for (const s of parsed.scans) this.scans.set(s.scanId, s);
        }
        if (parsed.watchdogTargets && Array.isArray(parsed.watchdogTargets)) {
          for (const w of parsed.watchdogTargets) this.watchdogTargets.set(w.id, w);
        }
        if (parsed.watchdogChecks && Array.isArray(parsed.watchdogChecks)) {
          this.watchdogChecks = parsed.watchdogChecks;
        }
        if (parsed.schedules && Array.isArray(parsed.schedules)) {
          for (const schedule of parsed.schedules) this.schedules.set(schedule.id, schedule);
        }
        if (parsed.webhooks && Array.isArray(parsed.webhooks)) {
          for (const wh of parsed.webhooks) this.webhooks.set(wh.id, wh);
        }
        if (parsed.orders && Array.isArray(parsed.orders)) {
          this.orders = parsed.orders;
        }
        if (parsed.users && Array.isArray(parsed.users)) {
          for (const u of parsed.users) this.users.set(u.id, u);
        }
        if (parsed.stats) {
          this.stats = { ...this.stats, ...parsed.stats };
        }
        console.log(`[StorageEngine] Loaded ${this.scans.size} scans, ${this.watchdogTargets.size} monitors from disk.`);
      }
    } catch (err) {
      console.warn('[StorageEngine] Could not read disk database, using fresh store:', err);
    }
  }

  public saveToDisk() {
    try {
      const payload = {
        scans: Array.from(this.scans.values()).slice(-200), // Retain most recent 200 scans
        watchdogTargets: Array.from(this.watchdogTargets.values()),
        watchdogChecks: this.watchdogChecks.slice(0, 100),
        schedules: Array.from(this.schedules.values()),
        webhooks: Array.from(this.webhooks.values()),
        orders: this.orders.slice(-100),
        users: Array.from(this.users.values()),
        stats: this.stats,
      };
      const tempPath = `${this.dataFilePath}.tmp-${process.pid}`;
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dataFilePath);
    } catch (err) {
      console.warn('[StorageEngine] Error saving to disk:', err);
    }
  }

  private seedDefaultsIfEmpty() {
    if (this.watchdogChecks.length === 0) {
      this.watchdogChecks = [
        { id: "chk_1", domain: "drsharmadental.in", check: "WhatsApp Link Routing", status: "FAIL (+9191)", timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
        { id: "chk_2", domain: "elitesalonmumbai.com", check: "Google Review 404", status: "FAIL (404 Dead Link)", timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
        { id: "chk_3", domain: "urbanvogue.in", check: "Meta Pixel & GA4 Ping", status: "PASS (Healthy)", timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
        { id: "chk_4", domain: "apexgrandrealestate.com", check: "Toll Free Dialer", status: "FAIL (8-digit cut)", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
      ];
    }
    if (this.watchdogTargets.size === 0) {
      const defaultTargets: WatchdogTarget[] = [
        {
          id: "wd_default_1",
          targetUrl: "https://drsharmadental.in",
          domain: "drsharmadental.in",
          contact: "+91 98765 43210",
          channel: "WHATSAPP",
          frequency: "DAILY",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          trialExpiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: "ACTIVE_SUBSCRIPTION",
          lastCheckedAt: new Date().toISOString(),
          lastScore: 38,
          lastStatus: "CRITICAL_LEAKS",
        },
        {
          id: "wd_default_2",
          targetUrl: "https://urbanvogue.in",
          domain: "urbanvogue.in",
          contact: "@urbanvogue_alerts",
          channel: "TELEGRAM",
          frequency: "HOURLY",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          trialExpiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          status: "ACTIVE_SUBSCRIPTION",
          lastCheckedAt: new Date().toISOString(),
          lastScore: 96,
          lastStatus: "HEALTHY",
        }
      ];
      for (const t of defaultTargets) this.watchdogTargets.set(t.id, t);
    }
  }

  // --- Scan Methods ---
  public saveScan(scan: ScanRecord) {
    this.scans.set(scan.scanId, scan);
    this.saveToDisk();
  }

  public getScan(scanId: string): ScanRecord | undefined {
    return this.scans.get(scanId);
  }

  public updateScan(scanId: string, updates: Partial<ScanRecord>): ScanRecord | undefined {
    const existing = this.scans.get(scanId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.scans.set(scanId, updated);
    this.saveToDisk();
    return updated;
  }

  public getScansForUser(userId: string): ScanRecord[] {
    return Array.from(this.scans.values()).filter(s => s.userId === userId);
  }

  public getScansHistory(limit = 20): ScanRecord[] {
    return Array.from(this.scans.values())
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, limit);
  }

  public getScansHistoryForUser(userId: string, limit = 20): ScanRecord[] {
    return Array.from(this.scans.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, limit);
  }

  // --- Scan Schedule Methods ---
  public addSchedule(schedule: ScanSchedule) {
    this.schedules.set(schedule.id, schedule);
    this.saveToDisk();
  }

  public getSchedulesForUser(userId: string): ScanSchedule[] {
    return Array.from(this.schedules.values()).filter(schedule => schedule.userId === userId);
  }

  public getSchedules(): ScanSchedule[] {
    return Array.from(this.schedules.values());
  }

  public getSchedule(id: string): ScanSchedule | undefined {
    return this.schedules.get(id);
  }

  public updateSchedule(id: string, updates: Partial<ScanSchedule>): ScanSchedule | undefined {
    const existing = this.schedules.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.schedules.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  public deleteSchedule(id: string): boolean {
    const deleted = this.schedules.delete(id);
    if (deleted) this.saveToDisk();
    return deleted;
  }

  // --- Watchdog Methods ---
  public addWatchdogTarget(target: WatchdogTarget) {
    this.watchdogTargets.set(target.id, target);
    this.saveToDisk();
  }

  public getWatchdogTargets(): WatchdogTarget[] {
    return Array.from(this.watchdogTargets.values());
  }

  public getWatchdogTargetsForUser(userId: string): WatchdogTarget[] {
    return Array.from(this.watchdogTargets.values()).filter(t => t.userId === userId);
  }

  public getWatchdogTarget(id: string): WatchdogTarget | undefined {
    return this.watchdogTargets.get(id);
  }

  public updateWatchdogTarget(id: string, updates: Partial<WatchdogTarget>) {
    const existing = this.watchdogTargets.get(id);
    if (existing) {
      this.watchdogTargets.set(id, { ...existing, ...updates });
      this.saveToDisk();
    }
  }

  public deleteWatchdogTarget(id: string): boolean {
    const deleted = this.watchdogTargets.delete(id);
    if (deleted) this.saveToDisk();
    return deleted;
  }

  public addWatchdogCheckLog(log: WatchdogCheckLog) {
    this.watchdogChecks.unshift(log);
    if (this.watchdogChecks.length > 200) this.watchdogChecks.pop();
    this.saveToDisk();
  }

  public getWatchdogCheckLogs(limit = 20): WatchdogCheckLog[] {
    return this.watchdogChecks.slice(0, limit);
  }

  public getWatchdogCheckLogsForUser(userId: string, limit = 20): WatchdogCheckLog[] {
    return this.watchdogChecks.filter(c => c.userId === userId).slice(0, limit);
  }

  // --- Webhook Methods ---
  public addWebhook(config: WebhookConfig) {
    this.webhooks.set(config.id, config);
    this.saveToDisk();
  }

  public getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  public getWebhooksForUser(userId: string): WebhookConfig[] {
    return Array.from(this.webhooks.values()).filter(w => w.userId === userId);
  }

  public getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  public deleteWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) this.saveToDisk();
    return deleted;
  }

  // --- Order Methods ---
  public addOrder(order: OrderRecord) {
    this.orders.unshift(order);
    this.saveToDisk();
  }

  public getOrders(): OrderRecord[] {
    return this.orders;
  }

  public getOrdersForUser(userId: string): OrderRecord[] {
    return this.orders.filter(o => o.userId === userId);
  }

  // --- Stats Methods ---
  public getStats(): SystemStats {
    return { ...this.stats };
  }

  public incrementScanStats(hasIssues: boolean, isHealthy: boolean, issuesCount = 1) {
    this.stats.totalScannedSites += 1;
    if (hasIssues) this.stats.problemsFound += issuesCount;
    if (isHealthy) this.stats.healthySites += 1;
    this.stats.lastUpdated = new Date().toISOString();
    this.saveToDisk();
  }

  public incrementFixes() {
    this.stats.fixedByLeadGuard += 1;
    this.stats.lastUpdated = new Date().toISOString();
    this.saveToDisk();
  }

  // --- Audit Log Methods ---
  private auditLogs: any[] = [];
  private userUsageMap = new Map<string, { scansThisMonth: number; exportsThisMonth: number }>();

  public addAuditLog(entry: any) {
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
    this.saveToDisk();
  }

  public getAuditLogs(limit = 50): any[] {
    return this.auditLogs.slice(0, limit);
  }

  public getUserUsage(userId: string) {
    const current = this.userUsageMap.get(userId) || { scansThisMonth: 0, exportsThisMonth: 0 };
    const watchdogCount = this.getWatchdogTargetsForUser(userId).length;
    return {
      ...current,
      watchdogTargetsCount: watchdogCount,
    };
  }

  public incrementUserScanUsage(userId: string) {
    const current = this.userUsageMap.get(userId) || { scansThisMonth: 0, exportsThisMonth: 0 };
    current.scansThisMonth += 1;
    this.userUsageMap.set(userId, current);
    this.saveToDisk();
  }

  public deleteAccount(userId: string): boolean {
    if (!userId) return false;

    // 1. Delete user watchdog targets
    const userTargets = this.getWatchdogTargetsForUser(userId);
    for (const target of userTargets) {
      this.deleteWatchdogTarget(target.id);
    }

    // 2. Delete webhooks
    const userWebhooks = this.getWebhooksForUser(userId);
    for (const hook of userWebhooks) {
      this.deleteWebhook(hook.id);
    }

    // 3. Remove usage map
    this.userUsageMap.delete(userId);

    this.saveToDisk();
    return true;
  }
}

if (process.env.NODE_ENV === 'production' && process.env.STORAGE_MODE === 'local') {
  throw new Error('FATAL_CONFIGURATION_ERROR: STORAGE_MODE=local is prohibited in production. Production must use Firestore or database source of truth.');
}

export const storage = new StorageEngine();
