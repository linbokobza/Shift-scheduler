import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; iat?: number };

    // Find user (include passwordChangedAt for token invalidation check)
    const user = await User.findById(decoded.userId).select('+passwordChangedAt');

    if (!user) {
      res.status(401).json({ error: 'Invalid token - user not found' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'User account is inactive' });
      return;
    }

    // Reject tokens issued before the last password change (SEC-017)
    if (user.passwordChangedAt && decoded.iat) {
      const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAt) {
        res.status(401).json({ error: 'Token invalidated - please log in again' });
        return;
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (role: 'employee' | 'manager') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ error: `Access denied. ${role} role required` });
      return;
    }

    next();
  };
};

export const requireManager = requireRole('manager');
