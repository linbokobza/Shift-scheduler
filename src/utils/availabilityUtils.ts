import { Availability, User, VacationDay, Holiday } from '../types';
import { SHIFTS, DAYS } from '../data/mockData';
import { getWeekDates, formatDate, parseLocalDate } from './dateUtils';

export interface UnavailableShift {
  day: number;                    // 0-5 (ראשון-שישי)
  dayName: string;                // שם היום בעברית
  shiftId: string;                // 'morning', 'evening', 'night'
  shiftName: string;              // שם המשמרת בעברית
  reason: 'all-unavailable';
  unavailableCount: number;       // מספר עובדים שסימנו לא זמין + בחופשה
  totalActive: number;            // סך כל העובדים הפעילים
}

export interface ShiftAvailabilityAnalysis {
  unavailableShifts: UnavailableShift[];
  hasIssues: boolean;
}

/**
 * בודק אם משמרת היא מוגבלת (שישי ערב/לילה)
 */
const isRestrictedShift = (dayIndex: number, shiftId: string): boolean => {
  // שישי ערב ולילה
  const isFridayEveningOrNight = dayIndex === 5 && (shiftId === 'evening' || shiftId === 'night');

  return isFridayEveningOrNight;
};

/**
 * בודק אם משמרת חסומה עקב חג
 */
const isHolidayShiftBlocked = (
  dayIndex: number,
  shiftId: string,
  holidays: Holiday[],
  weekDates: Date[]
): boolean => {
  const date = weekDates[dayIndex];
  const dateString = formatDate(date);
  const holiday = holidays.find(h => h.date === dateString);

  if (!holiday) return false;

  // חג ללא עבודה - כל המשמרות חסומות
  if (holiday.type === 'no-work') return true;
  // חג עם עבודה רק בבוקר - ערב ולילה חסומים
  if (holiday.type === 'morning-only' && (shiftId === 'evening' || shiftId === 'night')) return true;

  return false;
};

/**
 * בודק אם עובד בחופשה/מחלה ביום מסוים
 */
const isEmployeeOnVacation = (
  employeeId: string,
  dayIndex: number,
  vacations: VacationDay[],
  weekDates: Date[]
): boolean => {
  const date = weekDates[dayIndex];
  const dateString = formatDate(date);
  return vacations.some(v => v.employeeId === employeeId && v.date === dateString);
};

/**
 * מנתח את זמינות העובדים ומזהה משמרות ללא עובדים זמינים
 */
export function analyzeShiftAvailability(
  availabilities: Availability[],
  activeEmployees: User[],
  vacations: VacationDay[],
  holidays: Holiday[],
  weekStart: string
): ShiftAvailabilityAnalysis {
  const unavailableShifts: UnavailableShift[] = [];
  const weekDates = getWeekDates(parseLocalDate(weekStart));

  // עבור כל יום ומשמרת (6 ימים: ראשון-שישי)
  for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
    for (const shift of SHIFTS) {
      // דלג על משמרות מוגבלות
      if (isRestrictedShift(dayIndex, shift.id)) {
        continue;
      }

      // דלג על משמרות חסומות עקב חגים
      if (isHolidayShiftBlocked(dayIndex, shift.id, holidays, weekDates)) {
        continue;
      }

      // ספור עובדים זמינים למשמרת זו
      let availableCount = 0;
      let unavailableCount = 0;
      let onVacationCount = 0;

      for (const employee of activeEmployees) {
        // בדוק אם העובד בחופשה ביום זה
        if (isEmployeeOnVacation(employee.id, dayIndex, vacations, weekDates)) {
          onVacationCount++;
          continue;
        }

        // מצא את הזמינות של העובד לשבוע הנוכחי
        const employeeAvailability = availabilities.find(
          a => a.employeeId === employee.id && a.weekStart === weekStart
        );

        // אם העובד לא הגיש זמינות - נחשב כזמין (ברירת מחדל)
        if (!employeeAvailability) {
          availableCount++;
          continue;
        }

        // בדוק את הסטטוס של המשמרת הספציפית
        const dayStr = dayIndex.toString();
        const shiftStatus = employeeAvailability.shifts[dayStr]?.[shift.id]?.status;

        // אם לא סימן כלום או סימן 'available' - זמין
        // רק אם סימן במפורש 'unavailable' - לא זמין
        if (shiftStatus === 'unavailable') {
          unavailableCount++;
        } else {
          availableCount++;
        }
      }

      // אם אין אף עובד זמין - הוסף לרשימת המשמרות הלא זמינות
      if (availableCount === 0) {
        unavailableShifts.push({
          day: dayIndex,
          dayName: DAYS[dayIndex],
          shiftId: shift.id,
          shiftName: shift.name,
          reason: 'all-unavailable',
          unavailableCount: unavailableCount + onVacationCount,
          totalActive: activeEmployees.length
        });
      }
    }
  }

  return {
    unavailableShifts,
    hasIssues: unavailableShifts.length > 0
  };
}
