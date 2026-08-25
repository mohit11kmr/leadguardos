import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

// ─── Configuration ──────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;            // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600;     // 7 days
const BCRYPT_ROUNDS = 12;

export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL_CONFIGURATION_ERROR: JWT_SECRET is required in production');
  }
  return 'leadguard_dev_jwt_secret_key_32_chars';
}

function getJwtRefreshSecret(): string {
  if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL_CONFIGURATION_ERROR: JWT_REFRESH_SECRET is required in production');
  }
  return 'leadguard_dev_refresh_secret_key_32ch';
}

export type Role = 'USER' | 'AGENCY' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

// ─── Access tokens (minimal claims only) ───────────────────────────────────────

/** Issues a short-lived access JWT. Claims: sub, email, role — nothing sensitive. */
export function signAccessToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL_SECONDS, issuer: 'leadguard-os' },
  );
}

export interface VerifiedAccess {
  sub: string;
  email?: string;
  role?: string;
}

export function verifyAccessToken(token: string): VerifiedAccess | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'leadguard-os',
    }) as VerifiedAccess;
    if (!decoded?.sub) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ─── Refresh token rotation with family reuse detection ────────────────────────

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a refresh token family and returns the opaque refresh token.
 * Only the SHA-256 hash is persisted — plaintext never touches the database.
 */
async function issueRefreshToken(userId: string, familyId?: string, meta?: { ip?: string; userAgent?: string }): Promise<string> {
  const raw = crypto.randomBytes(48).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      familyId: familyId || crypto.randomUUID(),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  });
  return raw;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function login(email: string, password: string, meta?: { ip?: string; userAgent?: string }): Promise<TokenPair> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Uniform failure — never reveal whether the account exists.
  const ok = user && user.passwordHash && user.isActive &&
    (await bcrypt.compare(password, user.passwordHash));
  if (!ok || !user) throw new AuthError('INVALID_CREDENTIALS', 401);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const authUser: AuthUser = { id: user.id, email: user.email, role: user.role as Role };
  const accessToken = signAccessToken(authUser);
  const refreshToken = await issueRefreshToken(user.id, undefined, meta);
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export async function register(input: {
  email: string; password: string; displayName?: string; role?: Role;
}, meta?: { ip?: string; userAgent?: string }): Promise<TokenPair> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError('INVALID_EMAIL', 400);
  if (typeof input.password !== 'string' || input.password.length < 8) {
    throw new AuthError('PASSWORD_TOO_SHORT', 400);
  }
  if (input.password.length > 128) throw new AuthError('PASSWORD_TOO_LONG', 400);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AuthError('EMAIL_ALREADY_REGISTERED', 409);

  const requestedRole: Role = input.role === 'AGENCY' ? 'AGENCY' : 'USER';
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      displayName: input.displayName?.slice(0, 120),
      role: requestedRole,
    },
  });

  const authUser: AuthUser = { id: user.id, email: user.email, role: user.role as Role };
  const accessToken = signAccessToken(authUser);
  const refreshToken = await issueRefreshToken(user.id, undefined, meta);
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Refresh-token rotation. If a rotated/revoked token is replayed, the ENTIRE
 * token family is revoked (theft detection) and an error is returned.
 */
export async function rotateRefreshToken(rawToken: string, meta?: { ip?: string; userAgent?: string }): Promise<TokenPair> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record) throw new AuthError('INVALID_REFRESH_TOKEN', 401);

  if (record.revokedAt || record.expiresAt.getTime() < Date.now()) {
    // Replay of an already-rotated token → assume theft, kill the family.
    await prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AuthError('REFRESH_TOKEN_REUSE_DETECTED', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive) throw new AuthError('ACCOUNT_DISABLED', 401);

  const newRaw = await issueRefreshToken(user.id, record.familyId, meta);
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date(), replacedById: undefined },
  });

  const authUser: AuthUser = { id: user.id, email: user.email, role: user.role as Role };
  return { accessToken: signAccessToken(authUser), refreshToken: newRaw, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

/** Revokes one refresh token (logout single session). */
export async function revokeRefreshToken(rawToken: string): Promise<boolean> {
  const result = await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

/** Revokes ALL refresh tokens for a user (logout everywhere / compromise). */
export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}
