import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authenticateJWT, requireManager } from '../middleware';

const router = Router();

/**
 * @route   GET /api/audit
 * @desc    Get audit logs with filters
 * @access  Private (Manager only)
 */
router.get('/', authenticateJWT, requireManager, auditController.getAuditLogs);

/**
 * @route   GET /api/audit/:entityType/:entityId
 * @desc    Get audit logs for specific entity
 * @access  Private (Manager only)
 */
router.get('/:entityType/:entityId', authenticateJWT, requireManager, auditController.getAuditLogsByEntity);

export default router;
