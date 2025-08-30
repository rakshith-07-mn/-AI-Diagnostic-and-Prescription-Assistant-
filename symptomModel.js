const mongoose = require('mongoose');

/**
 * Symptom Schema
 * Stores comprehensive information about medical symptoms for the AI Diagnostic system
 */
const symptomSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Symptom name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Symptom description is required']
  },
  aliases: [{
    type: String,
    trim: true
  }],
  
  // Classification
  category: {
    type: String,
    required: [true, 'Symptom category is required'],
    enum: [
      'Neurological', 'Respiratory', 'Cardiovascular', 'Gastrointestinal',
      'Musculoskeletal', 'Dermatological', 'Psychological', 'Urological',
      'Reproductive', 'Endocrine', 'Hematological', 'Immunological',
      'Ophthalmological', 'Otolaryngological', 'General', 'Other'
    ]
  },
  bodyPart: {
    type: String,
    required: false
  },
  bodySystem: {
    type: String,
    required: false
  },
  
  // Severity and Characteristics
  possibleSeverity: [{
    type: String,
    enum: ['mild', 'moderate', 'severe']
  }],
  characteristics: [{
    name: String,
    description: String,
    values: [String]
  }],
  duration: {
    typical: {
      min: String,
      max: String
    },
    requiresMedicalAttention: String
  },
  onset: {
    type: String,
    enum: ['sudden', 'gradual', 'variable']
  },
  
  // Medical Context
  commonlyAssociatedWith: [{
    condition: String,
    likelihood: {
      type: Number,
      min: 0,
      max: 1
    }
  }],
  differentialDiagnosis: [{
    condition: String,
    keyDifferentiators: [String]
  }],
  riskFactors: [String],
  triggers: [String],
  alleviatingFactors: [String],
  aggravatingFactors: [String],
  
  // Diagnostic Information
  diagnosticTests: [{
    name: String,
    description: String,
    normalRange: String,
    abnormalSignificance: String
  }],
  physicalExamFindings: [{
    name: String,
    description: String,
    significance: String
  }],
  
  // Treatment and Management
  selfCareRecommendations: [{
    recommendation: String,
    evidence: String,
    effectiveness: {
      type: String,
      enum: ['low', 'moderate', 'high', 'unknown']
    }
  }],
  whenToSeekMedicalAttention: [{
    scenario: String,
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency']
    }
  }],
  
  // AI/ML Specific Fields
  keywordTags: [String],
  nlpSynonyms: [String],
  searchTerms: [String],
  symptomVector: [Number], // For vector embedding representation
  
  // Metadata
  sourceReferences: [{
    title: String,
    authors: [String],
    publication: String,
    year: Number,
    url: String,
    doi: String
  }],
  evidenceLevel: {
    type: String,
    enum: ['high', 'moderate', 'low', 'anecdotal', 'theoretical']
  },
  lastReviewDate: Date,
  reviewedBy: [{
    name: String,
    credentials: String,
    date: Date
  }],
  
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
symptomSchema.index({ name: 1 });
symptomSchema.index({ category: 1 });
symptomSchema.index({ bodyPart: 1 });
symptomSchema.index({ keywordTags: 1 });
symptomSchema.index({ nlpSynonyms: 'text', name: 'text', description: 'text' });

// Pre-save middleware to update the updatedAt field
symptomSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to find related symptoms
symptomSchema.methods.findRelatedSymptoms = function() {
  return this.model('Symptom').find({
    $or: [
      { category: this.category },
      { bodyPart: this.bodyPart },
      { bodySystem: this.bodySystem }
    ],
    _id: { $ne: this._id }
  }).limit(10);
};

// Method to find commonly co-occurring symptoms
symptomSchema.methods.findCoOccurringSymptoms = function() {
  // This would typically involve a more complex query using aggregation
  // to find symptoms that frequently appear together in patient reports
  // For now, we'll use a simplified approach based on commonlyAssociatedWith
  
  const associatedConditions = this.commonlyAssociatedWith.map(item => item.condition);
  
  return this.model('Symptom').find({
    'commonlyAssociatedWith.condition': { $in: associatedConditions },
    _id: { $ne: this._id }
  }).limit(10);
};

// Static method to search symptoms by text
symptomSchema.statics.searchByText = function(query) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Static method to find symptoms by body part
symptomSchema.statics.findByBodyPart = function(bodyPart) {
  return this.find({ bodyPart: new RegExp(bodyPart, 'i') });
};

// Static method to find symptoms by category
symptomSchema.statics.findByCategory = function(category) {
  return this.find({ category });
};

const Symptom = mongoose.model('Symptom', symptomSchema);

module.exports = Symptom;