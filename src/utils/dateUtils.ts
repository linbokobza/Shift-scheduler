export const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Reset time to midnight
  const day = d.getDay();
  const diff = day === 0 ? 0 : -day; // If Sunday (0), stay same day, else go back to Sunday
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() + diff);
  return weekStart;
};

export const getWeekDates = (weekStart: Date): Date[] => {
  const dates = [];
  for (let i = 0; i < 6; i++) { // 6 days: Sunday-Friday
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    dates.push(date);
  }
  return dates;
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateHebrew = (date: Date): string => {
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric'
  });
};

// Parse date string (YYYY-MM-DD) as local date, not UTC
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

// Format date string (YYYY-MM-DD) to Hebrew display
export const formatDateStringHebrew = (dateString: string): string => {
  const date = parseLocalDate(dateString);
  return formatDateHebrew(date);
};

export const isSubmissionDeadlinePassed = (weekStart: Date): boolean => {
  // Calculate deadline for the week that is 2 weeks before the target week
  const twoWeeksBefore = new Date(weekStart);
  twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
  
  const deadline = new Date(twoWeeksBefore);
  deadline.setDate(deadline.getDate() + 2); // Tuesday of 2 weeks before
  deadline.setHours(12, 0, 0, 0);
  
  return new Date() > deadline;
};

export const getSubmissionWeek = (): Date => {
  // Get the week that is 2 weeks from now
  const today = new Date();
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14);
  
  return getWeekStart(twoWeeksFromNow);
};

export const getNextWeek = (currentWeekStart: Date): Date => {
  const nextWeek = new Date(currentWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek;
};

export const getPreviousWeek = (currentWeekStart: Date): Date => {
  const previousWeek = new Date(currentWeekStart);
  previousWeek.setDate(previousWeek.getDate() - 7);
  return previousWeek;
};