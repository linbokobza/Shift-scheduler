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
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'Invalid token - user not found' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'User account is inactive' });
      return;
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
