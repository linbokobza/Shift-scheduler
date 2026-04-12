import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvailabilityGrid from '../../components/AvailabilityGrid';
import { Holiday } from '../../types';

// Mock data utilities
vi.mock('../../data/mockData', () => ({
  SHIFTS: [
    { id: 'morning', name: 'בוקר', startTime: '07:30', endTime: '15:30', color: 'bg-blue-100 text-blue-800' },
    { id: 'evening', name: 'ערב', startTime: '15:30', endTime: '23:30', color: 'bg-orange-100 text-orange-800' },
    { id: 'night', name: 'לילה', startTime: '23:30', endTime: '07:30', color: 'bg-purple-100 text-purple-800' },
  ],
  DAYS: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'],
}));

vi.mock('../../utils/dateUtils', () => ({
  formatDateHebrew: (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`,
  getWeekDates: (weekStart: Date) => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  },
  formatDate: (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },
  formatDateStringHebrew: (s: string) => s,
}));

// Sunday January 12, 2025
const WEEK_START = new Date(2025, 0, 12);

const baseProps = {
  availability: {},
  vacationDays: [],
  holidays: [] as Holiday[],
  onAvailabilityChange: vi.fn(),
  onCommentChange: vi.fn(),
  weekStart: WEEK_START,
  forceViewMode: 'table' as const,
};

describe('AvailabilityGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering (table mode)', () => {
    it('should render shift names: בוקר, ערב, לילה', () => {
      render(<AvailabilityGrid {...baseProps} />);
      expect(screen.getAllByText('בוקר').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ערב').length).toBeGreaterThan(0);
      expect(screen.getAllByText('לילה').length).toBeGreaterThan(0);
    });

    it('should render day names from DAYS constant', () => {
      render(<AvailabilityGrid {...baseProps} />);
      expect(screen.getAllByText('ראשון').length).toBeGreaterThan(0);
      expect(screen.getAllByText('שישי').length).toBeGreaterThan(0);
    });

    it('should render empty cells when no availability is set', () => {
      const { container } = render(<AvailabilityGrid {...baseProps} />);
      // Unset cells use bg-gray-50 styling in table mode (render empty string content)
      const unsetCells = container.querySelectorAll('td .bg-gray-50');
      expect(unsetCells.length).toBeGreaterThan(0);
    });
  });

  describe('Availability Status Display (table mode)', () => {
    it('should show "זמין" for available status', () => {
      render(
        <AvailabilityGrid
          {...baseProps}
          availability={{ '0': { morning: { status: 'available' } } }}
        />
      );
      expect(screen.getAllByText('זמין').length).toBeGreaterThan(0);
    });

    it('should show "לא זמין" for unavailable status', () => {
      render(
        <AvailabilityGrid
          {...baseProps}
          availability={{ '0': { morning: { status: 'unavailable' } } }}
        />
      );
      expect(screen.getAllByText('לא זמין').length).toBeGreaterThan(0);
    });
  });

  describe('Cell Click - Toggle (table mode)', () => {
    it('should call onAvailabilityChange with "available" when unset cell clicked', async () => {
      const user = userEvent.setup();
      const mockChange = vi.fn();

      const { container } = render(
        <AvailabilityGrid
          {...baseProps}
          onAvailabilityChange={mockChange}
          forceViewMode="table"
        />
      );

      // Click on an unset cell (bg-gray-50 styled in table mode)
      const unsetCells = container.querySelectorAll('td .bg-gray-50');
      await user.click(unsetCells[0] as HTMLElement);

      expect(mockChange).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'available');
    });

    it('should call onAvailabilityChange with "unavailable" when available cell clicked', async () => {
      const user = userEvent.setup();
      const mockChange = vi.fn();

      render(
        <AvailabilityGrid
          {...baseProps}
          availability={{ '0': { morning: { status: 'available' } } }}
          onAvailabilityChange={mockChange}
          forceViewMode="table"
        />
      );

      const availableCell = screen.getAllByText('זמין')[0];
      await user.click(availableCell);

      expect(mockChange).toHaveBeenCalledWith('0', 'morning', 'unavailable');
    });
  });

  describe('Readonly Mode (table mode)', () => {
    it('should not call onAvailabilityChange when readonly=true', async () => {
      const user = userEvent.setup();
      const mockChange = vi.fn();

      const { container } = render(
        <AvailabilityGrid
          {...baseProps}
          readonly={true}
          onAvailabilityChange={mockChange}
          forceViewMode="table"
        />
      );

      const unsetCells = container.querySelectorAll('td .bg-gray-50');
      await user.click(unsetCells[0] as HTMLElement);

      expect(mockChange).not.toHaveBeenCalled();
    });
  });

  describe('Vacation Days (table mode)', () => {
    it('should display vacation indicator for vacation day cells', () => {
      // Jan 12 is day 0 of weekStart = '2025-01-12'
      render(
        <AvailabilityGrid
          {...baseProps}
          vacationDays={['2025-01-12']}
          forceViewMode="table"
        />
      );

      // Sunday (day 0) should show חופשה/מחלה text
      expect(screen.getAllByText(/חופשה|מחלה/).length).toBeGreaterThan(0);
    });

    it('should not call onAvailabilityChange for vacation day cells', async () => {
      const user = userEvent.setup();
      const mockChange = vi.fn();

      render(
        <AvailabilityGrid
          {...baseProps}
          vacationDays={['2025-01-12']}
          onAvailabilityChange={mockChange}
          forceViewMode="table"
        />
      );

      const vacationCell = screen.getAllByText(/חופשה|מחלה/)[0];
      await user.click(vacationCell);

      expect(mockChange).not.toHaveBeenCalled();
    });
  });

  describe('Holiday Blocking (table mode)', () => {
    it('should display holiday name for no-work holiday cells', () => {
      const holidays: Holiday[] = [{
        id: 'h1',
        date: '2025-01-12', // day 0 = Sunday
        name: 'ראש השנה',
        type: 'no-work',
        createdAt: '2025-01-01T00:00:00.000Z',
      }];

      render(
        <AvailabilityGrid
          {...baseProps}
          holidays={holidays}
          forceViewMode="table"
        />
      );

      // Holiday name should appear in the cells
      expect(screen.getAllByText(/ראש השנה/).length).toBeGreaterThan(0);
    });

    it('should block evening and night on morning-only holiday', () => {
      const holidays: Holiday[] = [{
        id: 'h1',
        date: '2025-01-12',
        name: 'חג',
        type: 'morning-only',
        createdAt: '2025-01-01T00:00:00.000Z',
      }];

      render(
        <AvailabilityGrid
          {...baseProps}
          holidays={holidays}
          forceViewMode="table"
        />
      );

      // Holiday-blocked cells should exist
      const blockedCells = document.querySelectorAll('.bg-indigo-200, .cursor-not-allowed');
      expect(blockedCells.length).toBeGreaterThan(0);
    });
  });

  describe('Friday Restrictions (table mode)', () => {
    it('should show restricted indicator for Friday evening/night shifts', () => {
      render(<AvailabilityGrid {...baseProps} forceViewMode="table" />);

      // Friday is day 5. Evening and night should show ×
      const restrictedCells = screen.getAllByText('×');
      expect(restrictedCells.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Comment Modal (table mode)', () => {
    it('should open comment modal when comment icon clicked', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <AvailabilityGrid
          {...baseProps}
          availability={{ '0': { morning: { status: 'available' } } }}
          forceViewMode="table"
        />
      );

      // Find comment buttons (svg buttons with no text content)
      const msgButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.querySelector('svg') && btn.textContent?.trim() === ''
      );

      expect(msgButtons.length).toBeGreaterThan(0);
      await user.click(msgButtons[0] as HTMLElement);

      // Modal opens — two textareas rendered (mobile+desktop), use getAllByRole
      const textareas = screen.getAllByRole('textbox');
      expect(textareas.length).toBeGreaterThan(0);
    });

    it('should call onCommentChange with text when save clicked', async () => {
      const user = userEvent.setup();
      const mockComment = vi.fn();

      const { container } = render(
        <AvailabilityGrid
          {...baseProps}
          availability={{ '0': { morning: { status: 'available' } } }}
          onCommentChange={mockComment}
          forceViewMode="table"
        />
      );

      const commentBtns = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.querySelector('svg') && btn.textContent?.trim() === ''
      );

      expect(commentBtns.length).toBeGreaterThan(0);
      await user.click(commentBtns[0] as HTMLElement);

      // Use first textarea (mobile version visible in jsdom)
      const textareas = screen.getAllByRole('textbox');
      await user.type(textareas[0], 'הערה חדשה');
      const saveBtns = screen.getAllByRole('button', { name: /שמירה/i });
      await user.click(saveBtns[0]);
      expect(mockComment).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(String));
    });
  });
});
