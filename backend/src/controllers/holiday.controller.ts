import { Request, Response } from 'express';
import { Holiday } from '../models';
import { AppError, AuthRequest } from '../middleware';
import { createAuditLog } from '../middleware/auditLogger';

// Date validation helper
const isValidDateFormat = (dateString: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

export const getAllHolidays = async (req: Request, res: Response): Promise<void> => {
  const { year } = req.query;

  const query: any = {};
  if (year) {
    // Filter by year using string comparison (YYYY-MM-DD format)
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query.date = { $gte: startDate, $lte: endDate };
  }

  const holidays = await Holiday.find(query).sort({ date: 1 });

  res.status(200).json({
    holidays: holidays.map(h => ({
      id: h._id.toString(),
      date: h.date, // Already in YYYY-MM-DD format
      name: h.name,
      type: h.type,
      createdAt: h.createdAt.toISOString(),
    })),
  });
};

export const createHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, name, type } = req.body;

  if (!date || !name || !type) {
    throw new AppError('date, name, and type are required', 400);
  }

  // Validate date format
  if (!isValidDateFormat(date)) {
    throw new AppError('Date must be in YYYY-MM-DD format', 400);
  }

  const holiday = await Holiday.create({
    date, // Store as string (YYYY-MM-DD)
    name,
    type,
  });

  await createAuditLog(req, {
    action: 'CREATE_HOLIDAY',
    entityType: 'holiday',
    entityId: holiday._id,
  });

  res.status(201).json({
    message: 'Holiday created successfully',
    holiday: {
      id: holiday._id.toString(),
      date: holiday.date, // Already in YYYY-MM-DD format
      name: holiday.name,
      type: holiday.type,
      createdAt: holiday.createdAt.toISOString(),
    },
  });
};

export const updateHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, type } = req.body;

  const holiday = await Holiday.findById(id);
  if (!holiday) {
    throw new AppError('Holiday not found', 404);
  }

  if (name) holiday.name = name;
  if (type) holiday.type = type;

  await holiday.save();

  await createAuditLog(req, {
    action: 'UPDATE_HOLIDAY',
    entityType: 'holiday',
    entityId: holiday._id,
  });

  res.status(200).json({
    message: 'Holiday updated successfully',
    holiday: {
      id: holiday._id.toString(),
      date: holiday.date, // Already in YYYY-MM-DD format
      name: holiday.name,
      type: holiday.type,
      createdAt: holiday.createdAt.toISOString(),
    },
  });
};

export const deleteHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const holiday = await Holiday.findById(id);
  if (!holiday) {
    throw new AppError('Holiday not found', 404);
  }

  await holiday.deleteOne();

  await createAuditLog(req, {
    action: 'DELETE_HOLIDAY',
    entityType: 'holiday',
    entityId: holiday._id,
  });

  res.status(200).json({
    message: 'Holiday deleted successfully',
  });
};
