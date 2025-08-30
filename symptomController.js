const Symptom = require('../models/symptomModel');
const SymptomReport = require('../models/symptomReportModel');
const ApiError = require('../utils/apiError');

/**
 * Symptom Controller
 * Handles symptom-related operations for the AI Diagnostic and Prescription system
 */

// Get all symptoms with pagination and filtering
exports.getAllSymptoms = async (req, res, next) => {
  try {
    // Build query
    const query = {};
    
    // Filter by name
    if (req.query.name) {
      query.name = { $regex: req.query.name, $options: 'i' };
    }
    
    // Filter by category
    if (req.query.category) {
      query.category = { $regex: req.query.category, $options: 'i' };
    }
    
    // Filter by body part
    if (req.query.bodyPart) {
      query.bodyPart = { $regex: req.query.bodyPart, $options: 'i' };
    }
    
    // Filter by body system
    if (req.query.bodySystem) {
      query.bodySystem = { $regex: req.query.bodySystem, $options: 'i' };
    }
    
    // Filter by severity
    if (req.query.severity) {
      query['possibleSeverity.level'] = { $in: req.query.severity.split(',') };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const symptoms = await Symptom.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalSymptoms = await Symptom.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: symptoms.length,
      pagination: {
        total: totalSymptoms,
        page,
        limit,
        pages: Math.ceil(totalSymptoms / limit)
      },
      data: {
        symptoms
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single symptom by ID
exports.getSymptom = async (req, res, next) => {
  try {
    const symptom = await Symptom.findById(req.params.id);
    
    if (!symptom) {
      return next(new ApiError('No symptom found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        symptom
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new symptom
exports.createSymptom = async (req, res, next) => {
  try {
    // Check if symptom with same name already exists
    const existingSymptom = await Symptom.findOne({ name: req.body.name });
    
    if (existingSymptom) {
      return next(new ApiError('Symptom with this name already exists', 400));
    }
    
    // Add audit information
    req.body.createdBy = req.user ? req.user.id : undefined;
    
    const newSymptom = await Symptom.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        symptom: newSymptom
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a symptom
exports.updateSymptom = async (req, res, next) => {
  try {
    // Add audit information
    req.body.updatedBy = req.user ? req.user.id : undefined;
    req.body.updatedAt = new Date();
    
    const symptom = await Symptom.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!symptom) {
      return next(new ApiError('No symptom found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        symptom
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a symptom
exports.deleteSymptom = async (req, res, next) => {
  try {
    const symptom = await Symptom.findByIdAndDelete(req.params.id);
    
    if (!symptom) {
      return next(new ApiError('No symptom found with that ID', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Submit patient symptom report
exports.submitSymptomReport = async (req, res, next) => {
  try {
    // Validate patient ID
    if (!req.body.patient) {
      return next(new ApiError('Patient ID is required', 400));
    }
    
    // Validate symptoms array
    if (!req.body.symptoms || !Array.isArray(req.body.symptoms) || req.body.symptoms.length === 0) {
      return next(new ApiError('At least one symptom is required', 400));
    }
    
    // Generate session ID if not provided
    if (!req.body.sessionId) {
      req.body.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    // Add submission information
    req.body.submittedBy = req.user ? req.user.id : undefined;
    req.body.submissionMethod = req.body.submissionMethod || 'self_report';
    req.body.submissionPlatform = req.body.submissionPlatform || 'web';
    req.body.ipAddress = req.ip;
    req.body.userAgent = req.headers['user-agent'];
    
    // Create symptom report
    const newSymptomReport = await SymptomReport.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        symptomReport: newSymptomReport
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get symptom history for a patient
exports.getPatientSymptomHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter = {};
      
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
    }
    
    const query = {
      patient: patientId
    };
    
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const symptomReports = await SymptomReport.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('symptoms.symptom', 'name description category bodyPart');
    
    // Get total count for pagination
    const totalReports = await SymptomReport.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: symptomReports.length,
      pagination: {
        total: totalReports,
        page,
        limit,
        pages: Math.ceil(totalReports / limit)
      },
      data: {
        symptomReports
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get symptom trends for a patient
exports.getPatientSymptomTrends = async (req, res, next) => {
  try {
    const { patientId, symptomId } = req.params;
    const days = parseInt(req.query.days, 10) || 30;
    
    const trends = await SymptomReport.getSymptomTrends(patientId, symptomId, days);
    
    res.status(200).json({
      status: 'success',
      data: {
        patientId,
        symptomId,
        days,
        trends
      }
    });
  } catch (error) {
    next(error);
  }
};

// Search symptoms by text
exports.searchSymptoms = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return next(new ApiError('Search query is required', 400));
    }
    
    const symptoms = await Symptom.searchByText(query);
    
    res.status(200).json({
      status: 'success',
      results: symptoms.length,
      data: {
        symptoms
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get symptoms by body part
exports.getSymptomsByBodyPart = async (req, res, next) => {
  try {
    const { bodyPart } = req.params;
    
    const symptoms = await Symptom.findByBodyPart(bodyPart);
    
    res.status(200).json({
      status: 'success',
      results: symptoms.length,
      data: {
        bodyPart,
        symptoms
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get symptoms by category
exports.getSymptomsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    
    const symptoms = await Symptom.findByCategory(category);
    
    res.status(200).json({
      status: 'success',
      results: symptoms.length,
      data: {
        category,
        symptoms
      }
    });
  } catch (error) {
    next(error);
  }
};

// Analyze symptoms to get potential diagnoses
exports.analyzeSymptoms = async (req, res, next) => {
  try {
    const { symptoms, patientId, vitalSigns } = req.body;
    
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return next(new ApiError('At least one symptom is required', 400));
    }
    
    // This would normally call the AI/ML service
    // For now, we'll return a mock response
    
    // Mock AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock potential diagnoses
    const potentialDiagnoses = [
      {
        condition: 'Common Cold',
        probability: 0.85,
        icdCode: 'J00',
        description: 'A viral infectious disease of the upper respiratory tract',
        recommendedTests: ['None required', 'Rest and fluids recommended'],
        aiConfidence: 0.92
      },
      {
        condition: 'Seasonal Allergies',
        probability: 0.65,
        icdCode: 'J30.2',
        description: 'Allergic rhinitis due to pollen',
        recommendedTests: ['Allergy skin test', 'IgE blood test'],
        aiConfidence: 0.78
      },
      {
        condition: 'Influenza',
        probability: 0.45,
        icdCode: 'J10.1',
        description: 'Influenza with other respiratory manifestations',
        recommendedTests: ['Rapid influenza diagnostic test', 'PCR test'],
        aiConfidence: 0.62
      }
    ];
    
    res.status(200).json({
      status: 'success',
      data: {
        patientId,
        symptoms,
        vitalSigns,
        potentialDiagnoses,
        analysisId: `analysis_${Date.now()}`,
        timestamp: new Date(),
        aiVersion: '1.0.0',
        processingTime: 0.85 // seconds
      }
    });
  } catch (error) {
    next(error);
  }
};