import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';

// Store CSRF tokens in memory (in production, use Redis or similar)
const csrfTokens = new Map<string, { token: string; createdAt: number }>();

// Max tokens to prevent memory exhaustion from many unique IPs
const MAX_TOKENS = 1000;
const TOKEN_TTL = 3600000; // 1 hour in ms

// Cleanup expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (now - value.createdAt > TOKEN_TTL) {
      csrfTokens.delete(key);
    }
  }
}, 600000); // Cleanup every 10 minutes

/**
 * Remove expired tokens and, if still over limit, evict the oldest entry.
 */
const evictIfNeeded = (): void => {
  if (csrfTokens.size < MAX_TOKENS) return;

  // First pass: remove expired tokens
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (now - value.createdAt > TOKEN_TTL) {
      csrfTokens.delete(key);
    }
  }

  // If still at limit, evict oldest entry (Map iterates in insertion order)
  if (csrfTokens.size >= MAX_TOKENS) {
    const oldestKey = csrfTokens.keys().next().value;
    if (oldestKey !== undefined) {
      csrfTokens.delete(oldestKey);
    }
  }
};

/**
 * Generate a CSRF token for the user
 * This should be called for all GET requests that contain forms
 */
export const generateCSRFToken = (req: Request, res: Response): void => {
  // Create a unique identifier for this session
  const sessionId = (req as any).sessionID || req.ip || 'unknown';

  // Check if token already exists for this session
  let csrfData = csrfTokens.get(sessionId);

  if (!csrfData) {
    // Enforce size limit before adding
    evictIfNeeded();

    // Generate a new token
    const token = crypto.randomBytes(32).toString('hex');
    csrfData = {
      token,
      createdAt: Date.now(),
    };
    csrfTokens.set(sessionId, csrfData);
  }

  // Add token to response headers
  res.set('X-CSRF-Token', csrfData.token);
};

/**
 * Middleware to protect against CSRF attacks
 * Should be applied to POST, PUT, DELETE, and PATCH requests
 */
export const verifyCsrfToken = (req: Request, _res: Response, next: NextFunction): void => {
  // Skip CSRF verification for GET and HEAD requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = (req as any).sessionID || req.ip || 'unknown';
  const csrfData = csrfTokens.get(sessionId);

  // Get token from request
  // Check in order: header, body, query
  const token =
    req.headers['x-csrf-token'] as string ||
    (req.body && req.body._csrf) ||
    req.query._csrf as string;

  if (!token) {
    throw new AppError('CSRF token is missing', 403);
  }

  if (!csrfData || csrfData.token !== token) {
    throw new AppError('Invalid CSRF token', 403);
  }

  // Token is valid, proceed
  next();
};

/**
 * Middleware to attach CSRF token to all GET responses
 */
export const csrfTokenMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  generateCSRFToken(req, res);
  next();
};
