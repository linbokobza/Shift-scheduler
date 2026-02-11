import { Schedule, User } from '../types';
import { formatDate, parseLocalDate } from './dateUtils';

export interface DayShifts {
  morning: string | null;  // employee name or null
  evening: string | null;
  night: string | null;
}

export const SHIFT_DISPLAY_ORDER = ['morning', 'evening', 'night'] as const;

export const SHIFT_NAMES_HEBREW = {
  morning: 'בוקר',
  evening: 'ערב',
  night: 'לילה',
} as const;

/**
 * Normalize date to midnight for accurate comparison
 */
const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * Get shift assignments for a specific date
 * @param date - The date to get shifts for
 * @param schedules - Array of published schedules
 * @param employees - Array of all employees
 * @returns Object with morning/evening/night employee names, or null if no schedule found
 */
export const getShiftsForDate = (
  date: Date,
  schedules: Schedule[],
  employees: User[]
): DayShifts | null => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  // Normalize the input date to midnight for accurate comparison
  const normalizedDate = normalizeDate(date);

  // Find schedule that covers this date
  const schedule = schedules.find((s) => {
    // Parse weekStart as local date to avoid timezone issues
    const weekStart = typeof s.weekStart === 'string'
      ? parseLocalDate(s.weekStart)
      : normalizeDate(new Date(s.weekStart));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // End of day

    return normalizedDate >= weekStart && normalizedDate <= weekEnd;
  });

  if (!schedule || !schedule.assignments) return null;

  // Get assignments for this day of week
  const dayAssignments = schedule.assignments[dayOfWeek.toString()];
  if (!dayAssignments) return null;

  // Helper function to resolve employee ID to name
  const getEmployeeName = (employeeId: string | null): string | null => {
    if (!employeeId) return 'ללא שיבוץ';
    if (employeeId === '119-emergency-service') return '119';
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.name || null;
  };

  // Friday (5): only morning shift. Saturday (6): no shifts.
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;

  if (isSaturday) return null;

  return {
    morning: getEmployeeName(dayAssignments['morning']),
    evening: isFriday ? null : getEmployeeName(dayAssignments['evening']),
    night: isFriday ? null : getEmployeeName(dayAssignments['night']),
  };
};
