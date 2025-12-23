import { Request, Response } from 'express';
import { Availability, User } from '../models';
import { AppError, AuthRequest } from '../middleware';
import { createAuditLog } from '../middleware/auditLogger';
import { formatDate } from '../services/dateUtils.service';

export const getAllAvailabilities = async (req: Request, res: Response): Promise<void> => {
  const { weekStart } = req.query;

  const query: any = {};
  if (weekStart) {
    query.weekStart = new Date(weekStart as string);
  }

  const availabilities = await Availability.find(query)
    .populate('employeeId', 'name email')
    .sort({ weekStart: -1, employeeId: 1 });

  res.status(200).json({
    availabilities: availabilities.map(av => {
      const populatedEmployee = av.employeeId as any;
      // Convert Map to plain object if needed
      let shiftsObj: any;
      if (av.shifts instanceof Map) {
        shiftsObj = {};
        (av.shifts as any).forEach((dayShifts: any, day: string) => {
          if (dayShifts instanceof Map) {
            shiftsObj[day] = Object.fromEntries(dayShifts);
          } else {
            shiftsObj[day] = dayShifts;
          }
        });
      } else {
        shiftsObj = av.shifts;
      }

      return {
        id: av._id.toString(),
        employeeId: populatedEmployee._id ? populatedEmployee._id.toString() : av.employeeId.toString(),
        employeeName: populatedEmployee.name,
        weekStart: formatDate(av.weekStart),
        shifts: shiftsObj,
        submittedAt: av.submittedAt.toISOString(),
      };
    }),
  });
};

export const getAvailabilityByEmployee = async (req: Request, res: Response): Promise<void> => {
  const { employeeId } = req.params;
  const { weekStart } = req.query;

  console.log('🔍 getAvailabilityByEmployee called:', { employeeId, weekStart });

  if (!weekStart) {
    throw new AppError('weekStart query parameter is required', 400);
  }

  // Debug: Check what's in the database
  const allAvailabilities = await Availability.find({ employeeId }).limit(5);
  console.log('📋 All availabilities for this employee:', allAvailabilities.map(a => ({
    id: a._id,
    weekStart: formatDate(a.weekStart),
    employeeId: a.employeeId.toString()
  })));

  const availability = await Availability.findOne({
    employeeId,
    weekStart: new Date(weekStart as string),
  });

  console.log('📊 Found availability:', availability ? 'YES' : 'NO', availability?._id);

  if (!availability) {
    console.log('❌ Returning 404 - no availability found');
    res.status(404).json({
      message: 'Availability not found for this employee and week',
      availability: null,
    });
    return;
  }

  // Convert Map to plain object properly
  let shiftsObj: any = {};
  if (availability.shifts instanceof Map) {
    availability.shifts.forEach((dayShifts: any, day: string) => {
      if (dayShifts instanceof Map) {
        shiftsObj[day] = Object.fromEntries(dayShifts);
      } else {
        shiftsObj[day] = dayShifts;
      }
    });
  } else {
    shiftsObj = availability.shifts;
  }

  console.log('✅ Returning availability with shifts:', Object.keys(shiftsObj));

  res.status(200).json({
    availability: {
      id: availability._id.toString(),
      employeeId: availability.employeeId.toString(),
      weekStart: formatDate(availability.weekStart),
      shifts: shiftsObj,
      submittedAt: availability.submittedAt.toISOString(),
    },
  });
};

export const createAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  const { employeeId, weekStart, shifts } = req.body;

  // Validation
  if (!employeeId || !weekStart || !shifts) {
    throw new AppError('employeeId, weekStart, and shifts are required', 400);
  }

  // Check if employee exists
  const employee = await User.findById(employeeId);
  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  // Authorization: employees can only submit their own availability
  if (req.user?.role === 'employee' && req.user._id.toString() !== employeeId) {
    throw new AppError('You can only submit your own availability', 403);
  }

  // Check if availability already exists
  const existing = await Availability.findOne({
    employeeId,
    weekStart: new Date(weekStart),
  });

  if (existing) {
    throw new AppError('Availability already exists for this week. Use PUT to update.', 409);
  }

  // Convert shifts object to Map
  const shiftsMap = new Map();
  Object.entries(shifts).forEach(([day, dayShifts]) => {
    const dayMap = new Map();
    Object.entries(dayShifts as any).forEach(([shiftId, shiftData]) => {
      dayMap.set(shiftId, shiftData);
    });
    shiftsMap.set(day, dayMap);
  });

  // Create availability
  const availability = await Availability.create({
    employeeId,
    weekStart: new Date(weekStart),
    shifts: shiftsMap,
    submittedAt: new Date(),
  });

  // Audit log
  await createAuditLog(req, {
    action: 'CREATE_AVAILABILITY',
    entityType: 'availability',
    entityId: availability._id,
    changes: { weekStart, employeeId },
  });

  res.status(201).json({
    message: 'Availability submitted successfully',
    availability: {
      id: availability._id.toString(),
      employeeId: availability.employeeId.toString(),
      weekStart: formatDate(availability.weekStart),
      shifts: Object.fromEntries(availability.shifts),
      submittedAt: availability.submittedAt.toISOString(),
    },
  });
};

export const updateAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { shifts } = req.body;

  if (!shifts) {
    throw new AppError('shifts is required', 400);
  }

  const availability = await Availability.findById(id);

  if (!availability) {
    throw new AppError('Availability not found', 404);
  }

  // Authorization
  if (req.user?.role === 'employee' && req.user._id.toString() !== availability.employeeId.toString()) {
    throw new AppError('You can only update your own availability', 403);
  }

  // Convert shifts to Map
  const shiftsMap = new Map();
  Object.entries(shifts).forEach(([day, dayShifts]) => {
    const dayMap = new Map();
    Object.entries(dayShifts as any).forEach(([shiftId, shiftData]) => {
      dayMap.set(shiftId, shiftData);
    });
    shiftsMap.set(day, dayMap);
  });

  availability.shifts = shiftsMap;
  availability.submittedAt = new Date();
  await availability.save();

  // Audit log
  await createAuditLog(req, {
    action: 'UPDATE_AVAILABILITY',
    entityType: 'availability',
    entityId: availability._id,
  });

  res.status(200).json({
    message: 'Availability updated successfully',
    availability: {
      id: availability._id.toString(),
      employeeId: availability.employeeId.toString(),
      weekStart: formatDate(availability.weekStart),
      shifts: Object.fromEntries(availability.shifts),
      submittedAt: availability.submittedAt.toISOString(),
    },
  });
};

export const deleteAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const availability = await Availability.findById(id);

  if (!availability) {
    throw new AppError('Availability not found', 404);
  }

  // Authorization
  if (req.user?.role === 'employee' && req.user._id.toString() !== availability.employeeId.toString()) {
    throw new AppError('You can only delete your own availability', 403);
  }

  await availability.deleteOne();

  // Audit log
  await createAuditLog(req, {
    action: 'DELETE_AVAILABILITY',
    entityType: 'availability',
    entityId: availability._id,
  });

  res.status(200).json({
    message: 'Availability deleted successfully',
  });
};
