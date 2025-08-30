/**
 * Error Handling Middleware
 * Provides centralized error handling for the AI Diagnostic and Prescription system
 */

const ApiError = require('../utils/apiError');

// Development error handler - sends detailed error information
const sendErrorDev = (err, req, res) => {
  // API errors
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Rendered website errors
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

// Production error handler - sends limited error information
const sendErrorProd = (err, req, res) => {
  // API errors
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }

  // Rendered website errors
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

// Handle MongoDB duplicate key error
const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new ApiError(message, 400);
};

// Handle MongoDB validation error
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ApiError(message, 400);
};

// Handle MongoDB cast error (invalid ID)
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new ApiError(message, 400);
};

// Handle JWT error
const handleJWTError = () =>
  new ApiError('Invalid token. Please log in again!', 401);

// Handle JWT expired error
const handleJWTExpiredError = () =>
  new ApiError('Your token has expired! Please log in again.', 401);

// Main error handling middleware
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Different error handling based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// 404 handler for undefined routes
exports.notFound = (req, res, next) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404));
};

// Rate limit exceeded handler
exports.tooManyRequests = (req, res) => {
  res.status(429).json({
    status: 'error',
    message: 'Too many requests from this IP, please try again later!'
  });
};

// Request timeout handler
exports.requestTimeout = (req, res) => {
  res.status(408).json({
    status: 'error',
    message: 'Request timeout, please try again later!'
  });
};