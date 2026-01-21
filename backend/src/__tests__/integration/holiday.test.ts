import request from 'supertest';
import { app } from '../../server';
import { Holiday } from '../../models';
import { createTestManager, createTestEmployee } from '../helpers/fixtures';
import mongoose from 'mongoose';

describe('Holiday API', () => {
  describe('GET /api/holidays', () => {
    it('should return all holidays', async () => {
      const manager = await createTestManager();

      await Holiday.create({ date: '2025-01-01', name: 'New Year', type: 'no-work' });
      await Holiday.create({ date: '2025-04-14', name: 'Passover', type: 'morning-only' });

      const response = await request(app)
        .get('/api/holidays')
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.holidays).toBeDefined();
      expect(response.body.holidays.length).toBe(2);
    });

    it('should filter holidays by year', async () => {
      const manager = await createTestManager();

      await Holiday.create({ date: '2024-12-25', name: 'Hanukkah 2024', type: 'no-work' });
      await Holiday.create({ date: '2025-01-01', name: 'New Year 2025', type: 'no-work' });
      await Holiday.create({ date: '2025-09-23', name: 'Rosh Hashanah', type: 'no-work' });

      const response = await request(app)
        .get('/api/holidays?year=2025')
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.holidays.length).toBe(2);
      response.body.holidays.forEach((h: any) => {
        expect(h.date).toMatch(/^2025-/);
      });
    });

    it('should sort holidays by date', async () => {
      const manager = await createTestManager();

      await Holiday.create({ date: '2025-12-01', name: 'Later', type: 'no-work' });
      await Holiday.create({ date: '2025-01-01', name: 'Earlier', type: 'no-work' });
      await Holiday.create({ date: '2025-06-15', name: 'Middle', type: 'no-work' });

      const response = await request(app)
        .get('/api/holidays')
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.holidays[0].date).toBe('2025-01-01');
      expect(response.body.holidays[1].date).toBe('2025-06-15');
      expect(response.body.holidays[2].date).toBe('2025-12-01');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/holidays')
        .expect(401);
    });

    it('should allow employees to view holidays', async () => {
      const employee = await createTestEmployee('HolEmployee', 'holemployee@test.com');

      const response = await request(app)
        .get('/api/holidays')
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);

      expect(response.body.holidays).toBeDefined();
    });
  });

  describe('POST /api/holidays', () => {
    it('HOL-001: should create holiday with no-work type (manager)', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          date: '2025-09-25',
          name: 'Yom Kippur',
          type: 'no-work',
        })
        .expect(201);

      expect(response.body.message).toBe('Holiday created successfully');
      expect(response.body.holiday).toMatchObject({
        date: '2025-09-25',
        name: 'Yom Kippur',
        type: 'no-work',
      });

      const holiday = await Holiday.findOne({ date: '2025-09-25' });
      expect(holiday).toBeDefined();
      expect(holiday?.name).toBe('Yom Kippur');
    });

    it('HOL-002: should create holiday with morning-only type', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          date: '2025-04-20',
          name: 'Holiday Eve',
          type: 'morning-only',
        })
        .expect(201);

      expect(response.body.holiday.type).toBe('morning-only');
    });

    it('should reject creation with missing required fields', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          date: '2025-05-01',
          name: 'Missing Type',
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should reject invalid date format', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          date: '01-25-2025', // Wrong format
          name: 'Bad Format',
          type: 'no-work',
        })
        .expect(400);

      expect(response.body.error).toContain('YYYY-MM-DD');
    });

    it('should reject invalid date format (slash separator)', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          date: '2025/01/25',
          name: 'Slash Date',
          type: 'no-work',
        })
        .expect(400);

      expect(response.body.error).toContain('YYYY-MM-DD');
    });

    it('should reject holiday creation by non-manager', async () => {
      const employee = await createTestEmployee('NoHolCreate', 'noholcreate@test.com');

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          date: '2025-05-15',
          name: 'Employee Holiday',
          type: 'no-work',
        })
        .expect(403);

      expect(response.body.error.toLowerCase()).toContain('manager');
    });
  });

  describe('PUT /api/holidays/:id', () => {
    it('HOL-004: should update holiday name and type', async () => {
      const manager = await createTestManager();

      const holiday = await Holiday.create({
        date: '2025-07-01',
        name: 'Original Name',
        type: 'no-work',
      });

      const response = await request(app)
        .put(`/api/holidays/${holiday._id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'Updated Name',
          type: 'morning-only',
        })
        .expect(200);

      expect(response.body.message).toBe('Holiday updated successfully');
      expect(response.body.holiday.name).toBe('Updated Name');
      expect(response.body.holiday.type).toBe('morning-only');

      const updated = await Holiday.findById(holiday._id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.type).toBe('morning-only');
    });

    it('should allow partial updates (name only)', async () => {
      const manager = await createTestManager();

      const holiday = await Holiday.create({
        date: '2025-07-15',
        name: 'Partial Update',
        type: 'no-work',
      });

      const response = await request(app)
        .put(`/api/holidays/${holiday._id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'Only Name Changed',
        })
        .expect(200);

      expect(response.body.holiday.name).toBe('Only Name Changed');
      expect(response.body.holiday.type).toBe('no-work');
    });

    it('should allow partial updates (type only)', async () => {
      const manager = await createTestManager();

      const holiday = await Holiday.create({
        date: '2025-07-20',
        name: 'Type Update',
        type: 'no-work',
      });

      const response = await request(app)
        .put(`/api/holidays/${holiday._id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          type: 'morning-only',
        })
        .expect(200);

      expect(response.body.holiday.name).toBe('Type Update');
      expect(response.body.holiday.type).toBe('morning-only');
    });

    it('should return 404 for non-existent holiday', async () => {
      const manager = await createTestManager();
      const fakeId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .put(`/api/holidays/${fakeId}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          name: 'New Name',
        })
        .expect(404);
    });

    it('should reject update by non-manager', async () => {
      const employee = await createTestEmployee('NoUpdate', 'noupdate@test.com');

      const holiday = await Holiday.create({
        date: '2025-08-01',
        name: 'No Update',
        type: 'no-work',
      });

      await request(app)
        .put(`/api/holidays/${holiday._id}`)
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });
  });

  describe('DELETE /api/holidays/:id', () => {
    it('HOL-005: should delete holiday (manager)', async () => {
      const manager = await createTestManager();

      const holiday = await Holiday.create({
        date: '2025-10-01',
        name: 'To Delete',
        type: 'no-work',
      });

      const response = await request(app)
        .delete(`/api/holidays/${holiday._id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.message).toBe('Holiday deleted successfully');

      const deleted = await Holiday.findById(holiday._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent holiday', async () => {
      const manager = await createTestManager();
      const fakeId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .delete(`/api/holidays/${fakeId}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(404);
    });

    it('should reject deletion by non-manager', async () => {
      const employee = await createTestEmployee('NoDelete', 'nodelete@test.com');

      const holiday = await Holiday.create({
        date: '2025-10-15',
        name: 'No Delete',
        type: 'no-work',
      });

      await request(app)
        .delete(`/api/holidays/${holiday._id}`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(403);

      // Verify not deleted
      const stillExists = await Holiday.findById(holiday._id);
      expect(stillExists).not.toBeNull();
    });
  });
});
