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

export default router;
