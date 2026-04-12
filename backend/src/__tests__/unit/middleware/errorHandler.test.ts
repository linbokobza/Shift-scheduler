import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler, notFoundHandler } from '../../../middleware/errorHandler';

// Mock logger to suppress output during tests
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const createMockRes = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
  };
  return res as Response;
};

const createMockReq = (overrides: Partial<Request> = {}): Request => ({
  method: 'GET',
  url: '/test',
  ...overrides,
} as Request);

describe('AppError', () => {
  it('should set message and statusCode properties', () => {
    const err = new AppError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
  });

  it('should default statusCode to 500 when not provided', () => {
    const err = new AppError('Something went wrong');
    expect(err.statusCode).toBe(500);
  });

  it('should set isOperational to true', () => {
    const err = new AppError('Operational error', 400);
    expect(err.isOperational).toBe(true);
  });

  it('should be an instance of Error', () => {
    const err = new AppError('Test', 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('should have a stack trace', () => {
    const err = new AppError('Test', 400);
    expect(err.stack).toBeDefined();
  });
});

describe('errorHandler middleware', () => {
  const next: NextFunction = jest.fn();
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('AppError handling', () => {
    it('should use AppError.statusCode as response status', () => {
      const err = new AppError('Not found', 404);
      const req = createMockReq();
      const res = createMockRes();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should use AppError.message as response error field', () => {
      const err = new AppError('Forbidden', 403);
      const req = createMockReq();
      const res = createMockRes();

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Forbidden' })
      );
    });

    it('should include stack trace in response body when NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      const err = new AppError('Dev error', 400);
      const req = createMockReq();
      const res = createMockRes();

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ stack: expect.any(String) })
      );
    });

    it('should NOT include stack trace when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      const err = new AppError('Prod error', 400);
      const req = createMockReq();
      const res = createMockRes();

      errorHandler(err, req, res, next);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('stack');
    });

    it('should NOT include stack trace when NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      const err = new AppError('Test error', 400);
      const req = createMockReq();
      const res = createMockRes();

      errorHandler(err, req, res, next);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('stack');
    });
  });

  describe('Generic Error handling', () => {
    it('should return 500 status for non-AppError errors', () => {
      const err = new Error('Unexpected error');
      const req = createMockReq();
      const res = createMockRes();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return "Internal server error" message for generic errors', () => {
      const err = new Error('Raw error details');
      const req = createMockReq();
      const res = createMockRes();

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Internal server error' })
      );
    });

    it('should not expose original error message for non-operational errors', () => {
      const err = new Error('Sensitive database connection string xyz');
      const req = createMockReq();
      const res = createMockRes();

      errorHandler(err, req, res, next);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error).not.toContain('database connection string');
    });
  });
});

describe('notFoundHandler', () => {
  it('should return 404 status', () => {
    const req = createMockReq({ method: 'GET', url: '/unknown' });
    const res = createMockRes();

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should include method and url in error message', () => {
    const req = createMockReq({ method: 'POST', url: '/api/unknown' });
    const res = createMockRes();

    notFoundHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Route not found: POST /api/unknown' })
    );
  });
});
