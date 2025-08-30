const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

/**
 * Validation Middleware
 * Provides validation functions for the AI Diagnostic and Prescription system
 */

// Middleware to check validation results
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`).join(', ');
    return next(new ApiError(`Validation error: ${errorMessages}`, 400));
  }
  next();
};

// User validation rules
exports.userValidationRules = {
  create: [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('role')
      .optional()
      .isIn(['patient', 'doctor', 'nurse', 'pharmacist', 'admin', 'researcher'])
      .withMessage('Invalid role')
  ],
  update: [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('role')
      .optional()
      .isIn(['patient', 'doctor', 'nurse', 'pharmacist', 'admin', 'researcher'])
      .withMessage('Invalid role')
  ],
  updatePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Please confirm your password')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      })
  ],
  forgotPassword: [
    body('email').isEmail().withMessage('Please provide a valid email')
  ],
  resetPassword: [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Please confirm your password')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      })
  ]
};

// Authentication validation rules
exports.authValidationRules = {
  register: [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('role')
      .optional()
      .isIn(['patient', 'doctor', 'nurse', 'pharmacist', 'admin', 'researcher'])
      .withMessage('Invalid role')
  ],
  login: [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ]
};

// Patient validation rules
exports.patientValidationRules = {
  create: [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('dateOfBirth').isISO8601().withMessage('Please provide a valid date of birth'),
    body('gender').isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
    body('contactInfo.email').optional().isEmail().withMessage('Please provide a valid email'),
    body('contactInfo.phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('address.zipCode').optional().isPostalCode('any').withMessage('Please provide a valid postal code')
  ],
  update: [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('dateOfBirth').optional().isISO8601().withMessage('Please provide a valid date of birth'),
    body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
    body('contactInfo.email').optional().isEmail().withMessage('Please provide a valid email'),
    body('contactInfo.phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('address.zipCode').optional().isPostalCode('any').withMessage('Please provide a valid postal code')
  ]
};

// Symptom validation rules
exports.symptomValidationRules = {
  create: [
    body('name').notEmpty().withMessage('Symptom name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('bodyPart').optional().notEmpty().withMessage('Body part cannot be empty'),
    body('severity').optional().isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty')
  ],
  update: [
    body('name').optional().notEmpty().withMessage('Symptom name cannot be empty'),
    body('description').optional().notEmpty().withMessage('Description cannot be empty'),
    body('bodyPart').optional().notEmpty().withMessage('Body part cannot be empty'),
    body('severity').optional().isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty')
  ],
  report: [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('symptoms').isArray({ min: 1 }).withMessage('At least one symptom is required'),
    body('symptoms.*.symptomId').notEmpty().withMessage('Symptom ID is required'),
    body('symptoms.*.severity').isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10'),
    body('symptoms.*.duration').optional().notEmpty().withMessage('Duration cannot be empty'),
    body('additionalNotes').optional().isString().withMessage('Additional notes must be a string')
  ]
};

// Diagnosis validation rules
exports.diagnosisValidationRules = {
  create: [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('condition').notEmpty().withMessage('Condition is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('symptoms').isArray().withMessage('Symptoms must be an array'),
    body('icdCode').optional().notEmpty().withMessage('ICD code cannot be empty'),
    body('severity').optional().isIn(['mild', 'moderate', 'severe']).withMessage('Invalid severity'),
    body('status').optional().isIn(['provisional', 'confirmed', 'differential', 'ruled_out']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  update: [
    body('condition').optional().notEmpty().withMessage('Condition cannot be empty'),
    body('description').optional().notEmpty().withMessage('Description cannot be empty'),
    body('symptoms').optional().isArray().withMessage('Symptoms must be an array'),
    body('icdCode').optional().notEmpty().withMessage('ICD code cannot be empty'),
    body('severity').optional().isIn(['mild', 'moderate', 'severe']).withMessage('Invalid severity'),
    body('status').optional().isIn(['provisional', 'confirmed', 'differential', 'ruled_out']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  feedback: [
    body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
    body('accuracy').isInt({ min: 1, max: 5 }).withMessage('Accuracy must be between 1 and 5'),
    body('comments').optional().isString().withMessage('Comments must be a string')
  ]
};

// Medication validation rules
exports.medicationValidationRules = {
  create: [
    body('name').notEmpty().withMessage('Medication name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('dosageForm').notEmpty().withMessage('Dosage form is required'),
    body('strength').notEmpty().withMessage('Strength is required'),
    body('activeIngredients').isArray({ min: 1 }).withMessage('At least one active ingredient is required'),
    body('activeIngredients.*.name').notEmpty().withMessage('Ingredient name is required'),
    body('activeIngredients.*.amount').notEmpty().withMessage('Ingredient amount is required'),
    body('manufacturer').optional().notEmpty().withMessage('Manufacturer cannot be empty'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
    body('sideEffects').optional().isArray().withMessage('Side effects must be an array'),
    body('contraindications').optional().isArray().withMessage('Contraindications must be an array'),
    body('interactions').optional().isArray().withMessage('Interactions must be an array')
  ],
  update: [
    body('name').optional().notEmpty().withMessage('Medication name cannot be empty'),
    body('description').optional().notEmpty().withMessage('Description cannot be empty'),
    body('dosageForm').optional().notEmpty().withMessage('Dosage form cannot be empty'),
    body('strength').optional().notEmpty().withMessage('Strength cannot be empty'),
    body('activeIngredients').optional().isArray({ min: 1 }).withMessage('At least one active ingredient is required'),
    body('activeIngredients.*.name').optional().notEmpty().withMessage('Ingredient name cannot be empty'),
    body('activeIngredients.*.amount').optional().notEmpty().withMessage('Ingredient amount cannot be empty'),
    body('manufacturer').optional().notEmpty().withMessage('Manufacturer cannot be empty'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
    body('sideEffects').optional().isArray().withMessage('Side effects must be an array'),
    body('contraindications').optional().isArray().withMessage('Contraindications must be an array'),
    body('interactions').optional().isArray().withMessage('Interactions must be an array')
  ],
  prescription: [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
    body('medications').isArray({ min: 1 }).withMessage('At least one medication is required'),
    body('medications.*.medicationId').notEmpty().withMessage('Medication ID is required'),
    body('medications.*.dosage').notEmpty().withMessage('Dosage is required'),
    body('medications.*.frequency').notEmpty().withMessage('Frequency is required'),
    body('medications.*.duration').notEmpty().withMessage('Duration is required'),
    body('medications.*.route').notEmpty().withMessage('Route is required'),
    body('medications.*.instructions').optional().isString().withMessage('Instructions must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ]
};

// Feedback validation rules
exports.feedbackValidationRules = {
  create: [
    body('userId').optional().notEmpty().withMessage('User ID cannot be empty'),
    body('targetType').isIn(['diagnosis', 'medication', 'symptom_analysis', 'system', 'ui']).withMessage('Invalid target type'),
    body('targetId').optional().notEmpty().withMessage('Target ID cannot be empty'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').notEmpty().withMessage('Comment is required'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ],
  update: [
    body('status').optional().isIn(['pending', 'reviewed', 'resolved', 'rejected']).withMessage('Invalid status'),
    body('responseNotes').optional().isString().withMessage('Response notes must be a string'),
    body('assignedTo').optional().notEmpty().withMessage('Assigned to cannot be empty')
  ],
  response: [
    body('responseNotes').notEmpty().withMessage('Response notes are required')
  ]
};

// ID parameter validation
exports.idParamValidation = [
  param('id').isMongoId().withMessage('Invalid ID format')
];

// Pagination validation
exports.paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Date range validation
exports.dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// Search validation
exports.searchValidation = [
  query('q').optional().isString().withMessage('Search query must be a string'),
  query('fields').optional().isString().withMessage('Fields must be a comma-separated string')
];

// Filter validation
exports.filterValidation = {
  user: [
    query('role').optional().isIn(['patient', 'doctor', 'nurse', 'pharmacist', 'admin', 'researcher']).withMessage('Invalid role'),
    query('status').optional().isIn(['active', 'inactive', 'locked']).withMessage('Invalid status')
  ],
  patient: [
    query('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
    query('minAge').optional().isInt({ min: 0 }).withMessage('Minimum age must be a non-negative integer'),
    query('maxAge').optional().isInt({ min: 0 }).withMessage('Maximum age must be a non-negative integer')
  ],
  symptom: [
    query('bodyPart').optional().isString().withMessage('Body part must be a string'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('severity').optional().isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10')
  ],
  diagnosis: [
    query('condition').optional().isString().withMessage('Condition must be a string'),
    query('status').optional().isIn(['provisional', 'confirmed', 'differential', 'ruled_out']).withMessage('Invalid status'),
    query('severity').optional().isIn(['mild', 'moderate', 'severe']).withMessage('Invalid severity')
  ],
  medication: [
    query('category').optional().isString().withMessage('Category must be a string'),
    query('activeIngredient').optional().isString().withMessage('Active ingredient must be a string'),
    query('dosageForm').optional().isString().withMessage('Dosage form must be a string')
  ],
  feedback: [
    query('targetType').optional().isIn(['diagnosis', 'medication', 'symptom_analysis', 'system', 'ui']).withMessage('Invalid target type'),
    query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    query('status').optional().isIn(['pending', 'reviewed', 'resolved', 'rejected']).withMessage('Invalid status')
  ]
};