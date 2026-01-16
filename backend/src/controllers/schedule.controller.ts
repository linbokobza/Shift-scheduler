import { Response } from 'express';
import { Schedule } from '../models';
import { AppError, AuthRequest } from '../middleware';
import { createAuditLog } from '../middleware/auditLogger';
import { ScheduleService } from '../services/schedule.service';
import { generateOptimizedSchedule } from '../utils/optimizedScheduler';

export const getAllSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  const { weekStart } = req.query;

  const query: any = {};
  if (weekStart) {
    query.weekStart = new Date(weekStart as string);
  }

  // Filter by isPublished for employees - they should only see published schedules
  if (req.user?.role === 'employee') {
    query.isPublished = true;
  }

  const schedules = await Schedule.find(query)
    .populate('createdBy', 'name email')
    .sort({ weekStart: -1 });

  res.status(200).json({
    schedules: schedules.map(s => ScheduleService.scheduleToDTO(s)),
  });
};

export const getSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { weekStart } = req.query;

  if (!weekStart) {
    throw new AppError('weekStart query parameter is required', 400);
  }

  const query: any = {
    weekStart: new Date(weekStart as string),
  };

  // Filter by isPublished for employees - they should only see published schedules
  if (req.user?.role === 'employee') {
    query.isPublished = true;
  }

  const schedule = await Schedule.findOne(query).populate('createdBy', 'name email');

  if (!schedule) {
    res.status(404).json({
      message: 'Schedule not found for this week',
      schedule: null,
    });
    return;
  }

  res.status(200).json({
    schedule: ScheduleService.scheduleToDTO(schedule),
  });
};

export const generateSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { weekStart } = req.body;

  if (!weekStart) {
    throw new AppError('weekStart is required', 400);
  }

  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const weekStartDate = new Date(weekStart);

  // Fetch all data
  const data = await ScheduleService.getScheduleData(weekStartDate);

  // Check if there's an existing schedule with frozen assignments
  const existingSchedule = await Schedule.findOne({ weekStart: weekStartDate });
  let existingScheduleData: { assignments?: any; frozenAssignments?: any } | undefined;

  if (existingSchedule) {
    existingScheduleData = {
      assignments: existingSchedule.assignments ? ScheduleService.convertMapToObject(existingSchedule.assignments) : undefined,
      frozenAssignments: existingSchedule.frozenAssignments ? ScheduleService.convertMapToObject(existingSchedule.frozenAssignments) : undefined
    };
    console.log('[Controller] Found existing schedule with frozenAssignments:', existingScheduleData.frozenAssignments);
  }

  // Call advanced optimization algorithm (now async with OR-Tools)
  const result = await generateOptimizedSchedule(
    data.employees,
    data.availabilities,
    data.vacations,
    data.holidays,
    data.weekStart,
    existingScheduleData
  );

  if (!result) {
    res.status(400).json({
      message: 'Failed to generate schedule',
      errors: ['לא נמצא פתרון אפשרי. נסה להגדיל זמינויות או לצמצם אילוצים.'],
      warnings: [],
      schedule: null
    });
    return;
  }

  // Save schedule - preserve frozenAssignments from existing schedule
  const schedule = await ScheduleService.saveSchedule(
    weekStartDate,
    result.assignments,
    {},
    req.user._id,
    0,
    result.frozenAssignments || existingScheduleData?.frozenAssignments
  );

  // Audit log
  await createAuditLog(req, {
    action: 'CREATE_SCHEDULE',
    entityType: 'schedule',
    entityId: schedule._id,
  });

  res.status(201).json({
    message: 'Schedule generated successfully',
    schedule: ScheduleService.scheduleToDTO(schedule),
    warnings: result.warnings,
    errors: [],
  });
};

export const updateSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { assignments, lockedAssignments, frozenAssignments } = req.body;

  const schedule = await Schedule.findById(id);

  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }

  // Update
  if (assignments) {
    schedule.assignments = ScheduleService.convertObjectToMap(assignments) as any;
  }

  if (lockedAssignments) {
    schedule.lockedAssignments = ScheduleService.convertObjectToMap(lockedAssignments) as any;
  }

  if (frozenAssignments) {
    schedule.frozenAssignments = ScheduleService.convertObjectToMap(frozenAssignments) as any;
  }

  await schedule.save();

  // Audit log
  await createAuditLog(req, {
    action: 'UPDATE_SCHEDULE',
    entityType: 'schedule',
    entityId: schedule._id,
  });

  res.status(200).json({
    message: 'Schedule updated successfully',
    schedule: ScheduleService.scheduleToDTO(schedule),
  });
};

export const publishSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const schedule = await Schedule.findById(id);

  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }

  schedule.isPublished = true;
  schedule.publishedAt = new Date();
  await schedule.save();

  // Audit log
  await createAuditLog(req, {
    action: 'PUBLISH_SCHEDULE',
    entityType: 'schedule',
    entityId: schedule._id,
  });

  res.status(200).json({
    message: 'Schedule published successfully',
    schedule: ScheduleService.scheduleToDTO(schedule),
  });
};

export const lockShift = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { day, shiftId, locked } = req.body;

  if (day === undefined || !shiftId || locked === undefined) {
    throw new AppError('day, shiftId, and locked are required', 400);
  }

  const schedule = await Schedule.findById(id);

  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }

  // Initialize lockedAssignments if not exists
  if (!schedule.lockedAssignments) {
    schedule.lockedAssignments = new Map() as any;
  }

  // Get or create day map - cast to Map for proper access
  const lockedMap = schedule.lockedAssignments as any as Map<string, Map<string, boolean>>;
  let dayMap = lockedMap.get(day.toString());
  if (!dayMap) {
    dayMap = new Map();
    lockedMap.set(day.toString(), dayMap);
  }

  // Set lock status
  dayMap.set(shiftId, locked);

  await schedule.save();

  // Audit log
  await createAuditLog(req, {
    action: locked ? 'LOCK_SHIFT' : 'UNLOCK_SHIFT',
    entityType: 'schedule',
    entityId: schedule._id,
    changes: { day, shiftId, locked },
  });

  res.status(200).json({
    message: `Shift ${locked ? 'locked' : 'unlocked'} successfully`,
    schedule: ScheduleService.scheduleToDTO(schedule),
  });
};
