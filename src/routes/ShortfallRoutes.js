import { Router } from 'express';
import ShortfallController from '../controllers/ShortfallController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, requireRole('owner', 'admin', 'cashier'), asyncHandler(ShortfallController.list));
router.patch('/:id/resolve', verifyFirebaseToken, requireRole('owner', 'admin', 'cashier'), asyncHandler(ShortfallController.resolve));

export default router;
