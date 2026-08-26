import { isPgEnabled } from '../db/storageMode';
import { UserAccount } from '../storage';
import { auditRepository } from './auditRepository';
import { verifyAccessToken } from '../auth/authService';
import { verifyFirebaseIdToken } from '../security/firebaseAuth';

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
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const row = await prisma.user.findUnique({ where: { id: uid } });
      if (row) {
        const user: UserProfileDocument = {
          id: row.id,
          email: row.email,
          displayName: row.displayName || undefined,
          photoURL: row.photoUrl || undefined,
          role: row.role as 'USER' | 'AGENCY' | 'ADMIN',
          organizationId: row.organizationId || undefined,
          createdAt: row.createdAt.toISOString(),
          lastLoginAt: row.lastLoginAt?.toISOString?.(),
          updatedAt: row.updatedAt?.toISOString?.(),
        };
        this.localUsers.set(uid, user);
        return user;
      }
      return undefined;
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

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const upserted = await prisma.user.upsert({
        where: { id: uid },
        create: {
          id: uid,
          email: email.trim().toLowerCase(),
          displayName: displayName || 'LeadGuard Member',
          photoUrl: photoURL || null,
          role: 'USER',
          lastLoginAt: new Date(),
        },
        update: {
          email: email.trim().toLowerCase(),
          displayName: displayName || undefined,
          photoUrl: photoURL || undefined,
          lastLoginAt: new Date(),
        },
      });

      const profile: UserProfileDocument = {
        id: upserted.id,
        email: upserted.email,
        displayName: upserted.displayName || undefined,
        photoURL: upserted.photoUrl || undefined,
        role: upserted.role as 'USER' | 'AGENCY' | 'ADMIN',
        organizationId: upserted.organizationId || undefined,
        createdAt: upserted.createdAt.toISOString(),
        lastLoginAt: upserted.lastLoginAt?.toISOString(),
        updatedAt: upserted.updatedAt.toISOString(),
      };
      this.localUsers.set(uid, profile);
      return profile;
    }

    let existing = this.localUsers.get(uid);
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

    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      const updated = await prisma.user.update({
        where: { id: uid },
        data: { role },
      });
      const profile: UserProfileDocument = {
        ...user,
        role: updated.role as 'USER' | 'AGENCY' | 'ADMIN',
        updatedAt: updated.updatedAt.toISOString(),
      };
      this.localUsers.set(uid, profile);
      await auditRepository.logEvent({
        action: 'ADMIN_ACTION',
        userId: requestedByAdminUid,
        details: { targetUserId: uid, updatedRole: role },
        timestamp: new Date().toISOString(),
      });
      return profile;
    }

    const updated = { ...user, role, updatedAt: new Date().toISOString() };
    this.localUsers.set(uid, updated);

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

    // 1. Primary: PostgreSQL JWT Access Token
    const jwtClaims = verifyAccessToken(token);
    if (jwtClaims?.sub) {
      let role: 'USER' | 'AGENCY' | 'ADMIN' = (jwtClaims.role as any) || 'USER';
      // In PG mode, check authoritative user role
      if (isPgEnabled()) {
        const dbUser = await this.getUserById(jwtClaims.sub);
        if (dbUser) role = dbUser.role;
      }
      return {
        uid: jwtClaims.sub,
        email: jwtClaims.email,
        role,
        isAnonymous: false,
      };
    }

    // 2. Transitional: Firebase ID token (resolved against PostgreSQL)
    const firebaseUser = await verifyFirebaseIdToken(token);
    if (firebaseUser?.uid) {
      let role: 'USER' | 'AGENCY' | 'ADMIN' = firebaseUser.role || 'USER';
      if (isPgEnabled()) {
        const dbUser = await this.getUserById(firebaseUser.uid);
        if (dbUser) role = dbUser.role;
      }
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        isAnonymous: false,
      };
    }

    // 3. Dev/test in-memory token check
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

    return null;
  }

  public clear(): void {
    this.localUsers.clear();
  }
}

export const userRepository = new UserRepository();
