const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/userModel');
const ApiError = require('../utils/apiError');

/**
 * Authentication Middleware
 * Provides authentication and authorization functions for the AI Diagnostic and Prescription system
 */

// Middleware to protect routes - verify user is authenticated
exports.protect = async (req, res, next) => {
  try {
    // 1) Get token from authorization header or cookie
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // Check if token exists
    if (!token) {
      return next(new ApiError('You are not logged in. Please log in to get access.', 401));
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new ApiError('The user belonging to this token no longer exists.', 401));
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new ApiError('User recently changed password. Please log in again.', 401));
    }

    // 5) Check if user account is active
    if (!currentUser.isActive) {
      return next(new ApiError('Your account has been deactivated. Please contact support.', 401));
    }

    // 6) Check if account is locked
    if (currentUser.isLocked && currentUser.isLocked()) {
      return next(new ApiError('Your account is locked. Please contact support.', 401));
    }

    // 7) Update last active timestamp
    if (currentUser.updateActivity) {
      await currentUser.updateActivity();
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new ApiError('Invalid token. Please log in again.', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError('Your token has expired. Please log in again.', 401));
    }
    next(err);
  }
};

// Middleware to restrict access to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user role is included in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(new ApiError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Middleware to check if user has specific permissions
exports.hasPermission = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];
    
    // Check if user has all required permissions
    const hasAllPermissions = permissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return next(new ApiError('You do not have the required permissions to perform this action', 403));
    }
    
    next();
  };
};

// Middleware to check if user is the owner of a resource or has admin privileges
exports.isOwnerOrAdmin = (model, paramIdField = 'id') => {
  return async (req, res, next) => {
    try {
      // Skip check for admins
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Get resource ID from request parameters
      const resourceId = req.params[paramIdField];
      if (!resourceId) {
        return next(new ApiError(`No ${paramIdField} parameter found`, 400));
      }
      
      // Find the resource
      const resource = await model.findById(resourceId);
      if (!resource) {
        return next(new ApiError(`No resource found with ID: ${resourceId}`, 404));
      }
      
      // Check if user is the owner
      const isOwner = resource.user && resource.user.toString() === req.user.id.toString();
      const isCreator = resource.createdBy && resource.createdBy.toString() === req.user.id.toString();
      
      if (!isOwner && !isCreator) {
        return next(new ApiError('You do not have permission to perform this action on this resource', 403));
      }
      
      // Add resource to request for potential later use
      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Middleware to check if user is accessing their own data or has admin privileges
exports.isCurrentUserOrAdmin = (paramIdField = 'id') => {
  return (req, res, next) => {
    // Skip check for admins
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Get user ID from request parameters
    const userId = req.params[paramIdField];
    if (!userId) {
      return next(new ApiError(`No ${paramIdField} parameter found`, 400));
    }
    
    // Check if user is accessing their own data
    if (userId !== req.user.id.toString()) {
      return next(new ApiError('You do not have permission to perform this action on another user\'s data', 403));
    }
    
    next();
  };
};

// Middleware to check if user is a healthcare provider
exports.isHealthcareProvider = (req, res, next) => {
  const healthcareRoles = ['doctor', 'nurse', 'pharmacist'];
  
  if (!healthcareRoles.includes(req.user.role)) {
    return next(new ApiError('This action requires healthcare provider privileges', 403));
  }
  
  next();
};

// Middleware to check if user is a patient
exports.isPatient = (req, res, next) => {
  if (req.user.role !== 'patient') {
    return next(new ApiError('This action requires patient privileges', 403));
  }
  
  next();
};

// Middleware to check if user is a doctor
exports.isDoctor = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return next(new ApiError('This action requires doctor privileges', 403));
  }
  
  next();
};

// Middleware to log user activity
exports.logActivity = (action) => {
  return (req, res, next) => {
    // In a real application, this would log to a database
    // For now, just log to console
    console.log(`[${new Date().toISOString()}] User ${req.user.id} (${req.user.role}): ${action}`);
    
    // Could also store in a database collection
    // const activity = new Activity({
    //   user: req.user.id,
    //   action,
    //   ip: req.ip,
    //   userAgent: req.headers['user-agent'],
    //   details: { method: req.method, path: req.path, params: req.params }
    // });
    // activity.save().catch(err => console.error('Error logging activity:', err));
    
    next();
  };
};

// Middleware to check rate limits for sensitive operations
exports.sensitiveRateLimit = (maxAttempts, windowMs) => {
  const attempts = new Map();
  
  // Cleanup function to remove old attempts
  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of attempts.entries()) {
      if (now - value.timestamp > windowMs) {
        attempts.delete(key);
      }
    }
  };
  
  // Run cleanup every minute
  setInterval(cleanup, 60000);
  
  return (req, res, next) => {
    const ip = req.ip;
    const key = `${ip}:${req.originalUrl}`;
    const now = Date.now();
    
    // Clean up old attempts
    cleanup();
    
    // Get current attempts
    const attempt = attempts.get(key) || { count: 0, timestamp: now };
    
    // Check if too many attempts
    if (attempt.count >= maxAttempts) {
      return next(new ApiError(`Too many attempts. Please try again after ${Math.ceil((windowMs - (now - attempt.timestamp)) / 1000 / 60)} minutes.`, 429));
    }
    
    // Update attempts
    attempts.set(key, { count: attempt.count + 1, timestamp: attempt.timestamp });
    
    next();
  };
};