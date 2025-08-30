const mongoose = require('mongoose');

/**
 * Patient Schema
 * Stores comprehensive patient information for the AI Diagnostic system
 */
const patientSchema = new mongoose.Schema({
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
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    required: [true, 'Gender is required']
  },
  contactInformation: {
    email: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
      lowercase: true
    },
    phone: {
      type: String,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    preferredContactMethod: {
      type: String,
      enum: ['Email', 'Phone', 'SMS', 'Mail'],
      default: 'Email'
    }
  },
  
  // Medical Information
  medicalHistory: {
    conditions: [{
      name: String,
      diagnosedDate: Date,
      status: {
        type: String,
        enum: ['Active', 'Resolved', 'In Remission', 'Unknown']
      },
      notes: String
    }],
    surgeries: [{
      procedure: String,
      date: Date,
      notes: String
    }],
    familyHistory: [{
      condition: String,
      relationship: String,
      notes: String
    }]
  },
  
  allergies: [{
    allergen: String,
    reaction: String,
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe', 'Unknown']
    },
    diagnosedDate: Date
  }],
  
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: String,
    purpose: String,
    status: {
      type: String,
      enum: ['Current', 'Discontinued', 'Completed']
    }
  }],
  
  vitalSigns: [{
    date: {
      type: Date,
      default: Date.now
    },
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
    },
    notes: String
  }],
  
  // Healthcare Provider Information
  primaryCareProvider: {
    name: String,
    specialization: String,
    contactInformation: {
      email: String,
      phone: String,
      facility: String,
      address: String
    }
  },
  
  specialists: [{
    name: String,
    specialization: String,
    contactInformation: {
      email: String,
      phone: String,
      facility: String,
      address: String
    },
    referralDate: Date,
    reason: String
  }],
  
  // Insurance Information
  insuranceInformation: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    policyHolder: {
      name: String,
      relationship: String,
      dateOfBirth: Date
    },
    coverageStartDate: Date,
    coverageEndDate: Date
  },
  
  // System-related Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  consentInformation: {
    dataProcessingConsent: Boolean,
    researchParticipationConsent: Boolean,
    marketingCommunicationsConsent: Boolean,
    consentDate: Date,
    consentVersion: String
  },
  
  // Audit and Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedBy: {
    userId: String,
    role: String,
    timestamp: Date
  },
  accessLog: [{
    userId: String,
    role: String,
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Virtual for patient's age
patientSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for patient's full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for efficient queries
patientSchema.index({ lastName: 1, firstName: 1 });
patientSchema.index({ 'contactInformation.email': 1 });
patientSchema.index({ dateOfBirth: 1 });

// Pre-save middleware to update the updatedAt field
patientSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if patient has a specific allergy
patientSchema.methods.hasAllergy = function(allergen) {
  return this.allergies.some(allergy => 
    allergy.allergen.toLowerCase() === allergen.toLowerCase()
  );
};

// Method to check if patient is currently taking a specific medication
patientSchema.methods.isOnMedication = function(medicationName) {
  return this.medications.some(medication => 
    medication.name.toLowerCase() === medicationName.toLowerCase() && 
    medication.status === 'Current'
  );
};

// Method to add a new vital sign record
patientSchema.methods.addVitalSigns = function(vitalSignData) {
  this.vitalSigns.push(vitalSignData);
  return this.save();
};

// Method to get the most recent vital signs
patientSchema.methods.getLatestVitalSigns = function() {
  if (this.vitalSigns.length === 0) return null;
  
  return this.vitalSigns.sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  )[0];
};

// Static method to find patients by age range
patientSchema.statics.findByAgeRange = function(minAge, maxAge) {
  const today = new Date();
  const minBirthDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate());
  const maxBirthDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  
  return this.find({
    dateOfBirth: {
      $gte: minBirthDate,
      $lte: maxBirthDate
    }
  });
};

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;