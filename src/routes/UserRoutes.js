import { Router } from 'express';
import multer from 'multer';
import UserController from '../controllers/UserController.js';
import { verifyFirebaseToken, requireRole } from '../middlewares/AuthMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// multer reports rejected files/oversized uploads via next(err) — translate
// that into the app's standard { error: { code, message } } shape instead of
// letting it fall through to the generic 500 handler.
function uploadPhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    }
    next();
  });
}

// Self-service profile routes — registered before /:id so Express never
// matches "me" as a route param.
router.get('/me', verifyFirebaseToken, asyncHandler(UserController.getMe));
router.patch('/me', verifyFirebaseToken, asyncHandler(UserController.updateMe));
router.post('/me/photo', verifyFirebaseToken, uploadPhoto, asyncHandler(UserController.uploadMyPhoto));
router.get('/me/login-history', verifyFirebaseToken, asyncHandler(UserController.getMyLoginHistory));

router.get('/', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(UserController.list));
router.get('/:id', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(UserController.getById));
router.patch('/:id', verifyFirebaseToken, requireRole('owner', 'admin'), asyncHandler(UserController.update));

export default router;
