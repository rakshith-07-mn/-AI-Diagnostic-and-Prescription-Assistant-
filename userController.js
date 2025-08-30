const User = require('../models/userModel');
const ApiError = require('../utils/apiError');
const crypto = require('crypto');

/**
 * User Controller
 * Handles user-related operations for the AI Diagnostic and Prescription system
 */

// Get all users with pagination and filtering
exports.getAllUsers = async (req, res, next) => {
  try {
    // Build query
    const query = {};
    
    // Filter by role
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    // Filter by name
    if (req.query.name) {
      const nameRegex = new RegExp(req.query.name, 'i');
      query.$or = [
        { firstName: nameRegex },
        { lastName: nameRegex }
      ];
    }
    
    // Filter by email
    if (req.query.email) {
      query.email = { $regex: req.query.email, $options: 'i' };
    }
    
    // Filter by account status
    if (req.query.status) {
      query['accountStatus.status'] = req.query.status;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const users = await User.find(query)
      .select('-password -passwordResetToken -passwordResetExpires -loginAttempts')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit)
      },
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single user by ID
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken -passwordResetExpires -loginAttempts');
    
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

// Create a new user (admin only)
exports.createUser = async (req, res, next) => {
  try {
    // Check if user with same email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    
    if (existingUser) {
      return next(new ApiError('User with this email already exists', 400));
    }
    
    // Create new user
    const newUser = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      permissions: req.body.permissions,
      profile: req.body.profile,
      professionalInfo: req.body.professionalInfo,
      patientInfo: req.body.patientInfo,
      accountStatus: {
        status: 'active',
        activatedAt: new Date()
      },
      createdBy: req.user ? req.user.id : undefined
    });
    
    // Remove sensitive fields from response
    newUser.password = undefined;
    newUser.passwordResetToken = undefined;
    newUser.passwordResetExpires = undefined;
    newUser.loginAttempts = undefined;
    
    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a user
exports.updateUser = async (req, res, next) => {
  try {
    // Prevent password update through this route
    if (req.body.password) {
      return next(new ApiError('This route is not for password updates. Please use /updatePassword', 400));
    }
    
    // Add audit information
    req.body.updatedBy = req.user ? req.user.id : undefined;
    req.body.updatedAt = new Date();
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).select('-password -passwordResetToken -passwordResetExpires -loginAttempts');
    
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

// Delete a user
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

// Get current user profile
exports.getMe = async (req, res, next) => {
  try {
    // req.user.id is set by the protect middleware
    const user = await User.findById(req.user.id)
      .select('-password -passwordResetToken -passwordResetExpires -loginAttempts');
    
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

// Update current user profile
exports.updateMe = async (req, res, next) => {
  try {
    // Prevent password update through this route
    if (req.body.password) {
      return next(new ApiError('This route is not for password updates. Please use /updatePassword', 400));
    }
    
    // Prevent role and permissions update through this route
    if (req.body.role || req.body.permissions) {
      return next(new ApiError('This route is not for role or permissions updates', 400));
    }
    
    // Filter allowed fields
    const allowedFields = ['firstName', 'lastName', 'email', 'profile', 'preferences'];
    const filteredBody = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });
    
    // Add audit information
    filteredBody.updatedAt = new Date();
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).select('-password -passwordResetToken -passwordResetExpires -loginAttempts');
    
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

// Update user password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Check if all required fields are provided
    if (!currentPassword || !newPassword || !confirmPassword) {
      return next(new ApiError('Please provide current password, new password, and confirm password', 400));
    }
    
    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return next(new ApiError('New password and confirm password do not match', 400));
    }
    
    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    // Check if current password is correct
    if (!(await user.comparePassword(currentPassword, user.password))) {
      return next(new ApiError('Current password is incorrect', 401));
    }
    
    // Update password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Deactivate user account
exports.deactivateAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        'accountStatus.status': 'inactive',
        'accountStatus.deactivatedAt': new Date(),
        'accountStatus.deactivationReason': req.body.reason || 'User requested deactivation'
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Reactivate user account (admin only)
exports.reactivateAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        'accountStatus.status': 'active',
        'accountStatus.activatedAt': new Date(),
        'accountStatus.deactivationReason': null
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!user) {
      return next(new ApiError('No user found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Account reactivated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          accountStatus: user.accountStatus
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Lock user account (admin only)
exports.lockAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        'accountStatus.status': 'locked',
        'accountStatus.lockedAt': new Date(),
        'accountStatus.lockReason': req.body.reason || 'Administrative action'
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!user) {
      return next(new ApiError('No user found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Account locked successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          accountStatus: user.accountStatus
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Unlock user account (admin only)
exports.unlockAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        'accountStatus.status': 'active',
        'accountStatus.lockedAt': null,
        'accountStatus.lockReason': null,
        loginAttempts: 0
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!user) {
      return next(new ApiError('No user found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Account unlocked successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          accountStatus: user.accountStatus
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user role and permissions (admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role, permissions } = req.body;
    
    if (!role) {
      return next(new ApiError('Role is required', 400));
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        role,
        permissions,
        updatedAt: new Date(),
        updatedBy: req.user.id
      },
      {
        new: true,
        runValidators: true
      }
    ).select('-password -passwordResetToken -passwordResetExpires -loginAttempts');
    
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

// Get healthcare providers
exports.getHealthcareProviders = async (req, res, next) => {
  try {
    const providers = await User.findHealthcareProviders();
    
    res.status(200).json({
      status: 'success',
      results: providers.length,
      data: {
        providers
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get users by permission
exports.getUsersByPermission = async (req, res, next) => {
  try {
    const { permission } = req.params;
    
    const users = await User.findByPermission(permission);
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        permission,
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate password reset token
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next(new ApiError('Please provide your email', 400));
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return next(new ApiError('No user found with that email', 404));
    }
    
    // Generate reset token
    const resetToken = await user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    // In a real application, send email with reset token
    // For now, just return the token in the response (for development only)
    
    res.status(200).json({
      status: 'success',
      message: 'Password reset token generated successfully',
      data: {
        resetToken, // In production, this should be sent via email, not in the response
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// Reset password using token
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    if (!password || !confirmPassword) {
      return next(new ApiError('Please provide password and confirm password', 400));
    }
    
    if (password !== confirmPassword) {
      return next(new ApiError('Passwords do not match', 400));
    }
    
    // Hash the token to compare with the stored hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user by token and check if token is still valid
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return next(new ApiError('Token is invalid or has expired', 400));
    }
    
    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get user activity log
exports.getUserActivityLog = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user.id;
    
    // In a real application, this would query an activity log collection
    // For now, we'll return a mock response
    
    const activityLog = [
      {
        action: 'login',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { status: 'success', method: 'password' }
      },
      {
        action: 'view_patient',
        timestamp: new Date(Date.now() - 3500000), // 58 minutes ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { patientId: '60d21b4667d0d8992e610c88', action: 'view' }
      },
      {
        action: 'create_diagnosis',
        timestamp: new Date(Date.now() - 3400000), // 57 minutes ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { diagnosisId: '60d21b4667d0d8992e610c90', patientId: '60d21b4667d0d8992e610c88' }
      },
      {
        action: 'create_prescription',
        timestamp: new Date(Date.now() - 3300000), // 55 minutes ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { prescriptionId: 'RX20230001ABC', patientId: '60d21b4667d0d8992e610c88' }
      },
      {
        action: 'logout',
        timestamp: new Date(Date.now() - 3200000), // 53 minutes ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { status: 'success' }
      }
    ];
    
    res.status(200).json({
      status: 'success',
      data: {
        userId,
        activityLog
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user statistics
exports.getUserStatistics = async (req, res, next) => {
  try {
    // In a real application, this would aggregate user data
    // For now, we'll return a mock response
    
    const statistics = {
      totalUsers: 256,
      activeUsers: 218,
      inactiveUsers: 28,
      lockedUsers: 10,
      usersByRole: {
        'admin': 5,
        'doctor': 42,
        'nurse': 78,
        'patient': 131
      },
      newUsersLast30Days: 24,
      activeUsersLast24Hours: 87,
      averageSessionDuration: 28, // minutes
      topActiveUsers: [
        { id: '60d21b4667d0d8992e610c91', name: 'Dr. Jane Smith', role: 'doctor', activityCount: 156 },
        { id: '60d21b4667d0d8992e610c92', name: 'Dr. Robert Johnson', role: 'doctor', activityCount: 142 },
        { id: '60d21b4667d0d8992e610c93', name: 'Nurse Sarah Williams', role: 'nurse', activityCount: 137 },
        { id: '60d21b4667d0d8992e610c94', name: 'Dr. Michael Brown', role: 'doctor', activityCount: 129 },
        { id: '60d21b4667d0d8992e610c95', name: 'Nurse David Miller', role: 'nurse', activityCount: 118 }
      ],
      registrationTrend: {
        // Mock monthly data for the last 6 months
        labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
        counts: [18, 22, 25, 31, 28, 24]
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        statistics
      }
    });
  } catch (error) {
    next(error);
  }
};