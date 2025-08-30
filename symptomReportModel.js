const mongoose = require('mongoose');

/**
 * Symptom Report Schema
 * Stores patient-reported symptoms for diagnosis and tracking
 */
const symptomReportSchema = new mongoose.Schema({
  // Patient Information
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient reference is required']
  },
  
  // Session Information
  sessionId: {
    type: String,
    required: [true, 'Session ID is required']
  },
  reportType: {
    type: String,
    enum: ['initial', 'follow_up', 'monitoring'],
    default: 'initial'
  },
  
  // Reported Symptoms
  symptoms: [{
    symptom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Symptom',
      required: true
    },
    name: String, // Denormalized for quick access
    severity: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days', 'weeks', 'months', 'years'],
        default: 'days'
      }
    },
    onset: {
      type: String,
      enum: ['sudden', 'gradual', 'unknown'],
      default: 'unknown'
    },
    frequency: {
      type: String,
      enum: ['constant', 'intermittent', 'periodic', 'occasional', 'rare', 'unknown'],
      default: 'unknown'
    },
    progression: {
      type: String,
      enum: ['improving', 'worsening', 'stable', 'fluctuating', 'unknown'],
      default: 'unknown'
    },
    location: [String],
    characteristics: [String],
    aggravatingFactors: [String],
    alleviatingFactors: [String],
    associatedSymptoms: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Symptom'
    }],
    notes: String
  }],
  
  // Vital Signs
  vitalSigns: {
    temperature: {
      value: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    heartRate: Number, // beats per minute
    respiratoryRate: Number, // breaths per minute
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    oxygenSaturation: Number, // percentage
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'lb'],
        default: 'kg'
      }
    },
    height: {
      value: Number,
      unit: {
        type: String,
        enum: ['cm', 'in'],
        default: 'cm'
      }
    },
    bmi: Number,
    pain: {
      level: {
        type: Number,
        min: 0,
        max: 10
      },
      location: [String]
    },
    measuredAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Additional Information
  generalHealth: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'unknown'],
    default: 'unknown'
  },
  recentMedications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    adherence: {
      type: String,
      enum: ['full', 'partial', 'poor', 'unknown'],
      default: 'unknown'
    },
    effectiveness: {
      type: String,
      enum: ['very_effective', 'somewhat_effective', 'not_effective', 'unknown'],
      default: 'unknown'
    },
    sideEffects: [String]
  }],
  recentEvents: [{
    eventType: {
      type: String,
      enum: ['injury', 'illness', 'surgery', 'stress', 'travel', 'diet_change', 'medication_change', 'other'],
      required: true
    },
    description: String,
    date: Date,
    impact: {
      type: String,
      enum: ['none', 'mild', 'moderate', 'severe', 'unknown'],
      default: 'unknown'
    }
  }],
  
  // Patient-reported Impact
  impactOnDaily: {
    type: String,
    enum: ['none', 'mild', 'moderate', 'severe', 'debilitating', 'unknown'],
    default: 'unknown'
  },
  sleepImpact: {
    type: String,
    enum: ['none', 'mild', 'moderate', 'severe', 'unknown'],
    default: 'unknown'
  },
  moodImpact: {
    type: String,
    enum: ['none', 'mild', 'moderate', 'severe', 'unknown'],
    default: 'unknown'
  },
  patientConcerns: [String],
  
  // AI/ML Processing Fields
  nlpProcessed: {
    type: Boolean,
    default: false
  },
  extractedKeywords: [String],
  symptomVectors: [{
    symptomId: mongoose.Schema.Types.ObjectId,
    vector: [Number]
  }],
  processingNotes: [{
    note: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Submission Information
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submissionMethod: {
    type: String,
    enum: ['self_report', 'healthcare_provider', 'caregiver', 'automated_system'],
    default: 'self_report'
  },
  submissionPlatform: {
    type: String,
    enum: ['web', 'mobile', 'kiosk', 'api', 'other'],
    default: 'web'
  },
  ipAddress: String,
  userAgent: String,
  geoLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
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
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
symptomReportSchema.index({ patient: 1, createdAt: -1 });
symptomReportSchema.index({ sessionId: 1 });
symptomReportSchema.index({ 'symptoms.symptom': 1 });
symptomReportSchema.index({ createdAt: -1 });
symptomReportSchema.index({ nlpProcessed: 1 });

// Pre-save middleware to update the updatedAt field
symptomReportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to calculate BMI if height and weight are provided
symptomReportSchema.pre('save', function(next) {
  if (this.vitalSigns && 
      this.vitalSigns.height && 
      this.vitalSigns.height.value && 
      this.vitalSigns.weight && 
      this.vitalSigns.weight.value) {
    
    let heightInMeters;
    let weightInKg;
    
    // Convert height to meters if needed
    if (this.vitalSigns.height.unit === 'cm') {
      heightInMeters = this.vitalSigns.height.value / 100;
    } else if (this.vitalSigns.height.unit === 'in') {
      heightInMeters = this.vitalSigns.height.value * 0.0254;
    }
    
    // Convert weight to kg if needed
    if (this.vitalSigns.weight.unit === 'kg') {
      weightInKg = this.vitalSigns.weight.value;
    } else if (this.vitalSigns.weight.unit === 'lb') {
      weightInKg = this.vitalSigns.weight.value * 0.453592;
    }
    
    // Calculate BMI: weight (kg) / (height (m))^2
    if (heightInMeters && weightInKg) {
      this.vitalSigns.bmi = Math.round((weightInKg / (heightInMeters * heightInMeters)) * 10) / 10;
    }
  }
  
  next();
});

// Method to add a new symptom to the report
symptomReportSchema.methods.addSymptom = function(symptomData) {
  this.symptoms.push(symptomData);
  return this.save();
};

// Method to update a symptom in the report
symptomReportSchema.methods.updateSymptom = function(symptomId, updatedData) {
  const symptomIndex = this.symptoms.findIndex(
    symptom => symptom._id.toString() === symptomId.toString()
  );
  
  if (symptomIndex !== -1) {
    this.symptoms[symptomIndex] = {
      ...this.symptoms[symptomIndex].toObject(),
      ...updatedData
    };
    return this.save();
  }
  
  return Promise.reject(new Error('Symptom not found in report'));
};

// Method to remove a symptom from the report
symptomReportSchema.methods.removeSymptom = function(symptomId) {
  this.symptoms = this.symptoms.filter(
    symptom => symptom._id.toString() !== symptomId.toString()
  );
  return this.save();
};

// Method to update vital signs
symptomReportSchema.methods.updateVitalSigns = function(vitalSignsData) {
  this.vitalSigns = {
    ...this.vitalSigns,
    ...vitalSignsData,
    measuredAt: new Date()
  };
  return this.save();
};

// Static method to find reports by symptom
symptomReportSchema.statics.findBySymptom = function(symptomId) {
  return this.find({
    'symptoms.symptom': symptomId
  }).sort({ createdAt: -1 });
};

// Static method to find reports by date range
symptomReportSchema.statics.findByDateRange = function(patientId, startDate, endDate) {
  return this.find({
    patient: patientId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

// Static method to find reports with high severity symptoms
symptomReportSchema.statics.findHighSeverity = function(minSeverity = 8) {
  return this.find({
    'symptoms.severity': { $gte: minSeverity }
  }).sort({ createdAt: -1 });
};

// Static method to get symptom trends for a patient
symptomReportSchema.statics.getSymptomTrends = async function(patientId, symptomId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        patient: mongoose.Types.ObjectId(patientId),
        createdAt: { $gte: startDate },
        'symptoms.symptom': mongoose.Types.ObjectId(symptomId)
      }
    },
    { $unwind: '$symptoms' },
    {
      $match: {
        'symptoms.symptom': mongoose.Types.ObjectId(symptomId)
      }
    },
    {
      $project: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        severity: '$symptoms.severity',
        progression: '$symptoms.progression'
      }
    },
    {
      $group: {
        _id: '$date',
        avgSeverity: { $avg: '$severity' },
        reports: { $sum: 1 },
        progressions: { $push: '$progression' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const SymptomReport = mongoose.model('SymptomReport', symptomReportSchema);

module.exports = SymptomReport;