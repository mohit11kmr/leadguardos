import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiKeyManager } from '../security/apiKeyManager';
import { verifyFirebaseIdToken } from '../security/firebaseAuth';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'AGENCY' | 'ADMIN';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const DEV_JWT_SECRET = 'leadguard_dev_jwt_secret_key_32_chars';

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return DEV_JWT_SECRET;
}

export function signToken(user: AuthUser): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: decodedPayload.sub,
      email: decodedPayload.email,
      role: decodedPayload.role || 'USER',
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }

    const firebaseUser = await verifyFirebaseIdToken(token);
    if (firebaseUser) {
      req.user = {
        id: firebaseUser.uid,
        email: firebaseUser.email || `${firebaseUser.uid}@firebase.local`,
        role: firebaseUser.role || 'USER',
      };
      return next();
    }
  }

  // Support Master API key for automated jobs / testing or API access
  if (apiKeyHeader) {
    if (process.env.ADMIN_API_KEY && apiKeyHeader === process.env.ADMIN_API_KEY) {
      req.user = { id: 'usr_admin', email: 'admin@leadguard.os', role: 'ADMIN' };
      return next();
    }
    const keyRecord = ApiKeyManager.verifyApiKey(apiKeyHeader);
    if (keyRecord) {
      req.user = { id: keyRecord.userId, email: 'api_user@leadguard.os', role: 'USER' };
      return next();
    }
  }

  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please provide a valid Bearer token or X-API-Key.',
    },
  });
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    } else {
      const firebaseUser = await verifyFirebaseIdToken(token);
      if (firebaseUser) {
        req.user = {
          id: firebaseUser.uid,
          email: firebaseUser.email || `${firebaseUser.uid}@firebase.local`,
          role: firebaseUser.role || 'USER',
        };
      }
    }
  } else if (apiKeyHeader) {
    const keyRecord = ApiKeyManager.verifyApiKey(apiKeyHeader);
    if (keyRecord) {
      req.user = { id: keyRecord.userId, email: 'api_user@leadguard.os', role: 'USER' };
    }
  }

  next();
}

export function requireRole(role: 'ADMIN' | 'AGENCY') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (req.user.role !== role && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: `Access denied. Requires ${role} privileges.` },
      });
    }

    next();
  };
}
