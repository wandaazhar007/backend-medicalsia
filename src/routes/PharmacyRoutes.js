import { Router } from 'express';
import PharmacyController from '../controllers/PharmacyController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/queue', verifyFirebaseToken, requireRole('owner', 'admin', 'pharmacy'), asyncHandler(PharmacyController.getQueue));
router.post('/dispense/:prescriptionId', verifyFirebaseToken, requireRole('owner', 'admin', 'pharmacy'), asyncHandler(PharmacyController.dispense));

export default router;
