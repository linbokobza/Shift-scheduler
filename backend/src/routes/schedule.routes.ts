import { Router } from 'express';
import * as scheduleController from '../controllers/schedule.controller';
import { authenticateJWT, requireManager } from '../middleware';

const router = Router();

/**
 * @route   GET /api/schedules
 * @desc    Get all schedules (with optional weekStart filter)
 * @access  Private
 */
router.get('/', authenticateJWT, scheduleController.getAllSchedules);

/**
 * @route   GET /api/schedules/week
 * @desc    Get schedule for specific week
 * @access  Private
 */
router.get('/week', authenticateJWT, scheduleController.getSchedule);

/**
 * @route   POST /api/schedules/generate
 * @desc    Generate new schedule using optimization algorithm
 * @access  Private (Manager only)
 */
router.post('/generate', authenticateJWT, requireManager, scheduleController.generateSchedule);

/**
 * @route   PUT /api/schedules/:id
 * @desc    Update schedule
 * @access  Private (Manager only)
 */
router.put('/:id', authenticateJWT, requireManager, scheduleController.updateSchedule);

/**
 * @route   PATCH /api/schedules/:id/publish
 * @desc    Publish schedule
 * @access  Private (Manager only)
 */
router.patch('/:id/publish', authenticateJWT, requireManager, scheduleController.publishSchedule);

/**
 * @route   PATCH /api/schedules/:id/lock
 * @desc    Lock/unlock shift
 * @access  Private (Manager only)
 */
router.patch('/:id/lock', authenticateJWT, requireManager, scheduleController.lockShift);

export default router;
