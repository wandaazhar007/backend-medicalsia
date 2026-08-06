import { Router } from 'express';
import PatientController from '../controllers/PatientController.js';
import { verifyFirebaseToken } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', verifyFirebaseToken, asyncHandler(PatientController.list));
router.get('/:id', verifyFirebaseToken, asyncHandler(PatientController.getById));
router.get('/:id/medical-records', verifyFirebaseToken, asyncHandler(PatientController.getMedicalRecordsForPrint));
router.post('/', verifyFirebaseToken, asyncHandler(PatientController.create));
router.patch('/:id', verifyFirebaseToken, asyncHandler(PatientController.update));

export default router;
