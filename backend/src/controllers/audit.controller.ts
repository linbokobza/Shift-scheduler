import { Request, Response } from 'express';
import { AuditLog } from '../models';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const { entityType, entityId, userId, action, startDate, endDate, limit = 50 } = req.query;

  const query: any = {};

  if (entityType && typeof entityType === 'string') query.entityType = entityType;
  if (entityId && typeof entityId === 'string') query.entityId = entityId;
  if (userId && typeof userId === 'string') query.userId = userId;
  if (action && typeof action === 'string') query.action = action;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate as string);
    if (endDate) query.timestamp.$lte = new Date(endDate as string);
  }

  // Cap the limit to prevent resource exhaustion
  const parsedLimit = Math.min(Math.max(parseInt(limit as string) || 50, 1), 200);

  const logs = await AuditLog.find(query)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(parsedLimit);

  res.status(200).json({
    logs: logs.map(log => ({
      id: log._id.toString(),
      userId: log.userId.toString(),
      userName: (log.userId as any).name,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString(),
      changes: log.changes,
      timestamp: log.timestamp.toISOString(),
    })),
  });
};

export const getAuditLogsByEntity = async (req: Request, res: Response): Promise<void> => {
  const { entityType, entityId } = req.params;
  const { limit = 50 } = req.query;

  // Cap the limit to prevent resource exhaustion
  const parsedLimit = Math.min(Math.max(parseInt(limit as string) || 50, 1), 200);

  const logs = await AuditLog.find({
    entityType,
    entityId,
  })
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(parsedLimit);

  res.status(200).json({
    logs: logs.map(log => ({
      id: log._id.toString(),
      userId: log.userId.toString(),
      userName: (log.userId as any).name,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString(),
      changes: log.changes,
      timestamp: log.timestamp.toISOString(),
    })),
  });
};
