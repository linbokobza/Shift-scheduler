import { Router } from 'express';
import * as publicController from '../controllers/public.controller';

const router = Router();

/**
 * @route   GET /api/public/schedule
 * @desc    Get published schedule for a given week (no auth required)
 * @access  Public
 */
router.get('/schedule', publicController.getPublicSchedule);

/**
 * @route   GET /api/public/schedule/latest
 * @desc    Get the most recent published schedule (no auth required)
 * @access  Public
 */
router.get('/schedule/latest', publicController.getLatestPublicSchedule);

export default router;
