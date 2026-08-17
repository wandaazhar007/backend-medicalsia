import { Router } from 'express';
import MedicalProcedureController from '../controllers/MedicalProcedureController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { uploadImportFile } from '../middlewares/ImportUploadMiddleware.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(MedicalProcedureController.list));
router.post('/import/preview', verifyFirebaseToken, requireRole('owner', 'admin'), uploadImportFile, asyncHandler(MedicalProcedureController.importPreview));
router.post('/import', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(MedicalProcedureController.importCommit));
router.post('/', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(MedicalProcedureController.create));
router.patch('/:id', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(MedicalProcedureController.update));

export default router;
