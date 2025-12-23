export interface User {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager';
  isActive: boolean;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export type AvailabilityStatus = 'available' | 'unavailable';

export interface Availability {
  employeeId: string;
  weekStart: string;
  shifts: {
    [day: string]: {
      [shiftId: string]: {
        status: AvailabilityStatus;
        comment?: string;
      };
    };
  };
}

export interface VacationDay {
  id: string;
  employeeId: string;
  date: string;
  type: 'vacation' | 'sick';
  createdAt: string;
}

export interface Schedule {
  id: string;
  weekStart: string;
  assignments: {
    [day: string]: {
      [shiftId: string]: string | null; // employeeId
    };
  };
  lockedAssignments?: {
    [day: string]: {
      [shiftId: string]: boolean; // true = locked
    };
  };
  createdAt: string;
  createdBy: string;
  isPublished?: boolean;
  publishedAt?: string;
}

export interface ScheduleAssignment {
  day: string;
  shiftId: string;
  employeeId: string;
  employeeName: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'no-work' | 'morning-only';
  createdAt: string;
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  employeeId?: string;
  employeeName?: string;
}

export interface ScheduleGenerationResult {
  schedule: Schedule | null;
  errors: ValidationError[];
  warnings: ValidationError[];
  attempts: number;
  optimizationScore?: number;
}