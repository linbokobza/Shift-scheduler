import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleAPI } from '../api';
import { Schedule } from '../types';
import { parseLocalDate } from '../utils/dateUtils';

// Query keys
export const scheduleKeys = {
  all: ['schedules'] as const,
  byWeek: (weekStart: string) => ['schedules', 'week', weekStart] as const,
};

// Get all schedules
export const useSchedules = (weekStart?: string) => {
  return useQuery({
    queryKey: weekStart ? scheduleKeys.byWeek(weekStart) : scheduleKeys.all,
    queryFn: async () => {
      const data = await scheduleAPI.getAll(weekStart);
      return data.schedules;
    },
  });
};

// Get schedule for specific week
export const useScheduleByWeek = (weekStart: string) => {
  return useQuery({
    queryKey: scheduleKeys.byWeek(weekStart),
    queryFn: async () => {
      const data = await scheduleAPI.getByWeek(weekStart);
      return data.schedule;
    },
    enabled: !!weekStart,
  });
};

// Generate new schedule
export const useGenerateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weekStart: string) => scheduleAPI.generate(weekStart),
    onSuccess: (response, weekStart) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.byWeek(weekStart) });
    },
  });
};

// Update schedule
export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      assignments,
      lockedAssignments,
    }: {
      id: string;
      assignments?: Schedule['assignments'];
      lockedAssignments?: Schedule['lockedAssignments'];
    }) => scheduleAPI.update(id, { assignments, lockedAssignments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
};

// Publish schedule
export const usePublishSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduleAPI.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
};

// Lock/unlock shift
export const useLockShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      day,
      shiftId,
      locked,
    }: {
      id: string;
      day: number;
      shiftId: string;
      locked: boolean;
    }) => scheduleAPI.lockShift(id, { day, shiftId, locked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
};

// Get all schedules for a specific month (published and unpublished)
export const usePublishedSchedulesForMonth = (year: number, month: number) => {
  return useQuery({
    queryKey: ['schedules', 'published', 'month', year, month],
    queryFn: async () => {
      // Calculate month boundaries - need to include days from previous/next month that appear in calendar grid
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);

      // Calculate actual first/last days shown in calendar (including padding from prev/next month)
      const startingDayOfWeek = firstDayOfMonth.getDay();
      const calendarStart = new Date(firstDayOfMonth);
      calendarStart.setDate(calendarStart.getDate() - startingDayOfWeek);

      const endingDayOfWeek = lastDayOfMonth.getDay();
      const calendarEnd = new Date(lastDayOfMonth);
      calendarEnd.setDate(calendarEnd.getDate() + (6 - endingDayOfWeek));

      // Fetch all schedules
      const data = await scheduleAPI.getAll();

      // Filter for schedules that overlap with the calendar view (including padding days)
      return data.schedules.filter((schedule) => {
        const weekStart = parseLocalDate(schedule.weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // A week overlaps if: weekEnd >= calendarStart AND weekStart <= calendarEnd
        return weekEnd >= calendarStart && weekStart <= calendarEnd;
      });
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
