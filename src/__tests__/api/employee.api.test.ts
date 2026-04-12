import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { employeeAPI } from '../../api/employee.api';

const API_URL = 'http://localhost:5001/api';

const mockEmployee = {
  id: 'emp-1',
  name: 'ישראל ישראלי',
  email: 'israel@test.com',
  role: 'employee' as const,
  isActive: true,
};

describe('Employee API', () => {
  const server = setupServer(
    http.get(`${API_URL}/employees`, () => {
      return HttpResponse.json({ employees: [mockEmployee] });
    }),

    http.get(`${API_URL}/employees/:id`, ({ params }) => {
      const { id } = params as { id: string };
      if (id === mockEmployee.id) {
        return HttpResponse.json({ employee: mockEmployee });
      }
      return HttpResponse.json({ error: 'Employee not found' }, { status: 404 });
    }),

    http.post(`${API_URL}/employees`, async ({ request }) => {
      const body = await request.json() as { email: string; name: string; role?: string };
      if (body.email === 'duplicate@test.com') {
        return HttpResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
      return HttpResponse.json(
        { employee: { id: 'new-emp-1', name: body.name, email: body.email, role: body.role || 'employee', isActive: true } },
        { status: 201 }
      );
    }),

    http.put(`${API_URL}/employees/:id`, async ({ params, request }) => {
      const { id } = params as { id: string };
      if (id === 'nonexistent') {
        return HttpResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      const body = await request.json() as Partial<typeof mockEmployee>;
      return HttpResponse.json({ employee: { ...mockEmployee, ...body, id } });
    }),

    http.patch(`${API_URL}/employees/:id/toggle-active`, ({ params }) => {
      const { id } = params as { id: string };
      return HttpResponse.json({
        employee: { ...mockEmployee, id, isActive: !mockEmployee.isActive },
      });
    }),

    http.delete(`${API_URL}/employees/:id`, ({ request, params }) => {
      const { id } = params as { id: string };
      const url = new URL(request.url);
      const confirm = url.searchParams.get('confirm') === 'true';

      if (!confirm) {
        return HttpResponse.json({
          hasScheduleConflicts: true,
          message: 'Employee has schedule conflicts',
          employee: mockEmployee,
          futureSchedules: [{ scheduleId: 's1', weekStart: '2025-09-07', isPublished: false, assignmentCount: 2 }],
        });
      }

      return HttpResponse.json({
        message: 'Employee deleted successfully',
        hasScheduleConflicts: false,
        employee: mockEmployee,
      });
    })
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('getAll', () => {
    it('should return list of employees', async () => {
      const result = await employeeAPI.getAll();

      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].name).toBe('ישראל ישראלי');
    });

    it('should return empty array when no employees', async () => {
      server.use(
        http.get(`${API_URL}/employees`, () => {
          return HttpResponse.json({ employees: [] });
        })
      );

      const result = await employeeAPI.getAll();
      expect(result.employees).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return single employee by id', async () => {
      const result = await employeeAPI.getById('emp-1');

      expect(result.employee.id).toBe('emp-1');
      expect(result.employee.email).toBe('israel@test.com');
    });

    it('should throw on 404 response', async () => {
      await expect(employeeAPI.getById('nonexistent-id')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create employee and return created object', async () => {
      const result = await employeeAPI.create({
        name: 'New Employee',
        email: 'new@test.com',
        password: 'Password123',
        role: 'employee',
      });

      expect(result.employee.name).toBe('New Employee');
      expect(result.employee.email).toBe('new@test.com');
    });

    it('should throw on 409 duplicate email response', async () => {
      await expect(
        employeeAPI.create({
          name: 'Dup',
          email: 'duplicate@test.com',
          password: 'Password123',
        })
      ).rejects.toThrow();
    });

    it('should default role to employee when not provided', async () => {
      const result = await employeeAPI.create({
        name: 'Default Role',
        email: 'defaultrole@test.com',
        password: 'Password123',
      });

      expect(result.employee.role).toBe('employee');
    });
  });

  describe('update', () => {
    it('should update employee name and return updated object', async () => {
      const result = await employeeAPI.update('emp-1', { name: 'Updated Name' });

      expect(result.employee.name).toBe('Updated Name');
      expect(result.employee.id).toBe('emp-1');
    });

    it('should throw on 404 when employee not found', async () => {
      await expect(
        employeeAPI.update('nonexistent', { name: 'Ghost' })
      ).rejects.toThrow();
    });
  });

  describe('toggleActive', () => {
    it('should toggle isActive status', async () => {
      const result = await employeeAPI.toggleActive('emp-1');

      // The mock flips it — mockEmployee.isActive is true, so result should be false
      expect(result.employee.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should return hasScheduleConflicts:true without confirm flag when conflicts exist', async () => {
      const result = await employeeAPI.delete('emp-1');

      expect(result.hasScheduleConflicts).toBe(true);
      expect(result.futureSchedules).toBeDefined();
    });

    it('should delete with confirm:true and return no conflicts', async () => {
      const result = await employeeAPI.delete('emp-1', { confirm: true });

      expect(result.hasScheduleConflicts).toBe(false);
      expect(result.message).toBe('Employee deleted successfully');
    });

    it('should throw on 401 unauthorized', async () => {
      server.use(
        http.delete(`${API_URL}/employees/:id`, () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );

      await expect(employeeAPI.delete('emp-1')).rejects.toThrow();
    });
  });
});
