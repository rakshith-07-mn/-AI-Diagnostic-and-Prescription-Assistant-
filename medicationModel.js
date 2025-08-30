const mongoose = require('mongoose');

/**
 * Medication Schema
 * Stores comprehensive information about medications for the AI Diagnostic and Prescription system
 */
const medicationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Medication name is required'],
    trim: true,
    unique: true
  },
  brandNames: [{
    type: String,
    trim: true
  }],
  genericName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Medication description is required']
  },
  
  // Classification
  category: {
    type: String,
    required: [true, 'Medication category is required']
  },
  drugClass: [String],
  controlledSubstanceSchedule: {
    type: String,
    enum: ['None', 'I', 'II', 'III', 'IV', 'V']
  },
  
  // Formulation
  dosageForm: {
    type: String,
    required: [true, 'Dosage form is required'],
    enum: [
      'Tablet', 'Capsule', 'Liquid', 'Injection', 'Topical', 
      'Patch', 'Inhaler', 'Suppository', 'Drops', 'Spray', 'Other'
    ]
  },
  strength: {
    type: String,
    required: [true, 'Medication strength is required']
  },
  route: {
    type: String,
    required: [true, 'Administration route is required'],
    enum: [
      'Oral', 'Intravenous', 'Intramuscular', 'Subcutaneous', 
      'Topical', 'Inhalation', 'Rectal', 'Ophthalmic', 'Otic', 
      'Nasal', 'Sublingual', 'Transdermal', 'Other'
    ]
  },
  
  // Composition
  activeIngredients: [{
    name: {
      type: String,
      required: true
    },
    quantity: String,
    unit: String
  }],
  inactiveIngredients: [String],
  
  // Clinical Information
  indications: [{
    condition: String,
    icdCode: String,
    isApproved: Boolean,
    evidenceLevel: {
      type: String,
      enum: ['high', 'moderate', 'low', 'anecdotal']
    }
  }],
  contraindications: [{
    condition: String,
    severity: {
      type: String,
      enum: ['absolute', 'relative']
    },
    description: String
  }],
  warnings: [{
    category: String,
    description: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'boxed']
    }
  }],
  adverseEffects: [{
    effect: String,
    incidence: {
      type: String,
      enum: ['very common', 'common', 'uncommon', 'rare', 'very rare']
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'life-threatening']
    },
    onset: {
      type: String,
      enum: ['immediate', 'acute', 'delayed', 'chronic']
    },
    description: String
  }],
  
  // Dosage Information
  dosageInstructions: [{
    indication: String,
    patientGroup: {
      type: String,
      enum: ['adult', 'pediatric', 'geriatric', 'pregnant', 'breastfeeding', 'renal', 'hepatic']
    },
    minWeight: Number,
    maxWeight: Number,
    minAge: Number,
    maxAge: Number,
    initialDose: String,
    maintenanceDose: String,
    maxDose: String,
    frequency: String,
    duration: String,
    adjustmentFactors: [{
      factor: String,
      adjustment: String
    }],
    administrationInstructions: String
  }],
  
  // Pharmacology
  mechanismOfAction: String,
  pharmacokinetics: {
    absorption: String,
    distribution: String,
    metabolism: String,
    elimination: String,
    halfLife: String,
    onsetOfAction: String,
    durationOfAction: String
  },
  
  // Interactions
  drugInteractions: [{
    interactingDrug: String,
    effect: String,
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'contraindicated']
    },
    mechanism: String,
    managementStrategy: String
  }],
  foodInteractions: [{
    food: String,
    effect: String,
    recommendation: String
  }],
  diseaseInteractions: [{
    disease: String,
    effect: String,
    recommendation: String
  }],
  
  // Special Populations
  pregnancyCategory: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'X', 'N']
  },
  pregnancyNotes: String,
  breastfeedingCompatibility: {
    type: String,
    enum: ['Compatible', 'Compatible with monitoring', 'Limited data - probably compatible', 
           'Limited data - potential concern', 'Not recommended', 'Contraindicated']
  },
  breastfeedingNotes: String,
  pediatricUse: {
    isApproved: Boolean,
    minAge: String,
    specialConsiderations: String
  },
  geriatricUse: {
    specialConsiderations: String,
    doseAdjustment: String
  },
  renalDoseAdjustment: [{
    renalFunction: String,
    adjustment: String
  }],
  hepaticDoseAdjustment: [{
    hepaticFunction: String,
    adjustment: String
  }],
  
  // Practical Information
  storageInstructions: String,
  dispensingInstructions: String,
  patientCounseling: [String],
  administrationInstructions: [String],
  
  // Regulatory Information
  approvalStatus: {
    type: String,
    enum: ['FDA Approved', 'EMA Approved', 'Not Approved', 'Withdrawn', 'Investigational']
  },
  approvalDate: Date,
  marketingStatus: {
    type: String,
    enum: ['Prescription', 'OTC', 'Behind Counter', 'Discontinued']
  },
  manufacturerInfo: [{
    name: String,
    contact: String
  }],
  
  // AI/ML Specific Fields
  keywordTags: [String],
  nlpSynonyms: [String],
  searchTerms: [String],
  medicationVector: [Number], // For vector embedding representation
  
  // Metadata
  sourceReferences: [{
    title: String,
    authors: [String],
    publication: String,
    year: Number,
    url: String,
    doi: String
  }],
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
medicationSchema.index({ name: 1 });
medicationSchema.index({ genericName: 1 });
medicationSchema.index({ brandNames: 1 });
medicationSchema.index({ category: 1 });
medicationSchema.index({ 'activeIngredients.name': 1 });
medicationSchema.index({ keywordTags: 1 });
medicationSchema.index({ nlpSynonyms: 'text', name: 'text', description: 'text', brandNames: 'text' });

// Pre-save middleware to update the updatedAt field
medicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to find alternative medications
medicationSchema.methods.findAlternatives = function() {
  const activeIngredientNames = this.activeIngredients.map(ingredient => ingredient.name);
  
  return this.model('Medication').find({
    $or: [
      { category: this.category },
      { 'activeIngredients.name': { $in: activeIngredientNames } },
      { drugClass: { $in: this.drugClass } }
    ],
    _id: { $ne: this._id }
  }).limit(10);
};

// Method to check if medication is safe for pregnancy
medicationSchema.methods.isSafeForPregnancy = function() {
  const safeCategoriesForPregnancy = ['A', 'B'];
  return safeCategoriesForPregnancy.includes(this.pregnancyCategory);
};

// Method to check if medication is safe for breastfeeding
medicationSchema.methods.isSafeForBreastfeeding = function() {
  const safeForBreastfeeding = [
    'Compatible', 
    'Compatible with monitoring', 
    'Limited data - probably compatible'
  ];
  return safeForBreastfeeding.includes(this.breastfeedingCompatibility);
};

// Method to get potential interactions with other medications
medicationSchema.methods.getInteractionsWithMedications = function(medicationNames) {
  return this.drugInteractions.filter(interaction => 
    medicationNames.some(med => 
      interaction.interactingDrug.toLowerCase().includes(med.toLowerCase())
    )
  );
};

// Static method to search medications by text
medicationSchema.statics.searchByText = function(query) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Static method to find medications by active ingredient
medicationSchema.statics.findByActiveIngredient = function(ingredient) {
  return this.find({
    'activeIngredients.name': new RegExp(ingredient, 'i')
  });
};

// Static method to find medications by category
medicationSchema.statics.findByCategory = function(category) {
  return this.find({ category });
};

// Static method to find medications for a specific condition
medicationSchema.statics.findForCondition = function(condition) {
  return this.find({
    'indications.condition': new RegExp(condition, 'i')
  });
};

const Medication = mongoose.model('Medication', medicationSchema);

module.exports = Medication;