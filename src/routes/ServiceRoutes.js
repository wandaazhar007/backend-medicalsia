import { Router } from 'express';
import ServiceController from '../controllers/ServiceController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(ServiceController.list));
router.post('/', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(ServiceController.create));
router.patch('/:id', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(ServiceController.update));

export default router;
