import { Request, Response } from 'express';
import { AuditLog } from '../models';
import { AppError } from '../middleware';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const { entityType, entityId, userId, action, startDate, endDate, limit = 50 } = req.query;

  const query: any = {};

  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (userId) query.userId = userId;
  if (action) query.action = action;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate as string);
    if (endDate) query.timestamp.$lte = new Date(endDate as string);
  }

  const logs = await AuditLog.find(query)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit as string));

  res.status(200).json({
    logs: logs.map(log => ({
      id: log._id.toString(),
      userId: log.userId.toString(),
      userName: (log.userId as any).name,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString(),
      changes: log.changes,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp.toISOString(),
    })),
  });
};

export const getAuditLogsByEntity = async (req: Request, res: Response): Promise<void> => {
  const { entityType, entityId } = req.params;
  const { limit = 50 } = req.query;

  const logs = await AuditLog.find({
    entityType,
    entityId,
  })
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit as string));

  res.status(200).json({
    logs: logs.map(log => ({
      id: log._id.toString(),
      userId: log.userId.toString(),
      userName: (log.userId as any).name,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString(),
      changes: log.changes,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp.toISOString(),
    })),
  });
};
