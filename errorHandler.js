/**
 * Global error handling middleware
 */

const errorHandler = (err, req, res, next) => {
  // Log error for server-side debugging
  console.error(err.stack);

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(error => error.message);
  } else if (err.name === 'CastError') {
    // Mongoose cast error (e.g., invalid ObjectId)
    statusCode = 400;
    message = 'Resource not found';
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    message = 'Duplicate field value entered';
    errors = { [Object.keys(err.keyValue)[0]]: `${Object.values(err.keyValue)[0]} already exists` };
  } else if (err.name === 'JsonWebTokenError') {
    // JWT validation error
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired error
    statusCode = 401;
    message = 'Token expired';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// Custom error class for API errors
class ApiError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'ApiError';
  }
}

module.exports = {
  errorHandler,
  ApiError
};