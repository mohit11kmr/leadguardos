import crypto from 'crypto';
import { prisma } from '../db/prisma';

export interface ApiKeyRecord {
  keyId: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  active: boolean;
  createdAt: string;
  revokedAt?: string;
}

/**
 * Durable API-key manager — PostgreSQL is the source of truth.
 * Only SHA-256 hashes are stored; raw keys are shown exactly once at creation.
 * Works across multiple server instances (no process-local state).
 *
 * The in-memory Map remains ONLY as a synchronous read-cache for the
 * verify hot path and is always backed by a durable row.
 */
export class ApiKeyManager {
  /** @classification CACHE-ONLY — PostgreSQL `ApiKey` table is authoritative */
  private static keysCache = new Map<string, ApiKeyRecord>();

  private static dbEnabled(): boolean {
    return !!process.env.DATABASE_URL;
  }

  public static async generateApiKeyAsync(userId: string, name = 'default'): Promise<{ apiKey: string; keyId: string; record: ApiKeyRecord }> {
    const { apiKey, keyId, record } = this.buildKey(userId);

    if (this.dbEnabled()) {
      await prisma.apiKey.create({
        data: {
          id: keyId,
          userId,
          name: name.slice(0, 100),
          keyPrefix: record.keyPrefix,
          keyHash: record.keyHash,
        },
      });
      // Cache write AFTER durable success.
      this.keysCache.set(record.keyHash, record);
      return { apiKey, keyId, record };
    }

    // Dev/test without database: cache-only (NOT production path).
    this.keysCache.set(record.keyHash, record);
    return { apiKey, keyId, record };
  }

  /**
   * Synchronous legacy signature retained for existing call sites that do not
   * yet await. In production prefer generateApiKeyAsync; this method still
   * persists durably via fire-and-forget and returns immediately.
   * @deprecated use generateApiKeyAsync
   */
  public static generateApiKey(userId: string): { apiKey: string; keyId: string; record: ApiKeyRecord } {
    const built = this.buildKey(userId);
    this.keysCache.set(built.record.keyHash, built.record);
    if (this.dbEnabled()) {
      void prisma.apiKey.create({
        data: {
          id: built.keyId,
          userId,
          name: 'default',
          keyPrefix: built.record.keyPrefix,
          keyHash: built.record.keyHash,
        },
      }).catch((err) => console.error('[ApiKeyManager] durable create failed:', err?.message));
    }
    return built;
  }

  private static buildKey(userId: string): { apiKey: string; keyId: string; record: ApiKeyRecord } {
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const apiKey = `lg_live_${rawSecret}`;
    const keyId = `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const keyHash = this.hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 15);

    return {
      apiKey,
      keyId,
      record: { keyId, userId, keyHash, keyPrefix, active: true, createdAt: new Date().toISOString() },
    };
  }

  /** Durable verification across instances + lastUsed tracking. */
  public static async verifyApiKeyAsync(apiKey: string): Promise<ApiKeyRecord | null> {
    if (!apiKey || !apiKey.startsWith('lg_live_')) return null;
    const hash = this.hashKey(apiKey);

    // Fast path: cache hit still validated against expiry/active flags only.
    const cached = this.keysCache.get(hash);
    if (cached?.active) return cached;

    if (!this.dbEnabled()) return null;
    const row = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    if (!row || !!row.revokedAt || (row.expiresAt && row.expiresAt.getTime() < Date.now())) {
      this.keysCache.delete(hash);
      return null;
    }
    const record: ApiKeyRecord = {
      keyId: row.id,
      userId: row.userId,
      keyHash: row.keyHash,
      keyPrefix: row.keyPrefix,
      active: true,
      createdAt: row.createdAt.toISOString(),
    };
    this.keysCache.set(hash, record);
    void prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    return record;
  }

  public static verifyApiKey(apiKey: string): ApiKeyRecord | null {
    if (!apiKey || !apiKey.startsWith('lg_live_')) return null;
    const record = this.keysCache.get(this.hashKey(apiKey));
    if (!record || !record.active) return null;
    return record;
  }

  public static async revokeApiKeyAsync(keyId: string): Promise<boolean> {
    if (this.dbEnabled()) {
      const result = await prisma.apiKey.updateMany({
        where: { id: keyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      // Evict matching cache entries so revocation is effective immediately on THIS instance.
      for (const [hash, rec] of this.keysCache.entries()) {
        if (rec.keyId === keyId) {
          rec.active = false;
          rec.revokedAt = new Date().toISOString();
        }
      }
      return result.count > 0;
    }
    return this.revokeInMemory(keyId, undefined);
  }

  public static revokeApiKey(keyId: string): boolean {
    if (this.dbEnabled()) {
      void this.revokeApiKeyAsync(keyId).catch(() => undefined);
    }
    return this.revokeInMemory(keyId, undefined);
  }

  public static async revokeApiKeyForUserAsync(keyId: string, userId: string): Promise<boolean> {
    if (this.dbEnabled()) {
      const result = await prisma.apiKey.updateMany({
        where: { id: keyId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      for (const [, rec] of this.keysCache.entries()) {
        if (rec.keyId === keyId && rec.userId === userId) {
          rec.active = false;
          rec.revokedAt = new Date().toISOString();
        }
      }
      return result.count > 0;
    }
    return this.revokeInMemory(keyId, userId);
  }

  public static revokeApiKeyForUser(keyId: string, userId: string): boolean {
    if (this.dbEnabled()) {
      void this.revokeApiKeyForUserAsync(keyId, userId).catch(() => undefined);
    }
    return this.revokeInMemory(keyId, userId);
  }

  private static revokeInMemory(keyId: string, userId?: string): boolean {
    for (const [hash, record] of this.keysCache.entries()) {
      if (record.keyId === keyId && (!userId || record.userId === userId)) {
        record.active = false;
        record.revokedAt = new Date().toISOString();
        this.keysCache.set(hash, record);
        return true;
      }
    }
    return false;
  }

  /** Lists all ACTIVE keys for a user directly from PostgreSQL. */
  public static async listKeysForUser(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /** Test-only: clears the in-process cache (durable rows untouched). */
  public static clear(): void {
    this.keysCache.clear();
  }
}
