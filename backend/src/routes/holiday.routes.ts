import { Router } from 'express';
import * as holidayController from '../controllers/holiday.controller';
import { authenticateJWT, requireManager } from '../middleware';

const router = Router();

router.get('/', authenticateJWT, holidayController.getAllHolidays);
router.post('/', authenticateJWT, requireManager, holidayController.createHoliday);
router.put('/:id', authenticateJWT, requireManager, holidayController.updateHoliday);
router.delete('/:id', authenticateJWT, requireManager, holidayController.deleteHoliday);

export default router;
