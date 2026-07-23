import express from 'express';
import { protectCustomerRoute, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../config/auth.js';
import { createReview, getFaqs, getReviews, submitContactMessage, subscribeNewsletter, validateCoupon } from '../controllers/contentController.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.get('/faqs', handle(getFaqs));
router.get('/reviews', handle(getReviews));
router.post('/reviews', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_REVIEWS_CREATE), handle(createReview));
router.post('/contact', handle(submitContactMessage));
router.post('/newsletter', handle(subscribeNewsletter));
router.post('/coupons/validate', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_PROFILE_READ), handle(validateCoupon));

export default router;
