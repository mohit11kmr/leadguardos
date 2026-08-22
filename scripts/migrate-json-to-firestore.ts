import fs from 'fs';
import path from 'path';
import { getAdminDb, isFirebaseConfigured, FieldValue } from '../server/firebaseAdmin';

export interface MigrationSummary {
  scansMigrated: number;
  watchdogsMigrated: number;
  checksMigrated: number;
  webhooksMigrated: number;
  ordersMigrated: number;
  usersMigrated: number;
  errors: string[];
}

export async function runJsonToFirestoreMigration(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    scansMigrated: 0,
    watchdogsMigrated: 0,
    checksMigrated: 0,
    webhooksMigrated: 0,
    ordersMigrated: 0,
    usersMigrated: 0,
    errors: [],
  };

  const jsonPath = path.join(process.cwd(), 'data', 'leadguard-db.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('[Migration] No local leadguard-db.json found. Nothing to migrate.');
    return summary;
  }

  if (!isFirebaseConfigured()) {
    throw new Error('MIGRATION_FAILED: Firebase Admin is not configured or unavailable.');
  }

  const db = getAdminDb();
  console.log('[Migration] Starting deterministic JSON -> Firestore migration...');

  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);

    // 1. Migrate Scans
    if (Array.isArray(data.scans)) {
      for (const scan of data.scans) {
        if (!scan.scanId) continue;
        try {
          const docRef = db.collection('scans').doc(scan.scanId);
          const existing = await docRef.get();
          if (!existing.exists) {
            await docRef.set({
              ...scan,
              mode: scan.mode || 'LIVE',
              migratedFromLocalJson: true,
              migratedAt: new Date().toISOString(),
              serverTimestamp: FieldValue.serverTimestamp(),
            });
            summary.scansMigrated += 1;
          }
        } catch (err: any) {
          summary.errors.push(`Scan ${scan.scanId}: ${err?.message || String(err)}`);
        }
      }
    }

    // 2. Migrate Watchdog Targets
    if (Array.isArray(data.watchdogTargets)) {
      for (const target of data.watchdogTargets) {
        if (!target.id) continue;
        try {
          const docRef = db.collection('watchdogTargets').doc(target.id);
          const existing = await docRef.get();
          if (!existing.exists) {
            await docRef.set({
              ...target,
              mode: target.id.startsWith('wd_default') ? 'DEMO' : 'LIVE',
              migratedFromLocalJson: true,
              migratedAt: new Date().toISOString(),
              serverTimestamp: FieldValue.serverTimestamp(),
            });
            summary.watchdogsMigrated += 1;
          }
        } catch (err: any) {
          summary.errors.push(`Target ${target.id}: ${err?.message || String(err)}`);
        }
      }
    }

    // 3. Migrate Watchdog Checks
    if (Array.isArray(data.watchdogChecks)) {
      for (const check of data.watchdogChecks) {
        if (!check.id) continue;
        try {
          const docRef = db.collection('watchdogChecks').doc(check.id);
          const existing = await docRef.get();
          if (!existing.exists) {
            await docRef.set({
              ...check,
              migratedFromLocalJson: true,
              migratedAt: new Date().toISOString(),
              serverTimestamp: FieldValue.serverTimestamp(),
            });
            summary.checksMigrated += 1;
          }
        } catch (err: any) {
          summary.errors.push(`Check ${check.id}: ${err?.message || String(err)}`);
        }
      }
    }

    // 4. Migrate Webhooks
    if (Array.isArray(data.webhooks)) {
      for (const wh of data.webhooks) {
        if (!wh.id) continue;
        try {
          const docRef = db.collection('webhooks').doc(wh.id);
          const existing = await docRef.get();
          if (!existing.exists) {
            await docRef.set({
              ...wh,
              migratedFromLocalJson: true,
              migratedAt: new Date().toISOString(),
              serverTimestamp: FieldValue.serverTimestamp(),
            });
            summary.webhooksMigrated += 1;
          }
        } catch (err: any) {
          summary.errors.push(`Webhook ${wh.id}: ${err?.message || String(err)}`);
        }
      }
    }

    // 5. Migrate Orders
    if (Array.isArray(data.orders)) {
      for (const ord of data.orders) {
        if (!ord.orderId) continue;
        try {
          const docRef = db.collection('orders').doc(ord.orderId);
          const existing = await docRef.get();
          if (!existing.exists) {
            await docRef.set({
              ...ord,
              migratedFromLocalJson: true,
              migratedAt: new Date().toISOString(),
              serverTimestamp: FieldValue.serverTimestamp(),
            });
            summary.ordersMigrated += 1;
          }
        } catch (err: any) {
          summary.errors.push(`Order ${ord.orderId}: ${err?.message || String(err)}`);
        }
      }
    }

    console.log('[Migration] Migration completed successfully:', summary);
    return summary;
  } catch (err: any) {
    summary.errors.push(`Global: ${err?.message || String(err)}`);
    console.error('[Migration] Migration encountered error:', err);
    return summary;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('migrate-json-to-firestore')) {
  runJsonToFirestoreMigration()
    .then(res => {
      console.log('Migration Result:', JSON.stringify(res, null, 2));
      process.exit(res.errors.length > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Fatal Migration Failure:', err);
      process.exit(1);
    });
}
