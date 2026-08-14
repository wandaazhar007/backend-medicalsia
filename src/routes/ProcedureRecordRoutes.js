import { Router } from 'express';
import ProcedureRecordController from '../controllers/ProcedureRecordController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(ProcedureRecordController.list));
router.post('/', verifyFirebaseToken, requireRole('doctor'), asyncHandler(ProcedureRecordController.create));
router.get('/:id', verifyFirebaseToken, asyncHandler(ProcedureRecordController.getById));

export default router;
