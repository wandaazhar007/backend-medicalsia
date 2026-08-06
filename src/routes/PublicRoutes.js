import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import PublicController from '../controllers/PublicController.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

// Public booking route only — prevents spam submissions, per 05-business-flow.md.
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// No AuthMiddleware anywhere in this router — these are the public,
// unauthenticated routes for the booking page and waiting-room display.
router.get('/booking/doctors', asyncHandler(PublicController.getBookingDoctors));
router.post('/booking', bookingLimiter, asyncHandler(PublicController.createBooking));
router.get('/queue', asyncHandler(PublicController.getQueue));
router.get('/queue/pharmacy', asyncHandler(PublicController.getPharmacyQueue));

export default router;
