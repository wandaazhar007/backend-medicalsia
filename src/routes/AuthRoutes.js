import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.post('/verify', verifyFirebaseToken, asyncHandler(AuthController.verify));
router.post('/invite', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(AuthController.invite));

export default router;
