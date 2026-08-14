import { Router } from 'express';
import MedicalProcedureController from '../controllers/MedicalProcedureController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(MedicalProcedureController.list));
router.post('/', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(MedicalProcedureController.create));
router.patch('/:id', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(MedicalProcedureController.update));

export default router;
