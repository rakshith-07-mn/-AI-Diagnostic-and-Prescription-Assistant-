const mongoose = require('mongoose');

/**
 * Diagnosis Schema
 * Stores comprehensive information about patient diagnoses for the AI Diagnostic system
 */
const diagnosisSchema = new mongoose.Schema({
  // Patient and Session Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  sessionId: {
    type: String,
    required: false
  },
  
  // Symptom Information
  symptoms: [{
    symptomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Symptom'
    },
    name: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    duration: String,
    characteristics: Map,
    notes: String
  }],
  
  // Vital Signs at Time of Diagnosis
  vitalSigns: {
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    respiratoryRate: Number,
    temperature: Number,
    temperatureUnit: {
      type: String,
      enum: ['Celsius', 'Fahrenheit'],
      default: 'Celsius'
    },
    oxygenSaturation: Number,
    weight: Number,
    weightUnit: {
      type: String,
      enum: ['kg', 'lb'],
      default: 'kg'
    },
    height: Number,
    heightUnit: {
      type: String,
      enum: ['cm', 'in'],
      default: 'cm'
    },
    bmi: Number,
    pain: {
      level: {
        type: Number,
        min: 0,
        max: 10
      },
      location: String
    }
  },
  
  // Diagnosis Information
  diagnosedConditions: [{
    conditionId: {
      type: String,
      required: false
    },
    name: {
      type: String,
      required: [true, 'Condition name is required']
    },
    icdCode: String,
    snomedCode: String,
    probability: {
      type: Number,
      min: 0,
      max: 1,
      required: [true, 'Probability is required']
    },
    category: String,
    description: String,
    evidenceStrength: {
      type: String,
      enum: ['low', 'moderate', 'high']
    },
    matchedSymptoms: [{
      symptomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Symptom'
      },
      name: String,
      weight: Number
    }],
    differentialDiagnoses: [{
      name: String,
      probability: Number,
      keyDifferentiators: [String]
    }]
  }],
  
  // AI/ML Information
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1,
    required: [true, 'AI confidence score is required']
  },
  aiVersion: {
    type: String,
    required: [true, 'AI model version is required']
  },
  aiProcessingTime: Number, // in milliseconds
  aiFeatures: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    importance: Number
  }],
  aiExplanation: String,
  
  // Healthcare Provider Information
  diagnosedBy: {
    type: {
      type: String,
      enum: ['AI', 'HEALTHCARE_PROVIDER', 'AI_ASSISTED'],
      required: [true, 'Diagnoser type is required']
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() { return this.diagnosedBy.type !== 'AI'; }
    },
    providerName: String,
    providerSpecialty: String,
    notes: String
  },
  
  // Recommendations
  recommendedTests: [{
    name: String,
    reason: String,
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency']
    },
    status: {
      type: String,
      enum: ['recommended', 'ordered', 'completed', 'cancelled'],
      default: 'recommended'
    }
  }],
  
  recommendedTreatments: [{
    type: {
      type: String,
      enum: ['medication', 'procedure', 'therapy', 'lifestyle', 'referral', 'other']
    },
    name: String,
    description: String,
    reason: String,
    status: {
      type: String,
      enum: ['recommended', 'prescribed', 'completed', 'cancelled'],
      default: 'recommended'
    }
  }],
  
  recommendedFollowUp: {
    timeframe: String,
    provider: String,
    reason: String
  },
  
  // Feedback and Verification
  feedback: [{
    feedbackType: {
      type: String,
      enum: ['ACCURACY', 'HELPFULNESS', 'TREATMENT_EFFICACY']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    submittedBy: {
      type: {
        type: String,
        enum: ['PATIENT', 'HEALTHCARE_PROVIDER', 'SYSTEM']
      },
      id: mongoose.Schema.Types.ObjectId,
      name: String
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'MODIFIED', 'REJECTED'],
    default: 'PENDING'
  },
  
  verifiedBy: {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    providerName: String,
    providerSpecialty: String,
    verificationDate: Date,
    notes: String
  },
  
  // Status and Tracking
  status: {
    type: String,
    enum: ['ACTIVE', 'RESOLVED', 'INCORRECT', 'SUPERSEDED'],
    default: 'ACTIVE'
  },
  
  resolutionDetails: {
    date: Date,
    reason: String,
    outcome: String
  },
  
  // Timestamps and Metadata
  diagnosisDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Diagnosis date is required']
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Audit Information
  accessLog: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userRole: String,
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
diagnosisSchema.index({ patientId: 1, diagnosisDate: -1 });
diagnosisSchema.index({ 'diagnosedConditions.name': 1 });
diagnosisSchema.index({ 'diagnosedConditions.icdCode': 1 });
diagnosisSchema.index({ status: 1 });
diagnosisSchema.index({ aiConfidence: 1 });
diagnosisSchema.index({ 'diagnosedBy.type': 1 });

// Pre-save middleware to update the updatedAt field
diagnosisSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add feedback
diagnosisSchema.methods.addFeedback = function(feedbackData) {
  this.feedback.push(feedbackData);
  return this.save();
};

// Method to update diagnosis status
diagnosisSchema.methods.updateStatus = function(status, details = {}) {
  this.status = status;
  
  if (status === 'RESOLVED' && details) {
    this.resolutionDetails = {
      date: details.date || new Date(),
      reason: details.reason,
      outcome: details.outcome
    };
  }
  
  return this.save();
};

// Method to verify diagnosis
diagnosisSchema.methods.verifyDiagnosis = function(verifierData, status = 'VERIFIED', notes = '') {
  this.verificationStatus = status;
  this.verifiedBy = {
    providerId: verifierData.providerId,
    providerName: verifierData.providerName,
    providerSpecialty: verifierData.providerSpecialty,
    verificationDate: new Date(),
    notes: notes
  };
  
  return this.save();
};

// Method to log access
diagnosisSchema.methods.logAccess = function(userData, action) {
  this.accessLog.push({
    userId: userData.userId,
    userName: userData.userName,
    userRole: userData.userRole,
    action: action,
    timestamp: new Date()
  });
  
  return this.save();
};

// Static method to find diagnoses by condition
diagnosisSchema.statics.findByCondition = function(conditionName) {
  return this.find({
    'diagnosedConditions.name': new RegExp(conditionName, 'i')
  });
};

// Static method to find diagnoses by ICD code
diagnosisSchema.statics.findByIcdCode = function(icdCode) {
  return this.find({
    'diagnosedConditions.icdCode': new RegExp('^' + icdCode, 'i')
  });
};

// Static method to find recent diagnoses for a patient
diagnosisSchema.statics.findRecentForPatient = function(patientId, limit = 5) {
  return this.find({ patientId })
    .sort({ diagnosisDate: -1 })
    .limit(limit)
    .populate('patientId', 'firstName lastName dateOfBirth');
};

// Static method to find diagnoses with high AI confidence
diagnosisSchema.statics.findHighConfidenceDiagnoses = function(threshold = 0.9) {
  return this.find({ aiConfidence: { $gte: threshold } });
};

const Diagnosis = mongoose.model('Diagnosis', diagnosisSchema);

module.exports = Diagnosis;