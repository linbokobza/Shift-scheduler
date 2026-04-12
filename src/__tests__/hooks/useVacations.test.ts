import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useVacations,
  useCreateVacation,
  useDeleteVacation,
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from '../../hooks/useVacations';
import { vacationAPI, holidayAPI } from '../../api';

vi.mock('../../api', () => ({
  vacationAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  holidayAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockVacation = {
  id: 'vac-1',
  employeeId: 'emp-1',
  date: '2025-09-10',
  type: 'vacation' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockHoliday = {
  id: 'holiday-1',
  date: '2025-09-22',
  name: 'ראש השנה',
  type: 'no-work' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('useVacations hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useVacations query', () => {
    it('should return vacations array on success', async () => {
      vi.mocked(vacationAPI.getAll).mockResolvedValue({ vacations: [mockVacation] });

      const { result } = renderHook(() => useVacations(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([mockVacation]);
    });

    it('should use vacations.all key when no params', async () => {
      vi.mocked(vacationAPI.getAll).mockResolvedValue({ vacations: [] });

      const { result } = renderHook(() => useVacations(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(vacationAPI.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass params when provided', async () => {
      vi.mocked(vacationAPI.getAll).mockResolvedValue({ vacations: [mockVacation] });

      const params = { employeeId: 'emp-1' };
      const { result } = renderHook(() => useVacations(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(vacationAPI.getAll).toHaveBeenCalledWith(params);
    });
  });

  describe('useCreateVacation mutation', () => {
    it('should call vacationAPI.create with employeeId, date, type', async () => {
      vi.mocked(vacationAPI.create).mockResolvedValue({ vacation: mockVacation });
      vi.mocked(vacationAPI.getAll).mockResolvedValue({ vacations: [] });

      const { result } = renderHook(() => useCreateVacation(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          employeeId: 'emp-1',
          date: '2025-09-10',
          type: 'vacation',
        });
      });

      expect(vacationAPI.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        date: '2025-09-10',
        type: 'vacation',
      });
    });

    it('should expose error when creation fails', async () => {
      vi.mocked(vacationAPI.create).mockRejectedValue(new Error('Conflict'));

      const { result } = renderHook(() => useCreateVacation(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          employeeId: 'emp-1',
          date: '2025-09-10',
          type: 'sick',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useDeleteVacation mutation', () => {
    it('should call vacationAPI.delete with id', async () => {
      vi.mocked(vacationAPI.delete).mockResolvedValue(undefined);
      vi.mocked(vacationAPI.getAll).mockResolvedValue({ vacations: [] });

      const { result } = renderHook(() => useDeleteVacation(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('vac-1');
      });

      expect(vacationAPI.delete).toHaveBeenCalledWith('vac-1');
    });
  });
});

describe('useHolidays hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useHolidays query', () => {
    it('should return holidays array on success', async () => {
      vi.mocked(holidayAPI.getAll).mockResolvedValue({ holidays: [mockHoliday] });

      const { result } = renderHook(() => useHolidays(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([mockHoliday]);
    });

    it('should pass year param when provided', async () => {
      vi.mocked(holidayAPI.getAll).mockResolvedValue({ holidays: [mockHoliday] });

      const { result } = renderHook(() => useHolidays('2025'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(holidayAPI.getAll).toHaveBeenCalledWith('2025');
    });
  });

  describe('useCreateHoliday mutation', () => {
    it('should call holidayAPI.create with date, name, type', async () => {
      vi.mocked(holidayAPI.create).mockResolvedValue({ holiday: mockHoliday });
      vi.mocked(holidayAPI.getAll).mockResolvedValue({ holidays: [] });

      const { result } = renderHook(() => useCreateHoliday(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          date: '2025-09-22',
          name: 'ראש השנה',
          type: 'no-work',
        });
      });

      expect(holidayAPI.create).toHaveBeenCalledWith({
        date: '2025-09-22',
        name: 'ראש השנה',
        type: 'no-work',
      });
    });
  });

  describe('useUpdateHoliday mutation', () => {
    it('should call holidayAPI.update with id and data', async () => {
      vi.mocked(holidayAPI.update).mockResolvedValue({ holiday: mockHoliday });
      vi.mocked(holidayAPI.getAll).mockResolvedValue({ holidays: [] });

      const { result } = renderHook(() => useUpdateHoliday(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'holiday-1', data: { name: 'יום כיפור' } });
      });

      expect(holidayAPI.update).toHaveBeenCalledWith('holiday-1', { name: 'יום כיפור' });
    });
  });

  describe('useDeleteHoliday mutation', () => {
    it('should call holidayAPI.delete with id', async () => {
      vi.mocked(holidayAPI.delete).mockResolvedValue(undefined);
      vi.mocked(holidayAPI.getAll).mockResolvedValue({ holidays: [] });

      const { result } = renderHook(() => useDeleteHoliday(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('holiday-1');
      });

      expect(holidayAPI.delete).toHaveBeenCalledWith('holiday-1');
    });
  });
});
