import { Router } from 'express';
import PrescriptionController from '../controllers/PrescriptionController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(PrescriptionController.list));
router.post('/', verifyFirebaseToken, requireRole('doctor'), asyncHandler(PrescriptionController.create));
router.get('/:id', verifyFirebaseToken, asyncHandler(PrescriptionController.getById));

export default router;
