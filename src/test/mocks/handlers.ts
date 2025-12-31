import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:5001/api';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        success: true,
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'employee',
        },
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Registration successful',
      user: body,
    }, { status: 201 });
  }),

  http.get(`${API_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'employee',
    });
  }),

  // Availability endpoints
  http.post(`${API_URL}/availabilities`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Availability submitted successfully',
      availability: {
        id: 'availability-1',
        ...body,
      },
    }, { status: 201 });
  }),

  http.get(`${API_URL}/availabilities`, ({ request }) => {
    const url = new URL(request.url);
    const weekStart = url.searchParams.get('weekStart');

    return HttpResponse.json({
      availabilities: [
        {
          id: 'availability-1',
          employeeId: 'user-1',
          weekStart: weekStart || '2024-01-01',
          shifts: {
            '0': {
              morning: { status: 'available', comment: '' },
              evening: { status: 'available', comment: '' },
              night: { status: 'unavailable', comment: '' },
            },
          },
        },
      ],
    });
  }),

  // Schedule endpoints
  http.get(`${API_URL}/schedules`, ({ request }) => {
    const url = new URL(request.url);
    const weekStart = url.searchParams.get('weekStart');

    return HttpResponse.json({
      schedules: [
        {
          id: 'schedule-1',
          weekStart: weekStart || '2024-01-01',
          status: 'published',
          assignments: {},
          createdBy: 'manager-1',
        },
      ],
    });
  }),

  http.post(`${API_URL}/schedules/generate`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Schedule generated successfully',
      schedule: {
        id: 'schedule-1',
        ...body,
        assignments: {},
        status: 'draft',
      },
    }, { status: 201 });
  }),
];
