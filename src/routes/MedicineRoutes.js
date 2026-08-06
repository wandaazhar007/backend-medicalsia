import { Router } from 'express';
import MedicineController from '../controllers/MedicineController.js';
import { verifyFirebaseToken } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(MedicineController.list));

export default router;
