import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  login, register, rotateRefreshToken, revokeRefreshToken,
  revokeAllSessions, AuthError,
} from '../auth/authService';
import { AuditLogger } from '../observability/auditLogger';

export const authRouter = Router();

// ─── Zod schemas (reject unknown fields) ───────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
}).strict();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(120).optional(),
  role: z.enum(['USER', 'AGENCY']).optional(),
}).strict();

const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(512),
}).strict();

const logoutSchema = refreshSchema;

function clientMeta(req: Request): { ip?: string; userAgent?: string } {
  return {
    ip: req.ip || req.socket.remoteAddress || undefined,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 200) : undefined,
  };
}

function handleAuthError(res: Response, err: unknown) {
  if (err instanceof AuthError) {
    if (err.message === 'REFRESH_TOKEN_REUSE_DETECTED') {
      AuditLogger.log({ action: 'AUTH_FAILURE', resource: 'REFRESH_REUSE', details: { severity: 'HIGH' } });
    }
    return res.status(err.statusCode).json({ error: { code: err.message, message: err.message } });
  }
  return res.status(500).json({ error: { code: 'AUTH_INTERNAL', message: 'Authentication failed.' } });
}

authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
  }
  try {
    const pair = await register(parsed.data, clientMeta(req));
    AuditLogger.log({ action: 'AUTH_LOGIN', resource: 'REGISTER', details: { email: parsed.data.email } });
    return res.status(201).json({ user: { email: parsed.data.email }, ...pair });
  } catch (err) {
    return handleAuthError(res, err);
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid credentials format.' } });
  }
  try {
    const pair = await login(parsed.data.email, parsed.data.password, clientMeta(req));
    return res.json(pair);
  } catch (err) {
    AuditLogger.log({ action: 'AUTH_FAILURE', resource: 'password-login', details: {} });
    return handleAuthError(res, err);
  }
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'refreshToken required.' } });
  }
  try {
    const pair = await rotateRefreshToken(parsed.data.refreshToken, clientMeta(req));
    return res.json(pair);
  } catch (err) {
    return handleAuthError(res, err);
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  const parsed = logoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'refreshToken required.' } });
  }
  const revoked = await revokeRefreshToken(parsed.data.refreshToken);
  return res.json({ revoked });
});

authRouter.post('/logout-all', async (_req: Request, res: Response) => {
  // Requires authenticated context (middleware attaches req.user)
  const userId = (_req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required.' } });
  const count = await revokeAllSessions(userId);
  return res.json({ revokedSessions: count });
});

authRouter.get('/me', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required.' } });
  const { prisma } = await import('../db/prisma');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, displayName: true, createdAt: true, lastLoginAt: true },
  });
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
  return res.json({ user });
});
