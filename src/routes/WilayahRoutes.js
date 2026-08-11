import { Router } from 'express';
import WilayahController from '../controllers/WilayahController.js';
import { verifyFirebaseToken } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(WilayahController.list));

export default router;
