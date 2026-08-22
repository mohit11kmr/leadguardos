import { StructuredAuditResult } from './types';

export class ScanCache {
  private static cacheMap = new Map<string, { result: StructuredAuditResult; expiresAt: number }>();
  private static readonly DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

  public static get(url: string): StructuredAuditResult | null {
    const key = this.normalizeKey(url);
    const entry = this.cacheMap.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cacheMap.delete(key);
      return null;
    }

    return entry.result;
  }

  public static set(url: string, result: StructuredAuditResult, ttlMs = this.DEFAULT_TTL_MS): void {
    const key = this.normalizeKey(url);
    this.cacheMap.set(key, {
      result,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public static clear(): void {
    this.cacheMap.clear();
  }

  private static normalizeKey(url: string): string {
    return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
  }
}
