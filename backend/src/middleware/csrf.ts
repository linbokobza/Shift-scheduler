import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';

// Store CSRF tokens in memory (in production, use Redis or similar)
const csrfTokens = new Map<string, { token: string; createdAt: number }>();

// Cleanup expired tokens (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (now - value.createdAt > 3600000) {
      csrfTokens.delete(key);
    }
  }
}, 600000); // Cleanup every 10 minutes

/**
 * Generate a CSRF token for the user
 * This should be called for all GET requests that contain forms
 */
export const generateCSRFToken = (req: Request, res: Response): void => {
  // Create a unique identifier for this session
  const sessionId = req.sessionID || req.ip || 'unknown';

  // Check if token already exists for this session
  let csrfData = csrfTokens.get(sessionId);

  if (!csrfData) {
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
export const verifyCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF verification for GET and HEAD requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = req.sessionID || req.ip || 'unknown';
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
