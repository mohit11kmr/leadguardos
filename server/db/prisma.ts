import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient instance for the process.
 * PostgreSQL is the authoritative production datastore.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Fail-fast connectivity probe used by readiness endpoints. */
export async function checkDatabaseHealth(): Promise<{ status: 'OK' | 'ERROR'; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'OK', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: 'ERROR', error: err?.message || String(err) };
  }
}

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('FATAL_CONFIGURATION_ERROR: DATABASE_URL is required. PostgreSQL is the production datastore.');
  }
  return url;
}
