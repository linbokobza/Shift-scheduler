import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { availabilityAPI } from '../../api/availability.api';

const API_URL = 'http://localhost:5001/api';

const mockAvailability = {
  id: 'av-1',
  employeeId: 'emp-1',
  weekStart: '2025-09-07',
  shifts: {
    '0': { morning: { status: 'available', comment: '' } },
    '1': { morning: { status: 'unavailable' } },
  },
};

describe('Availability API', () => {
  const server = setupServer(
    http.get(`${API_URL}/availabilities`, ({ request }) => {
      const url = new URL(request.url);
      const weekStart = url.searchParams.get('weekStart');

      if (weekStart === '2025-09-07') {
        return HttpResponse.json({ availabilities: [mockAvailability] });
      }

      return HttpResponse.json({ availabilities: [mockAvailability, { ...mockAvailability, id: 'av-2' }] });
    }),

    http.get(`${API_URL}/availabilities/:employeeId`, ({ params, request }) => {
      const { employeeId } = params as { employeeId: string };
      const url = new URL(request.url);
      const weekStart = url.searchParams.get('weekStart');

      if (employeeId === 'emp-no-availability') {
        return HttpResponse.json({ availability: null });
      }

      return HttpResponse.json({ availability: { ...mockAvailability, employeeId, weekStart } });
    }),

    http.post(`${API_URL}/availabilities`, async ({ request }) => {
      const body = await request.json() as typeof mockAvailability;
      return HttpResponse.json(
        { availability: { ...mockAvailability, ...body, id: 'new-av-1' } },
        { status: 201 }
      );
    }),

    http.put(`${API_URL}/availabilities/:id`, async ({ params, request }) => {
      const { id } = params as { id: string };
      if (id === 'nonexistent') {
        return HttpResponse.json({ error: 'Availability not found' }, { status: 404 });
      }
      const body = await request.json() as { shifts: typeof mockAvailability['shifts'] };
      return HttpResponse.json({ availability: { ...mockAvailability, id, shifts: body.shifts } });
    }),

    http.delete(`${API_URL}/availabilities/:id`, ({ params }) => {
      const { id } = params as { id: string };
      if (id === 'nonexistent') {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return new HttpResponse(null, { status: 204 });
    })
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('getAll', () => {
    it('should return all availabilities when no weekStart provided', async () => {
      const result = await availabilityAPI.getAll();

      expect(result.availabilities).toHaveLength(2);
    });

    it('should filter by weekStart when provided', async () => {
      const result = await availabilityAPI.getAll('2025-09-07');

      expect(result.availabilities).toHaveLength(1);
      expect(result.availabilities[0].weekStart).toBe('2025-09-07');
    });
  });

  describe('getByEmployee', () => {
    it('should return availability for given employee and week', async () => {
      const result = await availabilityAPI.getByEmployee('emp-1', '2025-09-07');

      expect(result.availability).not.toBeNull();
      expect(result.availability?.employeeId).toBe('emp-1');
    });

    it('should return null availability when employee has not submitted', async () => {
      const result = await availabilityAPI.getByEmployee('emp-no-availability', '2025-09-07');

      expect(result.availability).toBeNull();
    });
  });

  describe('create', () => {
    it('should create availability and return created object', async () => {
      const result = await availabilityAPI.create({
        employeeId: 'emp-1',
        weekStart: '2025-09-14',
        shifts: { '0': { morning: { status: 'available' } } } as any,
      });

      expect(result.availability.id).toBe('new-av-1');
      expect(result.availability.employeeId).toBe('emp-1');
    });

    it('should include shifts structure in returned object', async () => {
      const shifts = { '0': { morning: { status: 'available' as const } } };
      const result = await availabilityAPI.create({
        employeeId: 'emp-1',
        weekStart: '2025-09-14',
        shifts: shifts as any,
      });

      expect(result.availability.shifts).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update shifts and return updated availability', async () => {
      const newShifts = { '0': { morning: { status: 'unavailable' as const } } };
      const result = await availabilityAPI.update('av-1', { shifts: newShifts as any });

      expect(result.availability.id).toBe('av-1');
    });

    it('should throw on 404 when availability not found', async () => {
      await expect(
        availabilityAPI.update('nonexistent', { shifts: {} as any })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete availability without throwing (void response)', async () => {
      await expect(availabilityAPI.delete('av-1')).resolves.not.toThrow();
    });

    it('should throw on 404 when availability not found', async () => {
      await expect(availabilityAPI.delete('nonexistent')).rejects.toThrow();
    });
  });
});
