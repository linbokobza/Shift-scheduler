import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { vacationAPI } from '../../api/vacation.api';

const API_URL = 'http://localhost:5001/api';

const mockVacation = {
  id: 'vac-1',
  employeeId: 'emp-1',
  date: '2025-09-10',
  type: 'vacation' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockSick = {
  id: 'vac-2',
  employeeId: 'emp-2',
  date: '2025-09-11',
  type: 'sick' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('Vacation API', () => {
  const server = setupServer(
    http.get(`${API_URL}/vacations`, ({ request }) => {
      const url = new URL(request.url);
      const employeeId = url.searchParams.get('employeeId');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');

      if (employeeId === 'emp-1') {
        return HttpResponse.json({ vacations: [mockVacation] });
      }

      if (startDate && endDate) {
        return HttpResponse.json({ vacations: [mockVacation] });
      }

      return HttpResponse.json({ vacations: [mockVacation, mockSick] });
    }),

    http.post(`${API_URL}/vacations`, async ({ request }) => {
      const body = await request.json() as { employeeId: string; date: string; type: string };
      return HttpResponse.json(
        { vacation: { id: 'new-vac', ...body, createdAt: new Date().toISOString() } },
        { status: 201 }
      );
    }),

    http.delete(`${API_URL}/vacations/:id`, ({ params }) => {
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
    it('should return all vacations when no params', async () => {
      const result = await vacationAPI.getAll();

      expect(result.vacations).toHaveLength(2);
    });

    it('should filter by employeeId when provided', async () => {
      const result = await vacationAPI.getAll({ employeeId: 'emp-1' });

      expect(result.vacations).toHaveLength(1);
      expect(result.vacations[0].employeeId).toBe('emp-1');
    });

    it('should filter by startDate and endDate when provided', async () => {
      const result = await vacationAPI.getAll({
        startDate: '2025-09-07',
        endDate: '2025-09-13',
      });

      expect(result.vacations).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a vacation day entry', async () => {
      const result = await vacationAPI.create({
        employeeId: 'emp-1',
        date: '2025-09-15',
        type: 'vacation',
      });

      expect(result.vacation.employeeId).toBe('emp-1');
      expect(result.vacation.type).toBe('vacation');
    });

    it('should create a sick day entry (type: sick)', async () => {
      const result = await vacationAPI.create({
        employeeId: 'emp-1',
        date: '2025-09-16',
        type: 'sick',
      });

      expect(result.vacation.type).toBe('sick');
    });
  });

  describe('delete', () => {
    it('should delete vacation entry without throwing (void response)', async () => {
      await expect(vacationAPI.delete('vac-1')).resolves.not.toThrow();
    });

    it('should throw on 404 when vacation entry not found', async () => {
      await expect(vacationAPI.delete('nonexistent')).rejects.toThrow();
    });
  });
});
