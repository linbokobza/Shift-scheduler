import mongoose from 'mongoose';

// Re-export model interfaces
export type { IUser, IAvailability, ISchedule, IVacation, IHoliday, IAuditLog } from '../models';

// Shared types for schedule generation
export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  employeeId?: string;
  employeeName?: string;
}

export interface ScheduleGenerationResult {
  schedule: any | null; // Will be populated with actual schedule data
  errors: ValidationError[];
  warnings: ValidationError[];
  attempts: number;
  optimizationScore?: number;
}

// DTO types (Data Transfer Objects) for API responses
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager';
  isActive: boolean;
}

export interface AvailabilityDTO {
  id: string;
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
  submittedAt: string;
}

export interface ScheduleDTO {
  id: string;
  weekStart: string;
  assignments: {
    [day: string]: {
      [shiftId: string]: string | null; // employeeId
    };
  };
  lockedAssignments?: {
    [day: string]: {
      [shiftId: string]: boolean;
    };
  };
  isPublished: boolean;
  publishedAt?: string;
  createdBy: string;
  optimizationScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VacationDTO {
  id: string;
  employeeId: string;
  date: string;
  type: 'vacation' | 'sick';
  createdAt: string;
}

export interface HolidayDTO {
  id: string;
  date: string;
  name: string;
  type: 'no-work' | 'morning-only';
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

// Helper function to convert Mongoose ObjectId to string
export const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
};

export const toString = (id: mongoose.Types.ObjectId): string => {
  return id.toString();
};
