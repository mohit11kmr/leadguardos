import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * @deprecated Firebase Authentication is deprecated and will be removed in v2.0.0.
 * Use PostgreSQL-backed JWT authentication (see authService.ts) instead.
 * This module remains for transitional compatibility only.
 * Removal target: 2025-Q3.
 */

export interface FirebaseVerifiedToken {
  uid: string;
  email?: string;
  role?: 'USER' | 'AGENCY' | 'ADMIN';
}

interface FirebaseJwtPayload {
  aud?: string;
  iss?: string;
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
  role?: string;
  [key: string]: any;
}

export interface FirebaseVerifyOptions {
  projectId?: string;
  certs?: Record<string, string>;
  nowSeconds?: number;
}

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedCerts: { expiresAtMs: number; certs: Record<string, string> } | null = null;

function decodeBase64UrlJson<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

function getFirebaseProjectId(explicitProjectId?: string): string | null {
  // P1-08: Firebase project ID must come from environment variables only.
  // The firebase-applet-config.json is for development only.
  if (explicitProjectId || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT) {
    return explicitProjectId || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || null;
  }

  // In production, require explicit env var — no config file fallback.
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Development fallback to config file (legacy)
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed.projectId === 'string' ? parsed.projectId : null;
  } catch {
    return null;
  }
}

function getAdminFirebaseUids(): Set<string> {
  return new Set(
    (process.env.ADMIN_FIREBASE_UIDS || '')
      .split(',')
      .map(uid => uid.trim())
      .filter(Boolean)
  );
}

async function fetchFirebaseCerts(): Promise<Record<string, string>> {
  if (process.env.FIREBASE_AUTH_CERTS_JSON) {
    return JSON.parse(process.env.FIREBASE_AUTH_CERTS_JSON) as Record<string, string>;
  }

  const now = Date.now();
  if (cachedCerts && cachedCerts.expiresAtMs > now) {
    return cachedCerts.certs;
  }

  const response = await fetch(CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Firebase public certs: HTTP ${response.status}`);
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  
  // P1-07: Cap cert cache TTL at 1 hour (3600s) to ensure rotation on key rotation
  const cappedMaxAgeSeconds = Math.min(maxAgeSeconds, 3600);
  
  const certs = await response.json() as Record<string, string>;
  cachedCerts = {
    certs,
    expiresAtMs: now + Math.max(60, cappedMaxAgeSeconds - 60) * 1000,
  };
  return certs;
}

export async function verifyFirebaseIdToken(
  token: string,
  options: FirebaseVerifyOptions = {}
): Promise<FirebaseVerifiedToken | null> {
  // DEPRECATION WARNING: Firebase Auth is deprecated. Use PostgreSQL JWT auth instead.
  // This function will be removed in v2.0.0 (target: 2025-Q3).
  console.warn('[DEPRECATED] verifyFirebaseIdToken() is deprecated. Use PostgreSQL JWT authentication (authService.ts) instead. See MIGRATION.md for migration guide.');
  
  try {
    const projectId = getFirebaseProjectId(options.projectId);
    if (!projectId) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerSegment, payloadSegment, signatureSegment] = parts;
    const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerSegment);
    const payload = decodeBase64UrlJson<FirebaseJwtPayload>(payloadSegment);

    if (header.alg !== 'RS256' || !header.kid) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) return null;

    const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= nowSeconds) return null;
    if (!payload.iat || payload.iat > nowSeconds + 300) return null;

    const certs = options.certs || await fetchFirebaseCerts();
    const publicKey = certs[header.kid];
    if (!publicKey) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerSegment}.${payloadSegment}`);
    verifier.end();

    const signatureValid = verifier.verify(publicKey, signatureSegment, 'base64url');
    if (!signatureValid) return null;

    const signedRole = payload.role === 'ADMIN' || payload.role === 'AGENCY' || payload.role === 'USER'
      ? payload.role
      : undefined;
    const role = getAdminFirebaseUids().has(payload.sub)
      ? 'ADMIN'
      : signedRole || 'USER';

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role,
    };
  } catch {
    return null;
  }
}
