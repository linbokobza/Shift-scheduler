import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { authenticateJWT, requireManager } from '../middleware';

const router = Router();

/**
 * @route   POST /api/employees
 * @desc    Create new employee
 * @access  Private (Manager only)
 */
router.post('/', authenticateJWT, requireManager, employeeController.createEmployee);

/**
 * @route   GET /api/employees
 * @desc    Get all employees
 * @access  Private
 */
router.get('/', authenticateJWT, employeeController.getAllEmployees);

/**
 * @route   GET /api/employees/:id
 * @desc    Get employee by ID
 * @access  Private
 */
router.get('/:id', authenticateJWT, employeeController.getEmployee);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee
 * @access  Private (Manager only)
 */
router.put('/:id', authenticateJWT, requireManager, employeeController.updateEmployee);

/**
 * @route   PATCH /api/employees/:id/toggle-active
 * @desc    Toggle employee active status
 * @access  Private (Manager only)
 */
router.patch('/:id/toggle-active', authenticateJWT, requireManager, employeeController.toggleEmployeeActive);

/**
 * @route   DELETE /api/employees/:id
 * @desc    Delete employee (hard delete)
 * @access  Private (Manager only)
 * @query   confirm - If true, actually deletes. If false, just checks and returns info
 * @query   removeFromSchedules - If true, removes employee from future schedules before deleting
 */
router.delete('/:id', authenticateJWT, requireManager, employeeController.deleteEmployee);

export default router;
