import express from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { protectAdminRoute } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.post('/image', protectAdminRoute, upload.single('image'), handle(uploadImage));

export default router;
