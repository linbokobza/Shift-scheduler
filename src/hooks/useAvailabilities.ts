import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityAPI } from '../api';
import { Availability } from '../types';

// Query keys
export const availabilityKeys = {
  all: ['availabilities'] as const,
  byWeek: (weekStart: string) => ['availabilities', 'week', weekStart] as const,
  byEmployee: (employeeId: string, weekStart: string) =>
    ['availabilities', 'employee', employeeId, weekStart] as const,
};

// Get all availabilities for a week
export const useAvailabilities = (weekStart?: string) => {
  return useQuery({
    queryKey: weekStart ? availabilityKeys.byWeek(weekStart) : availabilityKeys.all,
    queryFn: async () => {
      const data = await availabilityAPI.getAll(weekStart);
      return data.availabilities;
    },
  });
};

// Get availability for specific employee and week
export const useEmployeeAvailability = (employeeId: string, weekStart: string) => {
  return useQuery({
    queryKey: availabilityKeys.byEmployee(employeeId, weekStart),
    queryFn: async () => {
      const data = await availabilityAPI.getByEmployee(employeeId, weekStart);
      return data.availability;
    },
    enabled: !!employeeId && !!weekStart,
  });
};

// Create availability
export const useCreateAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      weekStart: string;
      shifts: Availability['shifts'];
    }) => availabilityAPI.create(data),
    onSuccess: (response, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.byWeek(variables.weekStart)
      });
      queryClient.invalidateQueries({
        queryKey: availabilityKeys.byEmployee(variables.employeeId, variables.weekStart)
      });
    },
  });
};

// Update availability
export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, shifts }: { id: string; shifts: Availability['shifts'] }) =>
      availabilityAPI.update(id, { shifts }),
    onSuccess: () => {
      // Invalidate all availability queries
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
};

// Delete availability
export const useDeleteAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => availabilityAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
};
