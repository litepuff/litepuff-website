import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { createId } from '../utils/createId.js';

const directory = path.resolve('server/uploads/reviews');
fs.mkdirSync(directory, { recursive: true });

const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedVideos = new Set(['video/mp4']);
const storage = multer.diskStorage({
  destination: directory,
  filename: (_request, file, callback) => {
    const safeExtension = file.fieldname === 'video' ? '.mp4' : path.extname(file.originalname).toLowerCase();
    callback(null, `${createId(file.fieldname === 'video' ? 'review-video' : 'review-image')}${safeExtension}`);
  }
});

export const reviewUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 6, fields: 20 },
  fileFilter: (_request, file, callback) => {
    const valid = file.fieldname === 'images' ? allowedImages.has(file.mimetype) : file.fieldname === 'video' && allowedVideos.has(file.mimetype);
    callback(valid ? null : new Error('Review media must be JPG, PNG, WEBP, or MP4.'), valid);
  }
}).fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]);
