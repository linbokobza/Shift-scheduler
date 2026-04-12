import { describe, it, expect, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { ScheduleService } from '../../../services/schedule.service';
import { User, Availability, Vacation, Holiday, Schedule } from '../../../models';
import { createTestManager, createTestEmployee } from '../../helpers/fixtures';

// The global setup.ts provides MongoMemoryServer lifecycle (beforeAll / afterAll / afterEach)

describe('ScheduleService', () => {
  describe('convertMapToObject', () => {
    it('should convert a simple Map to a plain object', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const result = ScheduleService.convertMapToObject(map);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should recursively convert nested Maps', () => {
      const inner = new Map([['shift1', 'emp-1'], ['shift2', null]]);
      const outer = new Map([['0', inner]]);

      const result = ScheduleService.convertMapToObject(outer);
      expect(result).toEqual({ '0': { shift1: 'emp-1', shift2: null } });
    });

    it('should return input unchanged when not a Map', () => {
      const plain = { a: 1, b: 2 };
      const result = ScheduleService.convertMapToObject(plain);
      expect(result).toEqual(plain);
    });

    it('should return empty object for null input', () => {
      const result = ScheduleService.convertMapToObject(null);
      expect(result).toEqual({});
    });

    it('should return empty object for undefined input', () => {
      const result = ScheduleService.convertMapToObject(undefined);
      expect(result).toEqual({});
    });

    it('should convert ObjectId values to strings', () => {
      const objectId = new mongoose.Types.ObjectId();
      // Simulate what mongoose sends: an object with _bsontype and toString
      const objectIdLike = Object.assign(Object.create(null), {
        _bsontype: 'ObjectId',
        toString: () => objectId.toString(),
      });
      const map = new Map([['shift1', objectIdLike]]);

      const result = ScheduleService.convertMapToObject(map);
      expect(typeof result.shift1).toBe('string');
    });
  });

  describe('convertObjectToMap', () => {
    it('should convert a plain object to a Map', () => {
      const obj = { a: 1, b: 'hello' };
      const result = ScheduleService.convertObjectToMap(obj);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('a')).toBe(1);
      expect(result.get('b')).toBe('hello');
    });

    it('should recursively convert nested objects to nested Maps', () => {
      const obj = { day0: { morning: 'emp-1', evening: null } };
      const result = ScheduleService.convertObjectToMap(obj);

      expect(result.get('day0')).toBeInstanceOf(Map);
      expect(result.get('day0').get('morning')).toBe('emp-1');
      expect(result.get('day0').get('evening')).toBeNull();
    });

    it('should handle null values without converting them', () => {
      const obj = { shift1: null };
      const result = ScheduleService.convertObjectToMap(obj);

      expect(result.get('shift1')).toBeNull();
    });

    it('should handle array values without converting them to Maps', () => {
      const obj = { tags: ['a', 'b', 'c'] };
      const result = ScheduleService.convertObjectToMap(obj);

      expect(Array.isArray(result.get('tags'))).toBe(true);
      expect(result.get('tags')).toEqual(['a', 'b', 'c']);
    });

    it('should handle null/undefined input', () => {
      const resultNull = ScheduleService.convertObjectToMap(null);
      const resultUndefined = ScheduleService.convertObjectToMap(undefined);

      expect(resultNull).toBeInstanceOf(Map);
      expect(resultNull.size).toBe(0);
      expect(resultUndefined.size).toBe(0);
    });
  });

  describe('getScheduleData', () => {
    let weekStart: Date;
    let weekStartStr: string;

    beforeEach(async () => {
      // Use a fixed Sunday as weekStart
      weekStart = new Date('2025-09-07T00:00:00.000Z'); // Sunday
      weekStartStr = '2025-09-07';
    });

    it('should return only active employees with role=employee (not managers)', async () => {
      await createTestEmployee('Employee One', 'emp1@test.com');
      await createTestEmployee('Employee Two', 'emp2@test.com');
      await createTestManager(); // manager should be excluded

      const data = await ScheduleService.getScheduleData(weekStart);

      expect(data.employees).toHaveLength(2);
      expect(data.employees.every(e => e.role === 'employee')).toBe(true);
    });

    it('should exclude inactive employees', async () => {
      await createTestEmployee('Active Emp', 'active@test.com');
      // Create inactive employee directly
      await User.create({
        name: 'Inactive Emp',
        email: 'inactive@test.com',
        password: 'Password123',
        role: 'employee',
        isActive: false,
      });

      const data = await ScheduleService.getScheduleData(weekStart);

      expect(data.employees).toHaveLength(1);
      expect(data.employees[0].name).toBe('Active Emp');
    });

    it('should return availabilities for the given weekStart', async () => {
      const emp = await createTestEmployee('Emp', 'emp@test.com');
      const empId = new mongoose.Types.ObjectId(emp.id);

      await Availability.create({
        employeeId: empId,
        weekStart,
        shifts: new Map([['0', new Map([['morning', { status: 'available' }]])]]),
        submittedAt: new Date(),
      });

      const data = await ScheduleService.getScheduleData(weekStart);

      expect(data.availabilities).toHaveLength(1);
      expect(data.availabilities[0].employeeId).toBe(emp.id);
    });

    it('should return vacations that fall within the 6-day week range', async () => {
      const emp = await createTestEmployee('Emp', 'emp2@test.com');
      const empId = new mongoose.Types.ObjectId(emp.id);

      // Within week (day 2: Tuesday)
      await Vacation.create({
        employeeId: empId,
        date: new Date('2025-09-09T00:00:00.000Z'),
        type: 'vacation',
      });
      // Outside week (day 7: the following Saturday)
      await Vacation.create({
        employeeId: empId,
        date: new Date('2025-09-14T00:00:00.000Z'),
        type: 'sick',
      });

      const data = await ScheduleService.getScheduleData(weekStart);

      expect(data.vacations).toHaveLength(1);
      expect(data.vacations[0].type).toBe('vacation');
    });

    it('should return holidays in YYYY-MM-DD string format', async () => {
      await Holiday.create({
        date: '2025-09-08',
        name: 'Test Holiday',
        type: 'no-work',
      });

      const data = await ScheduleService.getScheduleData(weekStart);

      expect(data.holidays).toHaveLength(1);
      expect(data.holidays[0].date).toBe('2025-09-08');
      expect(typeof data.holidays[0].date).toBe('string');
    });

    it('should return weekStart as formatted YYYY-MM-DD string', async () => {
      const data = await ScheduleService.getScheduleData(weekStart);
      expect(data.weekStart).toBe(weekStartStr);
    });
  });

  describe('saveSchedule', () => {
    let managerId: mongoose.Types.ObjectId;
    let weekStart: Date;

    beforeEach(async () => {
      const manager = await createTestManager();
      managerId = new mongoose.Types.ObjectId(manager.id);
      weekStart = new Date('2025-09-07T00:00:00.000Z');
    });

    it('should create a new schedule document in the DB', async () => {
      const assignments = { '0': { morning: null, evening: null } };

      await ScheduleService.saveSchedule(weekStart, assignments, null, managerId);

      const schedules = await Schedule.find({});
      expect(schedules).toHaveLength(1);
    });

    it('should delete existing schedule for same week before creating', async () => {
      const assignments = { '0': { morning: null } };

      // Create first schedule
      await ScheduleService.saveSchedule(weekStart, assignments, null, managerId);
      // Create second (should replace)
      await ScheduleService.saveSchedule(weekStart, { '1': { evening: null } }, null, managerId);

      const schedules = await Schedule.find({});
      expect(schedules).toHaveLength(1);
    });

    it('should store lockedAssignments as Map when provided', async () => {
      const assignments = { '0': { morning: null } };
      const lockedAssignments = { '0': { morning: true } };

      const schedule = await ScheduleService.saveSchedule(
        weekStart, assignments, lockedAssignments, managerId
      );

      expect(schedule.lockedAssignments).toBeDefined();
    });

    it('should store frozenAssignments as Map when provided', async () => {
      const assignments = { '0': { morning: null } };
      const frozenAssignments = { '0': { morning: true } };

      const schedule = await ScheduleService.saveSchedule(
        weekStart, assignments, null, managerId, undefined, frozenAssignments
      );

      expect(schedule.frozenAssignments).toBeDefined();
    });

    it('should return an ISchedule document', async () => {
      const assignments = { '0': { morning: null } };

      const schedule = await ScheduleService.saveSchedule(weekStart, assignments, null, managerId);

      expect(schedule._id).toBeDefined();
      expect(schedule.weekStart).toBeDefined();
      expect(schedule.isPublished).toBe(false);
    });

    it('should store optimizationScore when provided', async () => {
      const assignments = { '0': { morning: null } };

      const schedule = await ScheduleService.saveSchedule(
        weekStart, assignments, null, managerId, 0.95
      );

      expect(schedule.optimizationScore).toBe(0.95);
    });
  });

  describe('scheduleToDTO', () => {
    let managerId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const manager = await createTestManager();
      managerId = new mongoose.Types.ObjectId(manager.id);
    });

    const createSchedule = async (weekStart: Date, extras: Record<string, any> = {}) => {
      const assignments = new Map([
        ['0', new Map([['morning', null], ['evening', null]])],
      ]);
      return await Schedule.create({
        weekStart,
        assignments,
        isPublished: false,
        createdBy: managerId,
        ...extras,
      });
    };

    it('should convert schedule _id to string id field', async () => {
      const schedule = await createSchedule(new Date('2025-09-07T00:00:00.000Z'));

      const dto = ScheduleService.scheduleToDTO(schedule);

      expect(typeof dto.id).toBe('string');
      expect(dto.id).toBe(schedule._id.toString());
    });

    it('should convert assignments Map to plain object', async () => {
      const schedule = await createSchedule(new Date('2025-09-07T00:00:00.000Z'));

      const dto = ScheduleService.scheduleToDTO(schedule);

      expect(typeof dto.assignments).toBe('object');
      expect(dto.assignments).not.toBeInstanceOf(Map);
    });

    it('should include createdAt and updatedAt as ISO strings', async () => {
      const schedule = await createSchedule(new Date('2025-09-07T00:00:00.000Z'));

      const dto = ScheduleService.scheduleToDTO(schedule);

      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
      expect(new Date(dto.createdAt).getTime()).not.toBeNaN();
    });

    it('should return undefined for lockedAssignments when not present', async () => {
      const schedule = await createSchedule(new Date('2025-09-07T00:00:00.000Z'));

      const dto = ScheduleService.scheduleToDTO(schedule);

      expect(dto.lockedAssignments).toBeUndefined();
    });

    it('should include isPublished flag', async () => {
      const schedule = await createSchedule(new Date('2025-09-07T00:00:00.000Z'));

      const dto = ScheduleService.scheduleToDTO(schedule);

      expect(dto.isPublished).toBe(false);
    });

    it('should include optimizationScore when present', async () => {
      const schedule = await createSchedule(new Date('2025-09-07T00:00:00.000Z'), {
        optimizationScore: 0.87,
      });

      const dto = ScheduleService.scheduleToDTO(schedule);

      expect(dto.optimizationScore).toBe(0.87);
    });

    it('should format weekStart as YYYY-MM-DD string', async () => {
      const schedule = await createSchedule(new Date('2025-09-07T00:00:00.000Z'));

      const dto = ScheduleService.scheduleToDTO(schedule);

      expect(dto.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
