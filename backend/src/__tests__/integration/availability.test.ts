import request from 'supertest';
import { app } from '../../server';
import { createTestEmployee, createTestManager, getWeekStart } from '../helpers/fixtures';

describe('Availability API', () => {
  describe('POST /api/availabilities', () => {
    it('should allow employee to submit availability', async () => {
      const employee = await createTestEmployee();
      const weekStart = getWeekStart();

      const response = await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': {
              morning: { status: 'available', comment: '' },
              evening: { status: 'available', comment: '' },
              night: { status: 'unavailable', comment: 'Family commitment' },
            },
            '1': {
              morning: { status: 'available', comment: '' },
              evening: { status: 'available', comment: '' },
              night: { status: 'available', comment: '' },
            },
          },
        })
        .expect(201);

      expect(response.body.message).toContain('successfully');
      expect(response.body.availability).toBeDefined();
      expect(response.body.availability.weekStart).toBe(weekStart);
      expect(response.body.availability.employeeId).toBe(employee.id);
    });

    it('should reject availability submission without authentication', async () => {
      const weekStart = getWeekStart();

      const response = await request(app)
        .post('/api/availabilities')
        .send({
          employeeId: 'test-id',
          weekStart,
          shifts: {},
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject availability with missing weekStart', async () => {
      const employee = await createTestEmployee();

      const response = await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          shifts: {},
        })
        .expect(400);

      expect(response.body.error).toContain('weekStart');
    });
  });

  describe('GET /api/availabilities', () => {
    it('should allow manager to view all availabilities', async () => {
      const manager = await createTestManager();
      const employee1 = await createTestEmployee('Emp 1', 'emp1@av.com');
      const employee2 = await createTestEmployee('Emp 2', 'emp2@av.com');
      const weekStart = getWeekStart();

      // Submit availabilities
      await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee1.token}`)
        .send({
          employeeId: employee1.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        });

      await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee2.token}`)
        .send({
          employeeId: employee2.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        });

      // Manager gets all availabilities
      const response = await request(app)
        .get(`/api/availabilities?weekStart=${weekStart}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.availabilities).toBeDefined();
      expect(response.body.availabilities.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow employee to view their own availability', async () => {
      const employee = await createTestEmployee();
      const weekStart = getWeekStart();

      // Submit availability
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

      // Get own availability
      const response = await request(app)
        .get(`/api/availabilities?weekStart=${weekStart}`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);

      expect(response.body.availabilities).toBeDefined();
      expect(response.body.availabilities.length).toBeGreaterThan(0);
      // Employee should see their own availability
      const ownAvailability = response.body.availabilities.find(
        (av: any) => av.employeeId === employee.id
      );
      expect(ownAvailability).toBeDefined();
    });
  });

  describe('PUT /api/availabilities/:id', () => {
    it('should allow employee to update their availability', async () => {
      const employee = await createTestEmployee();
      const weekStart = getWeekStart();

      // Create availability
      const createResponse = await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        })
        .expect(201);

      const availabilityId = createResponse.body.availability.id;

      // Update it
      const response = await request(app)
        .put(`/api/availabilities/${availabilityId}`)
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          shifts: {
            '0': {
              morning: { status: 'unavailable', comment: 'Changed my mind' },
              evening: { status: 'available', comment: '' },
            },
          },
        })
        .expect(200);

      expect(response.body.message).toContain('updated');
      expect(response.body.availability.shifts['0'].morning.status).toBe('unavailable');
    });

    it('should not allow employee to update another employee availability', async () => {
      const employee1 = await createTestEmployee('Emp 1', 'emp1@upd.com');
      const employee2 = await createTestEmployee('Emp 2', 'emp2@upd.com');
      const weekStart = getWeekStart();

      // Employee 1 creates availability
      const createResponse = await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee1.token}`)
        .send({
          employeeId: employee1.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        })
        .expect(201);

      const availabilityId = createResponse.body.availability.id;

      // Employee 2 tries to update it - should fail
      const response = await request(app)
        .put(`/api/availabilities/${availabilityId}`)
        .set('Authorization', `Bearer ${employee2.token}`)
        .send({
          shifts: {
            '0': { morning: { status: 'unavailable' } },
          },
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/availabilities/:id', () => {
    it('should allow manager to delete availability', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee();
      const weekStart = getWeekStart();

      // Create availability
      const createResponse = await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        })
        .expect(201);

      const availabilityId = createResponse.body.availability.id;

      // Manager deletes it
      const response = await request(app)
        .delete(`/api/availabilities/${availabilityId}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify it's gone
      const getResponse = await request(app)
        .get(`/api/availabilities?weekStart=${weekStart}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      const deletedAvailability = getResponse.body.availabilities.find(
        (av: any) => av.id === availabilityId
      );
      expect(deletedAvailability).toBeUndefined();
    });

    it('should allow employee to delete their own availability', async () => {
      const employee = await createTestEmployee();
      const weekStart = getWeekStart();

      // Create availability
      const createResponse = await request(app)
        .post('/api/availabilities')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          employeeId: employee.id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' } },
          },
        })
        .expect(201);

      const availabilityId = createResponse.body.availability.id;

      // Employee deletes their own availability - should succeed
      const response = await request(app)
        .delete(`/api/availabilities/${availabilityId}`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');
    });
  });
});
