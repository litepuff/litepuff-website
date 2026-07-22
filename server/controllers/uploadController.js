import { created } from '../utils/apiResponse.js';
import path from 'path';
import sharp from 'sharp';

export async function uploadImage(request, response) {
  if (!request.file) {
    return response.status(400).json({ success: false, message: 'Image file is required.' });
  }

  if (request.file.mimetype === 'application/pdf') {
    return created(response, { fileUrl: `/uploads/${request.file.filename}`, imageUrl: `/uploads/${request.file.filename}` }, 'PDF uploaded.');
  }

  const parsed = path.parse(request.file.filename);
  const webpFile = `${parsed.name}.webp`;
  const webpPath = path.join(path.dirname(request.file.path), webpFile);
  await sharp(request.file.path).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82 }).toFile(webpPath);

  created(response, {
    imageUrl: `/uploads/${request.file.filename}`,
    optimizedUrl: `/uploads/${webpFile}`,
    responsive: {
      webp: `/uploads/${webpFile}`,
      original: `/uploads/${request.file.filename}`
    }
  }, 'Image uploaded and optimized.');
}
