import { Schedule, User, Holiday } from '../types';
import { formatDate, parseLocalDate } from './dateUtils';

export interface DayShifts {
  morning: string | null;  // employee name, holiday name, or null
  evening: string | null;
  night: string | null;
  holidayName?: string;    // set when the day has a holiday
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
  employees: User[],
  holidays: Holiday[] = []
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
    if (!employeeId) return null;
    if (employeeId === '119-emergency-service') return '119';
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.name || null;
  };

  // Friday (5): only morning shift. Saturday (6): no shifts.
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;

  if (isSaturday) return null;

  // Find holiday for this date
  const year = normalizedDate.getFullYear();
  const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
  const day = String(normalizedDate.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  const holiday = holidays.find((h) => h.date === dateString);

  const isEveningBlocked = isFriday || (holiday?.type === 'no-work' || holiday?.type === 'morning-only');
  const isNightBlocked = isFriday || (holiday?.type === 'no-work' || holiday?.type === 'morning-only');
  const isMorningBlocked = holiday?.type === 'no-work';

  const holidayLabel = holiday?.name ?? null;

  return {
    morning: isMorningBlocked ? holidayLabel : getEmployeeName(dayAssignments['morning']),
    evening: isEveningBlocked ? (isFriday ? null : holidayLabel) : getEmployeeName(dayAssignments['evening']),
    night: isNightBlocked ? (isFriday ? null : holidayLabel) : getEmployeeName(dayAssignments['night']),
    holidayName: holiday?.name,
  };
};
