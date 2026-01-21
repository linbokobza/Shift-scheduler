import request from 'supertest';
import { app } from '../../server';
import { User, Schedule } from '../../models';
import { createTestUser, createTestManager, createTestEmployee, addDays } from '../helpers/fixtures';
import mongoose from 'mongoose';

describe('Employee API', () => {
  describe('POST /api/employees', () => {
    it('EMP-001: should create employee with valid data (manager)', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'New Employee',
          email: 'newemployee@test.com',
          password: 'password123',
          role: 'employee',
        })
        .expect(201);

      expect(response.body.message).toBe('Employee created successfully');
      expect(response.body.employee).toMatchObject({
        name: 'New Employee',
        email: 'newemployee@test.com',
        role: 'employee',
        isActive: true,
      });

      const employee = await User.findOne({ email: 'newemployee@test.com' });
      expect(employee).toBeDefined();
      expect(employee?.name).toBe('New Employee');
    });

    it('EMP-002: should reject creation with duplicate email', async () => {
      const manager = await createTestManager();
      await createTestEmployee('Existing', 'existing@test.com');

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'Duplicate',
          email: 'existing@test.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.error).toContain('already in use');
    });

    it('should reject creation without required fields', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'Only Name',
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('EMP-010: should reject employee creation by non-manager', async () => {
      const employee = await createTestEmployee();

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          name: 'New Employee',
          email: 'another@test.com',
          password: 'password123',
        })
        .expect(403);

      expect(response.body.error.toLowerCase()).toContain('manager');
    });

    it('should normalize email to lowercase', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'Lowercase Test',
          email: 'UPPERCASE@TEST.COM',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.employee.email).toBe('uppercase@test.com');
    });
  });

  describe('GET /api/employees', () => {
    it('EMP-003: should return all employees', async () => {
      const manager = await createTestManager();
      await createTestEmployee('Employee 1', 'emp1@test.com');
      await createTestEmployee('Employee 2', 'emp2@test.com');

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.employees).toBeDefined();
      expect(response.body.employees.length).toBeGreaterThanOrEqual(3); // manager + 2 employees
    });

    it('should include both active and inactive employees', async () => {
      const manager = await createTestManager();
      await createTestEmployee('Active', 'active@test.com');
      await User.create({
        name: 'Inactive',
        email: 'inactive@test.com',
        password: 'password123',
        role: 'employee',
        isActive: false,
      });

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      const emails = response.body.employees.map((e: any) => e.email);
      expect(emails).toContain('active@test.com');
      expect(emails).toContain('inactive@test.com');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/employees')
        .expect(401);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('EMP-004: should return single employee by ID', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Specific', 'specific@test.com');

      const response = await request(app)
        .get(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.employee).toMatchObject({
        id: employee.id,
        name: 'Specific',
        email: 'specific@test.com',
        role: 'employee',
        isActive: true,
      });
    });

    it('EMP-005: should return 404 for non-existent employee', async () => {
      const manager = await createTestManager();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/employees/${fakeId}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should not expose password in response', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee();

      const response = await request(app)
        .get(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.employee.password).toBeUndefined();
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('EMP-006: should update employee name/email/role', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Original', 'original@test.com');

      const response = await request(app)
        .put(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'Updated Name',
          email: 'updated@test.com',
          role: 'manager',
        })
        .expect(200);

      expect(response.body.message).toBe('Employee updated successfully');
      expect(response.body.employee).toMatchObject({
        name: 'Updated Name',
        email: 'updated@test.com',
        role: 'manager',
      });

      const updated = await User.findById(employee.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.email).toBe('updated@test.com');
      expect(updated?.role).toBe('manager');
    });

    it('should allow partial updates', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Partial', 'partial@test.com');

      const response = await request(app)
        .put(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'Only Name Changed',
        })
        .expect(200);

      expect(response.body.employee.name).toBe('Only Name Changed');
      expect(response.body.employee.email).toBe('partial@test.com');
    });

    it('should reject update by non-manager', async () => {
      const employee1 = await createTestEmployee('Employee 1', 'emp1@test.com');
      const employee2 = await createTestEmployee('Employee 2', 'emp2@test.com');

      await request(app)
        .put(`/api/employees/${employee2.id}`)
        .set('Authorization', `Bearer ${employee1.token}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });

    it('should return 404 for non-existent employee', async () => {
      const manager = await createTestManager();
      const fakeId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .put(`/api/employees/${fakeId}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'New Name',
        })
        .expect(404);
    });
  });

  describe('PATCH /api/employees/:id/toggle-active', () => {
    it('EMP-007: should toggle active status from true to false', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Active', 'toggleactive@test.com');

      const response = await request(app)
        .patch(`/api/employees/${employee.id}/toggle-active`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.employee.isActive).toBe(false);
      expect(response.body.message).toContain('deactivated');
    });

    it('should toggle active status from false to true', async () => {
      const manager = await createTestManager();
      const inactive = await User.create({
        name: 'Inactive',
        email: 'toggleinactive@test.com',
        password: 'password123',
        role: 'employee',
        isActive: false,
      });

      const response = await request(app)
        .patch(`/api/employees/${inactive._id}/toggle-active`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.employee.isActive).toBe(true);
      expect(response.body.message).toContain('activated');
    });

    it('should reject toggle by non-manager', async () => {
      const employee1 = await createTestEmployee('Emp1', 'toggle1@test.com');
      const employee2 = await createTestEmployee('Emp2', 'toggle2@test.com');

      await request(app)
        .patch(`/api/employees/${employee2.id}/toggle-active`)
        .set('Authorization', `Bearer ${employee1.token}`)
        .expect(403);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('EMP-008: should delete employee without future schedules', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('ToDelete', 'todelete@test.com');

      // First check without confirm
      const checkResponse = await request(app)
        .delete(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(checkResponse.body.hasScheduleConflicts).toBe(false);

      // Then confirm delete
      const deleteResponse = await request(app)
        .delete(`/api/employees/${employee.id}?confirm=true`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(deleteResponse.body.message).toBe('Employee deleted successfully');

      const deleted = await User.findById(employee.id);
      expect(deleted).toBeNull();
    });

    it('EMP-009: should detect employee with future schedules', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('InSchedule', 'inschedule@test.com');

      // Create a future schedule with this employee
      const futureWeekStart = addDays(new Date(), 14);
      futureWeekStart.setDate(futureWeekStart.getDate() - futureWeekStart.getDay()); // Get Sunday

      const assignments = new Map();
      const dayMap = new Map();
      dayMap.set('morning', new mongoose.Types.ObjectId(employee.id));
      assignments.set('0', dayMap);

      await Schedule.create({
        weekStart: futureWeekStart,
        assignments,
        isPublished: false,
        createdBy: manager.id,
      });

      const response = await request(app)
        .delete(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.hasScheduleConflicts).toBe(true);
      expect(response.body.futureSchedules.length).toBeGreaterThan(0);
    });

    it('should not delete manager accounts', async () => {
      const manager1 = await createTestManager();
      const manager2 = await createTestUser('Manager 2', 'manager2@test.com', 'password123', 'manager');

      const response = await request(app)
        .delete(`/api/employees/${manager2.id}?confirm=true`)
        .set('Authorization', `Bearer ${manager1.token}`)
        .expect(400);

      expect(response.body.error).toContain('Cannot delete manager');
    });

    it('should reject delete by non-manager', async () => {
      const employee1 = await createTestEmployee('Emp1', 'deleteemp1@test.com');
      const employee2 = await createTestEmployee('Emp2', 'deleteemp2@test.com');

      await request(app)
        .delete(`/api/employees/${employee2.id}?confirm=true`)
        .set('Authorization', `Bearer ${employee1.token}`)
        .expect(403);
    });

    it('should return 404 for non-existent employee', async () => {
      const manager = await createTestManager();
      const fakeId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .delete(`/api/employees/${fakeId}?confirm=true`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(404);
    });

    it('should remove employee from schedules when removeFromSchedules=true', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('RemoveFromSched', 'removefromsched@test.com');

      // Create a future schedule with this employee
      const futureWeekStart = addDays(new Date(), 21);
      futureWeekStart.setDate(futureWeekStart.getDate() - futureWeekStart.getDay());

      const assignments = new Map();
      const dayMap = new Map();
      dayMap.set('morning', new mongoose.Types.ObjectId(employee.id));
      assignments.set('0', dayMap);

      const schedule = await Schedule.create({
        weekStart: futureWeekStart,
        assignments,
        isPublished: false,
        createdBy: manager.id,
      });

      // Delete with removeFromSchedules=true
      await request(app)
        .delete(`/api/employees/${employee.id}?confirm=true&removeFromSchedules=true`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      // Verify employee is removed from schedule
      const updatedSchedule = await Schedule.findById(schedule._id);
      // Mongoose returns assignments as Map at runtime
      const dayAssignments = (updatedSchedule?.assignments as unknown as Map<string, Map<string, any>>)?.get('0');
      expect(dayAssignments?.get('morning')).toBeNull();

      // Verify employee is deleted
      const deleted = await User.findById(employee.id);
      expect(deleted).toBeNull();
    });
  });
});
