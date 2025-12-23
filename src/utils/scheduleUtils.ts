import { Availability, VacationDay, Schedule, User } from '../types';
import { Holiday } from '../types';
import { SHIFTS } from '../data/mockData';
import { ValidationError, validateScheduleGeneration, hasScheduleConflicts } from './scheduleValidation';
import { parseLocalDate, formatDate } from './dateUtils';

export interface ScheduleGenerationResult {
  schedule: Schedule | null;
  errors: ValidationError[];
  warnings: ValidationError[];
  attempts: number;
}

interface EmployeeShiftCounts {
  morning: number;
  evening: number;
  night: number;
  total: number;
}

interface ShiftAssignmentAttempt {
  assignments: Schedule['assignments'];
  employeeAssignments: { [employeeId: string]: string[] };
  shiftCounts: { [employeeId: string]: EmployeeShiftCounts };
  unassignedShifts: string[];
}

export const generateSchedule = (
  availabilities: Availability[],
  vacationDays: VacationDay[],
  holidays: Holiday[],
  activeEmployees: User[],
  weekStart: string
): ScheduleGenerationResult => {
  // Validate before generation
  const validationErrors = validateScheduleGeneration(availabilities, vacationDays, holidays, activeEmployees, weekStart);
  const warnings = validationErrors; // All validations are now warnings, always generate schedule

  const maxAttempts = 10;
  let bestAttempt: ShiftAssignmentAttempt | null = null;
  let bestScore = -1;

  // Try multiple times to get the best possible schedule
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptResult = generateScheduleAttempt(
      availabilities,
      vacationDays,
      holidays,
      activeEmployees,
      weekStart,
      attempt
    );

    const score = calculateScheduleScore(attemptResult);
    
    // If we found a perfect schedule (all shifts assigned), use it immediately
    if (attemptResult.unassignedShifts.length === 0) {
      bestAttempt = attemptResult;
      break;
    }

    // Otherwise, keep track of the best attempt so far
    if (score > bestScore) {
      bestScore = score;
      bestAttempt = attemptResult;
    }
  }

  // Always use the best attempt, even if it's not perfect
  // If somehow no attempt was made, create an empty schedule
  if (!bestAttempt) {
    const emptyAssignments: Schedule['assignments'] = {};
    for (let day = 0; day < 7; day++) {
      emptyAssignments[day.toString()] = {
        morning: null,
        evening: null,
        night: null
      };
    }

    bestAttempt = {
      assignments: emptyAssignments,
      employeeAssignments: {},
      shiftCounts: {},
      unassignedShifts: []
    };
  }

  // Generate warnings for the final schedule
  const finalWarnings = [...warnings];
  
  // Add warnings for unassigned shifts
  if (bestAttempt.unassignedShifts.length > 0) {
    finalWarnings.push({
      type: 'warning',
      message: `${bestAttempt.unassignedShifts.length} משמרות לא שובצו (אין עובדים זמינים)`
    });
  }

  // Add warnings for employee shift distribution
  activeEmployees.forEach(emp => {
    const counts = bestAttempt!.shiftCounts[emp.id] || { morning: 0, evening: 0, night: 0, total: 0 };
    const vacationCount = getEmployeeVacationCount(emp.id, vacationDays, weekStart);

    if (vacationCount < 3) {
      if (counts.total < 3) {
        finalWarnings.push({
          type: 'warning',
          message: `${emp.name} קיבל פחות מ-3 משמרות (${counts.total} משמרות)`,
          employeeId: emp.id,
          employeeName: emp.name
        });
      }

      if (counts.morning === 0) {
        finalWarnings.push({
          type: 'warning',
          message: `${emp.name} לא קיבל משמרת בוקר`,
          employeeId: emp.id,
          employeeName: emp.name
        });
      }

      if (counts.total >= 3 && counts.evening === 0 && counts.night === 0) {
        finalWarnings.push({
          type: 'warning',
          message: `${emp.name} קיבל רק משמרות בוקר`,
          employeeId: emp.id,
          employeeName: emp.name
        });
      }
    }
  });

  const schedule: Schedule = {
    id: Date.now().toString(),
    weekStart,
    assignments: bestAttempt.assignments,
    createdAt: new Date().toISOString(),
    createdBy: 'manager'
  };
  
  return {
    schedule,
    errors: [],
    warnings: finalWarnings,
    attempts: maxAttempts
  };
};

function generateScheduleAttempt(
  availabilities: Availability[],
  vacationDays: VacationDay[],
  holidays: Holiday[],
  activeEmployees: User[],
  weekStart: string,
  attemptNumber: number
): ShiftAssignmentAttempt {
  const assignments: Schedule['assignments'] = {};
  const employeeAssignments: { [employeeId: string]: string[] } = {};
  const shiftCounts: { [employeeId: string]: EmployeeShiftCounts } = {};
  const unassignedShifts: string[] = [];

  // Initialize tracking structures
  for (let day = 0; day < 7; day++) {
    assignments[day.toString()] = {};
    SHIFTS.forEach(shift => {
      const isRestrictedTime = (day === 5 && (shift.id === 'evening' || shift.id === 'night')) || day === 6;
      assignments[day.toString()][shift.id] = isRestrictedTime ? null : null;
    });
  }

  activeEmployees.forEach(emp => {
    employeeAssignments[emp.id] = [];
    shiftCounts[emp.id] = { morning: 0, evening: 0, night: 0, total: 0 };
  });

  // Get all shifts that need to be assigned in chronological order
  const shiftsToAssign: Array<{ day: number; shiftId: string; shiftOrder: number }> = [];

  for (let day = 0; day < 7; day++) {
    SHIFTS.forEach(shift => {
      const isRestrictedTime = (day === 5 && (shift.id === 'evening' || shift.id === 'night')) || day === 6;
      const isHolidayBlocked = isHolidayShiftBlocked(day, shift.id, holidays, weekStart);

      if (!isRestrictedTime && !isHolidayBlocked) {
        // Order within each day: morning=1, evening=2, night=3
        const shiftOrder = shift.id === 'morning' ? 1 : shift.id === 'evening' ? 2 : 3;
        shiftsToAssign.push({ day, shiftId: shift.id, shiftOrder });
      }
    });
  }

  // Sort shifts chronologically: by day first, then by shift order within day
  shiftsToAssign.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.shiftOrder - b.shiftOrder;
  });

  // Assign all shifts in chronological order
  for (const shift of shiftsToAssign) {
    const availableEmployees = getAvailableEmployees(
      shift.day,
      shift.shiftId,
      activeEmployees,
      availabilities,
      vacationDays,
      employeeAssignments,
      weekStart
    );

    if (availableEmployees.length > 0) {
      // Prioritize employees based on shift type and current counts
      availableEmployees.sort((a, b) => {
        const scoreA = getEmployeePriorityScore(a.id, shift.shiftId, shiftCounts);
        const scoreB = getEmployeePriorityScore(b.id, shift.shiftId, shiftCounts);
        return scoreA - scoreB;
      });

      // For morning shifts, prioritize employees who haven't had one yet
      if (shift.shiftId === 'morning') {
        const needMorningShift = availableEmployees.filter(emp => shiftCounts[emp.id].morning === 0);
        if (needMorningShift.length > 0) {
          const selectedEmployee = needMorningShift[Math.floor(Math.random() * needMorningShift.length)];
          assignShift(shift.day, shift.shiftId, selectedEmployee.id, assignments, employeeAssignments, shiftCounts);
        } else {
          const selectedEmployee = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
          assignShift(shift.day, shift.shiftId, selectedEmployee.id, assignments, employeeAssignments, shiftCounts);
        }
      } else {
        const selectedEmployee = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
        assignShift(shift.day, shift.shiftId, selectedEmployee.id, assignments, employeeAssignments, shiftCounts);
      }
    } else {
      unassignedShifts.push(`${shift.day}-${shift.shiftId}`);
    }
  }

  // Phase 3: Try to fill unassigned shifts by redistributing
  const maxRedistributionAttempts = 5;
  for (let i = 0; i < maxRedistributionAttempts && unassignedShifts.length > 0; i++) {
    const shiftKey = unassignedShifts[0];
    const [dayStr, shiftId] = shiftKey.split('-');
    const day = parseInt(dayStr);

    // Try to find an employee who can take this shift by moving their other shifts
    const availableEmployees = getAvailableEmployees(
      day,
      shiftId,
      activeEmployees,
      availabilities,
      vacationDays,
      [],
      weekStart
    );

    for (const employee of availableEmployees) {
      // Check if this employee has conflicts that can be resolved
      if (!hasScheduleConflicts(employee.id, day, shiftId, employeeAssignments)) {
        // Try to assign this shift
        assignShift(day, shiftId, employee.id, assignments, employeeAssignments, shiftCounts);
        unassignedShifts.shift(); // Remove from unassigned list
        break;
      }
    }

    // If we couldn't assign this shift, move to next
    if (unassignedShifts[0] === shiftKey) {
      break;
    }
  }

  return {
    assignments,
    employeeAssignments,
    shiftCounts,
    unassignedShifts
  };
}

function getAvailableEmployees(
  day: number,
  shiftId: string,
  activeEmployees: User[],
  availabilities: Availability[],
  vacationDays: VacationDay[],
  employeeAssignments: { [employeeId: string]: string[] },
  weekStart: string
): User[] {
  return activeEmployees.filter(emp =>
    isEmployeeAvailable(emp.id, day, shiftId, availabilities, weekStart) &&
    !isEmployeeOnVacation(emp.id, day, vacationDays, weekStart) &&
    !hasScheduleConflicts(emp.id, day, shiftId, employeeAssignments) &&
    !hasNightToMorningConflict(emp.id, day, shiftId, employeeAssignments) &&
    !hasThreeConsecutiveDaysConflict(emp.id, day, employeeAssignments)
  );
}

function hasNightToMorningConflict(
  employeeId: string,
  day: number,
  shiftId: string,
  employeeAssignments: { [employeeId: string]: string[] }
): boolean {
  const employeeShifts = employeeAssignments[employeeId] || [];

  // אם זו משמרת בוקר - בדוק שלא היה לילה אתמול
  if (shiftId === 'morning') {
    // Check if employee worked night shift the previous day
    if (day > 0) {
      const prevNightShift = `${day - 1}-night`;
      if (employeeShifts.includes(prevNightShift)) return true;
    }

    // Special case: Sunday morning after Saturday night
    if (day === 0) {
      const saturdayNightShift = `6-night`;
      if (employeeShifts.includes(saturdayNightShift)) return true;
    }
  }

  // אם זו משמרת לילה - בדוק שאין בוקר למחרת
  if (shiftId === 'night') {
    if (day < 5) {
      const nextMorningShift = `${day + 1}-morning`;
      if (employeeShifts.includes(nextMorningShift)) return true;
    }

    // Special case: Saturday night before Sunday morning
    if (day === 6) {
      const sundayMorningShift = `0-morning`;
      if (employeeShifts.includes(sundayMorningShift)) return true;
    }
  }

  return false;
}

/**
 * בדיקת 8-8-8: מונע 3 משמרות ברציפות
 * אסור לעובד לעבוד 3 ימים ברצף (למשל: לילה, ערב, בוקר)
 */
function hasThreeConsecutiveDaysConflict(
  employeeId: string,
  day: number,
  employeeAssignments: { [employeeId: string]: string[] }
): boolean {
  // אם זה יום 0 או 1, אי אפשר לעבוד 3 ימים ברצף כי אין מספיק ימים לפני
  if (day < 2) return false;

  const employeeShifts = employeeAssignments[employeeId] || [];

  // בדוק אם העובד עבד ביומיים הקודמים
  const yesterday = day - 1;
  const dayBeforeYesterday = day - 2;

  // בדוק אם יש משמרת ביום אתמול (כל משמרת)
  const hasYesterdayShift = SHIFTS.some(shift =>
    employeeShifts.includes(`${yesterday}-${shift.id}`)
  );

  // בדוק אם יש משמרת בשלשום (כל משמרת)
  const hasDayBeforeYesterdayShift = SHIFTS.some(shift =>
    employeeShifts.includes(`${dayBeforeYesterday}-${shift.id}`)
  );

  // אם עבד ביומיים האחרונים - אסור לתת לו משמרת היום (8-8-8)
  return hasYesterdayShift && hasDayBeforeYesterdayShift;
}
function isEmployeeAvailable(
  employeeId: string,
  day: number,
  shiftId: string,
  availabilities: Availability[],
  weekStart: string
): boolean {
  const empAvailability = availabilities.find(a => a.employeeId === employeeId && a.weekStart === weekStart);
  
  if (!empAvailability) {
    return true; // No submission = available for all shifts (default)
  }
  
  const dayAvailability = empAvailability.shifts[day.toString()]?.[shiftId];
  
  if (!dayAvailability) {
    return true; // No specific data for this shift = available (default)
  }
  
  return dayAvailability.status !== 'unavailable';
}

function isEmployeeOnVacation(
  employeeId: string,
  day: number,
  vacationDays: VacationDay[],
  weekStart: string
): boolean {
  const startDate = parseLocalDate(weekStart);
  const dayDate = new Date(startDate);
  dayDate.setDate(dayDate.getDate() + day);
  const dayString = formatDate(dayDate);

  return vacationDays.some(vacation =>
    vacation.employeeId === employeeId && vacation.date === dayString
  );
}

function isHolidayShiftBlocked(
  day: number,
  shiftId: string,
  holidays: Holiday[],
  weekStart: string
): boolean {
  const startDate = parseLocalDate(weekStart);
  const dayDate = new Date(startDate);
  dayDate.setDate(dayDate.getDate() + day);
  const dayString = formatDate(dayDate);

  const holiday = holidays.find(h => h.date === dayString);
  if (!holiday) return false;

  if (holiday.type === 'no-work') return true;
  if (holiday.type === 'morning-only' && (shiftId === 'evening' || shiftId === 'night')) return true;

  return false;
}

function getEmployeePriorityScore(
  employeeId: string,
  shiftId: string,
  shiftCounts: { [employeeId: string]: EmployeeShiftCounts }
): number {
  const counts = shiftCounts[employeeId];
  let score = 0;
  
  // Prioritize employees with fewer total shifts
  score += counts.total * 10;
  
  // For morning shifts, prioritize employees with no morning shifts
  if (shiftId === 'morning') {
    if (counts.morning === 0) score -= 50;
    else score += counts.morning * 20;
  }
  
  // For evening shifts, prioritize employees with no evening shifts
  if (shiftId === 'evening') {
    if (counts.evening === 0) score -= 30;
    else score += counts.evening * 15;
  }
  
  // For night shifts, prioritize employees with no night shifts
  if (shiftId === 'night') {
    if (counts.night === 0) score -= 30;
    else score += counts.night * 15;
  }
  
  return score;
}

function assignShift(
  day: number,
  shiftId: string,
  employeeId: string,
  assignments: Schedule['assignments'],
  employeeAssignments: { [employeeId: string]: string[] },
  shiftCounts: { [employeeId: string]: EmployeeShiftCounts }
): void {
  assignments[day.toString()][shiftId] = employeeId;
  employeeAssignments[employeeId].push(`${day}-${shiftId}`);
  
  if (shiftId === 'morning') shiftCounts[employeeId].morning++;
  else if (shiftId === 'evening') shiftCounts[employeeId].evening++;
  else if (shiftId === 'night') shiftCounts[employeeId].night++;
  
  shiftCounts[employeeId].total++;
}

function calculateScheduleScore(attempt: ShiftAssignmentAttempt): number {
  let score = 0;
  
  // High penalty for unassigned shifts
  score -= attempt.unassignedShifts.length * 100;
  
  // Bonus for balanced distribution
  const employeeIds = Object.keys(attempt.shiftCounts);
  const totalShifts = employeeIds.reduce((sum, id) => sum + attempt.shiftCounts[id].total, 0);
  const averageShifts = totalShifts / employeeIds.length;
  
  employeeIds.forEach(id => {
    const counts = attempt.shiftCounts[id];
    
    // Penalty for deviation from average
    const deviation = Math.abs(counts.total - averageShifts);
    score -= deviation * 5;
    
    // Bonus for having at least one of each shift type
    if (counts.morning > 0) score += 10;
    if (counts.evening > 0) score += 5;
    if (counts.night > 0) score += 5;
    
    // Penalty for having too many of one type
    if (counts.morning > 3) score -= (counts.morning - 3) * 10;
    if (counts.evening > 2) score -= (counts.evening - 2) * 5;
    if (counts.night > 2) score -= (counts.night - 2) * 5;
  });
  
  return score;
}

function getEmployeeVacationCount(
  employeeId: string,
  vacationDays: VacationDay[],
  weekStart: string
): number {
  const weekStartDate = parseLocalDate(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  return vacationDays.filter(vacation => {
    if (vacation.employeeId !== employeeId) return false;
    const vacationDate = parseLocalDate(vacation.date);
    return vacationDate >= weekStartDate && vacationDate <= weekEndDate;
  }).length;
}