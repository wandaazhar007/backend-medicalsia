import { Router } from 'express';
import ShortfallController from '../controllers/ShortfallController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, requireRole('cashier'), asyncHandler(ShortfallController.list));
router.patch('/:id/resolve', verifyFirebaseToken, requireRole('cashier'), asyncHandler(ShortfallController.resolve));

export default router;
