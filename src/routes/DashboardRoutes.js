import { Router } from 'express';
import DashboardController from '../controllers/DashboardController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/owner-stats', verifyFirebaseToken, requireRole('owner', 'admin', 'cashier'), asyncHandler(DashboardController.getOwnerStats));
router.get('/doctor-stats', verifyFirebaseToken, requireRole('doctor'), asyncHandler(DashboardController.getDoctorStats));
router.get('/pharmacy-stats', verifyFirebaseToken, requireRole('pharmacy'), asyncHandler(DashboardController.getPharmacyStats));

export default router;
