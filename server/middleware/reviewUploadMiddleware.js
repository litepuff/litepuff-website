import multer from 'multer';

const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedVideos = new Set(['video/mp4']);
export const reviewUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 6, fields: 20 },
  fileFilter: (_request, file, callback) => {
    const valid = file.fieldname === 'images' ? allowedImages.has(file.mimetype) : file.fieldname === 'video' && allowedVideos.has(file.mimetype);
    callback(valid ? null : new Error('Review media must be JPG, PNG, WEBP, or MP4.'), valid);
  }
}).fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]);
