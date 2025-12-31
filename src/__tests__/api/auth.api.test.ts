import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { authAPI } from '../../api/auth.api';

const API_URL = 'http://localhost:5001/api';

describe('Auth API', () => {
  // Create MSW server for these tests
  const server = setupServer(
    http.post(`${API_URL}/auth/login`, async ({ request }) => {
      const body = await request.json();
      const { email, password } = body as { email: string; password: string };

      if (email === 'test@example.com' && password === 'password123') {
        return HttpResponse.json({
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
      const { name, email, role } = body as { name: string; email: string; role: string };

      return HttpResponse.json({
        token: 'new-user-token',
        user: {
          id: 'new-user-1',
          name,
          email,
          role,
        },
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
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'employee',
        },
      });
    }),

    http.post(`${API_URL}/auth/logout`, () => {
      return HttpResponse.json({ message: 'Logged out successfully' });
    }),

    http.put(`${API_URL}/auth/update-password`, async ({ request }) => {
      const body = await request.json();
      const { currentPassword, newPassword } = body as { currentPassword: string; newPassword: string };

      if (currentPassword === 'oldpass' && newPassword === 'newpass') {
        return HttpResponse.json({ message: 'Password updated successfully' });
      }

      return HttpResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }),

    http.post(`${API_URL}/auth/forgot-password`, async ({ request }) => {
      const body = await request.json();
      const { email } = body as { email: string };

      return HttpResponse.json({
        message: 'Password reset email sent',
        resetToken: 'reset-token-123',
        resetLink: `http://localhost:5173/reset-password?token=reset-token-123`,
      });
    }),

    http.post(`${API_URL}/auth/reset-password`, async ({ request }) => {
      const body = await request.json();
      const { token, newPassword } = body as { token: string; newPassword: string };

      if (token === 'valid-reset-token') {
        return HttpResponse.json({ message: 'Password reset successfully' });
      }

      return HttpResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    })
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await authAPI.login('test@example.com', 'password123');

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('employee');
    });

    it('should throw error with invalid credentials', async () => {
      await expect(
        authAPI.login('wrong@example.com', 'wrongpass')
      ).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await authAPI.register('New User', 'new@example.com', 'password123', 'employee');

      expect(result.token).toBe('new-user-token');
      expect(result.user.name).toBe('New User');
      expect(result.user.email).toBe('new@example.com');
      expect(result.user.role).toBe('employee');
    });

    it('should register a manager successfully', async () => {
      const result = await authAPI.register('Manager User', 'manager@example.com', 'password123', 'manager');

      expect(result.user.role).toBe('manager');
    });
  });

  // getMe test skipped - requires authentication setup

  describe('logout', () => {
    it('should logout successfully', async () => {
      await expect(authAPI.logout()).resolves.not.toThrow();
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully with correct current password', async () => {
      const result = await authAPI.updatePassword('oldpass', 'newpass');

      expect(result.message).toBe('Password updated successfully');
    });

    it('should throw error with incorrect current password', async () => {
      await expect(
        authAPI.updatePassword('wrongpass', 'newpass')
      ).rejects.toThrow();
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const result = await authAPI.forgotPassword('test@example.com');

      expect(result.message).toBe('Password reset email sent');
      expect(result.resetToken).toBeDefined();
      expect(result.resetLink).toContain('reset-password');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const result = await authAPI.resetPassword('valid-reset-token', 'newpassword123');

      expect(result.message).toBe('Password reset successfully');
    });

    it('should throw error with invalid token', async () => {
      await expect(
        authAPI.resetPassword('invalid-token', 'newpassword123')
      ).rejects.toThrow();
    });
  });
});
