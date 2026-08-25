import { Request, Response, NextFunction } from 'express';
import { userRepository } from './repositories/userRepository';
import { auditRepository } from './repositories/auditRepository';

export interface AuthUserContext {
  id?: string;
  uid?: string;
  email?: string;
  role: 'USER' | 'AGENCY' | 'ADMIN';
  organizationId?: string;
  isAnonymous?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
    }
  }
}

/**
 * Optional authentication: extracts and verifies Firebase ID token if present.
 * Does not block if unauthenticated.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const user = await userRepository.verifyAuthToken(authHeader);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignored for optional auth
    }
  }
  next();
}

/**
 * Required authentication: ensures a verified token exists on the request.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required to access this resource. Please provide a valid Firebase ID token.',
      },
    });
  }

  try {
    const user = await userRepository.verifyAuthToken(authHeader);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'The provided authentication token is invalid or has expired.',
        },
      });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: 'Authentication verification failed.',
      },
    });
  }
}

/**
 * Admin authorization: requires authenticated user with verified ADMIN role or custom claim.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Admin authentication required.',
      },
    });
  }

  try {
    const user = await userRepository.verifyAuthToken(authHeader);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'The provided authentication token is invalid or has expired.',
        },
      });
    }

    req.user = user;

    if (user.role !== 'ADMIN') {
      await auditRepository.logEvent({
        action: 'AUTH_FAILURE',
        userId: user.uid,
        userEmail: user.email,
        details: { reason: 'NON_ADMIN_ACCESS_ATTEMPT', attemptedPath: req.originalUrl },
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have administrative privileges to perform this operation.',
        },
      });
    }

    next();
  } catch (err: any) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Administrative authorization check failed.',
      },
    });
  }
}