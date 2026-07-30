import express from 'express';
import rateLimit from 'express-rate-limit';
import { protectCustomerRoute, protectAdminRoute, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../config/auth.js';
import { deleteProductReview, markHelpful, moderateProductReview, replyToReview, reportReview, updateProductReview } from '../controllers/productReviewController.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);
const mutationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

router.put('/:id', protectCustomerRoute, mutationLimiter, handle(updateProductReview));
router.delete('/:id', protectCustomerRoute, mutationLimiter, handle(deleteProductReview));
router.post('/:id/helpful', protectCustomerRoute, mutationLimiter, handle(markHelpful));
router.post('/:id/report', protectCustomerRoute, mutationLimiter, handle(reportReview));
router.post('/:id/reply', protectAdminRoute, requirePermission(PERMISSIONS.ADMIN_REVIEWS_MANAGE), handle(replyToReview));
router.patch('/:id/admin', protectAdminRoute, requirePermission(PERMISSIONS.ADMIN_REVIEWS_MANAGE), handle(moderateProductReview));

export default router;
