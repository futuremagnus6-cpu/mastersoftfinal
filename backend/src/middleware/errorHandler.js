const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value for ${field}: ${value}. Please use another value.`;
  return new AppError(message, 409, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');

const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message, stack: err.stack };

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') error = handleCastErrorDB(err);

  // Mongoose duplicate key
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);

  // Mongoose validation error
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);

  // JWT errors
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large. Maximum size is 10MB.', 400, 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError(`Unexpected file field: ${err.field || 'unknown'}`, 400, 'UNEXPECTED_FILE_FIELD');
  }
  if (err.code === 'LIMIT_FILE_TYPES') {
    error = new AppError('Invalid file type. Allowed: jpg, jpeg, png, pdf, xlsx, csv.', 400, 'INVALID_FILE_TYPE');
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Something went wrong. Please try again later.';

  const response = {
    success: false,
    message,
    code: error.code || null,
  };

  // In development, include stack trace and error details
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.error = error;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
module.exports.AppError = AppError;
