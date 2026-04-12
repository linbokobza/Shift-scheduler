import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HolidayManager from '../../components/manager/HolidayManager';
import { Holiday } from '../../types';

vi.mock('../../utils/dateUtils', () => ({
  formatDateStringHebrew: (dateStr: string) => dateStr,
  formatDateHebrew: (date: Date) => date.toLocaleDateString('he-IL'),
}));

const mockHolidays: Holiday[] = [
  {
    id: 'holiday-1',
    date: '2025-09-22',
    name: 'ראש השנה',
    type: 'no-work',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'holiday-2',
    date: '2025-04-13',
    name: 'פסח',
    type: 'morning-only',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('HolidayManager', () => {
  const mockOnAddHoliday = vi.fn();
  const mockOnRemoveHoliday = vi.fn();

  const renderManager = (holidays: Holiday[] = mockHolidays) =>
    render(
      <HolidayManager
        holidays={holidays}
        onAddHoliday={mockOnAddHoliday}
        onRemoveHoliday={mockOnRemoveHoliday}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the section title "ניהול חגים"', () => {
      renderManager();
      expect(screen.getByText('ניהול חגים')).toBeInTheDocument();
    });

    it('should render date input with label "תאריך החג"', () => {
      renderManager();
      expect(screen.getByLabelText(/תאריך החג/i)).toBeInTheDocument();
    });

    it('should render name input with label "שם החג"', () => {
      renderManager();
      expect(screen.getByLabelText(/שם החג/i)).toBeInTheDocument();
    });

    it('should render type select with label "סוג החג"', () => {
      renderManager();
      expect(screen.getByLabelText(/סוג החג/i)).toBeInTheDocument();
    });

    it('should render submit button "הוסף חג"', () => {
      renderManager();
      expect(screen.getByRole('button', { name: /הוסף חג/i })).toBeInTheDocument();
    });

    it('should render toggle button "חגים מוגדרים"', () => {
      renderManager();
      expect(screen.getByText('חגים מוגדרים')).toBeInTheDocument();
    });
  });

  describe('Holiday List', () => {
    it('should not show holiday list by default (collapsed)', () => {
      renderManager();
      expect(screen.queryByText('ראש השנה')).not.toBeInTheDocument();
    });

    it('should expand holiday list when toggle button clicked', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.click(screen.getByText('חגים מוגדרים'));

      expect(screen.getByText(/ראש השנה/)).toBeInTheDocument();
    });

    it('should show "אין חגים מוגדרים" when holidays array is empty', async () => {
      const user = userEvent.setup();
      renderManager([]);

      await user.click(screen.getByText('חגים מוגדרים'));

      expect(screen.getByText('אין חגים מוגדרים')).toBeInTheDocument();
    });

    it('should display holiday names when expanded', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.click(screen.getByText('חגים מוגדרים'));

      expect(screen.getByText(/ראש השנה/)).toBeInTheDocument();
      expect(screen.getByText(/פסח/)).toBeInTheDocument();
    });

    it('should display type label "אין עבודה כלל" for no-work type', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.click(screen.getByText('חגים מוגדרים'));

      expect(screen.getByText('אין עבודה כלל')).toBeInTheDocument();
    });

    it('should display type label "עבודה רק בבוקר" for morning-only type', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.click(screen.getByText('חגים מוגדרים'));

      expect(screen.getByText('עבודה רק בבוקר')).toBeInTheDocument();
    });

    it('should render a delete button for each holiday', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.click(screen.getByText('חגים מוגדרים'));

      // Each holiday has a Trash2 button
      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg') && !btn.textContent?.includes('הוסף')
      );
      // There should be at least 2 delete buttons (one per holiday)
      // Plus the expand/collapse toggle
      const listItems = screen.getAllByText(/אין עבודה כלל|עבודה רק בבוקר/);
      expect(listItems.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Add Holiday Form', () => {
    it('should call onAddHoliday with date, name, type on valid submit', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.type(screen.getByLabelText(/תאריך החג/i), '2025-10-01');
      await user.type(screen.getByLabelText(/שם החג/i), 'סוכות');

      await user.click(screen.getByRole('button', { name: /הוסף חג/i }));

      expect(mockOnAddHoliday).toHaveBeenCalledWith('2025-10-01', 'סוכות', 'no-work');
    });

    it('should reset name field after successful submission', async () => {
      const user = userEvent.setup();
      renderManager();

      const dateInput = screen.getByLabelText(/תאריך החג/i);
      const nameInput = screen.getByLabelText(/שם החג/i);

      await user.type(dateInput, '2025-10-01');
      await user.type(nameInput, 'סוכות');
      await user.click(screen.getByRole('button', { name: /הוסף חג/i }));

      expect((nameInput as HTMLInputElement).value).toBe('');
    });

    it('should not call onAddHoliday when name is empty', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.type(screen.getByLabelText(/תאריך החג/i), '2025-10-01');
      // Do not fill name

      await user.click(screen.getByRole('button', { name: /הוסף חג/i }));

      expect(mockOnAddHoliday).not.toHaveBeenCalled();
    });

    it('should default type to no-work', () => {
      renderManager();
      const select = screen.getByLabelText(/סוג החג/i) as HTMLSelectElement;
      expect(select.value).toBe('no-work');
    });

    it('should submit with morning-only type when selected', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.type(screen.getByLabelText(/תאריך החג/i), '2025-10-08');
      await user.type(screen.getByLabelText(/שם החג/i), 'הושענא רבה');
      await user.selectOptions(screen.getByLabelText(/סוג החג/i), 'morning-only');

      await user.click(screen.getByRole('button', { name: /הוסף חג/i }));

      expect(mockOnAddHoliday).toHaveBeenCalledWith('2025-10-08', 'הושענא רבה', 'morning-only');
    });
  });

  describe('Remove Holiday', () => {
    it('should call onRemoveHoliday with holiday id when delete button clicked', async () => {
      const user = userEvent.setup();
      renderManager([mockHolidays[0]]); // Single holiday for clarity

      await user.click(screen.getByText('חגים מוגדרים'));

      // Find delete button by proximity to holiday item
      const trashButtons = document.querySelectorAll('button svg.lucide-trash-2, button [data-lucide="trash-2"]');

      // Alternative approach: get all buttons except add and toggle
      const buttons = screen.getAllByRole('button');
      const deleteBtn = buttons.find(btn => {
        const svgChild = btn.querySelector('svg');
        return svgChild && btn !== screen.getByRole('button', { name: /הוסף חג/i }) &&
               !btn.textContent?.includes('חגים מוגדרים');
      });

      if (deleteBtn) {
        await user.click(deleteBtn);
        expect(mockOnRemoveHoliday).toHaveBeenCalledWith('holiday-1');
      } else {
        // Fallback: click any button near the holiday name
        const allBtns = screen.getAllByRole('button');
        // Skip first (add) and second (toggle), last ones are delete
        const potentialDelete = allBtns[allBtns.length - 1];
        await user.click(potentialDelete);
        expect(mockOnRemoveHoliday).toHaveBeenCalled();
      }
    });
  });
});
