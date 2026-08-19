import { Router } from 'express';
import PatientController from '../controllers/PatientController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

// Pharmacy never looks up a patient directly — dispensing shows the patient
// name via a join in PharmacyController's own query, not this API — so it's
// the one role excluded here.
const PATIENT_ROLES = ['owner', 'admin', 'doctor', 'receptionist', 'cashier'];

router.get('/', verifyFirebaseToken, requireRole(...PATIENT_ROLES), asyncHandler(PatientController.list));
router.get('/:id', verifyFirebaseToken, requireRole(...PATIENT_ROLES), asyncHandler(PatientController.getById));
router.get('/:id/medical-records', verifyFirebaseToken, requireRole(...PATIENT_ROLES), asyncHandler(PatientController.getMedicalRecordsForPrint));
router.post('/', verifyFirebaseToken, requireRole(...PATIENT_ROLES), asyncHandler(PatientController.create));
router.patch('/:id', verifyFirebaseToken, requireRole(...PATIENT_ROLES), asyncHandler(PatientController.update));

export default router;
