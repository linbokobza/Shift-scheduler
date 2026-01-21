import request from 'supertest';
import { app } from '../../server';
import { Vacation } from '../../models';
import { createTestManager, createTestEmployee } from '../helpers/fixtures';
import mongoose from 'mongoose';

describe('Vacation API', () => {
  describe('GET /api/vacations', () => {
    it('should return all vacations', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('VacEmployee', 'vacemployee@test.com');

      // Create some vacations
      await Vacation.create({
        employeeId: employee.id,
        date: new Date('2025-02-15'),
        type: 'vacation',
      });
      await Vacation.create({
        employeeId: employee.id,
        date: new Date('2025-02-16'),
        type: 'sick',
      });

      const response = await request(app)
        .get('/api/vacations')
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.vacations).toBeDefined();
      expect(response.body.vacations.length).toBe(2);
    });

    it('should filter vacations by employeeId', async () => {
      const manager = await createTestManager();
      const employee1 = await createTestEmployee('Emp1', 'vacemp1@test.com');
      const employee2 = await createTestEmployee('Emp2', 'vacemp2@test.com');

      await Vacation.create({ employeeId: employee1.id, date: new Date('2025-03-01'), type: 'vacation' });
      await Vacation.create({ employeeId: employee2.id, date: new Date('2025-03-02'), type: 'vacation' });

      const response = await request(app)
        .get(`/api/vacations?employeeId=${employee1.id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.vacations.length).toBe(1);
      expect(response.body.vacations[0].employeeId).toBe(employee1.id);
    });

    it('should filter vacations by date range', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('DateRange', 'daterange@test.com');

      await Vacation.create({ employeeId: employee.id, date: new Date('2025-01-01'), type: 'vacation' });
      await Vacation.create({ employeeId: employee.id, date: new Date('2025-02-15'), type: 'vacation' });
      await Vacation.create({ employeeId: employee.id, date: new Date('2025-03-01'), type: 'vacation' });

      const response = await request(app)
        .get('/api/vacations?startDate=2025-02-01&endDate=2025-02-28')
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.vacations.length).toBe(1);
      expect(response.body.vacations[0].date).toBe('2025-02-15');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/vacations')
        .expect(401);
    });

    it('should allow employees to view vacations', async () => {
      const employee = await createTestEmployee('ViewVac', 'viewvac@test.com');

      const response = await request(app)
        .get('/api/vacations')
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);

      expect(response.body.vacations).toBeDefined();
    });
  });

  describe('POST /api/vacations', () => {
    it('VAC-001: should create vacation for employee (manager)', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('NewVac', 'newvac@test.com');

      const response = await request(app)
        .post('/api/vacations')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          employeeId: employee.id,
          date: '2025-04-15',
          type: 'vacation',
        })
        .expect(201);

      expect(response.body.message).toBe('Vacation created successfully');
      expect(response.body.vacation).toMatchObject({
        employeeId: employee.id,
        date: '2025-04-15',
        type: 'vacation',
      });

      const vacation = await Vacation.findOne({ employeeId: employee.id });
      expect(vacation).toBeDefined();
    });

    it('should create sick day', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('SickDay', 'sickday@test.com');

      const response = await request(app)
        .post('/api/vacations')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          employeeId: employee.id,
          date: '2025-04-20',
          type: 'sick',
        })
        .expect(201);

      expect(response.body.vacation.type).toBe('sick');
    });

    it('should default to vacation type if not specified', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('DefaultType', 'defaulttype@test.com');

      const response = await request(app)
        .post('/api/vacations')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          employeeId: employee.id,
          date: '2025-04-25',
        })
        .expect(201);

      expect(response.body.vacation.type).toBe('vacation');
    });

    it('VAC-002: should reject creation with missing required fields', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/vacations')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          employeeId: new mongoose.Types.ObjectId().toString(),
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should reject creation without employeeId', async () => {
      const manager = await createTestManager();

      const response = await request(app)
        .post('/api/vacations')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          date: '2025-05-01',
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('VAC-004: should reject vacation creation by non-manager', async () => {
      const employee1 = await createTestEmployee('NonMgr1', 'nonmgr1@test.com');
      const employee2 = await createTestEmployee('NonMgr2', 'nonmgr2@test.com');

      const response = await request(app)
        .post('/api/vacations')
        .set('Authorization', `Bearer ${employee1.token}`)
        .send({
          employeeId: employee2.id,
          date: '2025-05-15',
          type: 'vacation',
        })
        .expect(403);

      expect(response.body.error.toLowerCase()).toContain('manager');
    });
  });

  describe('DELETE /api/vacations/:id', () => {
    it('VAC-003: should delete vacation (manager)', async () => {
      const manager = await createTestManager();
      const employee = await createTestEmployee('DelVac', 'delvac@test.com');

      const vacation = await Vacation.create({
        employeeId: employee.id,
        date: new Date('2025-06-01'),
        type: 'vacation',
      });

      const response = await request(app)
        .delete(`/api/vacations/${vacation._id}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(200);

      expect(response.body.message).toBe('Vacation deleted successfully');

      const deleted = await Vacation.findById(vacation._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent vacation', async () => {
      const manager = await createTestManager();
      const fakeId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .delete(`/api/vacations/${fakeId}`)
        .set('Authorization', `Bearer ${manager.token}`)
        .expect(404);
    });

    it('should reject deletion by non-manager', async () => {
      const employee = await createTestEmployee('NoDelVac', 'nodelvac@test.com');

      const vacation = await Vacation.create({
        employeeId: employee.id,
        date: new Date('2025-06-15'),
        type: 'vacation',
      });

      await request(app)
        .delete(`/api/vacations/${vacation._id}`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(403);

      // Verify not deleted
      const stillExists = await Vacation.findById(vacation._id);
      expect(stillExists).not.toBeNull();
    });
  });
});
