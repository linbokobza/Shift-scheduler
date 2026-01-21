import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models';
import { AppError } from '../middleware';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/auditLogger';
import { logger } from '../utils/logger';
import { sendPasswordResetEmail } from '../services/email.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'employee',
    isActive: true,
  });

  logger.info(`New user registered: ${user.email} (${user.role})`);

  // Generate JWT
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const token = jwt.sign({ userId: user._id }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  } as SignOptions);

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  // Find user with password field
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('User account is inactive', 403);
  }

  // Generate JWT
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const token = jwt.sign({ userId: user._id }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  } as SignOptions);

  logger.info(`User logged in: ${user.email}`);

  // Create audit log
  await createAuditLog(req as AuthRequest, {
    action: 'LOGIN',
    entityType: 'auth',
  });

  res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
    },
  });
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  // With JWT, logout is handled client-side by removing the token
  // But we can log it for audit purposes

  await createAuditLog(req, {
    action: 'LOGOUT',
    entityType: 'auth',
  });

  res.status(200).json({
    message: 'Logout successful',
  });
};

export const updatePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { currentPassword, newPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }

  if (currentPassword === newPassword) {
    throw new AppError('New password must be different from current password', 400);
  }

  // Get user with password field
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password updated for user: ${user.email}`);

  // Create audit log
  await createAuditLog(req, {
    action: 'UPDATE_PASSWORD',
    entityType: 'auth',
  });

  res.status(200).json({
    message: 'Password updated successfully',
  });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  // Validation
  if (!email) {
    throw new AppError('Email is required', 400);
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists (security)
    res.status(200).json({
      message: 'If email exists, reset link has been sent',
    });
    return;
  }

  // Generate reset token (valid for 15 minutes)
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
  const resetToken = jwt.sign({ userId: user._id, type: 'reset' }, jwtSecret, {
    expiresIn: '15m',
  } as SignOptions);

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  logger.info(`Password reset requested for user: ${user.email}`);

  // Send password reset email
  const emailSent = await sendPasswordResetEmail(user.email, resetLink);

  // In development mode, also return the link for testing if email is not configured
  if (process.env.NODE_ENV === 'development' && !emailSent) {
    res.status(200).json({
      message: 'Reset link has been sent to email',
      // Only for development when email is not configured
      resetToken,
      resetLink,
    });
    return;
  }

  res.status(200).json({
    message: 'If email exists, reset link has been sent',
  });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  // Validation
  if (!token || !newPassword) {
    throw new AppError('Token and new password are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  try {
    // Verify reset token
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; type: string };

    if (decoded.type !== 'reset') {
      throw new AppError('Invalid token type', 401);
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password reset successful for user: ${user.email}`);

    res.status(200).json({
      message: 'Password has been reset successfully',
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Reset link has expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid reset link', 401);
    }
    throw error;
  }
};
