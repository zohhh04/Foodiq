import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) =>
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

export const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message = 'Server error', details } = err;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value: resource already exists';
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(statusCode).json({ success: false, message, details });
};
