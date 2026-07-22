import express from 'express';
import { getCategories, getProducts, getSingleProduct, searchProducts } from '../controllers/productController.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.get('/', handle(getProducts));
router.get('/search', handle(searchProducts));
router.get('/categories', handle(getCategories));
router.get('/:slug', handle(getSingleProduct));

export const categoriesRouter = express.Router();
categoriesRouter.get('/', handle(getCategories));

export default router;
