const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const User = require('../models/userModel');
const ApiError = require('../utils/apiError');

/**
 * Authentication Controller
 * Handles user authentication for the AI Diagnostic and Prescription system
 */

// Generate JWT token
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Send JWT token in response
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  
  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };
  
  // Send cookie
  res.cookie('jwt', token, cookieOptions);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError('Email already in use', 400));
    }
    
    // Create new user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'patient', // Default to patient role
      permissions: getDefaultPermissions(role || 'patient')
    });
    
    // Send welcome email (to be implemented)
    // await sendWelcomeEmail(newUser.email, newUser.firstName);
    
    // Generate token and send response
    createSendToken(newUser, 201, req, res);
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password exist
    if (!email || !password) {
      return next(new ApiError('Please provide email and password', 400));
    }
    
    // Find user by email and include password field
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists and password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new ApiError('Incorrect email or password', 401));
    }
    
    // Check if user account is active
    if (!user.isActive) {
      return next(new ApiError('Your account has been deactivated. Please contact support.', 401));
    }
    
    // Check if account is locked due to too many failed attempts
    if (user.isLocked()) {
      return next(new ApiError('Account locked due to too many failed login attempts. Please try again later.', 401));
    }
    
    // Reset login attempts and record login
    await user.recordLogin({
      deviceId: req.headers['user-agent'] || 'unknown',
      deviceType: getDeviceType(req),
      browser: getBrowser(req),
      os: getOS(req),
      ipAddress: req.ip
    });
    
    // Generate token and send response
    createSendToken(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// Logout user
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

// Protect routes - middleware to check if user is authenticated
exports.protect = async (req, res, next) => {
  try {
    // Get token from authorization header or cookie
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    // Check if token exists
    if (!token) {
      return next(new ApiError('You are not logged in. Please log in to get access.', 401));
    }
    
    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new ApiError('The user belonging to this token no longer exists.', 401));
    }
    
    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new ApiError('User recently changed password. Please log in again.', 401));
    }
    
    // Check if user account is active
    if (!currentUser.isActive) {
      return next(new ApiError('Your account has been deactivated. Please contact support.', 401));
    }
    
    // Update last active timestamp
    await currentUser.updateActivity();
    
    // Grant access to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

// Restrict routes to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Check if user has specific permissions
exports.hasPermission = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];
    
    const hasAllPermissions = permissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return next(new ApiError('You do not have the required permissions to perform this action', 403));
    }
    
    next();
  };
};

// Forgot password - send reset token via email
exports.forgotPassword = async (req, res, next) => {
  try {
    // Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new ApiError('There is no user with that email address', 404));
    }
    
    // Generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    // Send token to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    
    try {
      // TODO: Implement email sending functionality
      // await sendPasswordResetEmail(user.email, resetURL);
      
      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      return next(new ApiError('There was an error sending the email. Try again later!', 500));
    }
  } catch (error) {
    next(error);
  }
};

// Reset password using token
exports.resetPassword = async (req, res, next) => {
  try {
    // Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    // If token has not expired, and there is user, set the new password
    if (!user) {
      return next(new ApiError('Token is invalid or has expired', 400));
    }
    
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    // Log the user in, send JWT
    createSendToken(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// Update password
exports.updatePassword = async (req, res, next) => {
  try {
    // Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    
    // Check if current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return next(new ApiError('Your current password is incorrect', 401));
    }
    
    // Update password
    user.password = req.body.newPassword;
    await user.save();
    
    // Log in user with new password
    createSendToken(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Update current user data (except password)
exports.updateMe = async (req, res, next) => {
  try {
    // Check if user is trying to update password
    if (req.body.password) {
      return next(new ApiError('This route is not for password updates. Please use /updateMyPassword', 400));
    }
    
    // Filter out unwanted fields that should not be updated
    const filteredBody = filterObj(req.body, 
      'firstName', 'lastName', 'email', 'phoneNumber', 'address', 
      'preferences', 'profilePicture');
    
    // Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get user by ID
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new ApiError('No user found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update user
exports.updateUser = async (req, res, next) => {
  try {
    // Filter out password fields
    const filteredBody = {...req.body};
    delete filteredBody.password;
    
    const updatedUser = await User.findByIdAndUpdate(req.params.id, filteredBody, {
      new: true,
      runValidators: true
    });
    
    if (!updatedUser) {
      return next(new ApiError('No user found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete user
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return next(new ApiError('No user found with that ID', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to filter object properties
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Helper function to get default permissions based on role
const getDefaultPermissions = (role) => {
  switch (role) {
    case 'admin':
      return [
        'view_patients', 'edit_patients', 'delete_patients',
        'view_diagnoses', 'create_diagnoses', 'edit_diagnoses', 'delete_diagnoses',
        'view_medications', 'prescribe_medications', 'edit_medications', 'delete_medications',
        'view_feedback', 'respond_feedback', 'delete_feedback',
        'view_analytics', 'export_data', 'manage_users', 'system_settings'
      ];
    case 'doctor':
      return [
        'view_patients', 'edit_patients',
        'view_diagnoses', 'create_diagnoses', 'edit_diagnoses',
        'view_medications', 'prescribe_medications',
        'view_feedback', 'respond_feedback',
        'view_analytics'
      ];
    case 'nurse':
      return [
        'view_patients', 'edit_patients',
        'view_diagnoses',
        'view_medications',
        'view_feedback'
      ];
    case 'pharmacist':
      return [
        'view_patients',
        'view_diagnoses',
        'view_medications', 'edit_medications',
        'view_feedback'
      ];
    case 'researcher':
      return [
        'view_analytics', 'export_data'
      ];
    case 'patient':
    default:
      return [];
  }
};

// Helper functions to get device information
const getDeviceType = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  
  if (/mobile/i.test(userAgent)) {
    return 'Mobile';
  } else if (/tablet/i.test(userAgent)) {
    return 'Tablet';
  } else if (/windows|macintosh|linux/i.test(userAgent)) {
    return 'Desktop';
  } else {
    return 'Unknown';
  }
};

const getBrowser = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  
  if (/chrome/i.test(userAgent)) {
    return 'Chrome';
  } else if (/firefox/i.test(userAgent)) {
    return 'Firefox';
  } else if (/safari/i.test(userAgent)) {
    return 'Safari';
  } else if (/edge/i.test(userAgent)) {
    return 'Edge';
  } else if (/opera/i.test(userAgent)) {
    return 'Opera';
  } else if (/msie|trident/i.test(userAgent)) {
    return 'Internet Explorer';
  } else {
    return 'Unknown';
  }
};

const getOS = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  
  if (/windows/i.test(userAgent)) {
    return 'Windows';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    return 'macOS';
  } else if (/linux/i.test(userAgent)) {
    return 'Linux';
  } else if (/android/i.test(userAgent)) {
    return 'Android';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'iOS';
  } else {
    return 'Unknown';
  }
};