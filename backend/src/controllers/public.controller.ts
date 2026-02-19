import { Request, Response } from 'express';
import { Schedule, User, Holiday } from '../models';
import { AppError } from '../middleware';
import { ScheduleService } from '../services/schedule.service';
import { formatDate } from '../services/dateUtils.service';

const fetchEmployees = async () => {
  const employees = await User.find({ isActive: true, role: 'employee' }).select('-password');
  return employees.map(emp => ({
    id: emp._id.toString(),
    name: emp.name,
    email: emp.email,
    role: emp.role,
    isActive: emp.isActive,
  }));
};

const fetchHolidaysForWeek = async (weekStartDate: Date) => {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 5);
  const weekStartStr = formatDate(weekStartDate);
  const weekEndStr = formatDate(weekEndDate);

  const holidays = await Holiday.find({
    date: { $gte: weekStartStr, $lte: weekEndStr },
  }).sort({ date: 1 });

  return holidays.map(h => ({
    id: h._id.toString(),
    date: h.date,
    name: h.name,
    type: h.type,
    createdAt: h.createdAt.toISOString(),
  }));
};

export const getPublicSchedule = async (req: Request, res: Response): Promise<void> => {
  const { weekStart } = req.query;

  if (!weekStart || typeof weekStart !== 'string') {
    throw new AppError('weekStart query parameter is required', 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw new AppError('weekStart must be in YYYY-MM-DD format', 400);
  }

  const weekStartDate = new Date(weekStart);

  const schedule = await Schedule.findOne({
    weekStart: weekStartDate,
    isPublished: true,
  });

  const [employees, holidays] = await Promise.all([
    fetchEmployees(),
    fetchHolidaysForWeek(weekStartDate),
  ]);

  res.status(200).json({
    schedule: schedule ? ScheduleService.scheduleToDTO(schedule) : null,
    employees,
    holidays,
  });
};

export const getLatestPublicSchedule = async (_req: Request, res: Response): Promise<void> => {
  // Find the most recent published schedule
  const schedule = await Schedule.findOne({ isPublished: true }).sort({ weekStart: -1 });

  if (!schedule) {
    const employees = await fetchEmployees();
    res.status(200).json({ schedule: null, employees, holidays: [] });
    return;
  }

  const [employees, holidays] = await Promise.all([
    fetchEmployees(),
    fetchHolidaysForWeek(schedule.weekStart),
  ]);

  res.status(200).json({
    schedule: ScheduleService.scheduleToDTO(schedule),
    employees,
    holidays,
  });
};
