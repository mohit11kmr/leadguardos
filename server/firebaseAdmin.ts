import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json';

let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;
let adminAuth: Auth | null = null;
let isFirestoreAvailable = false;
let initError: string | null = null;

export function initializeFirebaseAdmin(): { app: App; db: Firestore; auth: Auth } | null {
  if (adminApp && firestoreDb && adminAuth) {
    return { app: adminApp, db: firestoreDb, auth: adminAuth };
  }

  try {
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCP_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      firebaseConfig.projectId ||
      'united-wallaby-h8chg';

    const databaseId =
      process.env.FIRESTORE_DATABASE_ID ||
      firebaseConfig.firestoreDatabaseId ||
      'ai-studio-leadguardosreven-c4712651-14e2-4a22-88ba-cd6812a60a0b';

    const existingApps = getApps();
    if (existingApps.length === 0) {
      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        adminApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId,
        });
      } else {
        adminApp = initializeApp({
          projectId,
        });
      }
    } else {
      adminApp = existingApps[0];
    }

    // Connect to Firestore database
    try {
      if (databaseId && databaseId !== '(default)') {
        firestoreDb = getFirestore(adminApp, databaseId);
      } else {
        firestoreDb = getFirestore(adminApp);
      }
    } catch {
      firestoreDb = getFirestore(adminApp);
    }

    // Tune Firestore settings
    firestoreDb.settings({
      ignoreUndefinedProperties: true,
    });

    adminAuth = getAuth(adminApp);
    isFirestoreAvailable = true;
    initError = null;

    console.log(`[FirebaseAdmin] Initialized successfully for project '${projectId}', database '${databaseId}'`);
    return { app: adminApp, db: firestoreDb, auth: adminAuth };
  } catch (err: any) {
    initError = err?.message || String(err);
    console.warn(`[FirebaseAdmin] Initialization warning: ${initError}`);
    return null;
  }
}

// Immediately attempt initialization on module load
initializeFirebaseAdmin();

export function getAdminDb(): Firestore {
  if (!firestoreDb) {
    const res = initializeFirebaseAdmin();
    if (!res || !res.db) {
      throw new Error(`FIRESTORE_UNAVAILABLE: ${initError || 'Failed to initialize Firebase Admin Firestore instance'}`);
    }
  }
  return firestoreDb!;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    const res = initializeFirebaseAdmin();
    if (!res || !res.auth) {
      throw new Error(`FIREBASE_AUTH_UNAVAILABLE: ${initError || 'Failed to initialize Firebase Admin Auth instance'}`);
    }
  }
  return adminAuth!;
}

export { FieldValue, Timestamp };
export function isFirebaseConfigured(): boolean {
  return isFirestoreAvailable && firestoreDb !== null;
}
