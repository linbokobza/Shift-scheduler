import { Response, NextFunction } from 'express';
import { AuditLog, AuditAction, EntityType } from '../models';
import { AuthRequest } from './auth';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export interface AuditLogOptions {
  action: AuditAction;
  entityType: EntityType;
  entityId?: mongoose.Types.ObjectId | string;
  changes?: Record<string, any>;
}

export const createAuditLog = async (
  req: AuthRequest,
  options: AuditLogOptions
): Promise<void> => {
  try {
    if (!req.user) {
      logger.warn('Audit log attempted without authenticated user');
      return;
    }

    await AuditLog.create({
      userId: req.user._id,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      changes: options.changes,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });

    logger.debug('Audit log created:', {
      userId: req.user._id,
      action: options.action,
      entityType: options.entityType,
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
};

export const auditLogMiddleware = (
  action: AuditAction,
  entityType: EntityType
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after successful response
    res.json = function (body: any) {
      // Only log if response was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extract entity ID from response if available
        const entityId = body?._id || body?.id || req.params.id;

        createAuditLog(req, {
          action,
          entityType,
          entityId,
          changes: body,
        });
      }

      return originalJson(body);
    };

    next();
  };
};
