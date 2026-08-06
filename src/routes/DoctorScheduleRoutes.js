import { Router } from 'express';
import DoctorScheduleController from '../controllers/DoctorScheduleController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(DoctorScheduleController.list));
router.post('/', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(DoctorScheduleController.create));
router.patch('/:id', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(DoctorScheduleController.update));

export default router;
