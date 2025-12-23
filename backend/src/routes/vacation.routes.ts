import { Router } from 'express';
import * as vacationController from '../controllers/vacation.controller';
import { authenticateJWT, requireManager } from '../middleware';

const router = Router();

router.get('/', authenticateJWT, vacationController.getAllVacations);
router.post('/', authenticateJWT, requireManager, vacationController.createVacation);
router.delete('/:id', authenticateJWT, requireManager, vacationController.deleteVacation);

export default router;
