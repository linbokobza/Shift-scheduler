import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useEmployees,
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useToggleEmployeeActive,
  useDeleteEmployee,
  employeeKeys,
} from '../../hooks/useEmployees';
import { employeeAPI } from '../../api';

vi.mock('../../api', () => ({
  employeeAPI: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
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

const mockEmployee = {
  id: 'emp-1',
  name: 'ישראל ישראלי',
  email: 'israel@test.com',
  role: 'employee' as const,
  isActive: true,
};

describe('useEmployees hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEmployees query', () => {
    it('should return employees list on success', async () => {
      vi.mocked(employeeAPI.getAll).mockResolvedValue({ employees: [mockEmployee] });

      const { result } = renderHook(() => useEmployees(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([mockEmployee]);
    });

    it('should be in loading state initially', () => {
      vi.mocked(employeeAPI.getAll).mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useEmployees(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
    });

    it('should enter error state on API failure', async () => {
      vi.mocked(employeeAPI.getAll).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEmployees(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useEmployee query (single)', () => {
    it('should fetch employee by id when id provided', async () => {
      vi.mocked(employeeAPI.getById).mockResolvedValue({ employee: mockEmployee });

      const { result } = renderHook(() => useEmployee('emp-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockEmployee);
      expect(employeeAPI.getById).toHaveBeenCalledWith('emp-1');
    });

    it('should not fetch when id is empty string (enabled: false)', () => {
      const { result } = renderHook(() => useEmployee(''), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(employeeAPI.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateEmployee mutation', () => {
    it('should call employeeAPI.create with correct data', async () => {
      vi.mocked(employeeAPI.create).mockResolvedValue({ employee: mockEmployee });
      vi.mocked(employeeAPI.getAll).mockResolvedValue({ employees: [mockEmployee] });

      const { result } = renderHook(() => useCreateEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'New Emp',
          email: 'new@test.com',
          password: 'Password123',
        });
      });

      expect(employeeAPI.create).toHaveBeenCalledWith({
        name: 'New Emp',
        email: 'new@test.com',
        password: 'Password123',
      });
    });

    it('should expose error when mutation fails', async () => {
      vi.mocked(employeeAPI.create).mockRejectedValue(new Error('Duplicate email'));

      const { result } = renderHook(() => useCreateEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({
          name: 'Dup',
          email: 'dup@test.com',
          password: 'Password123',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useUpdateEmployee mutation', () => {
    it('should call employeeAPI.update with id and data', async () => {
      const updated = { ...mockEmployee, name: 'Updated Name' };
      vi.mocked(employeeAPI.update).mockResolvedValue({ employee: updated });
      vi.mocked(employeeAPI.getAll).mockResolvedValue({ employees: [updated] });

      const { result } = renderHook(() => useUpdateEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'emp-1', data: { name: 'Updated Name' } });
      });

      expect(employeeAPI.update).toHaveBeenCalledWith('emp-1', { name: 'Updated Name' });
    });
  });

  describe('useToggleEmployeeActive mutation', () => {
    it('should call employeeAPI.toggleActive with id', async () => {
      const toggled = { ...mockEmployee, isActive: false };
      vi.mocked(employeeAPI.toggleActive).mockResolvedValue({ employee: toggled });
      vi.mocked(employeeAPI.getAll).mockResolvedValue({ employees: [toggled] });

      const { result } = renderHook(() => useToggleEmployeeActive(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-1');
      });

      expect(employeeAPI.toggleActive).toHaveBeenCalledWith('emp-1');
    });
  });

  describe('useDeleteEmployee mutation', () => {
    it('should call employeeAPI.delete with id and options', async () => {
      vi.mocked(employeeAPI.delete).mockResolvedValue({
        message: 'Deleted',
        hasScheduleConflicts: false,
        employee: mockEmployee,
      });
      vi.mocked(employeeAPI.getAll).mockResolvedValue({ employees: [] });

      const { result } = renderHook(() => useDeleteEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'emp-1', confirm: true, removeFromSchedules: false });
      });

      expect(employeeAPI.delete).toHaveBeenCalledWith('emp-1', { confirm: true, removeFromSchedules: false });
    });

    it('should NOT throw when response has hasScheduleConflicts:true', async () => {
      vi.mocked(employeeAPI.delete).mockResolvedValue({
        message: 'Conflicts found',
        hasScheduleConflicts: true,
        employee: mockEmployee,
      });

      const { result } = renderHook(() => useDeleteEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'emp-1' });
      });

      // Should succeed (not error), just with hasScheduleConflicts:true in response
      expect(result.current.isError).toBe(false);
    });
  });
});
