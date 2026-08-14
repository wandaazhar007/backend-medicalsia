import { Router } from 'express';
import AppointmentController from '../controllers/AppointmentController.js';
import { verifyFirebaseToken } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(AppointmentController.list));
router.get('/completed', verifyFirebaseToken, asyncHandler(AppointmentController.listCompleted));
router.get('/:id', verifyFirebaseToken, asyncHandler(AppointmentController.getById));
router.post('/', verifyFirebaseToken, asyncHandler(AppointmentController.create));
router.patch('/:id/status', verifyFirebaseToken, asyncHandler(AppointmentController.updateStatus));
router.delete('/:id', verifyFirebaseToken, asyncHandler(AppointmentController.remove));

export default router;
