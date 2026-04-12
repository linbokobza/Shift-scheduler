import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock nodemailer before importing the service
jest.mock('nodemailer');
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import nodemailer from 'nodemailer';
import { sendPasswordResetEmail } from '../../../services/email.service';
import { logger } from '../../../utils/logger';

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

const mockSendMail = jest.fn();
const mockTransporter = { sendMail: mockSendMail };

describe('email.service', () => {
  let originalEmailUser: string | undefined;
  let originalEmailPass: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEmailUser = process.env.EMAIL_USER;
    originalEmailPass = process.env.EMAIL_PASS;
  });

  afterEach(() => {
    process.env.EMAIL_USER = originalEmailUser;
    process.env.EMAIL_PASS = originalEmailPass;
  });

  describe('sendPasswordResetEmail - credentials configured', () => {
    beforeEach(() => {
      process.env.EMAIL_USER = 'test@gmail.com';
      process.env.EMAIL_PASS = 'secret-pass';
      mockNodemailer.createTransport.mockReturnValue(mockTransporter as any);
      mockSendMail.mockResolvedValue({ messageId: 'mock-message-id' });
    });

    it('should create a transporter when credentials are present', async () => {
      await sendPasswordResetEmail('recipient@test.com', 'http://localhost/reset?token=abc');

      expect(mockNodemailer.createTransport).toHaveBeenCalledTimes(1);
    });

    it('should call sendMail with correct to and subject', async () => {
      await sendPasswordResetEmail('recipient@test.com', 'http://localhost/reset?token=abc');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@test.com',
          subject: 'איפוס סיסמה',
        })
      );
    });

    it('should call sendMail with both html and text fields', async () => {
      await sendPasswordResetEmail('recipient@test.com', 'http://localhost/reset?token=abc');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.any(String),
          text: expect.any(String),
        })
      );
    });

    it('should return true on successful send', async () => {
      const result = await sendPasswordResetEmail(
        'recipient@test.com',
        'http://localhost/reset?token=abc'
      );

      expect(result).toBe(true);
    });

    it('should return false when sendMail throws', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

      const result = await sendPasswordResetEmail(
        'recipient@test.com',
        'http://localhost/reset?token=abc'
      );

      expect(result).toBe(false);
    });

    it('should log info message on success', async () => {
      await sendPasswordResetEmail('recipient@test.com', 'http://localhost/reset?token=abc');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('recipient@test.com')
      );
    });

    it('should log error message on send failure', async () => {
      const sendError = new Error('SMTP timeout');
      mockSendMail.mockRejectedValue(sendError);

      await sendPasswordResetEmail('recipient@test.com', 'http://localhost/reset?token=abc');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('recipient@test.com'),
        sendError
      );
    });

    describe('email template content (via sendMail spy)', () => {
      it('should produce HTML containing the resetLink URL', async () => {
        const resetLink = 'http://localhost:5173/reset-password?token=xyz123';
        await sendPasswordResetEmail('u@test.com', resetLink);

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.html).toContain(resetLink);
      });

      it('should produce HTML with rtl dir attribute', async () => {
        await sendPasswordResetEmail('u@test.com', 'http://localhost/reset?token=abc');

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.html).toContain('dir="rtl"');
      });

      it('should produce plain text containing the resetLink URL', async () => {
        const resetLink = 'http://localhost:5173/reset-password?token=abc999';
        await sendPasswordResetEmail('u@test.com', resetLink);

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.text).toContain(resetLink);
      });

      it('should include 15 minutes expiry text in HTML', async () => {
        await sendPasswordResetEmail('u@test.com', 'http://localhost/reset?token=abc');

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.html).toContain('15');
      });

      it('should include Hebrew subject text', async () => {
        await sendPasswordResetEmail('u@test.com', 'http://localhost/reset?token=abc');

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.subject).toContain('איפוס');
      });
    });
  });

  describe('sendPasswordResetEmail - no credentials configured', () => {
    beforeEach(() => {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;
    });

    it('should return false without calling createTransport', async () => {
      const result = await sendPasswordResetEmail(
        'recipient@test.com',
        'http://localhost/reset?token=abc'
      );

      expect(result).toBe(false);
      expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('should log warning with reset link when credentials not configured', async () => {
      const resetLink = 'http://localhost/reset?token=abc';
      await sendPasswordResetEmail('recipient@test.com', resetLink);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(resetLink)
      );
    });
  });

  describe('sendPasswordResetEmail - empty credential strings', () => {
    beforeEach(() => {
      process.env.EMAIL_USER = '';
      process.env.EMAIL_PASS = '';
    });

    it('should return false when credentials are empty strings', async () => {
      const result = await sendPasswordResetEmail(
        'recipient@test.com',
        'http://localhost/reset?token=abc'
      );

      expect(result).toBe(false);
    });
  });
});
