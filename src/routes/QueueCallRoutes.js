import { Router } from 'express';
import QueueCallController from '../controllers/QueueCallController.js';
import { verifyFirebaseToken } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.post('/', verifyFirebaseToken, asyncHandler(QueueCallController.create));

export default router;
