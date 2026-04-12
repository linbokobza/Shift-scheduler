import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { holidayAPI } from '../../api/holiday.api';

const API_URL = 'http://localhost:5001/api';

const mockHoliday = {
  id: 'holiday-1',
  date: '2025-09-22',
  name: 'ראש השנה',
  type: 'no-work' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockHoliday2 = {
  id: 'holiday-2',
  date: '2025-04-13',
  name: 'פסח',
  type: 'morning-only' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('Holiday API', () => {
  const server = setupServer(
    http.get(`${API_URL}/holidays`, ({ request }) => {
      const url = new URL(request.url);
      const year = url.searchParams.get('year');

      if (year === '2025') {
        return HttpResponse.json({ holidays: [mockHoliday, mockHoliday2] });
      }

      return HttpResponse.json({ holidays: [mockHoliday, mockHoliday2] });
    }),

    http.post(`${API_URL}/holidays`, async ({ request }) => {
      const body = await request.json() as { date: string; name: string; type: string };
      return HttpResponse.json(
        { holiday: { id: 'new-holiday', ...body, createdAt: new Date().toISOString() } },
        { status: 201 }
      );
    }),

    http.put(`${API_URL}/holidays/:id`, async ({ params, request }) => {
      const { id } = params as { id: string };
      if (id === 'nonexistent') {
        return HttpResponse.json({ error: 'Holiday not found' }, { status: 404 });
      }
      const body = await request.json() as Partial<typeof mockHoliday>;
      return HttpResponse.json({ holiday: { ...mockHoliday, ...body, id } });
    }),

    http.delete(`${API_URL}/holidays/:id`, ({ params }) => {
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
    it('should return all holidays when no year param', async () => {
      const result = await holidayAPI.getAll();

      expect(result.holidays).toHaveLength(2);
      expect(result.holidays[0].name).toBe('ראש השנה');
    });

    it('should pass year query param when provided', async () => {
      server.use(
        http.get(`${API_URL}/holidays`, ({ request }) => {
          const url = new URL(request.url);
          const year = url.searchParams.get('year');
          expect(year).toBe('2025');
          return HttpResponse.json({ holidays: [mockHoliday] });
        })
      );

      const result = await holidayAPI.getAll('2025');
      expect(result.holidays).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a no-work holiday', async () => {
      const result = await holidayAPI.create({
        date: '2025-10-01',
        name: 'סוכות',
        type: 'no-work',
      });

      expect(result.holiday.name).toBe('סוכות');
      expect(result.holiday.type).toBe('no-work');
    });

    it('should create a morning-only holiday', async () => {
      const result = await holidayAPI.create({
        date: '2025-10-08',
        name: 'הושענא רבה',
        type: 'morning-only',
      });

      expect(result.holiday.type).toBe('morning-only');
    });
  });

  describe('update', () => {
    it('should update holiday name', async () => {
      const result = await holidayAPI.update('holiday-1', { name: 'ראש השנה - יום א' });

      expect(result.holiday.name).toBe('ראש השנה - יום א');
      expect(result.holiday.id).toBe('holiday-1');
    });

    it('should update holiday type', async () => {
      const result = await holidayAPI.update('holiday-1', { type: 'morning-only' });

      expect(result.holiday.type).toBe('morning-only');
    });

    it('should throw on 404 when holiday not found', async () => {
      await expect(
        holidayAPI.update('nonexistent', { name: 'Ghost Holiday' })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete holiday without throwing (void response)', async () => {
      await expect(holidayAPI.delete('holiday-1')).resolves.not.toThrow();
    });

    it('should throw on 404 when holiday not found', async () => {
      await expect(holidayAPI.delete('nonexistent')).rejects.toThrow();
    });
  });
});
