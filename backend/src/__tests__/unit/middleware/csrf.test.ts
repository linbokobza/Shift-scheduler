import { describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Re-import module fresh for each test to reset the in-memory csrfTokens Map
let generateCSRFToken: (req: Request, res: Response) => void;
let verifyCsrfToken: (req: Request, res: Response, next: NextFunction) => void;
let csrfTokenMiddleware: (req: Request, res: Response, next: NextFunction) => void;

const CSRF_COOKIE = 'csrf_session';
const FAKE_SESSION = 'a'.repeat(64);

const createMockRes = () => {
  const res: any = {
    set: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

const createMockReq = (overrides: Record<string, any> = {}): Request => ({
  method: 'GET',
  url: '/test',
  ip: '127.0.0.1',
  headers: {},
  body: {},
  query: {},
  cookies: {},
  ...overrides,
} as unknown as Request);

describe('CSRF Middleware', () => {
  beforeEach(() => {
    jest.resetModules();
    const module = require('../../../middleware/csrf');
    generateCSRFToken = module.generateCSRFToken;
    verifyCsrfToken = module.verifyCsrfToken;
    csrfTokenMiddleware = module.csrfTokenMiddleware;
  });

  describe('generateCSRFToken', () => {
    it('should set X-CSRF-Token header on response', () => {
      const req = createMockReq({ cookies: { [CSRF_COOKIE]: FAKE_SESSION } });
      const res = createMockRes();

      generateCSRFToken(req, res);

      expect(res.set).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String));
    });

    it('should generate a 64-character hex token', () => {
      const req = createMockReq({ cookies: { [CSRF_COOKIE]: FAKE_SESSION } });
      const res = createMockRes();

      generateCSRFToken(req, res);

      const token = (res.set as jest.Mock).mock.calls[0][1];
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return the same token for the same session (reuse per session)', () => {
      const req1 = createMockReq({ cookies: { [CSRF_COOKIE]: FAKE_SESSION } });
      const req2 = createMockReq({ cookies: { [CSRF_COOKIE]: FAKE_SESSION } });
      const res1 = createMockRes();
      const res2 = createMockRes();

      generateCSRFToken(req1, res1);
      generateCSRFToken(req2, res2);

      const token1 = (res1.set as jest.Mock).mock.calls[0][1];
      const token2 = (res2.set as jest.Mock).mock.calls[0][1];
      expect(token1).toBe(token2);
    });

    it('should generate different tokens for different session cookies', () => {
      const req1 = createMockReq({ cookies: { [CSRF_COOKIE]: 'b'.repeat(64) } });
      const req2 = createMockReq({ cookies: { [CSRF_COOKIE]: 'c'.repeat(64) } });
      const res1 = createMockRes();
      const res2 = createMockRes();

      generateCSRFToken(req1, res1);
      generateCSRFToken(req2, res2);

      const token1 = (res1.set as jest.Mock).mock.calls[0][1];
      const token2 = (res2.set as jest.Mock).mock.calls[0][1];
      expect(token1).not.toBe(token2);
    });

    it('should set a new session cookie when none exists', () => {
      const req = createMockReq({ cookies: {} });
      const res = createMockRes();

      generateCSRFToken(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        CSRF_COOKIE,
        expect.any(String),
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
      );
    });
  });

  describe('verifyCsrfToken', () => {
    const getValidToken = (sessionId: string): string => {
      const req = createMockReq({ cookies: { [CSRF_COOKIE]: sessionId } });
      const res = createMockRes();
      generateCSRFToken(req, res);
      return (res.set as jest.Mock).mock.calls[0][1];
    };

    describe('Safe methods - should skip verification', () => {
      it('should call next() without verification for GET requests', () => {
        const req = createMockReq({ method: 'GET', cookies: { [CSRF_COOKIE]: FAKE_SESSION } });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        verifyCsrfToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
      });

      it('should call next() without verification for HEAD requests', () => {
        const req = createMockReq({ method: 'HEAD', cookies: { [CSRF_COOKIE]: FAKE_SESSION } });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        verifyCsrfToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
      });

      it('should call next() without verification for OPTIONS requests', () => {
        const req = createMockReq({ method: 'OPTIONS', cookies: { [CSRF_COOKIE]: FAKE_SESSION } });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        verifyCsrfToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
      });
    });

    describe('Unsafe methods - require token', () => {
      it('should throw when CSRF session cookie is missing on POST', () => {
        const req = createMockReq({ method: 'POST', cookies: {}, headers: {} });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        expect(() => verifyCsrfToken(req, res, next)).toThrow('CSRF session missing');
      });

      it('should throw "CSRF token is missing" when session exists but no token on POST', () => {
        const sessionId = 'd'.repeat(64);
        getValidToken(sessionId); // register session

        const req = createMockReq({ method: 'POST', cookies: { [CSRF_COOKIE]: sessionId }, headers: {} });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        expect(() => verifyCsrfToken(req, res, next)).toThrow('CSRF token is missing');
      });

      it('should throw "Invalid CSRF token" when token is wrong on PUT', () => {
        const sessionId = 'e'.repeat(64);
        getValidToken(sessionId);

        const req = createMockReq({
          method: 'PUT',
          cookies: { [CSRF_COOKIE]: sessionId },
          headers: { 'x-csrf-token': 'wrong-token' },
        });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        expect(() => verifyCsrfToken(req, res, next)).toThrow('Invalid CSRF token');
      });

      it('should call next() when valid token is in x-csrf-token header', () => {
        const sessionId = 'f'.repeat(64);
        const validToken = getValidToken(sessionId);

        const req = createMockReq({
          method: 'POST',
          cookies: { [CSRF_COOKIE]: sessionId },
          headers: { 'x-csrf-token': validToken },
        });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        verifyCsrfToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
      });

      it('should call next() when valid token is in request body as _csrf field', () => {
        const sessionId = '1'.repeat(64);
        const validToken = getValidToken(sessionId);

        const req = createMockReq({
          method: 'POST',
          cookies: { [CSRF_COOKIE]: sessionId },
          headers: {},
          body: { _csrf: validToken },
        });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        verifyCsrfToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
      });

      it('should call next() when valid token is in query string as _csrf param', () => {
        const sessionId = '2'.repeat(64);
        const validToken = getValidToken(sessionId);

        const req = createMockReq({
          method: 'DELETE',
          cookies: { [CSRF_COOKIE]: sessionId },
          headers: {},
          query: { _csrf: validToken },
        });
        const res = createMockRes();
        const next = jest.fn() as unknown as NextFunction;

        verifyCsrfToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('csrfTokenMiddleware', () => {
    it('should generate token AND call next()', () => {
      const req = createMockReq({ cookies: { [CSRF_COOKIE]: FAKE_SESSION } });
      const res = createMockRes();
      const next = jest.fn() as unknown as NextFunction;

      csrfTokenMiddleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String));
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
