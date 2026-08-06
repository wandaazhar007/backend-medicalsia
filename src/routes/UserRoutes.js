import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(UserController.list));
router.get('/:id', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(UserController.getById));
router.patch('/:id', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(UserController.update));

export default router;
