import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (_req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const dbConnected = mongoose.connection.readyState === 1;

  const health = isProduction
    ? {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'ok' : 'error',
      }
    : {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          name: mongoose.connection.name || 'unknown',
        },
      };

  const httpStatus = dbConnected ? 200 : 503;
  res.status(httpStatus).json(health);
});

export default router;
