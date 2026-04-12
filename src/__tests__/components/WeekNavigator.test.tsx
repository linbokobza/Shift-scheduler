import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekNavigator from '../../components/WeekNavigator';

// Mock dateUtils to control formatted date output
vi.mock('../../utils/dateUtils', () => ({
  formatDateHebrew: (date: Date) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  },
  formatDateStringHebrew: (dateStr: string) => dateStr,
}));

// Fixed Sunday January 12, 2025
const FIXED_WEEK_START = new Date(2025, 0, 12); // Sunday

describe('WeekNavigator', () => {
  const mockOnWeekChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNavigator = (overrides: Record<string, any> = {}) =>
    render(
      <WeekNavigator
        currentWeekStart={FIXED_WEEK_START}
        onWeekChange={mockOnWeekChange}
        {...overrides}
      />
    );

  describe('Rendering', () => {
    it('should render the week range with start and end dates', () => {
      renderNavigator();
      // Week start is Jan 12, end is Jan 18 (+6)
      expect(screen.getAllByText(/12\/1\/2025/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/18\/1\/2025/).length).toBeGreaterThan(0);
    });

    it('should render prev-week button with aria-label שבוע קודם', () => {
      renderNavigator();
      const prevBtns = screen.getAllByRole('button', { name: /שבוע קודם/i });
      expect(prevBtns.length).toBeGreaterThan(0);
    });

    it('should render next-week button with aria-label שבוע הבא', () => {
      renderNavigator();
      const nextBtns = screen.getAllByRole('button', { name: /שבוע הבא/i });
      expect(nextBtns.length).toBeGreaterThan(0);
    });

    it('should render "השבוע הנוכחי" button when showNavigator=true', () => {
      renderNavigator();
      expect(screen.getAllByText('השבוע הנוכחי').length).toBeGreaterThan(0);
    });

    it('should not render navigation buttons when showNavigator=false', () => {
      renderNavigator({ showNavigator: false });
      expect(screen.queryAllByRole('button', { name: /שבוע קודם/i })).toHaveLength(0);
      expect(screen.queryAllByRole('button', { name: /שבוע הבא/i })).toHaveLength(0);
    });

    it('should still show week range even when navigator is hidden', () => {
      renderNavigator({ showNavigator: false });
      expect(screen.getAllByText(/12\/1\/2025/).length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should call onWeekChange with date 7 days earlier on prev click', async () => {
      const user = userEvent.setup();
      renderNavigator();

      const prevBtn = screen.getAllByRole('button', { name: /שבוע קודם/i })[0];
      await user.click(prevBtn);

      expect(mockOnWeekChange).toHaveBeenCalledTimes(1);
      const called = mockOnWeekChange.mock.calls[0][0] as Date;
      // Should be 7 days before Jan 12 = Jan 5
      expect(called.getDate()).toBe(5);
      expect(called.getMonth()).toBe(0); // January
    });

    it('should call onWeekChange with date 7 days later on next click', async () => {
      const user = userEvent.setup();
      renderNavigator();

      const nextBtn = screen.getAllByRole('button', { name: /שבוע הבא/i })[0];
      await user.click(nextBtn);

      expect(mockOnWeekChange).toHaveBeenCalledTimes(1);
      const called = mockOnWeekChange.mock.calls[0][0] as Date;
      // Should be 7 days after Jan 12 = Jan 19
      expect(called.getDate()).toBe(19);
    });

    it('should call onWeekChange with current week start on "השבוע הנוכחי" click', async () => {
      const user = userEvent.setup();

      // Pin "today" to Wednesday Jan 15, 2025 → week start is Jan 12
      const fakeToday = new Date(2025, 0, 15);
      vi.setSystemTime(fakeToday);

      renderNavigator();

      const currentWeekBtns = screen.getAllByText('השבוע הנוכחי');
      await user.click(currentWeekBtns[0]);

      expect(mockOnWeekChange).toHaveBeenCalledTimes(1);
      const called = mockOnWeekChange.mock.calls[0][0] as Date;
      // Sunday of the week containing Jan 15 = Jan 12
      expect(called.getDay()).toBe(0); // Should be Sunday

      vi.useRealTimers();
    });
  });

  describe('Submission Week Button', () => {
    it('should render "שבוע הגשה" button when showSubmissionWeekButton=true and not current', () => {
      const mockGoToSubmission = vi.fn();
      renderNavigator({
        showSubmissionWeekButton: true,
        onGoToSubmissionWeek: mockGoToSubmission,
        isCurrentWeekSubmissionWeek: false,
      });

      expect(screen.getAllByText(/שבוע הגשה/).length).toBeGreaterThan(0);
    });

    it('should show "שבוע הגשה נוכחי" badge when isCurrentWeekSubmissionWeek=true', () => {
      renderNavigator({
        showSubmissionWeekButton: true,
        onGoToSubmissionWeek: vi.fn(),
        isCurrentWeekSubmissionWeek: true,
      });

      expect(screen.getAllByText(/שבוע הגשה נוכחי/).length).toBeGreaterThan(0);
    });

    it('should call onGoToSubmissionWeek when submission week button clicked', async () => {
      const user = userEvent.setup();
      const mockGoToSubmission = vi.fn();

      renderNavigator({
        showSubmissionWeekButton: true,
        onGoToSubmissionWeek: mockGoToSubmission,
        isCurrentWeekSubmissionWeek: false,
      });

      const submissionBtn = screen.getAllByText(/^שבוע הגשה$/)[0];
      await user.click(submissionBtn);

      expect(mockGoToSubmission).toHaveBeenCalledTimes(1);
    });

    it('should not render submission week button when showSubmissionWeekButton=false', () => {
      renderNavigator({ showSubmissionWeekButton: false });

      expect(screen.queryAllByText(/שבוע הגשה/)).toHaveLength(0);
    });
  });
});
