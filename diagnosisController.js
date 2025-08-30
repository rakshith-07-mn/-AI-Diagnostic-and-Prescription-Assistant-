const Diagnosis = require('../models/diagnosisModel');
const Patient = require('../models/patientModel');
const ApiError = require('../utils/apiError');

/**
 * Diagnosis Controller
 * Handles diagnosis-related operations for the AI Diagnostic and Prescription system
 */

// Create a new diagnosis
exports.createDiagnosis = async (req, res, next) => {
  try {
    // Validate patient ID
    if (!req.body.patient) {
      return next(new ApiError('Patient ID is required', 400));
    }
    
    // Validate diagnosed conditions
    if (!req.body.diagnosedConditions || !Array.isArray(req.body.diagnosedConditions) || req.body.diagnosedConditions.length === 0) {
      return next(new ApiError('At least one diagnosed condition is required', 400));
    }
    
    // Add healthcare provider information if available
    if (req.user) {
      req.body.healthcareProvider = {
        id: req.user.id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        role: req.user.role,
        specialization: req.user.specialization
      };
    }
    
    // Create diagnosis
    const newDiagnosis = await Diagnosis.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        diagnosis: newDiagnosis
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a diagnosis by ID
exports.getDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await Diagnosis.findById(req.params.id)
      .populate('patient', 'firstName lastName dateOfBirth gender');
    
    if (!diagnosis) {
      return next(new ApiError('No diagnosis found with that ID', 404));
    }
    
    // Log access
    if (req.user) {
      diagnosis.logAccess(req.user.id, req.user.role);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        diagnosis
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all diagnoses for a patient
exports.getPatientDiagnoses = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    
    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return next(new ApiError('No patient found with that ID', 404));
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const diagnoses = await Diagnosis.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalDiagnoses = await Diagnosis.countDocuments({ patient: patientId });
    
    res.status(200).json({
      status: 'success',
      results: diagnoses.length,
      pagination: {
        total: totalDiagnoses,
        page,
        limit,
        pages: Math.ceil(totalDiagnoses / limit)
      },
      data: {
        patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        diagnoses
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a diagnosis
exports.updateDiagnosis = async (req, res, next) => {
  try {
    // Add audit information
    req.body.updatedBy = req.user ? req.user.id : undefined;
    req.body.updatedAt = new Date();
    
    const diagnosis = await Diagnosis.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!diagnosis) {
      return next(new ApiError('No diagnosis found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        diagnosis
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a diagnosis
exports.deleteDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await Diagnosis.findByIdAndDelete(req.params.id);
    
    if (!diagnosis) {
      return next(new ApiError('No diagnosis found with that ID', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Submit feedback on a diagnosis
exports.submitDiagnosisFeedback = async (req, res, next) => {
  try {
    const diagnosis = await Diagnosis.findById(req.params.id);
    
    if (!diagnosis) {
      return next(new ApiError('No diagnosis found with that ID', 404));
    }
    
    // Add feedback
    const feedback = {
      ...req.body,
      submittedBy: req.user ? req.user.id : undefined,
      submittedAt: new Date()
    };
    
    diagnosis.feedback.push(feedback);
    await diagnosis.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        diagnosisId: diagnosis._id,
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify a diagnosis
exports.verifyDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await Diagnosis.findById(req.params.id);
    
    if (!diagnosis) {
      return next(new ApiError('No diagnosis found with that ID', 404));
    }
    
    // Update verification status
    const verificationData = {
      status: req.body.status,
      verifiedBy: req.user ? req.user.id : undefined,
      verifiedAt: new Date(),
      notes: req.body.notes
    };
    
    await diagnosis.verifyDiagnosis(verificationData);
    
    res.status(200).json({
      status: 'success',
      data: {
        diagnosisId: diagnosis._id,
        verification: diagnosis.verification
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get diagnoses by condition
exports.getDiagnosesByCondition = async (req, res, next) => {
  try {
    const { condition } = req.params;
    
    const diagnoses = await Diagnosis.findByCondition(condition);
    
    res.status(200).json({
      status: 'success',
      results: diagnoses.length,
      data: {
        condition,
        diagnoses
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get diagnoses by ICD code
exports.getDiagnosesByIcdCode = async (req, res, next) => {
  try {
    const { icdCode } = req.params;
    
    const diagnoses = await Diagnosis.findByIcdCode(icdCode);
    
    res.status(200).json({
      status: 'success',
      results: diagnoses.length,
      data: {
        icdCode,
        diagnoses
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get diagnosis statistics
exports.getDiagnosisStatistics = async (req, res, next) => {
  try {
    // This would normally query the database for statistics
    // For now, we'll return mock statistics
    
    const statistics = {
      totalDiagnoses: 1245,
      diagnosesLast30Days: 187,
      topConditions: [
        { condition: 'Hypertension', count: 156, percentage: 12.5 },
        { condition: 'Type 2 Diabetes', count: 124, percentage: 10.0 },
        { condition: 'Anxiety Disorder', count: 98, percentage: 7.9 },
        { condition: 'Asthma', count: 87, percentage: 7.0 },
        { condition: 'Osteoarthritis', count: 76, percentage: 6.1 }
      ],
      aiAccuracy: {
        overall: 0.87,
        byCondition: [
          { condition: 'Hypertension', accuracy: 0.94 },
          { condition: 'Type 2 Diabetes', accuracy: 0.91 },
          { condition: 'Anxiety Disorder', accuracy: 0.82 },
          { condition: 'Asthma', accuracy: 0.89 },
          { condition: 'Osteoarthritis', accuracy: 0.85 }
        ]
      },
      verificationStats: {
        verified: 876,
        pending: 289,
        rejected: 80,
        verificationRate: 0.70
      },
      demographicDistribution: {
        byAge: [
          { ageGroup: '0-17', count: 87 },
          { ageGroup: '18-34', count: 245 },
          { ageGroup: '35-50', count: 367 },
          { ageGroup: '51-65', count: 312 },
          { ageGroup: '66+', count: 234 }
        ],
        byGender: [
          { gender: 'male', count: 578 },
          { gender: 'female', count: 652 },
          { gender: 'other', count: 15 }
        ]
      },
      timestamp: new Date()
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