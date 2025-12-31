import request from 'supertest';
import { app } from '../../server';
import { createTestEmployee, createTestManager, getWeekStart } from '../helpers/fixtures';

describe('Schedule API', () => {
  describe('POST /api/schedules/generate', () => {
    it('should allow manager to generate schedule', async () => {
      const manager = await createTestManager();
      const employees = await Promise.all([
        createTestEmployee('Schedule Emp 1', 'schemp1@test.com'),
        createTestEmployee('Schedule Emp 2', 'schemp2@test.com'),
        createTestEmployee('Schedule Emp 3', 'schemp3@test.com'),
      ]);

      const weekStart = getWeekStart();

      // Submit availabilities for all employees
      for (const emp of employees) {
        await request(app)
          .post('/api/availabilities')
          .set('Authorization', `Bearer ${emp.token}`)
          .send({
            employeeId: emp.id,
            weekStart,
            shifts: {
              '0': {
                morning: { status: 'available' },
                evening: { status: 'available' },
                night: { status: 'available' },
              },
              '1': {
                morning: { status: 'available' },
                evening: { status: 'available' },
                night: { status: 'available' },
              },
              '2': {
                morning: { status: 'available' },
                evening: { status: 'available' },
                night: { status: 'available' },
              },
            },
          });
      }

      // Generate schedule
      const response = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ weekStart })
        .expect(201);

      expect(response.body.message).toContain('generated');
      expect(response.body.schedule).toBeDefined();
      expect(response.body.schedule.weekStart).toBe(weekStart);
      expect(response.body.schedule.assignments).toBeDefined();
      expect(response.body.schedule.isPublished).toBe(false);
    });

    it('should not allow employee to generate schedule', async () => {
      const employee = await createTestEmployee();
      const weekStart = getWeekStart();

      const response = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({ weekStart })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/schedules/week', () => {
    it('should allow anyone to view published schedule', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('View Emp', 'viewemp@test.com');
      const weekStart = getWeekStart();

      // Create availability
      await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        });

      // Generate schedule
      const generateResponse = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ weekStart })
        .expect(201);

      const scheduleId = generateResponse.body.schedule.id;

      // Publish it
      await request(app)
        .patch(`/api/schedules/${scheduleId}/publish`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      // Employee views published schedule
      const viewResponse = await request(app)
        .get(`/api/schedules/week?weekStart=${weekStart}`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);

      expect(viewResponse.body.schedule).toBeDefined();
      expect(viewResponse.body.schedule.isPublished).toBe(true);
    });
  });

  describe('PATCH /api/schedules/:id/publish', () => {
    it('should allow manager to publish schedule', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Pub Emp', 'pubemp@test.com');
      const weekStart = getWeekStart();

      // Create availability
      await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        });

      // Generate schedule
      const generateResponse = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ weekStart })
        .expect(201);

      const scheduleId = generateResponse.body.schedule.id;

      // Publish it
      const response = await request(app)
        .patch(`/api/schedules/${scheduleId}/publish`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.message).toContain('published');
      expect(response.body.schedule.isPublished).toBe(true);
    });

    it('should not allow employee to publish schedule', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Emp Pub', 'emppub@test.com');
      const weekStart = getWeekStart();

      // Create availability
      await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        });

      // Manager generates schedule
      const generateResponse = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ weekStart })
        .expect(201);

      const scheduleId = generateResponse.body.schedule.id;

      // Employee tries to publish - should fail
      await request(app)
        .patch(`/api/schedules/${scheduleId}/publish`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(403);
    });
  });

  describe('PUT /api/schedules/:id', () => {
    it('should allow manager to manually update schedule', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Update Emp', 'updateemp@test.com');
      const weekStart = getWeekStart();

      // Create availability
      await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': {
              morning: { status: 'available' },
              evening: { status: 'available' },
            },
          },
        });

      // Generate schedule
      const generateResponse = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ weekStart })
        .expect(201);

      const scheduleId = generateResponse.body.schedule.id;

      // Update manually
      const response = await request(app)
        .put(`/api/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          assignments: {
            '0': {
              morning: employee.id,
              evening: null,
              night: null,
            },
          },
        })
        .expect(200);

      expect(response.body.message).toContain('updated');
      expect(response.body.schedule.assignments['0'].morning).toBe(employee.id);
    });
  });

  describe('PATCH /api/schedules/:id/lock', () => {
    it('should allow manager to lock/unlock specific shifts', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Lock Emp', 'lockemp@test.com');
      const weekStart = getWeekStart();

      // Create availability
      await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        });

      // Generate schedule
      const generateResponse = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ weekStart })
        .expect(201);

      const scheduleId = generateResponse.body.schedule.id;

      // Lock a shift
      const response = await request(app)
        .patch(`/api/schedules/${scheduleId}/lock`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          day: 0,
          shiftId: 'morning',
          locked: true,
        })
        .expect(200);

      expect(response.body.message).toContain('locked');
    });

    it('should not allow employee to lock shifts', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('Emp Lock', 'emplock@test.com');
      const weekStart = getWeekStart();

      // Create availability
      await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        });

      // Manager generates schedule
      const generateResponse = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ weekStart })
        .expect(201);

      const scheduleId = generateResponse.body.schedule.id;

      // Employee tries to lock - should fail
      await request(app)
        .patch(`/api/schedules/${scheduleId}/lock`)
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          day: 0,
          shiftId: 'morning',
          locked: true,
        })
        .expect(403);
    });
  });
});
