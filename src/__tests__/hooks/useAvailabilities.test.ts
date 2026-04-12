import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useAvailabilities,
  useEmployeeAvailability,
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
  availabilityKeys,
} from '../../hooks/useAvailabilities';
import { availabilityAPI } from '../../api';

vi.mock('../../api', () => ({
  availabilityAPI: {
    getAll: vi.fn(),
    getByEmployee: vi.fn(),
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

const mockAvailability = {
  id: 'av-1',
  employeeId: 'emp-1',
  weekStart: '2025-09-07',
  shifts: {
    '0': { morning: { status: 'available' as const } },
  },
};

describe('useAvailabilities hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAvailabilities query', () => {
    it('should use all-availabilities key when no weekStart', async () => {
      vi.mocked(availabilityAPI.getAll).mockResolvedValue({ availabilities: [mockAvailability] });

      const { result } = renderHook(() => useAvailabilities(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(availabilityAPI.getAll).toHaveBeenCalledWith(undefined);
      expect(result.current.data).toEqual([mockAvailability]);
    });

    it('should use byWeek key and pass weekStart when provided', async () => {
      vi.mocked(availabilityAPI.getAll).mockResolvedValue({ availabilities: [mockAvailability] });

      const { result } = renderHook(() => useAvailabilities('2025-09-07'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(availabilityAPI.getAll).toHaveBeenCalledWith('2025-09-07');
    });

    it('should return availabilities array on success', async () => {
      vi.mocked(availabilityAPI.getAll).mockResolvedValue({
        availabilities: [mockAvailability, { ...mockAvailability, id: 'av-2' }],
      });

      const { result } = renderHook(() => useAvailabilities(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
    });
  });

  describe('useEmployeeAvailability query', () => {
    it('should be disabled when employeeId is empty', () => {
      const { result } = renderHook(
        () => useEmployeeAvailability('', '2025-09-07'),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(availabilityAPI.getByEmployee).not.toHaveBeenCalled();
    });

    it('should be disabled when weekStart is empty', () => {
      const { result } = renderHook(
        () => useEmployeeAvailability('emp-1', ''),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(availabilityAPI.getByEmployee).not.toHaveBeenCalled();
    });

    it('should fetch when both params are provided', async () => {
      vi.mocked(availabilityAPI.getByEmployee).mockResolvedValue({
        availability: mockAvailability,
      });

      const { result } = renderHook(
        () => useEmployeeAvailability('emp-1', '2025-09-07'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(availabilityAPI.getByEmployee).toHaveBeenCalledWith('emp-1', '2025-09-07');
      expect(result.current.data).toEqual(mockAvailability);
    });
  });

  describe('useCreateAvailability mutation', () => {
    it('should call availabilityAPI.create with correct payload', async () => {
      vi.mocked(availabilityAPI.create).mockResolvedValue({ availability: mockAvailability });
      vi.mocked(availabilityAPI.getAll).mockResolvedValue({ availabilities: [] });

      const { result } = renderHook(() => useCreateAvailability(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          employeeId: 'emp-1',
          weekStart: '2025-09-07',
          shifts: { '0': { morning: { status: 'available' } } } as any,
        });
      });

      expect(availabilityAPI.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        weekStart: '2025-09-07',
        shifts: expect.any(Object),
      });
    });
  });

  describe('useUpdateAvailability mutation', () => {
    it('should call availabilityAPI.update with id and shifts', async () => {
      vi.mocked(availabilityAPI.update).mockResolvedValue({ availability: mockAvailability });
      vi.mocked(availabilityAPI.getAll).mockResolvedValue({ availabilities: [] });

      const { result } = renderHook(() => useUpdateAvailability(), { wrapper: createWrapper() });

      const newShifts = { '0': { morning: { status: 'unavailable' as const } } };
      await act(async () => {
        await result.current.mutateAsync({ id: 'av-1', shifts: newShifts as any });
      });

      expect(availabilityAPI.update).toHaveBeenCalledWith('av-1', { shifts: newShifts });
    });
  });

  describe('useDeleteAvailability mutation', () => {
    it('should call availabilityAPI.delete with id', async () => {
      vi.mocked(availabilityAPI.delete).mockResolvedValue(undefined);
      vi.mocked(availabilityAPI.getAll).mockResolvedValue({ availabilities: [] });

      const { result } = renderHook(() => useDeleteAvailability(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('av-1');
      });

      expect(availabilityAPI.delete).toHaveBeenCalledWith('av-1');
    });
  });
});
