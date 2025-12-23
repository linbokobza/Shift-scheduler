import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vacationAPI, holidayAPI } from '../api';

// Vacation Query keys
export const vacationKeys = {
  all: ['vacations'] as const,
  filtered: (params: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }) => ['vacations', params] as const,
};

// Holiday Query keys
export const holidayKeys = {
  all: ['holidays'] as const,
  byYear: (year: string) => ['holidays', year] as const,
};

// Get vacations
export const useVacations = (params?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: params ? vacationKeys.filtered(params) : vacationKeys.all,
    queryFn: async () => {
      const data = await vacationAPI.getAll(params);
      return data.vacations;
    },
  });
};

// Create vacation
export const useCreateVacation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      date: string;
      type: 'vacation' | 'sick';
    }) => vacationAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vacationKeys.all });
    },
  });
};

// Delete vacation
export const useDeleteVacation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vacationAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vacationKeys.all });
    },
  });
};

// Get holidays
export const useHolidays = (year?: string) => {
  return useQuery({
    queryKey: year ? holidayKeys.byYear(year) : holidayKeys.all,
    queryFn: async () => {
      const data = await holidayAPI.getAll(year);
      return data.holidays;
    },
  });
};

// Create holiday
export const useCreateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      date: string;
      name: string;
      type: 'no-work' | 'morning-only';
    }) => holidayAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
};

// Update holiday
export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; type?: 'no-work' | 'morning-only' };
    }) => holidayAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
};

// Delete holiday
export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => holidayAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
};
