import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticateJWT, authController.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (for audit logging)
 * @access  Private
 */
router.post('/logout', authenticateJWT, authController.logout);

/**
 * @route   PUT /api/auth/update-password
 * @desc    Update current user password
 * @access  Private
 */
router.put('/update-password', authenticateJWT, authController.updatePassword);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

export default router;
