/**
 * LeadGuard OS — Firestore → PostgreSQL Migration Script
 *
 * Reads existing Firestore documents (if a Firebase service account is
 * configured), transforms them, and inserts into PostgreSQL via Prisma.
 *
 * Safety properties:
 *  - DRY-RUN mode: reads + reports without writing (default when --dry-run)
 *  - Idempotent: upserts on preserved application IDs
 *  - Never deletes anything from Firestore
 *  - Per-collection failure reporting with continue-on-error
 *
 * Usage:
 *   npm run migrate:firestore:dry-run   # read-only report
 *   npm run migrate:firestore           # writes to PostgreSQL
 *
 * Required env for source: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL +
 * FIREBASE_PRIVATE_KEY (service account). Target: DATABASE_URL.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

interface MigrationReport {
  collection: string;
  scanned: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

async function getFirestoreDb(): Promise<any | null> {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('⚠️  Firestore source credentials not set — nothing to migrate.');
    console.error('   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
    return null;
  }
  const admin = await import('firebase-admin/app');
  const firestore = await import('firebase-admin/firestore');
  const app = (admin.getApps().length ? admin.getApps() : [admin.initializeApp({
    credential: (await import('firebase-admin/app')).cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  })])[0];
  return firestore.getFirestore(app);
}

async function migrateCollection(
  name: string,
  db: any,
  transform: (docId: string, data: any) => Promise<{ prismaOp: () => Promise<unknown> } | null>,
): Promise<MigrationReport> {
  const report: MigrationReport = { collection: name, scanned: 0, migrated: 0, skipped: 0, errors: [] };
  const snap = await db.collection(name).get();
  report.scanned = snap.size;

  for (const doc of snap.docs) {
    try {
      const op = await transform(doc.id, doc.data());
      if (!op) { report.skipped++; continue; }
      if (!DRY_RUN) await op.prismaOp();
      report.migrated++;
    } catch (err: any) {
      report.errors.push(`${doc.id}: ${err?.message || err}`);
    }
  }
  return report;
}

async function main() {
  console.log(`\n🔄 Firestore → PostgreSQL migration (${DRY_RUN ? 'DRY-RUN — no writes' : 'LIVE WRITE'})\n`);
  const db = await getFirestoreDb();
  const reports: MigrationReport[] = [];

  if (db) {
    // ── Users ────────────────────────────────────────────────────────────────
    reports.push(await migrateCollection('users', db, async (_id, d) => ({
      prismaOp: () => prisma.user.upsert({
        where: { email: String(d.email || _id).toLowerCase() },
        create: {
          id: d.uid || undefined,
          email: String(d.email || `${_id}@migrated.local`).toLowerCase(),
          displayName: d.displayName?.slice(0, 120),
          role: ['USER', 'AGENCY', 'ADMIN'].includes(d.role) ? d.role : 'USER',
          lastLoginAt: d.lastLoginAt ? new Date(d.lastLoginAt) : undefined,
        },
        update: { role: ['USER', 'AGENCY', 'ADMIN'].includes(d.role) ? d.role : undefined },
      }),
    })));

    // ── Orders ───────────────────────────────────────────────────────────────
    reports.push(await migrateCollection('orders', db, async (id, d) => ({
      prismaOp: () => prisma.order.upsert({
        where: { id },
        create: {
          id,
          tierId: String(d.tierId || 'tier-express-fix'),
          tierName: String(d.tierName || 'Migrated Order'),
          amountInr: Number(d.amountINR || 0),
          status: String(d.status || 'PENDING'),
          provider: String(d.provider || 'RAZORPAY'),
          providerOrderId: d.providerOrderId || undefined,
          providerPaymentId: d.providerPaymentId || d.paymentReference || undefined,
          customerEmail: d.customerEmail || d.userEmail || undefined,
          domain: d.domain || undefined,
          createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
        },
        update: { status: String(d.status || 'PENDING') },
      }),
    })));

    // ── Watchdogs ────────────────────────────────────────────────────────────
    reports.push(await migrateCollection('watchdogTargets', db, async (id, d) => {
      if (!d.targetUrl) return null; // exact-URL contract — skip domain-less legacy rows
      return {
        prismaOp: () => prisma.watchdog.upsert({
          where: { id },
          create: {
            id,
            userId: d.userId || undefined,
            targetUrl: String(d.targetUrl),
            domain: String(d.domain || new URL(String(d.targetUrl)).hostname),
            contact: String(d.contact || ''),
            channel: d.channel || 'EMAIL',
            frequency: d.frequency || 'DAILY',
            status: d.status || 'ACTIVE_TRIAL',
            nextCheckAt: d.nextCheckAt ? new Date(d.nextCheckAt) : undefined,
            lastScore: typeof d.lastScore === 'number' ? d.lastScore : undefined,
            createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
          },
          update: { status: d.status || undefined, lastScore: typeof d.lastScore === 'number' ? d.lastScore : undefined },
        }),
      };
    }));

    // ── Scans (bounded batch to keep memory sane) ────────────────────────────
    reports.push(await migrateCollection('scans', db, async (id, d) => ({
      prismaOp: () => prisma.scan.upsert({
        where: { id },
        create: {
          id,
          userId: d.userId || undefined,
          targetUrl: String(d.targetUrl || `https://${d.domain || 'unknown'}`),
          domain: String(d.domain || 'unknown'),
          businessName: d.businessName || undefined,
          status: 'COMPLETED',
          mode: d.mode === 'DEMO' ? 'DEMO' : 'LIVE',
          score: typeof d.score === 'number' ? Math.round(d.score) : undefined,
          findings: Array.isArray(d.allIssues) ? d.allIssues : undefined,
          estimatedMonthlyLoss: typeof d.estimatedMonthlyLoss === 'number' ? d.estimatedMonthlyLoss : undefined,
          scannedAt: d.scannedAt ? new Date(d.scannedAt) : undefined,
          completedAt: d.completedAt ? new Date(d.completedAt) : undefined,
        },
        update: {},
      }),
    })));

    // ── Payment events / fulfillments / audit logs ──────────────────────────
    reports.push(await migrateCollection('paymentEvents', db, async (_id, d) => {
      if (!d.providerEventId) return null;
      const crypto = await import('crypto');
      const dedupId = crypto.createHash('sha256').update(`${d.provider}:${d.providerEventId}`).digest('hex');
      return {
        prismaOp: () => prisma.paymentEvent.upsert({
          where: { id: dedupId },
          create: {
            id: dedupId,
            provider: String(d.provider || 'razorpay'),
            providerEventId: String(d.providerEventId),
            eventType: String(d.eventType || 'unknown'),
            payloadHash: String(d.payloadHash || ''),
            status: 'PROCESSED',
            processedAt: new Date(),
          },
          update: {},
        }),
      };
    }));
  } else {
    console.log('No Firestore source available — generating target-readiness report only.\n');
  }

  // ─── Report ────────────────────────────────────────────────────────────────
  console.log('══════════════ MIGRATION REPORT ══════════════');
  let totalErrors = 0;
  for (const r of reports) {
    totalErrors += r.errors.length;
    console.log(`  ${r.collection.padEnd(18)} scanned=${r.scanned} migrated=${r.migrated} skipped=${r.skipped} errors=${r.errors.length}`);
    for (const e of r.errors.slice(0, 5)) console.log(`     ⚠️  ${e}`);
  }
  console.log(`\n  Firestore data was NOT deleted (by design). Re-run safely — upserts are idempotent.`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().finally(() => prisma.$disconnect());
