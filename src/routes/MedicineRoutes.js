import { Router } from 'express';
import MedicineController from '../controllers/MedicineController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(MedicineController.list));
router.get('/:id', verifyFirebaseToken, asyncHandler(MedicineController.getById));
router.get('/:id/stock-logs', verifyFirebaseToken, requireRole('owner', 'admin', 'pharmacy'), asyncHandler(MedicineController.getStockLogs));
router.post('/', verifyFirebaseToken, requireRole('owner', 'admin', 'pharmacy'), asyncHandler(MedicineController.create));
router.patch('/:id', verifyFirebaseToken, requireRole('owner', 'admin', 'pharmacy'), asyncHandler(MedicineController.update));
router.patch('/:id/stock', verifyFirebaseToken, requireRole('owner', 'admin', 'pharmacy'), asyncHandler(MedicineController.updateStock));

export default router;
