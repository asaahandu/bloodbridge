import multer from 'multer';

import { AppError } from '../utils/app-error.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 5, parts: 10 },
  fileFilter(_request, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError('Choose JPEG or PNG campaign images only', 400));
      return;
    }
    callback(null, true);
  },
}).array('images', 5);

export function parseCampaignUpload(request, response, next) {
  upload(request, response, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each campaign image must be 5 MB or smaller'
        : 'Attach no more than five campaign images';
      next(new AppError(message, 400));
      return;
    }
    next(error);
  });
}