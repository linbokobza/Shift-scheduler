import { useMemo } from 'react';
import { Availability, User, VacationDay, Holiday } from '../types';
import { analyzeShiftAvailability, ShiftAvailabilityAnalysis } from '../utils/availabilityUtils';

/**
 * React hook לניתוח זמינות עובדים ומציאת משמרות ללא עובדים זמינים
 * משתמש ב-useMemo כדי למנוע חישובים מיותרים
 */
export function useShiftAvailability(
  availabilities: Availability[],
  activeEmployees: User[],
  vacations: VacationDay[],
  holidays: Holiday[],
  weekStart: string
): { analysis: ShiftAvailabilityAnalysis } {
  const analysis = useMemo(() => {
    return analyzeShiftAvailability(
      availabilities,
      activeEmployees,
      vacations,
      holidays,
      weekStart
    );
  }, [availabilities, activeEmployees, vacations, holidays, weekStart]);

  return { analysis };
}
