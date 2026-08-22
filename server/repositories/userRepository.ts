import { getAdminDb, getAdminAuth, FieldValue, isFirebaseConfigured, markFirestorePermissionDenied } from '../firebaseAdmin';
import { UserAccount } from '../storage';
import { auditRepository } from './auditRepository';

export interface UserProfileDocument extends UserAccount {
  displayName?: string;
  photoURL?: string;
  organizationId?: string;
  organizationName?: string;
  savedScansCount?: number;
  activeMonitorsCount?: number;
  lastLoginAt?: string;
  updatedAt?: string;
  serverTimestamp?: any;
}

export interface IUserRepository {
  getUserById(uid: string): Promise<UserProfileDocument | undefined>;
  syncUserProfile(uid: string, email: string, displayName?: string, photoURL?: string): Promise<UserProfileDocument>;
  setUserRole(uid: string, role: 'USER' | 'AGENCY' | 'ADMIN', requestedByAdminUid: string): Promise<UserProfileDocument>;
  verifyAuthToken(bearerToken: string): Promise<{ uid: string; email?: string; role: 'USER' | 'AGENCY' | 'ADMIN'; isAnonymous?: boolean } | null>;
}

export class UserRepository implements IUserRepository {
  private localUsers: Map<string, UserProfileDocument> = new Map();

  async getUserById(uid: string): Promise<UserProfileDocument | undefined> {
    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const snap = await db.collection('users').doc(uid).get();
        if (snap.exists) {
          const data = snap.data() as UserProfileDocument;
          this.localUsers.set(uid, data);
          return data;
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    return this.localUsers.get(uid);
  }

  async syncUserProfile(
    uid: string,
    email: string,
    displayName?: string,
    photoURL?: string
  ): Promise<UserProfileDocument> {
    const now = new Date().toISOString();
    let existing = this.localUsers.get(uid);

    if (isFirebaseConfigured()) {
      try {
        const db = getAdminDb();
        const docRef = db.collection('users').doc(uid);
        const snap = await docRef.get();

        if (snap.exists) {
          existing = snap.data() as UserProfileDocument;
          const updates: Partial<UserProfileDocument> = {
            email,
            displayName: displayName || existing.displayName,
            photoURL: photoURL || existing.photoURL,
            lastLoginAt: now,
            updatedAt: now,
          };
          await docRef.set(updates, { merge: true });
          const merged = { ...existing, ...updates };
          this.localUsers.set(uid, merged);
          return merged;
        } else {
          // Default role for new users is USER - privileged roles require explicit admin assignment or claims
          const role: 'USER' | 'AGENCY' | 'ADMIN' = 'USER';

          const newProfile: UserProfileDocument = {
            id: uid,
            email,
            displayName: displayName || 'LeadGuard Member',
            photoURL,
            role,
            createdAt: now,
            lastLoginAt: now,
            updatedAt: now,
          };

          await docRef.set({
            ...newProfile,
            serverTimestamp: FieldValue.serverTimestamp(),
          });

          await auditRepository.logEvent({
            action: 'AUTH_LOGIN',
            userId: uid,
            userEmail: email,
            details: { role, isNewUser: true },
            timestamp: now,
          });

          this.localUsers.set(uid, newProfile);
          return newProfile;
        }
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    if (existing) {
      existing = {
        ...existing,
        email,
        displayName: displayName || existing.displayName,
        photoURL: photoURL || existing.photoURL,
        lastLoginAt: now,
        updatedAt: now,
      };
      this.localUsers.set(uid, existing);
      return existing;
    }

    const newProfile: UserProfileDocument = {
      id: uid,
      email,
      displayName: displayName || 'LeadGuard Member',
      role: 'USER',
      createdAt: now,
      lastLoginAt: now,
    };
    this.localUsers.set(uid, newProfile);
    return newProfile;
  }

  async setUserRole(
    uid: string,
    role: 'USER' | 'AGENCY' | 'ADMIN',
    requestedByAdminUid: string
  ): Promise<UserProfileDocument> {
    // Verify requesting user is admin
    const requester = await this.getUserById(requestedByAdminUid);
    if (!requester || requester.role !== 'ADMIN') {
      throw new Error('UNAUTHORIZED_ADMIN_ACTION');
    }

    const user = await this.getUserById(uid);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const updated = { ...user, role, updatedAt: new Date().toISOString() };
    this.localUsers.set(uid, updated);

    if (isFirebaseConfigured()) {
      try {
        const auth = getAdminAuth();
        await auth.setCustomUserClaims(uid, {
          role,
          admin: role === 'ADMIN',
        });

        const db = getAdminDb();
        const docRef = db.collection('users').doc(uid);
        await docRef.set({ role, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err: any) {
        if (err?.code === 7 || String(err).includes('PERMISSION_DENIED')) {
          markFirestorePermissionDenied();
        }
      }
    }

    await auditRepository.logEvent({
      action: 'ADMIN_ACTION',
      userId: requestedByAdminUid,
      details: { targetUserId: uid, updatedRole: role },
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async verifyAuthToken(
    bearerToken: string
  ): Promise<{ uid: string; email?: string; role: 'USER' | 'AGENCY' | 'ADMIN'; isAnonymous?: boolean } | null> {
    if (!bearerToken) return null;

    const token = bearerToken.startsWith('Bearer ') ? bearerToken.split(' ')[1] : bearerToken;
    if (!token) return null;

    // Check in-memory fast validation ONLY in non-production test/development environments
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && this.localUsers.has(token)) {
      const local = this.localUsers.get(token)!;
      return {
        uid: local.id,
        email: local.email,
        role: local.role,
        isAnonymous: false,
      };
    }

    if (isFirebaseConfigured()) {
      try {
        const auth = getAdminAuth();
        const decoded = await auth.verifyIdToken(token);
        const profile = await this.getUserById(decoded.uid);

        // Strict role resolution via custom claim or verified profile - NO email substring guessing
        const claimRole = (decoded.admin === true || decoded.role === 'ADMIN')
          ? 'ADMIN'
          : (decoded.role === 'AGENCY' ? 'AGENCY' : undefined);
        const role = claimRole || profile?.role || 'USER';

        return {
          uid: decoded.uid,
          email: decoded.email,
          role,
          isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
        };
      } catch (err) {
        // Token invalid or expired
        return null;
      }
    }

    // In production, if Firebase Admin is not configured or token fails, fail closed
    return null;
  }
}

export const userRepository = new UserRepository();
