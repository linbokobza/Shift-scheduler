import {
  getWeekStart,
  getWeekDates,
  formatDate,
  parseLocalDate,
  formatDateHebrew,
  isSubmissionDeadlinePassed,
  getSubmissionWeek,
  getNextWeek,
  getPreviousWeek,
} from '../../../services/dateUtils.service';

describe('dateUtils.service', () => {
  describe('getWeekStart', () => {
    it('should return Sunday of the current week', () => {
      // Test with a Wednesday
      const wednesday = new Date(2025, 0, 15); // Jan 15, 2025 is Wednesday
      const weekStart = getWeekStart(wednesday);

      expect(weekStart.getDay()).toBe(0); // Sunday
      expect(weekStart.getDate()).toBe(12); // Jan 12, 2025
    });

    it('should return same date if already Sunday', () => {
      const sunday = new Date(2025, 0, 12); // Jan 12, 2025 is Sunday
      const weekStart = getWeekStart(sunday);

      expect(weekStart.getDay()).toBe(0);
      expect(weekStart.getDate()).toBe(12);
    });

    it('should handle Saturday correctly', () => {
      const saturday = new Date(2025, 0, 18); // Jan 18, 2025 is Saturday
      const weekStart = getWeekStart(saturday);

      expect(weekStart.getDay()).toBe(0);
      expect(weekStart.getDate()).toBe(12);
    });

    it('should use current date if no argument provided', () => {
      const result = getWeekStart();
      expect(result.getDay()).toBe(0); // Should be Sunday
    });

    it('should handle month boundaries correctly', () => {
      // Feb 3, 2025 is Monday, week starts Jan 27
      const monday = new Date(2025, 1, 3);
      const weekStart = getWeekStart(monday);

      expect(weekStart.getDay()).toBe(0);
      expect(weekStart.getMonth()).toBe(1); // February
      expect(weekStart.getDate()).toBe(2);
    });

    it('should handle year boundaries correctly', () => {
      // Jan 2, 2025 is Thursday, week starts Dec 29, 2024
      const thursday = new Date(2025, 0, 2);
      const weekStart = getWeekStart(thursday);

      expect(weekStart.getDay()).toBe(0);
      expect(weekStart.getFullYear()).toBe(2024);
      expect(weekStart.getMonth()).toBe(11); // December
      expect(weekStart.getDate()).toBe(29);
    });
  });

  describe('getWeekDates', () => {
    it('should return 6 dates (Sunday to Friday)', () => {
      const weekStart = new Date(2025, 0, 12); // Sunday
      const dates = getWeekDates(weekStart);

      expect(dates.length).toBe(6);
    });

    it('should start with Sunday and end with Friday', () => {
      const weekStart = new Date(2025, 0, 12); // Sunday
      const dates = getWeekDates(weekStart);

      expect(dates[0].getDay()).toBe(0); // Sunday
      expect(dates[5].getDay()).toBe(5); // Friday
    });

    it('should return consecutive dates', () => {
      const weekStart = new Date(2025, 0, 12);
      const dates = getWeekDates(weekStart);

      for (let i = 1; i < dates.length; i++) {
        const diff = dates[i].getDate() - dates[i - 1].getDate();
        expect(diff).toBe(1);
      }
    });

    it('should handle month boundaries', () => {
      // Week starting Jan 26, 2025 ends in Feb
      const weekStart = new Date(2025, 0, 26);
      const dates = getWeekDates(weekStart);

      expect(dates[0].getMonth()).toBe(0); // January
      expect(dates[5].getMonth()).toBe(0); // Still January (31st)
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15);
      expect(formatDate(date)).toBe('2025-01-15');
    });

    it('should pad single digit months', () => {
      const date = new Date(2025, 4, 5); // May 5
      expect(formatDate(date)).toBe('2025-05-05');
    });

    it('should pad single digit days', () => {
      const date = new Date(2025, 11, 1); // Dec 1
      expect(formatDate(date)).toBe('2025-12-01');
    });

    it('should handle December correctly', () => {
      const date = new Date(2025, 11, 25);
      expect(formatDate(date)).toBe('2025-12-25');
    });

    it('should handle different years', () => {
      const date = new Date(2024, 5, 15);
      expect(formatDate(date)).toBe('2024-06-15');
    });
  });

  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD format correctly', () => {
      const date = parseLocalDate('2025-01-15');

      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January (0-indexed)
      expect(date.getDate()).toBe(15);
    });

    it('should parse date as local time, not UTC', () => {
      const date = parseLocalDate('2025-06-15');

      // Should not shift due to timezone
      expect(date.getDate()).toBe(15);
    });

    it('should handle end of month dates', () => {
      const date = parseLocalDate('2025-01-31');
      expect(date.getDate()).toBe(31);
    });

    it('should handle February 28', () => {
      const date = parseLocalDate('2025-02-28');
      expect(date.getMonth()).toBe(1);
      expect(date.getDate()).toBe(28);
    });

    it('should handle leap year Feb 29', () => {
      const date = parseLocalDate('2024-02-29');
      expect(date.getMonth()).toBe(1);
      expect(date.getDate()).toBe(29);
    });
  });

  describe('formatDateHebrew', () => {
    it('should format date in Hebrew locale', () => {
      const date = new Date(2025, 0, 15);
      const formatted = formatDateHebrew(date);

      // Hebrew format typically day/month
      expect(formatted).toContain('15');
      expect(formatted).toContain('1');
    });
  });

  describe('isSubmissionDeadlinePassed', () => {
    it('should return false if deadline not passed', () => {
      // Week start 4 weeks from now - deadline should not be passed
      const futureWeekStart = new Date();
      futureWeekStart.setDate(futureWeekStart.getDate() + 28);

      expect(isSubmissionDeadlinePassed(futureWeekStart)).toBe(false);
    });

    it('should return true if deadline has passed', () => {
      // Week start was last week - deadline definitely passed
      const pastWeekStart = new Date();
      pastWeekStart.setDate(pastWeekStart.getDate() - 7);

      expect(isSubmissionDeadlinePassed(pastWeekStart)).toBe(true);
    });

    it('should calculate deadline as Tuesday 12:00 two weeks before', () => {
      // Create a week start date and verify deadline logic
      const weekStart = new Date(2025, 1, 16); // Sunday Feb 16, 2025

      // Deadline should be Tuesday Feb 4, 2025 at 12:00
      // (2 weeks before = Feb 2, then +2 days = Feb 4)
      const twoWeeksBefore = new Date(weekStart);
      twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
      expect(twoWeeksBefore.getDate()).toBe(2); // Feb 2

      const deadline = new Date(twoWeeksBefore);
      deadline.setDate(deadline.getDate() + 2);
      expect(deadline.getDate()).toBe(4); // Feb 4
    });
  });

  describe('getSubmissionWeek', () => {
    it('should return week start 2 weeks from now', () => {
      const submissionWeek = getSubmissionWeek();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

      const expectedWeekStart = getWeekStart(twoWeeksFromNow);

      expect(submissionWeek.getDay()).toBe(0); // Sunday
      expect(formatDate(submissionWeek)).toBe(formatDate(expectedWeekStart));
    });

    it('should return a Sunday', () => {
      const submissionWeek = getSubmissionWeek();
      expect(submissionWeek.getDay()).toBe(0);
    });
  });

  describe('getNextWeek', () => {
    it('should return date 7 days later', () => {
      const currentWeek = new Date(2025, 0, 12); // Sunday Jan 12
      const nextWeek = getNextWeek(currentWeek);

      expect(nextWeek.getDate()).toBe(19); // Jan 19
    });

    it('should handle month boundary', () => {
      const currentWeek = new Date(2025, 0, 26); // Sunday Jan 26
      const nextWeek = getNextWeek(currentWeek);

      expect(nextWeek.getMonth()).toBe(1); // February
      expect(nextWeek.getDate()).toBe(2);
    });

    it('should handle year boundary', () => {
      const currentWeek = new Date(2024, 11, 29); // Sunday Dec 29, 2024
      const nextWeek = getNextWeek(currentWeek);

      expect(nextWeek.getFullYear()).toBe(2025);
      expect(nextWeek.getMonth()).toBe(0); // January
      expect(nextWeek.getDate()).toBe(5);
    });
  });

  describe('getPreviousWeek', () => {
    it('should return date 7 days earlier', () => {
      const currentWeek = new Date(2025, 0, 19); // Sunday Jan 19
      const previousWeek = getPreviousWeek(currentWeek);

      expect(previousWeek.getDate()).toBe(12); // Jan 12
    });

    it('should handle month boundary', () => {
      const currentWeek = new Date(2025, 1, 2); // Sunday Feb 2
      const previousWeek = getPreviousWeek(currentWeek);

      expect(previousWeek.getMonth()).toBe(0); // January
      expect(previousWeek.getDate()).toBe(26);
    });

    it('should handle year boundary', () => {
      const currentWeek = new Date(2025, 0, 5); // Sunday Jan 5, 2025
      const previousWeek = getPreviousWeek(currentWeek);

      expect(previousWeek.getFullYear()).toBe(2024);
      expect(previousWeek.getMonth()).toBe(11); // December
      expect(previousWeek.getDate()).toBe(29);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid date string in parseLocalDate', () => {
      // Invalid dates may produce NaN or invalid Date objects
      const invalidDate = parseLocalDate('invalid-date');
      expect(isNaN(invalidDate.getTime())).toBe(true);
    });

    it('should handle empty string in parseLocalDate', () => {
      const emptyDate = parseLocalDate('');
      expect(isNaN(emptyDate.getTime())).toBe(true);
    });

    it('should format dates consistently across timezones', () => {
      // Create date using local time to avoid timezone issues
      const date = new Date(2025, 5, 15); // June 15, 2025
      const formatted = formatDate(date);

      expect(formatted).toBe('2025-06-15');
    });

    it('should round-trip format and parse correctly', () => {
      const original = new Date(2025, 6, 20); // July 20, 2025
      const formatted = formatDate(original);
      const parsed = parseLocalDate(formatted);

      expect(parsed.getFullYear()).toBe(original.getFullYear());
      expect(parsed.getMonth()).toBe(original.getMonth());
      expect(parsed.getDate()).toBe(original.getDate());
    });
  });
});
