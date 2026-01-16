import { formatDate, parseLocalDate } from '../services/dateUtils.service';
import { solveWithORTools, generateWarningsFromStats } from './ortoolsSolver';

interface EmployeeShiftCounts {
  morning: number;
  evening: number;
  night: number;
  total: number;
  eightToEightCount: number; // מונה משמרות 8-8 (מקסימום 1)
}

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
}

interface HolidayData {
  id: string;
  date: string;
  name: string;
  type: 'no-work' | 'morning-only';
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager';
  isActive: boolean;
}

const SHIFTS = [
  { id: 'morning', name: 'בוקר' },
  { id: 'evening', name: 'ערב' },
  { id: 'night', name: 'לילה' },
];

interface ExistingScheduleData {
  assignments?: ShiftAssignment;
  frozenAssignments?: {
    [day: string]: {
      [shiftId: string]: boolean;
    };
  };
}

/**
 * אלגוריתם אופטימיזציה מתקדם לסידור משמרות
 * משתמש ב-OR-Tools CP-SAT solver כברירת מחדל, עם fallback לאלגוריתם greedy
 */
export async function generateOptimizedSchedule(
  employees: UserData[],
  availabilities: AvailabilityData[],
  vacations: VacationData[],
  holidays: HolidayData[],
  weekStart: string,
  existingSchedule?: ExistingScheduleData
): Promise<{ assignments: ShiftAssignment; warnings: string[]; frozenAssignments?: ExistingScheduleData['frozenAssignments'] } | null> {

  const warnings: string[] = [];
  const frozenAssignments = existingSchedule?.frozenAssignments;

  // יצירת מפות
  const availabilityMap = new Map<string, AvailabilityData>();
  availabilities.forEach(av => availabilityMap.set(av.employeeId, av));

  const vacationMap = new Map<string, Set<string>>();
  vacations.forEach(vd => {
    if (!vacationMap.has(vd.employeeId)) {
      vacationMap.set(vd.employeeId, new Set());
    }
    vacationMap.get(vd.employeeId)!.add(vd.date);
  });

  const holidayMap = new Map<string, HolidayData>();
  holidays.forEach(h => holidayMap.set(h.date, h));

  // בניית רשימת משמרות אפשריות
  const allShifts: Array<{ day: number; shiftId: string; date: string }> = [];
  for (let day = 0; day < 6; day++) {
    const date = getDateForDay(weekStart, day);
    const holiday = holidayMap.get(date);

    SHIFTS.forEach(shift => {
      // שישי - רק בוקר
      if (day === 5 && shift.id !== 'morning') return;

      // חג - לפי סוג
      if (holiday) {
        if (holiday.type === 'no-work') return;
        if (holiday.type === 'morning-only' && shift.id !== 'morning') return;
      }

      allShifts.push({ day, shiftId: shift.id, date });
    });
  }

  // סינון עובדים פעילים
  const activeEmployees = employees.filter(emp => emp.isActive);

  if (activeEmployees.length === 0) {
    return null;
  }

  // בדיקת זמינויות מינימליות
  activeEmployees.forEach(emp => {
    const avail = availabilityMap.get(emp.id);
    if (!avail) {
      warnings.push(`העובד ${emp.name} לא הגיש זמינות`);
      return;
    }

    let availableCount = 0;
    allShifts.forEach(({ day, shiftId, date }) => {
      if (isEmployeeAvailable(emp.id, day, shiftId, avail, vacationMap, date)) {
        availableCount++;
      }
    });

    if (availableCount < 3) {
      warnings.push(`העובד ${emp.name} הגיש רק ${availableCount} משמרות זמינות (פחות מ-3)`);
    }
  });

  // מיפוי משמרות מוקפאות - אלו יישארו קבועות
  const frozenShifts = new Map<string, string>(); // key: "day_shiftId", value: employeeId
  if (frozenAssignments && existingSchedule?.assignments) {
    Object.keys(frozenAssignments).forEach(dayStr => {
      const dayFrozen = frozenAssignments[dayStr];
      if (dayFrozen) {
        Object.keys(dayFrozen).forEach(shiftId => {
          if (dayFrozen[shiftId]) {
            const employeeId = existingSchedule.assignments?.[dayStr]?.[shiftId];
            if (employeeId) {
              frozenShifts.set(`${dayStr}_${shiftId}`, employeeId);
              console.log(`[Scheduler] Frozen shift: day ${dayStr}, shift ${shiftId}, employee ${employeeId}`);
            }
          }
        });
      }
    });
  }

  // ניסיון ראשון: OR-Tools CP-SAT solver
  try {
    console.log('[Scheduler] Attempting optimization with OR-Tools...');

    const ortoolsInput = {
      employees: activeEmployees,
      availabilities,
      vacations,
      holidays,
      weekStart
    };

    const ortoolsResult = await solveWithORTools(ortoolsInput, 60000);

    if (ortoolsResult.success && ortoolsResult.result.assignments) {
      console.log('[Scheduler] OR-Tools optimization succeeded!');

      // המרת פורמט assignments (מספרים ל-strings)
      const convertedAssignments: ShiftAssignment = {};
      for (const [day, shifts] of Object.entries(ortoolsResult.result.assignments)) {
        convertedAssignments[day] = shifts;
      }

      // שמירת משמרות מוקפאות - דריסת התוצאה של OR-Tools
      frozenShifts.forEach((employeeId, key) => {
        const [dayStr, shiftId] = key.split('_');
        if (!convertedAssignments[dayStr]) {
          convertedAssignments[dayStr] = {};
        }
        convertedAssignments[dayStr][shiftId] = employeeId;
        console.log(`[Scheduler] Preserving frozen assignment: day ${dayStr}, shift ${shiftId}, employee ${employeeId}`);
      });

      // בדיקת התנגשויות עם משמרות מוקפאות והסרת שיבוצים בעייתיים
      frozenShifts.forEach((frozenEmployeeId, key) => {
        const [dayStr, frozenShiftId] = key.split('_');
        const day = parseInt(dayStr);

        // אסור שתי משמרות באותו יום - הסר כל שיבוץ אחר של אותו עובד באותו יום
        if (convertedAssignments[dayStr]) {
          const shiftsInDay = ['morning', 'evening', 'night'];
          shiftsInDay.forEach(shiftId => {
            if (shiftId !== frozenShiftId && convertedAssignments[dayStr][shiftId] === frozenEmployeeId) {
              console.log(`[Scheduler] Removing conflicting ${shiftId} assignment for ${frozenEmployeeId} on day ${dayStr} (same day as frozen ${frozenShiftId})`);
              convertedAssignments[dayStr][shiftId] = null;
            }
          });
        }

        // אם יש לילה מוקפא, בדוק שאותו עובד לא משובץ לבוקר למחרת (רק בוקר - ערב מותר!)
        if (frozenShiftId === 'night' && day < 5) {
          const nextDay = (day + 1).toString();
          if (convertedAssignments[nextDay]) {
            if (convertedAssignments[nextDay]['morning'] === frozenEmployeeId) {
              console.log(`[Scheduler] Removing conflicting morning assignment for ${frozenEmployeeId} on day ${nextDay} (after frozen night)`);
              convertedAssignments[nextDay]['morning'] = null;
            }
          }
        }

        // אם יש בוקר מוקפא, בדוק שאותו עובד לא משובץ ללילה אתמול (רק בוקר - ערב מותר אחרי לילה!)
        if (frozenShiftId === 'morning' && day > 0) {
          const prevDay = (day - 1).toString();
          if (convertedAssignments[prevDay] && convertedAssignments[prevDay]['night'] === frozenEmployeeId) {
            console.log(`[Scheduler] Removing conflicting night assignment for ${frozenEmployeeId} on day ${prevDay} (before frozen morning)`);
            convertedAssignments[prevDay]['night'] = null;
          }
        }
      });

      // הוספת אזהרות מ-OR-Tools
      if (ortoolsResult.result.stats) {
        const ortoolsWarnings = generateWarningsFromStats(ortoolsResult.result.stats, activeEmployees);
        warnings.push(...ortoolsWarnings);
      }

      return {
        assignments: convertedAssignments,
        warnings,
        frozenAssignments
      };
    } else {
      console.warn('[Scheduler] OR-Tools failed:', ortoolsResult.result.message);
      warnings.push('⚠️ האלגוריתם המתקדם נכשל, משתמש באלגוריתם חלופי');
    }
  } catch (error) {
    console.error('[Scheduler] OR-Tools error:', error);
    warnings.push('⚠️ שגיאה באלגוריתם המתקדם, משתמש באלגוריתם חלופי');
  }

  // Fallback: אלגוריתם greedy מקורי
  console.log('[Scheduler] Falling back to greedy algorithm...');
  const result = optimizeSchedule(
    activeEmployees,
    allShifts,
    availabilityMap,
    vacationMap,
    frozenShifts
  );

  if (!result) {
    return null;
  }

  // בדיקות איכות ואזהרות
  const qualityWarnings = analyzeScheduleQuality(result.assignments, activeEmployees, availabilityMap);
  warnings.push(...qualityWarnings);

  return {
    assignments: result.assignments,
    warnings,
    frozenAssignments
  };
}

/**
 * אלגוריתם אופטימיזציה ראשי
 */
function optimizeSchedule(
  employees: UserData[],
  allShifts: Array<{ day: number; shiftId: string; date: string }>,
  availabilityMap: Map<string, AvailabilityData>,
  vacationMap: Map<string, Set<string>>,
  frozenShifts: Map<string, string> = new Map()
): { assignments: ShiftAssignment; score: number } | null {

  // אתחול assignments
  const assignments: ShiftAssignment = {};
  for (let day = 0; day < 6; day++) {
    assignments[day] = {};
    SHIFTS.forEach(shift => {
      assignments[day][shift.id] = null;
    });
  }

  // מילוי משמרות מוקפאות תחילה
  frozenShifts.forEach((employeeId, key) => {
    const [dayStr, shiftId] = key.split('_');
    const day = parseInt(dayStr);
    if (assignments[day]) {
      assignments[day][shiftId] = employeeId;
      console.log(`[Greedy] Pre-assigned frozen shift: day ${day}, shift ${shiftId}, employee ${employeeId}`);
    }
  });

  // ניסיונות מרובים למציאת פתרון אופטימלי
  const maxAttempts = 50;
  let bestAssignments: ShiftAssignment | null = null;
  let bestScore = Infinity;

  console.log(`Starting optimization with ${employees.length} employees and ${allShifts.length} shifts (${frozenShifts.size} frozen)`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptAssignments = JSON.parse(JSON.stringify(assignments));
    const employeeShiftCounts = new Map<string, EmployeeShiftCounts>();

    employees.forEach(emp => {
      employeeShiftCounts.set(emp.id, { morning: 0, evening: 0, night: 0, total: 0, eightToEightCount: 0 });
    });

    // עדכון ספירות למשמרות מוקפאות
    frozenShifts.forEach((employeeId, key) => {
      const [, shiftId] = key.split('_');
      const counts = employeeShiftCounts.get(employeeId);
      if (counts) {
        counts.total++;
        if (shiftId === 'morning') counts.morning++;
        else if (shiftId === 'evening') counts.evening++;
        else if (shiftId === 'night') counts.night++;
      }
    });

    // סינון משמרות שאינן מוקפאות
    const unfrozenShifts = allShifts.filter(({ day, shiftId }) => !frozenShifts.has(`${day}_${shiftId}`));

    // סידור משמרות לפי עדיפות: בוקר → ערב → לילה
    const sortedShifts = [...unfrozenShifts].sort((a, b) => {
      const shiftOrder: { [key: string]: number } = { 'morning': 1, 'evening': 2, 'night': 3 };
      if (shiftOrder[a.shiftId] !== shiftOrder[b.shiftId]) {
        return shiftOrder[a.shiftId] - shiftOrder[b.shiftId];
      }
      // בתוך אותו סוג משמרת - אקראי
      return Math.random() - 0.5;
    });

    let failed = false;
    for (const { day, shiftId, date } of sortedShifts) {
      // בניית רשימת מועמדים זמינים
      const candidates = employees.filter(emp => {
        // בדיקת זמינות בסיסית
        const avail = availabilityMap.get(emp.id);
        if (!isEmployeeAvailable(emp.id, day, shiftId, avail, vacationMap, date)) {
          return false;
        }

        // אסור שתי משמרות באותו יום
        const assignmentsInDay = Object.values(attemptAssignments[day]);
        if (assignmentsInDay.includes(emp.id)) {
          return false;
        }

        // אסור בוקר אחרי לילה (לילה ביום X -> בוקר ביום X+1)
        if (shiftId === 'morning' && day > 0) {
          const prevDayNight = attemptAssignments[day - 1]['night'];
          if (prevDayNight === emp.id) {
            return false;
          }
        }

        // אסור לילה לפני בוקר (לילה ביום X -> בוקר ביום X+1)
        if (shiftId === 'night' && day < 5) {
          const nextDayMorning = attemptAssignments[day + 1]?.['morning'];
          if (nextDayMorning === emp.id) {
            return false;
          }
        }

        // בדיקת 8-8: אם העובד כבר היה לו משמרת 8-8 השבוע - נסנן אותו (אלא אם אין ברירה)
        const counts = employeeShiftCounts.get(emp.id)!;
        if (counts.eightToEightCount >= 1) {
          // כבר היה לו 8-8 השבוע - נסנן (אבל לא נחסום לגמרי - האלגוריתם יבדוק אם אין ברירה)
          if (day > 0) {
            const prevEvening = attemptAssignments[day - 1]['evening'];
            const prevNight = attemptAssignments[day - 1]['night'];

            // אם המשמרת הנוכחית תיצור 8-8 נוסף - נסנן
            if (shiftId === 'morning' && prevEvening === emp.id) return false;
            if (shiftId === 'evening' && prevNight === emp.id) return false;
          }
        }

        return true;
      });

      if (candidates.length === 0) {
        // אין מועמדים זמינים - נשאיר את המשמרת ריקה אבל נמשיך
        attemptAssignments[day][shiftId] = null;
        continue; // לא נכשל, פשוט נמשיך למשמרת הבאה
      }

      // בחירת המועמד הטוב ביותר
      const selected = selectBestCandidate(
        candidates,
        day,
        shiftId,
        employeeShiftCounts,
        attemptAssignments,
        employees
      );

      // הקצאה
      attemptAssignments[day][shiftId] = selected.id;

      const counts = employeeShiftCounts.get(selected.id)!;
      counts.total++;
      if (shiftId === 'morning') counts.morning++;
      else if (shiftId === 'evening') counts.evening++;
      else if (shiftId === 'night') counts.night++;

      // בדיקה אם נוצרה משמרת 8-8 - עדכון המונה
      if (day > 0) {
        const prevEvening = attemptAssignments[day - 1]['evening'];
        const prevNight = attemptAssignments[day - 1]['night'];

        if (shiftId === 'morning' && prevEvening === selected.id) {
          counts.eightToEightCount++;
        }
        if (shiftId === 'evening' && prevNight === selected.id) {
          counts.eightToEightCount++;
        }
      }
    }

    // חישוב ציון
    const score = calculateOptimizationScore(attemptAssignments, employees, employeeShiftCounts);

    if (score < bestScore) {
      bestScore = score;
      bestAssignments = attemptAssignments;
    }

    // פתרון מושלם
    if (score === 0) {
      break;
    }
  }

  if (!bestAssignments) {
    console.log('Optimization failed: No valid assignment found');
    return null;
  }

  console.log(`Optimization succeeded! Best score: ${bestScore}`);
  return {
    assignments: bestAssignments,
    score: bestScore
  };
}

/**
 * בוחר את המועמד הטוב ביותר למשמרת
 */
function selectBestCandidate(
  candidates: UserData[],
  day: number,
  shiftId: string,
  employeeShiftCounts: Map<string, EmployeeShiftCounts>,
  currentAssignments: ShiftAssignment,
  allEmployees: UserData[]
): UserData {

  const scores = candidates.map(emp => {
    const counts = employeeShiftCounts.get(emp.id)!;
    let score = 0;

    // בונוס ענק לעובדים עם פחות משמרות (הוגנות)
    const avgShifts = Array.from(employeeShiftCounts.values()).reduce((sum, c) => sum + c.total, 0) / allEmployees.length;
    if (counts.total < avgShifts) {
      score -= (avgShifts - counts.total) * 500;
    }

    // בונוס גדול לעובדים ללא משמרת בוקר
    if (shiftId === 'morning' && counts.morning === 0) {
      score -= 1000;
    }

    // בונוס לאיזון סוג משמרות
    const avgMorning = Array.from(employeeShiftCounts.values()).reduce((sum, c) => sum + c.morning, 0) / allEmployees.length;
    const avgEvening = Array.from(employeeShiftCounts.values()).reduce((sum, c) => sum + c.evening, 0) / allEmployees.length;
    const avgNight = Array.from(employeeShiftCounts.values()).reduce((sum, c) => sum + c.night, 0) / allEmployees.length;

    if (shiftId === 'morning' && counts.morning < avgMorning) score -= 300;
    else if (shiftId === 'evening' && counts.evening < avgEvening) score -= 300;
    else if (shiftId === 'night' && counts.night < avgNight) score -= 300;

    // קנס חזק יותר על משמרות 8-8 + בונוס למי שעדיין לא היה לו
    if (day > 0) {
      const prevEvening = currentAssignments[day - 1]['evening'];
      const prevNight = currentAssignments[day - 1]['night'];

      if (shiftId === 'morning' && prevEvening === emp.id) {
        score += 200; // קנס חזק יותר
      }
      if (shiftId === 'evening' && prevNight === emp.id) {
        score += 200; // קנס חזק יותר
      }

      // בונוס גדול למי שעדיין לא היה לו 8-8
      if (counts.eightToEightCount === 0) {
        score -= 150;
      }
    }

    // רנדומיזציה קלה
    score += Math.random() * 5;

    return { emp, score };
  });

  scores.sort((a, b) => a.score - b.score);
  return scores[0].emp;
}

/**
 * מחשב ציון אופטימיזציה
 */
function calculateOptimizationScore(
  assignments: ShiftAssignment,
  employees: UserData[],
  employeeShiftCounts: Map<string, EmployeeShiftCounts>
): number {
  let score = 0;

  // קנס על משמרות לא מאוישות
  Object.keys(assignments).forEach(dayStr => {
    Object.keys(assignments[parseInt(dayStr)]).forEach(shiftId => {
      if (!assignments[parseInt(dayStr)][shiftId]) {
        score += 10000;
      }
    });
  });

  // קנס על חוסר הוגנות
  const totals = Array.from(employeeShiftCounts.values()).map(c => c.total);
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const fairnessGap = max - min;

  if (fairnessGap > 2) score += fairnessGap * 1000;
  else if (fairnessGap > 1) score += fairnessGap * 500;
  else score += fairnessGap * 100;

  // קנס על עובדים ללא בוקר
  employees.forEach(emp => {
    const counts = employeeShiftCounts.get(emp.id)!;
    if (counts.morning === 0) {
      score += 2000;
    }
  });

  // קנס קל על פחות מ-3 משמרות (soft constraint - רצוי אבל לא חובה)
  // במקרים של חגים או מעט הגשות זה OK
  const totalShifts = Object.keys(assignments).reduce((sum, day) => {
    return sum + Object.keys(assignments[parseInt(day)]).length;
  }, 0);
  const avgShiftsPerEmployee = totalShifts / employees.length;

  employees.forEach(emp => {
    const counts = employeeShiftCounts.get(emp.id)!;
    // רק אם יש מספיק משמרות לחלק (יותר מ-3 למשתמש בממוצע)
    if (avgShiftsPerEmployee >= 3 && counts.total < 3) {
      score += (3 - counts.total) * 400; // קנס קטן יותר - soft constraint
    }
  });

  // קנס על חוסר איזון בסוג משמרות
  const morningTotals = Array.from(employeeShiftCounts.values()).map(c => c.morning);
  const eveningTotals = Array.from(employeeShiftCounts.values()).map(c => c.evening);
  const nightTotals = Array.from(employeeShiftCounts.values()).map(c => c.night);

  const morningRange = Math.max(...morningTotals) - Math.min(...morningTotals);
  const eveningRange = Math.max(...eveningTotals) - Math.min(...eveningTotals);
  const nightRange = Math.max(...nightTotals) - Math.min(...nightTotals);

  score += (morningRange + eveningRange + nightRange) * 80;

  // קנס על משמרות 8-8
  employees.forEach(emp => {
    for (let day = 0; day < 5; day++) {
      const eveningToday = assignments[day]['evening'];
      const morningNext = assignments[day + 1]?.['morning'];
      if (eveningToday === emp.id && morningNext === emp.id) {
        score += 30;
      }

      const nightToday = assignments[day]['night'];
      const eveningNext = assignments[day + 1]?.['evening'];
      if (nightToday === emp.id && eveningNext === emp.id) {
        score += 30;
      }
    }
  });

  return score;
}

/**
 * בדיקה אם עובד זמין למשמרת
 */
function isEmployeeAvailable(
  employeeId: string,
  day: number,
  shiftId: string,
  availability: AvailabilityData | undefined,
  vacationMap: Map<string, Set<string>>,
  date?: string
): boolean {
  // בדיקת חופשה - אם העובד בחופשה בתאריך הזה, הוא לא זמין
  if (date && vacationMap.has(employeeId)) {
    const employeeVacations = vacationMap.get(employeeId)!;
    if (employeeVacations.has(date)) {
      return false;
    }
  }

  // אם אין availability - ברירת מחדל זמין
  if (!availability) {
    return true;
  }

  // בדיקת זמינות
  const dayAvailability = availability.shifts[day.toString()];
  if (!dayAvailability) return true;

  const shiftAvailability = dayAvailability[shiftId];
  if (!shiftAvailability) return true;

  return shiftAvailability.status === 'available';
}

/**
 * מחשב תאריך לפי יום בשבוע
 */
function getDateForDay(weekStart: string, day: number): string {
  const startDate = parseLocalDate(weekStart);
  const date = new Date(startDate);
  date.setDate(date.getDate() + day);
  return formatDate(date);
}

/**
 * מנתח את איכות הסידור ומחזיר אזהרות
 */
function analyzeScheduleQuality(
  assignments: ShiftAssignment,
  employees: UserData[],
  _availabilityMap: Map<string, AvailabilityData>
): string[] {
  const warnings: string[] = [];

  const employeeStats = new Map<string, EmployeeShiftCounts>();
  employees.forEach(emp => {
    employeeStats.set(emp.id, { morning: 0, evening: 0, night: 0, total: 0, eightToEightCount: 0 });
  });

  // ספירת משמרות
  Object.keys(assignments).forEach(dayStr => {
    const day = parseInt(dayStr);
    Object.keys(assignments[day]).forEach(shiftId => {
      const employeeId = assignments[day][shiftId];
      if (employeeId) {
        const stats = employeeStats.get(employeeId);
        if (stats) {
          stats.total++;
          if (shiftId === 'morning') stats.morning++;
          else if (shiftId === 'evening') stats.evening++;
          else if (shiftId === 'night') stats.night++;
        }
      }
    });
  });

  // חישוב סך כל המשמרות
  const totalShifts = Object.keys(assignments).reduce((sum, day) => {
    return sum + Object.values(assignments[parseInt(day)]).filter(emp => emp !== null).length;
  }, 0);
  const avgShiftsPerEmployee = totalShifts / employees.length;

  // בדיקות
  employees.forEach(emp => {
    const stats = employeeStats.get(emp.id)!;

    if (stats.morning === 0 && stats.total > 0) {
      warnings.push(`העובד ${emp.name} לא קיבל משמרת בוקר`);
    }

    // אזהרה על פחות מ-3 רק אם יש מספיק משמרות לחלק
    if (avgShiftsPerEmployee >= 3 && stats.total < 3) {
      warnings.push(`העובד ${emp.name} קיבל רק ${stats.total} משמרות (מומלץ לפחות 3)`);
    }
  });

  // בדיקת הוגנות
  const totals = Array.from(employeeStats.values()).map(s => s.total);
  const max = Math.max(...totals);
  const min = Math.min(...totals);

  if (max - min > 2) {
    warnings.push(`פער משמרות גדול: ${max} לעומת ${min}`);
  }

  // בדיקת משמרות 8-8
  employees.forEach(emp => {
    let count88 = 0;

    for (let day = 0; day < 5; day++) {
      const eveningToday = assignments[day]['evening'];
      const morningNext = assignments[day + 1]?.['morning'];

      if (eveningToday === emp.id && morningNext === emp.id) count88++;

      const nightToday = assignments[day]['night'];
      const eveningNext = assignments[day + 1]?.['evening'];

      if (nightToday === emp.id && eveningNext === emp.id) count88++;
    }

    if (count88 > 1) {
      warnings.push(`העובד ${emp.name} קיבל ${count88} משמרות 8-8 (יותר מהמומלץ)`);
    }
  });

  return warnings;
}
