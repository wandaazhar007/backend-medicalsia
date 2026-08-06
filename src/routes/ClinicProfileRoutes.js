import { Router } from 'express';
import ClinicProfileController from '../controllers/ClinicProfileController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(ClinicProfileController.get));
router.patch('/', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(ClinicProfileController.update));

export default router;
