import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { scheduleAPI } from '../../api/schedule.api';

const API_URL = 'http://localhost:5001/api';

const mockSchedule = {
  id: 'schedule-1',
  weekStart: '2024-01-01',
  status: 'published' as const,
  assignments: {},
  lockedAssignments: {},
  createdBy: 'manager-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Schedule API', () => {
  // Create MSW server for these tests
  const server = setupServer(
    http.get(`${API_URL}/schedules`, ({ request }) => {
      const url = new URL(request.url);
      const weekStart = url.searchParams.get('weekStart');

      return HttpResponse.json({
        schedules: weekStart ? [{ ...mockSchedule, weekStart }] : [mockSchedule],
      });
    }),

    http.get(`${API_URL}/schedules/week`, ({ request }) => {
      const url = new URL(request.url);
      const weekStart = url.searchParams.get('weekStart');

      if (weekStart === '2024-01-01') {
        return HttpResponse.json({
          schedule: { ...mockSchedule, weekStart },
        });
      }

      return HttpResponse.json({ schedule: null });
    }),

    http.post(`${API_URL}/schedules/generate`, async ({ request }) => {
      const body = await request.json();
      const { weekStart } = body as { weekStart: string };

      return HttpResponse.json({
        success: true,
        message: 'Schedule generated successfully',
        schedule: {
          ...mockSchedule,
          id: 'new-schedule-1',
          weekStart,
          status: 'draft' as const,
        },
        stats: {
          totalShifts: 21,
          assignedShifts: 20,
          unassignedShifts: 1,
          coveragePercentage: 95.2,
        },
      }, { status: 201 });
    }),

    http.put(`${API_URL}/schedules/:id`, async ({ params, request }) => {
      const { id } = params;
      const body = await request.json();

      return HttpResponse.json({
        schedule: {
          ...mockSchedule,
          id: id as string,
          ...body,
        },
      });
    }),

    http.patch(`${API_URL}/schedules/:id/publish`, ({ params }) => {
      const { id } = params;

      return HttpResponse.json({
        schedule: {
          ...mockSchedule,
          id: id as string,
          status: 'published' as const,
        },
      });
    }),

    http.patch(`${API_URL}/schedules/:id/lock`, async ({ params, request }) => {
      const { id } = params;
      const body = await request.json();
      const { day, shiftId, locked } = body as { day: number; shiftId: string; locked: boolean };

      return HttpResponse.json({
        schedule: {
          ...mockSchedule,
          id: id as string,
          lockedAssignments: {
            [day]: {
              [shiftId]: locked ? 'employee-1' : undefined,
            },
          },
        },
      });
    })
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('getAll', () => {
    it('should get all schedules', async () => {
      const result = await scheduleAPI.getAll();

      expect(result.schedules).toBeDefined();
      expect(Array.isArray(result.schedules)).toBe(true);
      expect(result.schedules.length).toBeGreaterThan(0);
    });

    it('should get schedules for specific week', async () => {
      const result = await scheduleAPI.getAll('2024-01-15');

      expect(result.schedules).toBeDefined();
      expect(result.schedules[0].weekStart).toBe('2024-01-15');
    });
  });

  describe('getByWeek', () => {
    it('should get schedule for existing week', async () => {
      const result = await scheduleAPI.getByWeek('2024-01-01');

      expect(result.schedule).toBeDefined();
      expect(result.schedule?.weekStart).toBe('2024-01-01');
    });

    it('should return null for non-existing week', async () => {
      const result = await scheduleAPI.getByWeek('2024-12-01');

      expect(result.schedule).toBeNull();
    });
  });

  describe('generate', () => {
    it('should generate a new schedule successfully', async () => {
      const result = await scheduleAPI.generate('2024-02-01');

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(result.schedule).toBeDefined();
      expect(result.schedule.weekStart).toBe('2024-02-01');
      expect(result.schedule.status).toBe('draft');
      expect(result.stats).toBeDefined();
      expect(result.stats.totalShifts).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update schedule assignments', async () => {
      const newAssignments = {
        '0': { morning: 'employee-1' },
      };

      const result = await scheduleAPI.update('schedule-1', {
        assignments: newAssignments,
      });

      expect(result.schedule).toBeDefined();
      expect(result.schedule.id).toBe('schedule-1');
      expect(result.schedule.assignments).toEqual(newAssignments);
    });

    it('should update locked assignments', async () => {
      const lockedAssignments = {
        '1': { evening: 'employee-2' },
      };

      const result = await scheduleAPI.update('schedule-1', {
        lockedAssignments,
      });

      expect(result.schedule.lockedAssignments).toEqual(lockedAssignments);
    });
  });

  describe('publish', () => {
    it('should publish a schedule', async () => {
      const result = await scheduleAPI.publish('schedule-1');

      expect(result.schedule).toBeDefined();
      expect(result.schedule.status).toBe('published');
    });
  });

  describe('lockShift', () => {
    it('should lock a shift', async () => {
      const result = await scheduleAPI.lockShift('schedule-1', {
        day: 0,
        shiftId: 'morning',
        locked: true,
      });

      expect(result.schedule).toBeDefined();
      expect(result.schedule.lockedAssignments).toBeDefined();
    });

    it('should unlock a shift', async () => {
      const result = await scheduleAPI.lockShift('schedule-1', {
        day: 1,
        shiftId: 'evening',
        locked: false,
      });

      expect(result.schedule).toBeDefined();
    });
  });
});
