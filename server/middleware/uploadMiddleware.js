import path from 'path';
import multer from 'multer';
import { createId } from '../utils/createId.js';

const storage = multer.diskStorage({
  destination: 'server/uploads',
  filename: (request, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${createId('image')}${extension}`);
  }
});

function fileFilter(request, file, callback) {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') callback(null, true);
  else callback(new Error('Only image or PDF files are allowed.'));
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024 } });
