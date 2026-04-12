import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useSchedules,
  useScheduleByWeek,
  useGenerateSchedule,
  useUpdateSchedule,
  usePublishSchedule,
  useLockShift,
  usePublishedSchedulesForMonth,
} from '../../hooks/useSchedules';
import { scheduleAPI } from '../../api';

vi.mock('../../api', () => ({
  scheduleAPI: {
    getAll: vi.fn(),
    getByWeek: vi.fn(),
    generate: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    lockShift: vi.fn(),
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

const mockSchedule = {
  id: 'sch-1',
  weekStart: '2025-09-07',
  assignments: { '0': { morning: null } },
  isPublished: false,
  createdBy: 'manager-1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('useSchedules hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSchedules query', () => {
    it('should return schedules array on success', async () => {
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [mockSchedule] });

      const { result } = renderHook(() => useSchedules(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([mockSchedule]);
    });

    it('should call getAll without params when no weekStart', async () => {
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [] });

      const { result } = renderHook(() => useSchedules(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(scheduleAPI.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass weekStart when provided', async () => {
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [mockSchedule] });

      const { result } = renderHook(() => useSchedules('2025-09-07'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(scheduleAPI.getAll).toHaveBeenCalledWith('2025-09-07');
    });
  });

  describe('useScheduleByWeek query', () => {
    it('should be disabled when weekStart is empty', () => {
      const { result } = renderHook(() => useScheduleByWeek(''), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(scheduleAPI.getByWeek).not.toHaveBeenCalled();
    });

    it('should return schedule for given week', async () => {
      vi.mocked(scheduleAPI.getByWeek).mockResolvedValue({ schedule: mockSchedule });

      const { result } = renderHook(() => useScheduleByWeek('2025-09-07'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSchedule);
    });
  });

  describe('useGenerateSchedule mutation', () => {
    it('should call scheduleAPI.generate with weekStart', async () => {
      vi.mocked(scheduleAPI.generate).mockResolvedValue({
        schedule: mockSchedule,
        errors: [],
        warnings: [],
        attempts: 1,
      });
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [] });

      const { result } = renderHook(() => useGenerateSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('2025-09-07');
      });

      expect(scheduleAPI.generate).toHaveBeenCalledWith('2025-09-07');
    });
  });

  describe('useUpdateSchedule mutation', () => {
    it('should call scheduleAPI.update with id and assignments', async () => {
      vi.mocked(scheduleAPI.update).mockResolvedValue({ schedule: mockSchedule });
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [] });

      const { result } = renderHook(() => useUpdateSchedule(), { wrapper: createWrapper() });

      const newAssignments = { '0': { morning: 'emp-1' } };
      await act(async () => {
        await result.current.mutateAsync({ id: 'sch-1', assignments: newAssignments as any });
      });

      expect(scheduleAPI.update).toHaveBeenCalledWith('sch-1', {
        assignments: newAssignments,
        lockedAssignments: undefined,
      });
    });

    it('should call scheduleAPI.update with lockedAssignments', async () => {
      vi.mocked(scheduleAPI.update).mockResolvedValue({ schedule: mockSchedule });
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [] });

      const { result } = renderHook(() => useUpdateSchedule(), { wrapper: createWrapper() });

      const locked = { '0': { morning: true } };
      await act(async () => {
        await result.current.mutateAsync({ id: 'sch-1', lockedAssignments: locked as any });
      });

      expect(scheduleAPI.update).toHaveBeenCalledWith('sch-1', {
        assignments: undefined,
        lockedAssignments: locked,
      });
    });
  });

  describe('usePublishSchedule mutation', () => {
    it('should call scheduleAPI.publish with schedule id', async () => {
      vi.mocked(scheduleAPI.publish).mockResolvedValue({
        schedule: { ...mockSchedule, isPublished: true },
      });
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [] });

      const { result } = renderHook(() => usePublishSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('sch-1');
      });

      expect(scheduleAPI.publish).toHaveBeenCalledWith('sch-1');
    });
  });

  describe('useLockShift mutation', () => {
    it('should call scheduleAPI.lockShift with id, day, shiftId, locked:true', async () => {
      vi.mocked(scheduleAPI.lockShift).mockResolvedValue({ schedule: mockSchedule });
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [] });

      const { result } = renderHook(() => useLockShift(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'sch-1', day: 0, shiftId: 'morning', locked: true });
      });

      expect(scheduleAPI.lockShift).toHaveBeenCalledWith('sch-1', {
        day: 0,
        shiftId: 'morning',
        locked: true,
      });
    });

    it('should call scheduleAPI.lockShift with locked:false to unlock', async () => {
      vi.mocked(scheduleAPI.lockShift).mockResolvedValue({ schedule: mockSchedule });
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [] });

      const { result } = renderHook(() => useLockShift(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'sch-1', day: 0, shiftId: 'morning', locked: false });
      });

      expect(scheduleAPI.lockShift).toHaveBeenCalledWith('sch-1', {
        day: 0,
        shiftId: 'morning',
        locked: false,
      });
    });
  });

  describe('usePublishedSchedulesForMonth', () => {
    it('should filter schedules overlapping the calendar month', async () => {
      // January 2025: weekStart on 2024-12-29 (overlaps Jan), and weekStart on 2025-01-05
      const janOverlapSchedule = { ...mockSchedule, id: 'sch-jan', weekStart: '2025-01-05' };
      const marchSchedule = { ...mockSchedule, id: 'sch-march', weekStart: '2025-03-02' };

      vi.mocked(scheduleAPI.getAll).mockResolvedValue({
        schedules: [janOverlapSchedule, marchSchedule],
      });

      const { result } = renderHook(
        () => usePublishedSchedulesForMonth(2025, 0), // January = month 0
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Only January schedule should be included, not March
      expect(result.current.data).toBeDefined();
      const ids = result.current.data!.map(s => s.id);
      expect(ids).toContain('sch-jan');
      expect(ids).not.toContain('sch-march');
    });

    it('should return empty array when no schedules match', async () => {
      vi.mocked(scheduleAPI.getAll).mockResolvedValue({ schedules: [] });

      const { result } = renderHook(
        () => usePublishedSchedulesForMonth(2025, 0),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });
});
