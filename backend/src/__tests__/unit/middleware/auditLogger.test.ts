import { describe, it, expect, beforeEach } from '@jest/globals';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { AuditLog } from '../../../models';
import { createAuditLog, auditLogMiddleware } from '../../../middleware/auditLogger';
import mongoose from 'mongoose';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { logger } from '../../../utils/logger';
const mockLogger = logger as jest.Mocked<typeof logger>;

const createMockReq = (overrides: Partial<AuthRequest> = {}): AuthRequest => ({
  headers: { 'user-agent': 'test-agent/1.0' },
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' } as any,
  params: {},
  ...overrides,
} as AuthRequest);

const createMockRes = () => {
  const res: any = {
    statusCode: 200,
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    }),
  };
  return res as Response;
};

const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  email: 'test@test.com',
  role: 'manager' as const,
  isActive: true,
};

describe('createAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('With authenticated user', () => {
    it('should create an AuditLog document in the database', async () => {
      const req = createMockReq({ user: mockUser as any });

      await createAuditLog(req, {
        action: 'CREATE_HOLIDAY',
        entityType: 'holiday',
      });

      const logs = await AuditLog.find({});
      expect(logs).toHaveLength(1);
    });

    it('should store userId, action, entityType in the log', async () => {
      const req = createMockReq({ user: mockUser as any });
      const entityObjectId = new mongoose.Types.ObjectId();

      await createAuditLog(req, {
        action: 'CREATE_HOLIDAY',
        entityType: 'holiday',
        entityId: entityObjectId,
      });

      const log = await AuditLog.findOne({});
      expect(log?.userId.toString()).toBe(mockUser._id.toString());
      expect(log?.action).toBe('CREATE_HOLIDAY');
      expect(log?.entityType).toBe('holiday');
    });

    it('should capture request IP address', async () => {
      const req = createMockReq({ user: mockUser as any, ip: '192.168.1.1' });

      await createAuditLog(req, { action: 'LOGIN', entityType: 'auth' });

      const log = await AuditLog.findOne({});
      expect(log?.ipAddress).toBe('192.168.1.1');
    });

    it('should capture user-agent header', async () => {
      const req = createMockReq({
        user: mockUser as any,
        headers: { 'user-agent': 'Mozilla/5.0 TestBrowser' },
      });

      await createAuditLog(req, { action: 'LOGIN', entityType: 'auth' });

      const log = await AuditLog.findOne({});
      expect(log?.userAgent).toBe('Mozilla/5.0 TestBrowser');
    });

    it('should set timestamp to current date', async () => {
      const before = new Date();
      const req = createMockReq({ user: mockUser as any });

      await createAuditLog(req, { action: 'LOGOUT', entityType: 'auth' });

      const after = new Date();
      const log = await AuditLog.findOne({});
      expect(log?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Without authenticated user', () => {
    it('should not create AuditLog when req.user is undefined', async () => {
      const req = createMockReq(); // no user

      await createAuditLog(req, { action: 'LOGIN', entityType: 'auth' });

      const logs = await AuditLog.find({});
      expect(logs).toHaveLength(0);
    });

    it('should log a warning when req.user is missing', async () => {
      const req = createMockReq();

      await createAuditLog(req, { action: 'LOGIN', entityType: 'auth' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Audit log attempted without authenticated user'
      );
    });
  });

  describe('Graceful failure', () => {
    it('should not throw when AuditLog.create rejects', async () => {
      const req = createMockReq({ user: mockUser as any });

      jest.spyOn(AuditLog, 'create').mockRejectedValueOnce(new Error('DB write failed') as never);

      await expect(
        createAuditLog(req, { action: 'CREATE_HOLIDAY', entityType: 'holiday' })
      ).resolves.not.toThrow();
    });

    it('should log error when DB write fails', async () => {
      const req = createMockReq({ user: mockUser as any });
      const dbError = new Error('Connection timeout');
      jest.spyOn(AuditLog, 'create').mockRejectedValueOnce(dbError as never);

      await createAuditLog(req, { action: 'CREATE_HOLIDAY', entityType: 'holiday' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create audit log:',
        dbError
      );
    });
  });
});

describe('auditLogMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() immediately', async () => {
    const middleware = auditLogMiddleware('CREATE_HOLIDAY', 'holiday');
    const req = createMockReq({ user: mockUser as any });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should create audit log when res.json is called with 2xx status', async () => {
    const middleware = auditLogMiddleware('CREATE_HOLIDAY', 'holiday');
    const req = createMockReq({ user: mockUser as any });
    const res = createMockRes();
    (res as any).statusCode = 201;
    const next: NextFunction = jest.fn();

    await middleware(req, res, next);

    // Call the overridden json method with a valid ObjectId
    const newHolidayId = new mongoose.Types.ObjectId();
    res.json({ _id: newHolidayId.toString(), name: 'Test Holiday' });

    // Allow async audit log to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    const logs = await AuditLog.find({});
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('CREATE_HOLIDAY');
  });

  it('should extract entityId from body._id field', async () => {
    const middleware = auditLogMiddleware('CREATE_HOLIDAY', 'holiday');
    const req = createMockReq({ user: mockUser as any });
    const res = createMockRes();
    (res as any).statusCode = 201;
    const next: NextFunction = jest.fn();

    const validEntityId = new mongoose.Types.ObjectId();
    await middleware(req, res, next);
    res.json({ _id: validEntityId.toString() });

    await new Promise(resolve => setTimeout(resolve, 10));

    const log = await AuditLog.findOne({});
    expect(log?.entityId?.toString()).toBe(validEntityId.toString());
  });

  it('should not create audit log when statusCode is 400', async () => {
    const middleware = auditLogMiddleware('CREATE_HOLIDAY', 'holiday');
    const req = createMockReq({ user: mockUser as any });
    const res = createMockRes();
    (res as any).statusCode = 400;
    const next: NextFunction = jest.fn();

    await middleware(req, res, next);
    res.json({ error: 'Bad Request' });

    await new Promise(resolve => setTimeout(resolve, 10));

    const logs = await AuditLog.find({});
    expect(logs).toHaveLength(0);
  });

  it('should not create audit log when statusCode is 500', async () => {
    const middleware = auditLogMiddleware('UPDATE_EMPLOYEE', 'employee');
    const req = createMockReq({ user: mockUser as any });
    const res = createMockRes();
    (res as any).statusCode = 500;
    const next: NextFunction = jest.fn();

    await middleware(req, res, next);
    res.json({ error: 'Internal Server Error' });

    await new Promise(resolve => setTimeout(resolve, 10));

    const logs = await AuditLog.find({});
    expect(logs).toHaveLength(0);
  });

  it('should preserve original res.json behavior and return result', async () => {
    const middleware = auditLogMiddleware('CREATE_HOLIDAY', 'holiday');
    const req = createMockReq({ user: mockUser as any });
    const res = createMockRes();
    (res as any).statusCode = 200;
    const next: NextFunction = jest.fn();

    await middleware(req, res, next);

    const result = res.json({ data: 'test' });

    // Original json should be called (returns res for chaining)
    expect(result).toBe(res);
  });
});
