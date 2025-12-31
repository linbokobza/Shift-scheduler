import { Schedule, Availability, Vacation, Holiday, User, ISchedule } from '../models';
import { formatDate } from './dateUtils.service';
import mongoose from 'mongoose';

interface ShiftAssignment {
  [day: string]: {
    [shiftId: string]: string | null;
  };
}

interface AvailabilityData {
  employeeId: string;
  weekStart: string;
  shifts: {
    [day: string]: {
      [shiftId: string]: {
        status: 'available' | 'unavailable';
        comment?: string;
      };
    };
  };
}

interface VacationData {
  id: string;
  employeeId: string;
  date: string;
  type: 'vacation' | 'sick';
  createdAt: string;
}

interface HolidayData {
  id: string;
  date: string;
  name: string;
  type: 'no-work' | 'morning-only';
  createdAt: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager';
  isActive: boolean;
}

export class ScheduleService {
  /**
   * Fetch all data needed for schedule generation
   */
  static async getScheduleData(weekStart: Date) {
    const weekStartStr = formatDate(weekStart);

    // Fetch active employees (exclude managers/admins)
    const employees = await User.find({ isActive: true, role: 'employee' }).select('-password');

    // Fetch availabilities for this week
    const availabilities = await Availability.find({ weekStart });

    // Fetch vacations for this week (± 6 days to include only Sunday-Friday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Fixed: was +7, should be +6 for 7 days (0-6)
    const vacations = await Vacation.find({
      date: { $gte: weekStart, $lte: weekEnd },
    });

    // Fetch holidays for this week (use string comparison since Holiday.date is a String)
    const weekEndStr = formatDate(weekEnd);
    const holidays = await Holiday.find({
      date: { $gte: weekStartStr, $lte: weekEndStr },
    });

    // Convert to plain objects
    const employeesData: UserData[] = employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      role: emp.role,
      isActive: emp.isActive,
    }));

    const availabilitiesData: AvailabilityData[] = availabilities.map(av => ({
      employeeId: av.employeeId.toString(),
      weekStart: formatDate(av.weekStart),
      shifts: this.convertMapToObject(av.shifts),
    }));

    const vacationsData: VacationData[] = vacations.map(v => ({
      id: v._id.toString(),
      employeeId: v.employeeId.toString(),
      date: formatDate(v.date),
      type: v.type,
      createdAt: v.createdAt.toISOString(),
    }));

    const holidaysData: HolidayData[] = holidays.map(h => ({
      id: h._id.toString(),
      date: h.date, // Holiday.date is already a string in YYYY-MM-DD format
      name: h.name,
      type: h.type,
      createdAt: h.createdAt.toISOString(),
    }));

    return {
      employees: employeesData,
      availabilities: availabilitiesData,
      vacations: vacationsData,
      holidays: holidaysData,
      weekStart: weekStartStr,
    };
  }

  /**
   * Convert Mongoose Map to plain object
   */
  private static convertMapToObject(map: any): any {
    if (!map) return {};

    const result: any = {};
    if (map instanceof Map) {
      map.forEach((value, key) => {
        if (value instanceof Map) {
          result[key] = this.convertMapToObject(value);
        } else {
          result[key] = value;
        }
      });
    } else {
      return map;
    }
    return result;
  }

  /**
   * Convert plain object to Map for Mongoose
   */
  static convertObjectToMap(obj: any): Map<string, any> {
    const map = new Map();
    Object.entries(obj || {}).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        map.set(key, this.convertObjectToMap(value));
      } else {
        map.set(key, value);
      }
    });
    return map;
  }

  /**
   * Save generated schedule to database
   */
  static async saveSchedule(
    weekStart: Date,
    assignments: ShiftAssignment,
    lockedAssignments: any,
    createdBy: mongoose.Types.ObjectId,
    optimizationScore?: number
  ): Promise<ISchedule> {
    // Delete any existing schedules for this week
    await Schedule.deleteMany({ weekStart });

    // Convert assignments to Map with ObjectIds
    const assignmentsMap = this.convertObjectToMap(assignments);

    // Convert employeeIds to ObjectIds
    assignmentsMap.forEach((dayMap, day) => {
      const newDayMap = new Map();
      dayMap.forEach((employeeId: string | null, shiftId: string) => {
        newDayMap.set(
          shiftId,
          employeeId ? new mongoose.Types.ObjectId(employeeId) : null
        );
      });
      assignmentsMap.set(day, newDayMap);
    });

    const lockedMap = lockedAssignments ? this.convertObjectToMap(lockedAssignments) : undefined;

    // Create new schedule
    const schedule = await Schedule.create({
      weekStart,
      assignments: assignmentsMap as any,
      lockedAssignments: lockedMap as any,
      isPublished: false,
      createdBy,
      optimizationScore,
    });

    return schedule;
  }

  /**
   * Convert schedule to DTO for API response
   */
  static scheduleToDTO(schedule: ISchedule): any {
    return {
      id: schedule._id.toString(),
      weekStart: formatDate(schedule.weekStart),
      assignments: this.convertMapToObject(schedule.assignments),
      lockedAssignments: schedule.lockedAssignments
        ? this.convertMapToObject(schedule.lockedAssignments)
        : undefined,
      isPublished: schedule.isPublished,
      publishedAt: schedule.publishedAt?.toISOString(),
      createdBy: schedule.createdBy.toString(),
      optimizationScore: schedule.optimizationScore,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }
}
