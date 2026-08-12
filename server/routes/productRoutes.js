import express from 'express';
import { getCategories, getOffers, getProducts, getSingleProduct, searchProducts } from '../controllers/productController.js';
import { createProductReview, getProductReviews, getRatingSummary } from '../controllers/productReviewController.js';
import { protectCustomerRoute } from '../middleware/authMiddleware.js';
import { reviewUpload } from '../middleware/reviewUploadMiddleware.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.get('/', handle(getProducts));
router.get('/offers/config', handle(getOffers));
router.get('/search', handle(searchProducts));
router.get('/categories', handle(getCategories));
router.get('/:id/reviews', handle(getProductReviews));
router.get('/:id/rating-summary', handle(getRatingSummary));
router.post('/:id/review', protectCustomerRoute, reviewUpload, handle(createProductReview));
router.get('/:slug', handle(getSingleProduct));

export const categoriesRouter = express.Router();
categoriesRouter.get('/', handle(getCategories));

export default router;
