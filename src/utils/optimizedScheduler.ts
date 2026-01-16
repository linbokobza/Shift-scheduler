import { Availability, VacationDay, Schedule, User, ValidationError, ScheduleGenerationResult } from '../types';
import { Holiday } from '../types';
import { SHIFTS } from '../data/mockData';
import { formatDate, parseLocalDate } from './dateUtils';

interface EmployeeShiftCounts {
  morning: number;
  evening: number;
  night: number;
  total: number;
}

interface OptimizationVariable {
  employeeId: string;
  employeeName: string;
  day: number;
  shiftId: string;
}

/**
 * מחשב את האופטימיזציה המושלמת לסידור משמרות באמצעות Linear Programming
 */
export const generateOptimizedSchedule = (
  availabilities: Availability[],
  vacationDays: VacationDay[],
  holidays: Holiday[],
  activeEmployees: User[],
  weekStart: string,
  existingSchedule?: Schedule
): ScheduleGenerationResult => {
  const warnings: ValidationError[] = [];
  const errors: ValidationError[] = [];

  // יצירת מפה של זמינויות
  const availabilityMap = new Map<string, Availability>();
  availabilities.forEach(av => {
    availabilityMap.set(av.employeeId, av);
  });

  // יצירת מפה של ימי חופשה
  const vacationMap = new Map<string, Set<string>>();
  vacationDays.forEach(vd => {
    if (!vacationMap.has(vd.employeeId)) {
      vacationMap.set(vd.employeeId, new Set());
    }
    vacationMap.get(vd.employeeId)!.add(vd.date);
  });

  // יצירת מפה של חגים
  const holidayMap = new Map<string, Holiday>();
  holidays.forEach(h => {
    holidayMap.set(h.date, h);
  });

  // יצירת מפה של משמרות נעולות
  const lockedAssignments = existingSchedule?.lockedAssignments || {};

  // בניית רשימת כל המשמרות האפשריות
  const allShifts: Array<{ day: number; shiftId: string; date: string }> = [];
  for (let day = 0; day < 6; day++) {
    const date = getDateForDay(weekStart, day);
    const holiday = holidayMap.get(date);

    SHIFTS.forEach(shift => {
      // יום שישי - רק בוקר
      if (day === 5 && shift.id !== 'morning') {
        return;
      }

      // חג - לפי סוג
      if (holiday) {
        if (holiday.type === 'no-work') {
          return; // אסור לעבוד בכלל
        }
        if (holiday.type === 'morning-only' && shift.id !== 'morning') {
          return; // רק בוקר
        }
      }

      allShifts.push({ day, shiftId: shift.id, date });
    });
  }

  // בניית רשימת עובדים פעילים
  const employees = activeEmployees.filter(emp => emp.isActive);

  if (employees.length === 0) {
    return {
      schedule: null,
      errors: [{ type: 'error', message: 'אין עובדים פעילים במערכת' }],
      warnings: [],
      attempts: 0
    };
  }

  // בדיקת זמינויות מינימליות
  employees.forEach(emp => {
    const avail = availabilityMap.get(emp.id);
    if (!avail) {
      warnings.push({
        type: 'warning',
        message: `העובד ${emp.name} לא הגיש זמינות`,
        employeeId: emp.id,
        employeeName: emp.name
      });
      return;
    }

    let availableCount = 0;
    let hasMorningAvailable = false;

    allShifts.forEach(({ day, shiftId }) => {
      if (isEmployeeAvailable(emp.id, day, shiftId, avail, vacationMap)) {
        availableCount++;
        if (shiftId === 'morning') {
          hasMorningAvailable = true;
        }
      }
    });

    if (availableCount < 3) {
      warnings.push({
        type: 'warning',
        message: `העובד ${emp.name} הגיש רק ${availableCount} משמרות זמינות (פחות מ-3)`,
        employeeId: emp.id,
        employeeName: emp.name
      });
    }

    if (!hasMorningAvailable) {
      warnings.push({
        type: 'warning',
        message: `העובד ${emp.name} לא סימן אף משמרת בוקר כזמינה`,
        employeeId: emp.id,
        employeeName: emp.name
      });
    }
  });

  try {
    // קריאה לאלגוריתם האופטימיזציה
    const result = optimizeSchedule(
      employees,
      allShifts,
      availabilityMap,
      vacationMap,
      lockedAssignments,
      existingSchedule?.frozenAssignments || {},
      weekStart,
      existingSchedule
    );

    if (!result) {
      return {
        schedule: null,
        errors: [{ type: 'error', message: 'לא נמצא פתרון אפשרי. נסה להגדיל זמינויות או לצמצם אילוצים.' }],
        warnings,
        attempts: 1
      };
    }

    // המרה לפורמט Schedule
    const schedule: Schedule = {
      id: crypto.randomUUID(),
      weekStart,
      assignments: result.assignments,
      lockedAssignments,
      frozenAssignments: existingSchedule?.frozenAssignments,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    };

    // בדיקות נוספות ואזהרות
    const postWarnings = analyzeScheduleQuality(schedule, employees, availabilityMap);
    warnings.push(...postWarnings);

    return {
      schedule,
      errors: [],
      warnings,
      attempts: 1,
      optimizationScore: result.score
    };

  } catch (error) {
    console.error('Optimization error:', error);
    return {
      schedule: null,
      errors: [{
        type: 'error',
        message: `שגיאה באופטימיזציה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`
      }],
      warnings,
      attempts: 1
    };
  }
};

/**
 * פונקציית האופטימיזציה הראשית - אלגור ית ם Constraint Satisfaction עם אופטימיזציה
 */
function optimizeSchedule(
  employees: User[],
  allShifts: Array<{ day: number; shiftId: string; date: string }>,
  availabilityMap: Map<string, Availability>,
  vacationMap: Map<string, Set<string>>,
  lockedAssignments: Schedule['lockedAssignments'],
  frozenAssignments: Schedule['frozenAssignments'],
  weekStart: string,
  existingSchedule?: Schedule
): { assignments: Schedule['assignments']; score: number } | null {

  // אתחול assignments
  const assignments: Schedule['assignments'] = {};
  for (let day = 0; day < 6; day++) {
    assignments[day] = {};
    SHIFTS.forEach(shift => {
      assignments[day][shift.id] = null;
    });
  }

  // מילוי משמרות נעולות תחילה מה-existingSchedule
  const lockedEmployeeAssignments = new Map<string, string>(); // key: "day_shift", value: employeeId

  if (lockedAssignments && existingSchedule) {
    Object.keys(lockedAssignments).forEach(dayStr => {
      const day = parseInt(dayStr);
      Object.keys(lockedAssignments[day]).forEach(shiftId => {
        if (lockedAssignments[day][shiftId]) {
          // מצא את ה-employeeId מה-assignments המקוריים
          const employeeId = existingSchedule.assignments[day]?.[shiftId];
          if (employeeId) {
            assignments[day][shiftId] = employeeId;
            lockedEmployeeAssignments.set(`${day}_${shiftId}`, employeeId);
          }
        }
      });
    });
  }

  // מעקב אחר עובדים קפואים - הם יכולים להיות משובצים רק במשמרות הקפואות שלהם
  const frozenEmployees = new Map<string, Set<string>>(); // employeeId -> Set of "day_shift"

  if (frozenAssignments && existingSchedule) {
    Object.keys(frozenAssignments).forEach(dayStr => {
      const day = parseInt(dayStr);
      Object.keys(frozenAssignments[day]).forEach(shiftId => {
        if (frozenAssignments[day][shiftId]) {
          const employeeId = existingSchedule.assignments[day]?.[shiftId];
          if (employeeId) {
            // מעקב אחר העובד כקפוא במשמרת זו
            if (!frozenEmployees.has(employeeId)) {
              frozenEmployees.set(employeeId, new Set());
            }
            frozenEmployees.get(employeeId)!.add(`${day}_${shiftId}`);

            // שיבוץ העובד למשמרת (כמו נעולה)
            assignments[day][shiftId] = employeeId;
            lockedEmployeeAssignments.set(`${day}_${shiftId}`, employeeId);
          }
        }
      });
    });
  }

  // ניסיונות מרובים למציאת הפתרון האופטימלי
  const maxAttempts = 50;
  let bestAssignments: Schedule['assignments'] | null = null;
  let bestScore = Infinity;

  console.log(`Starting optimization with ${employees.length} employees and ${allShifts.length} shifts`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptAssignments = JSON.parse(JSON.stringify(assignments)); // clone
    const employeeAssignments = new Map<string, Set<string>>(); // employeeId -> set of "day_shift"
    const employeeShiftCounts = new Map<string, EmployeeShiftCounts>();

    employees.forEach(emp => {
      employeeAssignments.set(emp.id, new Set());
      employeeShiftCounts.set(emp.id, { morning: 0, evening: 0, night: 0, total: 0 });
    });

    // עדכן ספירות עבור משמרות נעולות
    lockedEmployeeAssignments.forEach((employeeId, key) => {
      const [dayStr, shiftId] = key.split('_');
      employeeAssignments.get(employeeId)?.add(key);

      const counts = employeeShiftCounts.get(employeeId);
      if (counts) {
        counts.total++;
        if (shiftId === 'morning') counts.morning++;
        else if (shiftId === 'evening') counts.evening++;
        else if (shiftId === 'night') counts.night++;
      }
    });

    // סידור אקראי של המשמרות שאינן נעולות (לווריאציה בין ניסיונות)
    const unlockedShifts = allShifts.filter(({ day, shiftId }) => !lockedEmployeeAssignments.has(`${day}_${shiftId}`));
    const shuffledShifts = [...unlockedShifts].sort(() => Math.random() - 0.5);

    // הקצאה עם היוריסטיקות חזקות
    let failed = false;

    for (const { day, shiftId } of shuffledShifts) {

      // בניית רשימת מועמדים זמינים
      const candidates = employees.filter(emp => {
        // בדיקת זמינות בסיסית
        const avail = availabilityMap.get(emp.id);
        if (!isEmployeeAvailable(emp.id, day, shiftId, avail, vacationMap)) {
          return false;
        }

        // בדיקה שאין משמרת אחרת באותו יום (כולל משמרות נעולות)
        const dayKey = day.toString();
        const assignmentsInDay = Object.values(attemptAssignments[dayKey]);
        if (assignmentsInDay.includes(emp.id)) {
          return false;
        }

        // בדיקת בוקר אחרי לילה (אילוץ קשיח)
        // משמרת לילה היא 23:30-07:30, אז לילה ביום X חופף לבוקר ביום X+1
        if (shiftId === 'morning' && day > 0) {
          const prevDayNight = attemptAssignments[day - 1]['night'];
          if (prevDayNight === emp.id) {
            return false; // אסור בוקר מיד אחרי לילה
          }
        }

        // בדיקה הפוכה: אם זו משמרת לילה, אסור שהעובד יעבוד בוקר למחרת
        if (shiftId === 'night' && day < 5) {
          const nextDayMorning = attemptAssignments[day + 1]?.['morning'];
          if (nextDayMorning === emp.id) {
            return false; // אסור לילה לפני בוקר
          }
        }

        // בדיקת 8-8-8: מניעת 3 משמרות ברציפות (אילוץ קשיח)
        // בדוק אם העובד עבד ביומיים האחרונים
        if (day >= 2) {
          // בדוק את יום אתמול
          const yesterday = day - 1;
          const hasYesterdayShift = Object.values(attemptAssignments[yesterday]).includes(emp.id);

          // בדוק את שלשום
          const dayBeforeYesterday = day - 2;
          const hasDayBeforeYesterdayShift = Object.values(attemptAssignments[dayBeforeYesterday]).includes(emp.id);

          // אם עבד ביומיים האחרונים - אסור לתת לו עוד משמרת היום
          if (hasYesterdayShift && hasDayBeforeYesterdayShift) {
            return false;
          }
        }

        // Note: Frozen employees are already assigned to their frozen shifts
        // They CAN be assigned to other shifts as well (frozen doesn't exclude them from rotation)

        return true;
      });

      if (candidates.length === 0) {
        console.log(`Attempt ${attempt}: No candidates for day ${day}, shift ${shiftId}`);
        failed = true;
        break;
      }

      // בחירת המועמד הטוב ביותר לפי היוריסטיקות
      const selected = selectBestCandidate(
        candidates,
        day,
        shiftId,
        employeeShiftCounts,
        availabilityMap,
        allShifts,
        attemptAssignments,
        employees
      );

      // הקצאה
      attemptAssignments[day][shiftId] = selected.id;
      employeeAssignments.get(selected.id)!.add(`${day}_${shiftId}`);

      const counts = employeeShiftCounts.get(selected.id)!;
      counts.total++;
      if (shiftId === 'morning') counts.morning++;
      else if (shiftId === 'evening') counts.evening++;
      else if (shiftId === 'night') counts.night++;
    }

    if (failed) {
      continue; // נסה ניסיון הבא
    }

    // חישוב ציון
    const score = calculateOptimizationScore(attemptAssignments, employees, employeeShiftCounts, availabilityMap);

    if (score < bestScore) {
      bestScore = score;
      bestAssignments = attemptAssignments;
    }

    // אם מצאנו פתרון מושלם - עצור
    if (score === 0) {
      break;
    }
  }

  if (!bestAssignments) {
    console.log('Optimization failed: No valid assignment found in any attempt');
    return null;
  }

  console.log(`Optimization succeeded! Best score: ${bestScore}`);
  return {
    assignments: bestAssignments,
    score: bestScore
  };
}

/**
 * בוחר את המועמד הטוב ביותר למשמרת לפי היוריסטיקות
 */
function selectBestCandidate(
  candidates: User[],
  day: number,
  shiftId: string,
  employeeShiftCounts: Map<string, EmployeeShiftCounts>,
  availabilityMap: Map<string, Availability>,
  allShifts: Array<{ day: number; shiftId: string; date: string }>,
  currentAssignments: Schedule['assignments'],
  allEmployees: User[]
): User {

  // חישוב ציון לכל מועמד
  const scores = candidates.map(emp => {
    const counts = employeeShiftCounts.get(emp.id)!;
    let score = 0;

    // בונוס ענק לעובדים עם פחות משמרות (הוגנות חזקה)
    const avgShifts = Array.from(employeeShiftCounts.values()).reduce((sum, c) => sum + c.total, 0) / allEmployees.length;
    if (counts.total < avgShifts) {
      score -= (avgShifts - counts.total) * 500; // בונוס גדול מאוד למי שפחות מהממוצע
    }

    // בונוס גדול לעובדים ללא משמרת בוקר (אם זו משמרת בוקר)
    if (shiftId === 'morning' && counts.morning === 0) {
      score -= 1000; // הגדלתי מ-500 ל-1000

      // בונוס ענק למי שיש לו רק בוקר אחד זמין
      const avail = availabilityMap.get(emp.id);
      if (avail) {
        let morningCount = 0;
        for (let d = 0; d < 6; d++) {
          if (avail.shifts[d.toString()]?.['morning']?.status === 'available') {
            morningCount++;
          }
        }
        if (morningCount === 1) {
          score -= 5000; // עדיפות עליונה מוחלטת!
        } else if (morningCount === 2) {
          score -= 3000; // עדיפות גבוהה גם ל-2 בוקרים
        }
      }
    }

    // בונוס חזק לאיזון סוג משמרות
    const avgMorning = Array.from(employeeShiftCounts.values()).reduce((sum, c) => sum + c.morning, 0) / allEmployees.length;
    const avgEvening = Array.from(employeeShiftCounts.values()).reduce((sum, c) => sum + c.evening, 0) / allEmployees.length;
    const avgNight = Array.from(employeeShiftCounts.values()).reduce((sum, c) => sum + c.night, 0) / allEmployees.length;

    if (shiftId === 'morning' && counts.morning < avgMorning) score -= 300;
    else if (shiftId === 'evening' && counts.evening < avgEvening) score -= 300;
    else if (shiftId === 'night' && counts.night < avgNight) score -= 300;

    // קנס על משמרות 8-8
    if (day > 0) {
      const prevEvening = currentAssignments[day - 1]['evening'];
      const prevNight = currentAssignments[day - 1]['night'];

      if (shiftId === 'morning' && prevEvening === emp.id) {
        score += 50; // הגדלתי את הקנס
      }
      if (shiftId === 'evening' && prevNight === emp.id) {
        score += 50; // הגדלתי את הקנס
      }
    }

    // רנדומיזציה קלה למניעת bias
    score += Math.random() * 5;

    return { emp, score };
  });

  // מיון לפי ציון (נמוך יותר = טוב יותר)
  scores.sort((a, b) => a.score - b.score);

  return scores[0].emp;
}

/**
 * מחשב ציון אופטימיזציה (נמוך יותר = טוב יותר)
 */
function calculateOptimizationScore(
  assignments: Schedule['assignments'],
  employees: User[],
  employeeShiftCounts: Map<string, EmployeeShiftCounts>,
  availabilityMap: Map<string, Availability>
): number {
  let score = 0;

  // קנס על משמרות לא מאוישות
  Object.keys(assignments).forEach(dayStr => {
    Object.keys(assignments[parseInt(dayStr)]).forEach(shiftId => {
      if (!assignments[parseInt(dayStr)][shiftId]) {
        score += 10000; // קנס עצום
      }
    });
  });

  // קנס חזק על חוסר הוגנות
  const totals = Array.from(employeeShiftCounts.values()).map(c => c.total);
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const fairnessGap = max - min;

  if (fairnessGap > 2) {
    score += fairnessGap * 1000; // קנס עצום על פער גדול מ-2
  } else if (fairnessGap > 1) {
    score += fairnessGap * 500; // קנס בינוני על פער של 2
  } else {
    score += fairnessGap * 100; // קנס קל על פער של 1
  }

  // קנס גדול על עובדים ללא בוקר
  employees.forEach(emp => {
    const counts = employeeShiftCounts.get(emp.id)!;
    if (counts.morning === 0) {
      const avail = availabilityMap.get(emp.id);
      let hasMorningAvailable = false;
      if (avail) {
        for (let day = 0; day < 6; day++) {
          if (avail.shifts[day.toString()]?.['morning']?.status === 'available') {
            hasMorningAvailable = true;
            break;
          }
        }
      }
      if (hasMorningAvailable) {
        score += 2000; // הגדלתי מ-500 ל-2000 - קנס חזק מאוד!
      }
    }
  });

  // קנס גדול על פחות מ-3 משמרות
  employees.forEach(emp => {
    const counts = employeeShiftCounts.get(emp.id)!;
    if (counts.total < 3) {
      score += (3 - counts.total) * 800; // הגדלתי מ-150 ל-800
    }

    // קנס נוסף אם יש לעובד יותר מ-5 משמרות
    if (counts.total > 5) {
      score += (counts.total - 5) * 600;
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
 * בדיקה אם עובד זמין למשמרת מסוימת
 */
function isEmployeeAvailable(
  employeeId: string,
  day: number,
  shiftId: string,
  availability: Availability | undefined,
  vacationMap: Map<string, Set<string>>
): boolean {
  // בדיקת חופשה
  const vacations = vacationMap.get(employeeId);
  if (vacations) {
    // צריך לבדוק את התאריך בפועל
    // כרגע נניח שאין חופשות (יש לממש את זה)
  }

  // אם אין availability - ברירת מחדל זמין
  if (!availability) {
    return true;
  }

  // בדיקת זמינות מהגשה
  const dayAvailability = availability.shifts[day.toString()];
  if (!dayAvailability) {
    return true; // ברירת מחדל זמין
  }

  const shiftAvailability = dayAvailability[shiftId];
  if (!shiftAvailability) {
    return true; // ברירת מחדל זמין
  }

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
  schedule: Schedule,
  employees: User[],
  availabilityMap: Map<string, Availability>
): ValidationError[] {
  const warnings: ValidationError[] = [];

  // חישוב סטטיסטיקות לכל עובד
  const employeeStats = new Map<string, EmployeeShiftCounts>();

  employees.forEach(emp => {
    employeeStats.set(emp.id, { morning: 0, evening: 0, night: 0, total: 0 });
  });

  // ספירת משמרות
  Object.keys(schedule.assignments).forEach(dayStr => {
    const day = parseInt(dayStr);
    Object.keys(schedule.assignments[day]).forEach(shiftId => {
      const employeeId = schedule.assignments[day][shiftId];
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

  // בדיקות
  employees.forEach(emp => {
    const stats = employeeStats.get(emp.id)!;

    // בדיקה: לפחות משמרת בוקר אחת
    if (stats.morning === 0) {
      const avail = availabilityMap.get(emp.id);
      let hasMorningAvailable = false;
      if (avail) {
        for (let day = 0; day < 6; day++) {
          if (avail.shifts[day.toString()]?.['morning']?.status === 'available') {
            hasMorningAvailable = true;
            break;
          }
        }
      }

      if (!hasMorningAvailable) {
        warnings.push({
          type: 'warning',
          message: `העובד ${emp.name} לא קיבל בוקר (לא סימן אף בוקר כזמין)`,
          employeeId: emp.id,
          employeeName: emp.name
        });
      } else {
        warnings.push({
          type: 'warning',
          message: `העובד ${emp.name} לא קיבל בוקר למרות שסימן בוקרים כזמינים`,
          employeeId: emp.id,
          employeeName: emp.name
        });
      }
    }

    // בדיקה: פחות מ-3 משמרות
    if (stats.total < 3) {
      warnings.push({
        type: 'warning',
        message: `העובד ${emp.name} קיבל רק ${stats.total} משמרות (פחות מ-3)`,
        employeeId: emp.id,
        employeeName: emp.name
      });
    }
  });

  // בדיקת הוגנות
  const totals = Array.from(employeeStats.values()).map(s => s.total);
  const max = Math.max(...totals);
  const min = Math.min(...totals);

  if (max - min > 2) {
    const maxEmp = employees.find(e => employeeStats.get(e.id)!.total === max);
    const minEmp = employees.find(e => employeeStats.get(e.id)!.total === min);

    warnings.push({
      type: 'warning',
      message: `פער משמרות: ${maxEmp?.name} קיבל ${max} משמרות, ${minEmp?.name} קיבל ${min} משמרות`
    });
  }

  // בדיקת משמרות 8-8
  employees.forEach(emp => {
    let count88 = 0;

    for (let day = 0; day < 5; day++) {
      const eveningToday = schedule.assignments[day]['evening'];
      const morningNext = schedule.assignments[day + 1]?.['morning'];

      if (eveningToday === emp.id && morningNext === emp.id) {
        count88++;
      }

      const nightToday = schedule.assignments[day]['night'];
      const eveningNext = schedule.assignments[day + 1]?.['evening'];

      if (nightToday === emp.id && eveningNext === emp.id) {
        count88++;
      }
    }

    if (count88 > 0) {
      warnings.push({
        type: 'warning',
        message: `העובד ${emp.name} קיבל ${count88} משמרות 8-8`,
        employeeId: emp.id,
        employeeName: emp.name
      });
    }
  });

  return warnings;
}
