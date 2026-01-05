import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeAPI } from '../api';
import { User } from '../types';

// Query keys
export const employeeKeys = {
  all: ['employees'] as const,
  detail: (id: string) => ['employees', id] as const,
};

// Get all employees
export const useEmployees = () => {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: async () => {
      const data = await employeeAPI.getAll();
      return data.employees;
    },
  });
};

// Get single employee
export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => {
      const data = await employeeAPI.getById(id);
      return data.employee;
    },
    enabled: !!id,
  });
};

// Create employee
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      role?: 'employee' | 'manager';
    }) => employeeAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
};

// Update employee
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      employeeAPI.update(id, data),
    onSuccess: (response) => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(response.employee.id) });
    },
  });
};

// Toggle employee active status
export const useToggleEmployeeActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeAPI.toggleActive(id),
    onSuccess: (response) => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(response.employee.id) });
    },
  });
};

// Delete employee
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      confirm = false,
      removeFromSchedules = false
    }: {
      id: string;
      confirm?: boolean;
      removeFromSchedules?: boolean;
    }) => employeeAPI.delete(id, { confirm, removeFromSchedules }),
    onSuccess: (response) => {
      // Only invalidate queries if employee was actually deleted
      if (!response.hasScheduleConflicts) {
        queryClient.invalidateQueries({ queryKey: employeeKeys.all });
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(response.employee.id) });
        // Also invalidate schedules since assignments may have changed
        queryClient.invalidateQueries({ queryKey: ['schedules'] });
      }
    },
  });
};
