import { Router } from 'express';
import InvoiceController from '../controllers/InvoiceController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(InvoiceController.list));
router.get('/:id', verifyFirebaseToken, asyncHandler(InvoiceController.getById));
router.post('/', verifyFirebaseToken, requireRole('cashier'), asyncHandler(InvoiceController.create));
router.patch('/:id/pay', verifyFirebaseToken, requireRole('cashier'), asyncHandler(InvoiceController.pay));

export default router;
