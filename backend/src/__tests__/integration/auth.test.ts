import request from 'supertest';
import { app } from '../../server';
import { User } from '../../models';
import { createTestUser } from '../helpers/fixtures';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'Password123',
          role: 'employee',
        })
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toMatchObject({
        name: 'New User',
        email: 'newuser@test.com',
        role: 'employee',
        isActive: true,
      });

      const user = await User.findOne({ email: 'newuser@test.com' });
      expect(user).toBeDefined();
      expect(user?.name).toBe('New User');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      await createTestUser('Existing User', 'existing@test.com');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'existing@test.com',
          password: 'Password123',
        })
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      await createTestUser('Login User', 'login@test.com', 'Password123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Password123',
        })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('login@test.com');
    });

    it('should reject login with incorrect password', async () => {
      await createTestUser('Login User', 'login@test.com', 'CorrectPass1');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPass1',
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject login for inactive user', async () => {
      await User.create({
        name: 'Inactive User',
        email: 'inactive@test.com',
        password: 'Password123',
        role: 'employee',
        isActive: false,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'Password123',
        })
        .expect(403);

      expect(response.body.error).toContain('inactive');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const testUser = await createTestUser('Current User', 'current@test.com');

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body.user.email).toBe('current@test.com');
      expect(response.body.user.name).toBe('Current User');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/auth/password', () => {
    it('should update password successfully', async () => {
      const testUser = await createTestUser('Password User', 'password@test.com', 'OldPass123');

      const response = await request(app)
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          currentPassword: 'OldPass123',
          newPassword: 'NewPass123',
        })
        .expect(200);

      expect(response.body.message).toContain('Password updated');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'password@test.com',
          password: 'NewPass123',
        })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
    });

    it('should reject password update with incorrect current password', async () => {
      const testUser = await createTestUser('Password User 2', 'password2@test.com', 'CorrectPass1');

      const response = await request(app)
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          currentPassword: 'WrongPass1',
          newPassword: 'NewPass123',
        })
        .expect(401);

      expect(response.body.error).toContain('Current password is incorrect');
    });
  });
});
