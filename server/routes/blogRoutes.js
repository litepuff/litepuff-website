import express from 'express';
import { getBlogs, getSingleBlog } from '../controllers/blogController.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.get('/', handle(getBlogs));
router.get('/:slug', handle(getSingleBlog));

export default router;
