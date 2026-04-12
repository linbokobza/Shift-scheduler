import { describe, it, expect, beforeEach } from '@jest/globals';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middleware/auth';

// Mock jwt
jest.mock('jsonwebtoken');

// Mock the models - use a module-level variable for dynamic control
const mockFindById = jest.fn();
jest.mock('../../../models', () => ({
  User: {
    findById: (...args: any[]) => mockFindById(...args),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import { authenticateJWT, requireRole } from '../../../middleware/auth';

const mockJwt = jwt as jest.Mocked<typeof jwt>;

const createMockReq = (overrides: Partial<AuthRequest> = {}): AuthRequest => ({
  headers: {},
  ...overrides,
} as AuthRequest);

const createMockRes = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
  };
  return res as Response;
};

const mockActiveUser = {
  _id: 'user-id-123',
  name: 'Test User',
  email: 'test@test.com',
  role: 'employee' as const,
  isActive: true,
};

describe('authenticateJWT middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  describe('Missing / malformed token', () => {
    it('should return 401 when Authorization header is absent', async () => {
      const req = createMockReq({ headers: {} });
      const res = createMockRes();

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header has no Bearer prefix', async () => {
      const req = createMockReq({ headers: { authorization: 'Token abc123' } });
      const res = createMockRes();

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    it('should return 401 for empty Bearer token string', async () => {
      const req = createMockReq({ headers: { authorization: 'Bearer ' } });
      const res = createMockRes();

      // Empty string token will fail jwt.verify — mock it to throw
      mockJwt.verify.mockImplementation(() => {
        const err = new Error('jwt malformed');
        err.name = 'JsonWebTokenError';
        throw err;
      });

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Invalid token', () => {
    it('should return 401 with "Invalid token" when jwt.verify throws JsonWebTokenError', async () => {
      const req = createMockReq({ headers: { authorization: 'Bearer bad.token.here' } });
      const res = createMockRes();

      mockJwt.verify.mockImplementation(() => {
        const err = new Error('invalid signature');
        err.name = 'JsonWebTokenError';
        throw err;
      });

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });
  });

  describe('Expired token', () => {
    it('should return 401 with "Token expired" when jwt.verify throws TokenExpiredError', async () => {
      const req = createMockReq({ headers: { authorization: 'Bearer expired.token.here' } });
      const res = createMockRes();

      mockJwt.verify.mockImplementation(() => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
    });
  });

  describe('Valid token - user not found', () => {
    it('should return 401 when User.findById returns null', async () => {
      const req = createMockReq({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = createMockRes();

      mockJwt.verify.mockReturnValue({ userId: 'nonexistent-id' } as any);
      mockFindById.mockResolvedValue(null);

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token - user not found' });
    });
  });

  describe('Valid token - inactive user', () => {
    it('should return 403 when user.isActive is false', async () => {
      const req = createMockReq({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = createMockRes();
      const inactiveUser = { ...mockActiveUser, isActive: false };

      mockJwt.verify.mockReturnValue({ userId: 'user-id-123' } as any);
      mockFindById.mockResolvedValue(inactiveUser);

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'User account is inactive' });
    });
  });

  describe('Valid token - success', () => {
    it('should call next() when token is valid and user is active', async () => {
      const req = createMockReq({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = createMockRes();

      mockJwt.verify.mockReturnValue({ userId: 'user-id-123' } as any);
      mockFindById.mockResolvedValue(mockActiveUser);

      await authenticateJWT(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should attach user object to req.user on success', async () => {
      const req = createMockReq({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = createMockRes();

      mockJwt.verify.mockReturnValue({ userId: 'user-id-123' } as any);
      mockFindById.mockResolvedValue(mockActiveUser);

      await authenticateJWT(req, res, next);

      expect(req.user).toEqual(mockActiveUser);
    });
  });
});

describe('requireRole middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  describe('Not authenticated', () => {
    it('should return 401 when req.user is undefined', () => {
      const requireManager = requireRole('manager');
      const req = createMockReq(); // no user attached
      const res = createMockRes();

      requireManager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });
  });

  describe('Wrong role', () => {
    it('should return 403 when user is employee but manager required', () => {
      const requireManager = requireRole('manager');
      const req = createMockReq({ user: { ...mockActiveUser, role: 'employee' } as any });
      const res = createMockRes();

      requireManager(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. manager role required' });
    });

    it('should return 403 when user is manager but employee required', () => {
      const requireEmployee = requireRole('employee');
      const req = createMockReq({ user: { ...mockActiveUser, role: 'manager' } as any });
      const res = createMockRes();

      requireEmployee(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Correct role', () => {
    it('should call next() when user has manager role and manager required', () => {
      const requireManager = requireRole('manager');
      const req = createMockReq({ user: { ...mockActiveUser, role: 'manager' } as any });
      const res = createMockRes();

      requireManager(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() when user has employee role and employee required', () => {
      const requireEmployee = requireRole('employee');
      const req = createMockReq({ user: { ...mockActiveUser, role: 'employee' } as any });
      const res = createMockRes();

      requireEmployee(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
