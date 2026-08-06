import { Router } from 'express';
import MedicalRecordController from '../controllers/MedicalRecordController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.post('/', verifyFirebaseToken, requireRole('doctor'), asyncHandler(MedicalRecordController.create));

export default router;
