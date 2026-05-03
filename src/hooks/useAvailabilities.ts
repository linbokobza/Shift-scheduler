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
      console.log('[queryFn] fetching availabilities from server');
      const data = await availabilityAPI.getAll(weekStart);
      console.log('[queryFn] got', data.availabilities.length, 'availabilities from server');
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: availabilityKeys.all });
      const previous = queryClient.getQueryData<Availability[]>(availabilityKeys.all);
      const optimistic: Availability = {
        id: '__optimistic__',
        employeeId: variables.employeeId,
        weekStart: variables.weekStart,
        shifts: variables.shifts,
      } as Availability;
      queryClient.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
        old ? [...old, optimistic] : [optimistic]
      );
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(availabilityKeys.all, context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
        old
          ? old.map((a) => (a.id === '__optimistic__' ? response.availability : a))
          : [response.availability]
      );
    },
  });
};

// Update availability
export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, shifts }: { id: string; shifts: Availability['shifts'] }) =>
      availabilityAPI.update(id, { shifts }),
    onMutate: async ({ id, shifts }) => {
      await queryClient.cancelQueries({ queryKey: availabilityKeys.all });
      const previous = queryClient.getQueryData<Availability[]>(availabilityKeys.all);
      queryClient.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
        old ? old.map((a) => (a.id === id ? { ...a, shifts } : a)) : old
      );
      const after = queryClient.getQueryData<Availability[]>(availabilityKeys.all);
      const updatedEntry = after?.find(a => a.id === id);
      console.log(`[onMutate] after setQueryData - found id? ${!!updatedEntry} | shifts object same as input? ${updatedEntry?.shifts === shifts}`);
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(availabilityKeys.all, context.previous);
      }
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
