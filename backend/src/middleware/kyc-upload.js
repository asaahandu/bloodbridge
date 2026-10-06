import multer from 'multer';

import { AppError } from '../utils/app-error.js';

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 1, parts: 6 },
  fileFilter(_request, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError('Choose PDF, JPEG, or PNG documents only', 400));
      return;
    }
    callback(null, true);
  },
}).array('documents', 5);

export function parseKycUpload(request, response, next) {
  upload(request, response, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each document must be 5 MB or smaller'
        : 'Attach no more than five documents';
      next(new AppError(message, 400));
      return;
    }
    next(error);
  });
}