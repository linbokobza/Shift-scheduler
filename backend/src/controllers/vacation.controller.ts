import { Request, Response } from 'express';
import { Vacation } from '../models';
import { AppError, AuthRequest } from '../middleware';
import { createAuditLog } from '../middleware/auditLogger';
import { formatDate, parseLocalDate } from '../services/dateUtils.service';

export const getAllVacations = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, startDate, endDate } = req.query;

  const query: any = {};
  if (employeeId) query.employeeId = employeeId;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = parseLocalDate(startDate as string);
    if (endDate) query.date.$lte = parseLocalDate(endDate as string);
  }

  const vacations = await Vacation.find(query).populate('employeeId', 'name email').sort({ date: 1 });

  res.status(200).json({
    vacations: vacations.map(v => {
      const populatedEmployee = v.employeeId as any;
      return {
        id: v._id.toString(),
        employeeId: populatedEmployee._id ? populatedEmployee._id.toString() : v.employeeId.toString(),
        employeeName: populatedEmployee.name || 'Unknown',
        date: formatDate(v.date),
        type: v.type,
        createdAt: v.createdAt.toISOString(),
      };
    }),
  });
};

export const createVacation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { employeeId, date, type } = req.body;

  if (!employeeId || !date) {
    throw new AppError('employeeId and date are required', 400);
  }

  const vacation = await Vacation.create({
    employeeId,
    date: parseLocalDate(date),
    type: type || 'vacation',
  });

  await createAuditLog(req, {
    action: 'CREATE_VACATION',
    entityType: 'vacation',
    entityId: vacation._id,
  });

  res.status(201).json({
    message: 'Vacation created successfully',
    vacation: {
      id: vacation._id.toString(),
      employeeId: vacation.employeeId.toString(),
      date: formatDate(vacation.date),
      type: vacation.type,
      createdAt: vacation.createdAt.toISOString(),
    },
  });
};

export const deleteVacation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const vacation = await Vacation.findById(id);
  if (!vacation) {
    throw new AppError('Vacation not found', 404);
  }

  await vacation.deleteOne();

  await createAuditLog(req, {
    action: 'DELETE_VACATION',
    entityType: 'vacation',
    entityId: vacation._id,
  });

  res.status(200).json({
    message: 'Vacation deleted successfully',
  });
};
