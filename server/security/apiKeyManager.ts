import crypto from 'crypto';

export interface ApiKeyRecord {
  keyId: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  active: boolean;
  createdAt: string;
  revokedAt?: string;
}

export class ApiKeyManager {
  private static keysMap = new Map<string, ApiKeyRecord>();

  public static generateApiKey(userId: string): { apiKey: string; keyId: string; record: ApiKeyRecord } {
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const apiKey = `lg_live_${rawSecret}`;
    const keyId = `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const keyHash = this.hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 15);

    const record: ApiKeyRecord = {
      keyId,
      userId,
      keyHash,
      keyPrefix,
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.keysMap.set(keyHash, record);
    return { apiKey, keyId, record };
  }

  public static verifyApiKey(apiKey: string): ApiKeyRecord | null {
    if (!apiKey || !apiKey.startsWith('lg_live_')) return null;
    const hash = this.hashKey(apiKey);
    const record = this.keysMap.get(hash);
    if (!record || !record.active) return null;
    return record;
  }

  public static revokeApiKey(keyId: string): boolean {
    for (const [hash, record] of this.keysMap.entries()) {
      if (record.keyId === keyId) {
        record.active = false;
        record.revokedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  public static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  public static clear(): void {
    this.keysMap.clear();
  }
}
