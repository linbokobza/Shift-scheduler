import { Availability, VacationDay, User } from '../types';
import { Holiday } from '../types';
import { parseLocalDate } from './dateUtils';

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  employeeId?: string;
  employeeName?: string;
}

export const validateAvailabilitySubmission = (
  availability: Availability['shifts'],
  vacationDays: string[],
  employeeName: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Count vacation days
  const vacationCount = vacationDays.length;
  
  // Check if has at least one morning shift available (unless 3+ vacation days)
  if (vacationCount < 3) {
    let hasMorningShift = false;
    for (let day = 0; day < 6; day++) { // Sunday to Friday (include Friday morning)
      const morningAvailability = availability[day.toString()]?.['morning'];
      if (morningAvailability?.status === 'available') {
        hasMorningShift = true;
        break;
      }
    }
    
    if (!hasMorningShift) {
      errors.push({
        type: 'error',
        message: 'חובה לסמן לפחות משמרת בוקר אחת כ"זמין" (למעט במקרה של 3+ ימי חופשה)'
      });
    }
  }
  
  return errors;
};

export const validateScheduleGeneration = (
  availabilities: Availability[],
  vacationDays: VacationDay[],
  holidays: Holiday[],
  activeEmployees: User[],
  weekStart: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Check if all employees have minimum shifts requirement
  const employeeShiftCounts: { [employeeId: string]: number } = {};
  const employeeMorningShifts: { [employeeId: string]: number } = {};
  
  // Initialize counters
  activeEmployees.forEach(emp => {
    employeeShiftCounts[emp.id] = 0;
    employeeMorningShifts[emp.id] = 0;
  });
  
  // Check vacation days for each employee
  const employeeVacationDays: { [employeeId: string]: number } = {};
  vacationDays.forEach(vacation => {
    const vacationDate = parseLocalDate(vacation.date);
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    if (vacationDate >= weekStartDate && vacationDate <= weekEndDate) {
      employeeVacationDays[vacation.employeeId] = (employeeVacationDays[vacation.employeeId] || 0) + 1;
    }
  });
  
  // Check availability submissions
  activeEmployees.forEach(employee => {
    const empAvailability = availabilities.find(a => a.employeeId === employee.id && a.weekStart === weekStart);
    
    if (!empAvailability) {
      errors.push({
        type: 'warning',
        message: `${employee.name} לא הגיש אילוצים לשבוע זה`,
        employeeId: employee.id,
        employeeName: employee.name
      });
      return;
    }
    
    // Check morning shift requirement (unless 3+ vacation days)
    const vacationCount = employeeVacationDays[employee.id] || 0;
    if (vacationCount < 3) {
      let hasMorningAvailable = false;
      for (let day = 0; day < 6; day++) { // Include Friday morning
        const morningAvailability = empAvailability.shifts[day.toString()]?.['morning'];
        if (morningAvailability?.status === 'available') {
          hasMorningAvailable = true;
          break;
        }
      }
      
      if (!hasMorningAvailable) {
        errors.push({
          type: 'warning',
          message: `${employee.name} לא סימן אף משמרת בוקר כזמינה`,
          employeeId: employee.id,
          employeeName: employee.name
        });
      }
    }
  });
  
  return errors;
};

export const hasScheduleConflicts = (
  employeeId: string,
  day: number,
  shiftId: string,
  currentAssignments: { [employeeId: string]: string[] }
): boolean => {
  const employeeShifts = currentAssignments[employeeId] || [];
  const currentShiftKey = `${day}-${shiftId}`;
  
  // Check for double shift (same day)
  const sameDay = employeeShifts.filter(shift => 
    shift.startsWith(`${day}-`)
  );
  if (sameDay.length > 0) return true;
  
  // Check shift sequence conflicts
  if (shiftId === 'evening') {
    // Can't work evening after morning same day
    const morningShift = `${day}-morning`;
    if (employeeShifts.includes(morningShift)) return true;
  }
  
  if (shiftId === 'night') {
    // Can't work night after evening same day
    const eveningShift = `${day}-evening`;
    if (employeeShifts.includes(eveningShift)) return true;
  }
  
  if (shiftId === 'morning') {
    // Can't work morning after night shift (night ends in the morning)
    // Check previous day night shift
    if (day > 0) {
      const prevNightShift = `${day - 1}-night`;
      if (employeeShifts.includes(prevNightShift)) return true;
    }
  }
  
  return false;
};