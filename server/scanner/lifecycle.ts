export type FindingStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'REOPENED';

export interface FindingLifecycleRecord {
  id: string;
  domain: string;
  ruleId: string;
  title: string;
  status: FindingStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  resolvedAt?: string;
  reopenedAt?: string;
}

export class FindingLifecycleManager {
  private static findingsMap = new Map<string, FindingLifecycleRecord>();

  public static reconcileFindings(domain: string, currentRuleIds: string[]): FindingLifecycleRecord[] {
    const updatedRecords: FindingLifecycleRecord[] = [];
    const now = new Date().toISOString();

    // 1. Process current scan findings
    for (const ruleId of currentRuleIds) {
      const key = `${domain}:${ruleId}`;
      const existing = this.findingsMap.get(key);

      if (!existing) {
        const newRecord: FindingLifecycleRecord = {
          id: `fl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          domain,
          ruleId,
          title: `Finding ${ruleId}`,
          status: 'OPEN',
          firstObservedAt: now,
          lastObservedAt: now,
        };
        this.findingsMap.set(key, newRecord);
        updatedRecords.push(newRecord);
      } else if (existing.status === 'RESOLVED') {
        existing.status = 'REOPENED';
        existing.reopenedAt = now;
        existing.lastObservedAt = now;
        updatedRecords.push(existing);
      } else {
        existing.lastObservedAt = now;
        updatedRecords.push(existing);
      }
    }

    // 2. Check for resolved findings (was OPEN in previous scan, absent in current scan)
    for (const [key, record] of this.findingsMap.entries()) {
      if (record.domain === domain && !currentRuleIds.includes(record.ruleId)) {
        if (record.status === 'OPEN' || record.status === 'REOPENED' || record.status === 'ACKNOWLEDGED') {
          record.status = 'RESOLVED';
          record.resolvedAt = now;
          updatedRecords.push(record);
        }
      }
    }

    return updatedRecords;
  }

  public static getFindingsForDomain(domain: string): FindingLifecycleRecord[] {
    return Array.from(this.findingsMap.values()).filter(f => f.domain === domain);
  }

  public static clear(): void {
    this.findingsMap.clear();
  }
}
