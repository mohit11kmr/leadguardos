/**
 * Storage-mode selector for the PostgreSQL migration.
 *
 * PostgreSQL is the ONLY production source of truth. Setting DATABASE_URL
 * enables Prisma-backed persistence everywhere. Without it:
 *  - development/test keeps legacy adapters (Firestore/local JSON)
 *  - production REFUSES to operate (fail-fast, no silent fallback)
 */
export function isPgEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

export function requirePgInProduction(): void {
  if (process.env.NODE_ENV === 'production' && !isPgEnabled()) {
    throw new Error(
      'FATAL_CONFIGURATION_ERROR: DATABASE_URL is required in production. ' +
      'PostgreSQL is the single source of truth — no JSON/Firestore fallback exists.',
    );
  }
}
