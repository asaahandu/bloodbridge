import mongoose from 'mongoose';

import { env } from '../config/env.js';

export function errorHandler(error, _request, response, _next) {
  let statusCode = error.statusCode ?? 500;
  let message = error.message ?? 'Internal server error';
  let details = error.details;

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(error.errors).map((validationError) => validationError.message);
  }

  if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${error.path}`;
  }

  if (error?.code === 11000) {
    statusCode = 409;
    message = 'A record with those details already exists';
    details = error.keyValue;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.nodeEnv === 'development' && statusCode >= 500 ? { stack: error.stack } : {}),
    },
  });
}
