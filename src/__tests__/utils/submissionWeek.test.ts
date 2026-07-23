import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSubmissionWeek, isSubmissionDeadlinePassed, formatDate } from '../../utils/dateUtils';

describe('getSubmissionWeek deadline cutoff (Tuesday 12:00)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Reference week: Sunday Aug 2, 2026 - Saturday Aug 8, 2026.
  // Its submission deadline is Tuesday Jul 21, 2026 at 12:00 (12 days before week start).
  const currentOpenWeek = '2026-08-02';
  const nextWeek = '2026-08-09';

  it('Monday before the deadline: shows the current open week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20, 9, 0, 0)); // Mon Jul 20, 2026 09:00

    const week = getSubmissionWeek();
    expect(formatDate(week)).toBe(currentOpenWeek);
    expect(isSubmissionDeadlinePassed(week)).toBe(false);
  });

  it('Tuesday 11:59: still shows the current open week (not yet closed)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 21, 11, 59, 0)); // Tue Jul 21, 2026 11:59

    const week = getSubmissionWeek();
    expect(formatDate(week)).toBe(currentOpenWeek);
    expect(isSubmissionDeadlinePassed(week)).toBe(false);
  });

  it('Tuesday 12:00:00 exactly: immediately switches to next week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 21, 12, 0, 0)); // Tue Jul 21, 2026 12:00:00

    const week = getSubmissionWeek();
    expect(formatDate(week)).toBe(nextWeek);
    expect(isSubmissionDeadlinePassed(week)).toBe(false);
  });

  it('Friday after the cutoff: shows the week that opened on Tuesday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 24, 9, 0, 0)); // Fri Jul 24, 2026 09:00

    const week = getSubmissionWeek();
    expect(formatDate(week)).toBe(nextWeek);
    expect(isSubmissionDeadlinePassed(week)).toBe(false);
  });
});
