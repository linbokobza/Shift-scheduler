import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';

// Store CSRF tokens in memory (in production, use Redis or similar)
const csrfTokens = new Map<string, { token: string; createdAt: number }>();

// Max tokens to prevent memory exhaustion
const MAX_TOKENS = 1000;
const TOKEN_TTL = 3600000; // 1 hour in ms
const CSRF_COOKIE = 'csrf_session';

// Cleanup expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (now - value.createdAt > TOKEN_TTL) {
      csrfTokens.delete(key);
    }
  }
}, 600000);

/**
 * Remove expired tokens and, if still over limit, evict the oldest entry.
 */
const evictIfNeeded = (): void => {
  if (csrfTokens.size < MAX_TOKENS) return;

  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (now - value.createdAt > TOKEN_TTL) {
      csrfTokens.delete(key);
    }
  }

  if (csrfTokens.size >= MAX_TOKENS) {
    const oldestKey = csrfTokens.keys().next().value;
    if (oldestKey !== undefined) {
      csrfTokens.delete(oldestKey);
    }
  }
};

/**
 * Get or create a stable session identifier from a signed cookie (not IP).
 */
const getSessionId = (req: Request, res: Response): string => {
  let sessionId = req.cookies?.[CSRF_COOKIE];

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 32) {
    sessionId = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TOKEN_TTL,
    });
  }

  return sessionId;
};

/**
 * Generate a CSRF token for the session and attach it to response headers.
 */
export const generateCSRFToken = (req: Request, res: Response): void => {
  const sessionId = getSessionId(req, res);

  let csrfData = csrfTokens.get(sessionId);

  if (!csrfData || Date.now() - csrfData.createdAt > TOKEN_TTL) {
    evictIfNeeded();
    const token = crypto.randomBytes(32).toString('hex');
    csrfData = { token, createdAt: Date.now() };
    csrfTokens.set(sessionId, csrfData);
  }

  res.set('X-CSRF-Token', csrfData.token);
};

/**
 * Middleware to protect against CSRF attacks on mutation requests.
 */
export const verifyCsrfToken = (req: Request, _res: Response, next: NextFunction): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = req.cookies?.[CSRF_COOKIE];
  if (!sessionId) {
    throw new AppError('CSRF session missing', 403);
  }

  const csrfData = csrfTokens.get(sessionId);

  const token =
    (req.headers['x-csrf-token'] as string) ||
    (req.body && req.body._csrf) ||
    (req.query._csrf as string);

  if (!token) {
    throw new AppError('CSRF token is missing', 403);
  }

  if (!csrfData || csrfData.token !== token) {
    throw new AppError('Invalid CSRF token', 403);
  }

  next();
};

/**
 * Middleware to attach CSRF token to all responses.
 */
export const csrfTokenMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  generateCSRFToken(req, res);
  next();
};
