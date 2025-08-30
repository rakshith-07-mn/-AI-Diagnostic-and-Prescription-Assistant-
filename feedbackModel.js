const mongoose = require('mongoose');

/**
 * Feedback Schema
 * Stores user feedback on diagnoses, medications, and system usability
 */
const feedbackSchema = new mongoose.Schema({
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  userType: {
    type: String,
    required: [true, 'User type is required'],
    enum: ['patient', 'doctor', 'nurse', 'pharmacist', 'other_healthcare_provider', 'admin']
  },
  
  // Feedback Target
  feedbackType: {
    type: String,
    required: [true, 'Feedback type is required'],
    enum: ['diagnosis', 'medication', 'system', 'general']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['Diagnosis', 'Medication', 'Patient', null]
  },
  
  // Feedback Content
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Rating is required']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  comment: {
    type: String,
    trim: true,
    required: [true, 'Comment is required'],
    maxlength: [2000, 'Comment cannot be more than 2000 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Specific Feedback Fields
  // For Diagnosis Feedback
  diagnosisAccuracy: {
    type: Number,
    min: 1,
    max: 5
  },
  diagnosisCorrection: {
    condition: String,
    icdCode: String,
    explanation: String
  },
  
  // For Medication Feedback
  medicationEffectiveness: {
    type: Number,
    min: 1,
    max: 5
  },
  sideEffectsReported: [{
    effect: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    onset: String,
    duration: String,
    description: String
  }],
  dosageIssues: {
    type: Boolean,
    default: false
  },
  dosageIssueDetails: String,
  
  // For System Feedback
  usabilityRating: {
    type: Number,
    min: 1,
    max: 5
  },
  featureRequest: String,
  bugReport: {
    description: String,
    stepsToReproduce: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  },
  
  // Attachments
  attachments: [{
    name: String,
    fileType: String,
    url: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status and Processing
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'addressed', 'resolved', 'rejected'],
    default: 'submitted'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  
  // AI Analysis
  aiAnalysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    keyTopics: [String],
    actionableInsights: [String],
    suggestedResponse: String,
    processingTime: Number,
    confidenceScore: Number
  },
  
  // System Fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['web_app', 'mobile_app', 'email', 'support_ticket', 'phone', 'other'],
    default: 'web_app'
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for efficient queries
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ feedbackType: 1 });
feedbackSchema.index({ targetId: 1, targetModel: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ tags: 1 });

// Pre-save middleware to update the updatedAt field
feedbackSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to update feedback status
feedbackSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  this.updatedAt = new Date();
  
  if (newStatus === 'addressed' || newStatus === 'resolved') {
    if (!this.response) {
      this.response = {};
    }
    this.response.respondedBy = userId;
    this.response.respondedAt = new Date();
  }
  
  return this.save();
};

// Method to add a response to feedback
feedbackSchema.methods.addResponse = function(content, userId) {
  this.response = {
    content,
    respondedBy: userId,
    respondedAt: new Date()
  };
  
  this.status = 'addressed';
  this.updatedAt = new Date();
  
  return this.save();
};

// Method to assign feedback to a user
feedbackSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.updatedAt = new Date();
  
  return this.save();
};

// Static method to find feedback by rating range
feedbackSchema.statics.findByRatingRange = function(min, max) {
  return this.find({
    rating: { $gte: min, $lte: max }
  }).sort({ createdAt: -1 });
};

// Static method to find unresolved feedback
feedbackSchema.statics.findUnresolved = function() {
  return this.find({
    status: { $nin: ['resolved', 'rejected'] }
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to find feedback by tag
feedbackSchema.statics.findByTag = function(tag) {
  return this.find({
    tags: tag
  }).sort({ createdAt: -1 });
};

// Static method to get feedback statistics
feedbackSchema.statics.getFeedbackStats = async function() {
  return this.aggregate([
    {
      $facet: {
        byType: [
          { $group: { _id: '$feedbackType', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        byRating: [
          { $group: { _id: '$rating', count: { $sum: 1 } } }
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ],
        overall: [
          { $group: { 
            _id: null, 
            totalCount: { $sum: 1 }, 
            avgRating: { $avg: '$rating' },
            unresolvedCount: { 
              $sum: { 
                $cond: [{ $in: ['$status', ['submitted', 'under_review']] }, 1, 0] 
              } 
            }
          }}
        ]
      }
    }
  ]);
};

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;