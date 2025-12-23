import { Router } from 'express';
import * as availabilityController from '../controllers/availability.controller';
import { authenticateJWT } from '../middleware';

const router = Router();

/**
 * @route   GET /api/availabilities
 * @desc    Get all availabilities (with optional weekStart filter)
 * @access  Private
 */
router.get('/', authenticateJWT, availabilityController.getAllAvailabilities);

/**
 * @route   GET /api/availabilities/:employeeId
 * @desc    Get availability for specific employee and week
 * @access  Private
 */
router.get('/:employeeId', authenticateJWT, availabilityController.getAvailabilityByEmployee);

/**
 * @route   POST /api/availabilities
 * @desc    Create new availability
 * @access  Private
 */
router.post('/', authenticateJWT, availabilityController.createAvailability);

/**
 * @route   PUT /api/availabilities/:id
 * @desc    Update availability
 * @access  Private
 */
router.put('/:id', authenticateJWT, availabilityController.updateAvailability);

/**
 * @route   DELETE /api/availabilities/:id
 * @desc    Delete availability
 * @access  Private
 */
router.delete('/:id', authenticateJWT, availabilityController.deleteAvailability);

export default router;
