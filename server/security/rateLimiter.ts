import { Request, Response, NextFunction } from 'express';
import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';
import { isPgEnabled } from '../db/storageMode';

/**
 * Production-grade rate limiter.
 *
 * Architecture:
 * - Development: In-memory Map (single-instance, no external deps)
 * - Production: Firestore-backed short-window counters (shared across instances)
 *
 * For high-scale production, consider:
 * - Google Cloud Armor rate limiting (infrastructure-level)
 * - Redis-backed sliding window (if Redis is available)
 * - API Gateway rate limiting
 *
 * @classification PRODUCTION — Firestore-backed in production, in-memory for dev
 */

interface RateBucket {
  count: number;
  windowStart: number;
}

// ─── In-Memory Rate Limiter (Development) ──────────────────────────────────────

const memoryBuckets = new Map<string, RateBucket>();

function checkMemoryRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);

  if (!bucket || now > bucket.windowStart + windowMs) {
    bucket = { count: 0, windowStart: now };
    memoryBuckets.set(key, bucket);
  }

  bucket.count++;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.windowStart + windowMs,
  };
}

// Periodic cleanup to prevent unbounded memory growth.
// .unref() ensures this janitor timer never keeps the process alive on its own.
const memoryBucketCleanup = setInterval(() => {
  const now = Date.now();
  const cutoff = now - 120_000; // 2 minutes
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.windowStart < cutoff) memoryBuckets.delete(key);
  }
}, 60_000);
if (typeof memoryBucketCleanup.unref === 'function') memoryBucketCleanup.unref();

// ─── PostgreSQL Rate Limiter (Production) ──────────────────────────────────────

async function checkPgRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number }> {
  const { prisma } = await import('../db/prisma');
  const windowId = `${key}:${Math.floor(Date.now() / windowMs)}`;
  const now = new Date();

  try {
    const created = await prisma.rateLimitWindow.create({
      data: {
        id: windowId,
        bucketKey: key,
        count: 1,
        windowMs,
        expiresAt: new Date(now.getTime() + windowMs + 60_000),
        lastRequestAt: now,
      },
    });
    return { allowed: created.count <= limit, remaining: Math.max(0, limit - created.count) };
  } catch (err: any) {
    if (err?.code !== 'P2002') throw err;
    // Window exists → atomic increment with cap guard
    const updated = await prisma.$queryRaw<{ count: number }[]>`
      UPDATE "RateLimitWindow"
      SET "count" = "count" + 1, "lastRequestAt" = (NOW() AT TIME ZONE 'utc')
      WHERE "id" = ${windowId} AND "count" < ${limit}
      RETURNING "count";
    `;
    if (updated.length > 0) {
      return { allowed: true, remaining: Math.max(0, limit - updated[0].count) };
    }
    return { allowed: false, remaining: 0 };
  }
}

// ─── Firestore Rate Limiter (legacy pre-migration) ─────────────────────────────

async function checkFirestoreRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number }> {
  const db = getAdminDb();

  const windowId = `${key}:${Math.floor(Date.now() / windowMs)}`;
  const ref = db.collection('rateLimits').doc(windowId);

  const result = await db.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(ref);
    const data = snap.data();
    const currentCount = data?.count || 0;

    if (currentCount >= limit) {
      return { allowed: false, remaining: 0 };
    }

    if (snap.exists) {
      transaction.update(ref, { count: FieldValue.increment(1), lastRequestAt: new Date().toISOString() });
    } else {
      transaction.create(ref, {
        key,
        count: 1,
        windowStart: new Date().toISOString(),
        lastRequestAt: new Date().toISOString(),
        // TTL for automatic Firestore cleanup (requires TTL policy on collection)
        expiresAt: new Date(Date.now() + windowMs + 60_000).toISOString(),
      });
    }

    return { allowed: true, remaining: limit - currentCount - 1 };
  });

  return result;
}

// ─── Unified Rate Limit Check ──────────────────────────────────────────────────

/**
 * Failure semantics for the SHARED production limiter:
 * - 'fail-closed' (default in production): if the shared counter cannot be
 *   reached, requests are REJECTED. This guarantees abuse protection never
 *   silently degrades to process-local memory across multiple instances.
 * - 'fail-open': requests are allowed but loudly logged (operator opt-in for
 *   availability-critical deployments).
 */
export function rateLimitFailureMode(): 'fail-closed' | 'fail-open' {
  const configured = (process.env.RATE_LIMIT_FAILURE_MODE || '').toLowerCase();
  if (configured === 'fail-open' || configured === 'open') return 'fail-open';
  if (configured === 'fail-closed' || configured === 'closed') return 'fail-closed';
  return process.env.NODE_ENV === 'production' ? 'fail-closed' : 'fail-open';
}

async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt?: number }> {
  const isProduction = process.env.NODE_ENV === 'production';

  // PostgreSQL shared counters — production authority (multi-instance safe)
  if (isPgEnabled()) {
    try {
      return await checkPgRateLimit(key, limit, windowMs);
    } catch (err) {
      const mode = rateLimitFailureMode();
      console.error(`[RateLimiter] Shared limiter error (${mode}):`, err instanceof Error ? err.message : err);
      if (mode === 'fail-closed') {
        throw new Error('RATE_LIMIT_SHARED_STORE_UNAVAILABLE: shared counter unreachable');
      }
      return { allowed: true, remaining: limit };
    }
  }

  if (isProduction) {
    if (!isFirebaseConfigured()) {
      // Shared enforcement is REQUIRED in production — refuse to degrade.
      throw new Error('RATE_LIMIT_SHARED_STORE_UNAVAILABLE: Firestore not configured for shared rate limiting');
    }
    try {
      return await checkFirestoreRateLimit(key, limit, windowMs);
    } catch (err) {
      const mode = rateLimitFailureMode();
      console.error(`[RateLimiter] Shared limiter error (${mode}):`, err instanceof Error ? err.message : err);
      if (mode === 'fail-closed') {
        throw new Error('RATE_LIMIT_SHARED_STORE_UNAVAILABLE: shared counter unreachable');
      }
      return { allowed: true, remaining: limit };
    }
  }

  return checkMemoryRateLimit(key, limit, windowMs);
}

// ─── Express Middleware ────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Requests allowed per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs?: number;
  /** Key extractor: 'ip', 'user', 'org', or custom function */
  keyBy?: 'ip' | 'user' | 'org' | ((req: Request) => string);
  /** Optional operation name for grouping */
  operation?: string;
}

/**
 * Creates a production-grade rate limiter middleware.
 *
 * Usage:
 *   app.post('/api/scan', productionRateLimiter({ limit: 30, operation: 'scan' }), handler)
 *   app.post('/api/scan-batch', productionRateLimiter({ limit: 10, operation: 'batch', keyBy: 'user' }), handler)
 */
export function productionRateLimiter(config: RateLimitConfig) {
  const {
    limit,
    windowMs = 60_000,
    keyBy = 'ip',
    operation = 'default',
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    let key: string;
    if (typeof keyBy === 'function') {
      key = keyBy(req);
    } else if (keyBy === 'user') {
      key = `user:${(req as any).user?.id || 'anon'}:${operation}`;
    } else if (keyBy === 'org') {
      key = `org:${(req as any).user?.orgId || 'none'}:${operation}`;
    } else {
      key = `ip:${req.ip || req.socket.remoteAddress || 'unknown'}:${operation}`;
    }

    try {
      const result = await checkRateLimit(key, limit, windowMs);

      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      if (result.resetAt) {
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
      }

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please wait before retrying.',
          retryAfterMs: windowMs,
        });
      }

      next();
    } catch (err) {
      // Shared limiter unavailable with fail-closed semantics (production default):
      // reject rather than silently bypassing abuse protection.
      const isSharedStoreError = String((err as Error)?.message || '').includes('RATE_LIMIT_SHARED_STORE_UNAVAILABLE');
      if (isSharedStoreError && process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          error: 'Rate limiting service temporarily unavailable. Request rejected for protection.',
          retryAfterMs: windowMs,
        });
      }
      // Dev/unexpected errors: availability first
      next();
    }
  };
}

/**
 * Legacy in-memory rate limiter for backward compatibility.
 * @classification CACHE-ONLY — single-instance only
 * @deprecated Use productionRateLimiter() for new endpoints
 */
export function legacyRateLimiter(limitPerMin = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown_ip';
    const result = checkMemoryRateLimit(`legacy:${ip}`, limitPerMin, 60_000);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment before sending more diagnostic requests.',
      });
    }

    next();
  };
}
