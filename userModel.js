const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Handles authentication and user management for the AI Diagnostic and Prescription system
 */
const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password in queries by default
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['patient', 'doctor', 'nurse', 'pharmacist', 'admin', 'researcher'],
    default: 'patient'
  },
  permissions: [{
    type: String,
    enum: [
      'view_patients', 'edit_patients', 'delete_patients',
      'view_diagnoses', 'create_diagnoses', 'edit_diagnoses', 'delete_diagnoses',
      'view_medications', 'prescribe_medications', 'edit_medications', 'delete_medications',
      'view_feedback', 'respond_feedback', 'delete_feedback',
      'view_analytics', 'export_data', 'manage_users', 'system_settings'
    ]
  }],
  
  // Profile Information
  profilePicture: String,
  phoneNumber: {
    type: String,
    trim: true
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  // Professional Information (for healthcare providers)
  professionalTitle: String,
  specialization: String,
  licenseNumber: String,
  licenseExpiryDate: Date,
  organization: String,
  department: String,
  yearsOfExperience: Number,
  
  // Patient-specific Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phoneNumber: String
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isMFAEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    select: false
  },
  
  // Security
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Preferences
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    accessibility: {
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      highContrast: {
        type: Boolean,
        default: false
      },
      screenReader: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // System Fields
  lastLogin: Date,
  lastActive: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deviceInfo: [{
    deviceId: String,
    deviceType: String,
    browser: String,
    os: String,
    lastUsed: Date,
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'address.zipCode': 1 });
userSchema.index({ specialization: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  // Hash the password with a salt factor of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // Update passwordChangedAt if not a new user
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token is created after password change
  }
  
  next();
});

// Pre-save middleware to update the updatedAt field
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if password is correct
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to check if password was changed after a given timestamp
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  
  // False means NOT changed
  return false;
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Token expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

// Method to record login
userSchema.methods.recordLogin = function(deviceInfo) {
  this.lastLogin = new Date();
  this.lastActive = new Date();
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  
  // Add or update device info
  if (deviceInfo) {
    const existingDeviceIndex = this.deviceInfo.findIndex(
      device => device.deviceId === deviceInfo.deviceId
    );
    
    if (existingDeviceIndex >= 0) {
      this.deviceInfo[existingDeviceIndex] = {
        ...this.deviceInfo[existingDeviceIndex],
        ...deviceInfo,
        lastUsed: new Date()
      };
    } else {
      this.deviceInfo.push({
        ...deviceInfo,
        lastUsed: new Date()
      });
    }
  }
  
  return this.save({ validateBeforeSave: false });
};

// Method to update activity timestamp
userSchema.methods.updateActivity = function() {
  this.lastActive = new Date();
  return this.model('User').updateOne(
    { _id: this._id },
    { lastActive: this.lastActive }
  );
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Method to handle failed login attempt
userSchema.methods.incrementLoginAttempts = function() {
  // Reset login attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Increment login attempts
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account if max attempts reached
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // Lock for 30 minutes
  }
  
  return this.updateOne(updates);
};

// Static method to find active healthcare providers
userSchema.statics.findHealthcareProviders = function() {
  return this.find({
    role: { $in: ['doctor', 'nurse', 'pharmacist'] },
    isActive: true
  });
};

// Static method to find users by permission
userSchema.statics.findByPermission = function(permission) {
  return this.find({
    permissions: permission,
    isActive: true
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;