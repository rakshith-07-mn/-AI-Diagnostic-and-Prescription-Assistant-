/**
 * AI Controller - Handles AI-related endpoints
 */

const catchAsync = require('../utils/catchAsync');
const aiService = require('../utils/aiService');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const Diagnosis = require('../models/diagnosisModel');
const Symptom = require('../models/symptomModel');
const logger = require('../utils/logger');

/**
 * Analyze symptoms and generate potential diagnoses
 * @route POST /api/v1/ai/analyze
 */
exports.analyzeSymptoms = catchAsync(async (req, res, next) => {
  const { text, symptoms, patientId } = req.body;
  
  // Validate input
  if (!text && (!symptoms || symptoms.length === 0)) {
    return next(new ApiError('Either symptom text or structured symptoms are required', 400));
  }
  
  // Get patient information if patientId is provided
  let patientInfo = {};
  if (patientId) {
    try {
      const Patient = require('../models/patientModel');
      const patient = await Patient.findById(patientId).select('age gender medicalHistory');
      if (patient) {
        patientInfo = {
          age: patient.age,
          gender: patient.gender,
          medicalHistory: patient.medicalHistory
        };
      }
    } catch (error) {
      logger.warn(`Could not fetch patient info for ID ${patientId}: ${error.message}`);
    }
  }
  
  // Prepare structured symptoms if provided
  let structuredSymptoms = [];
  if (symptoms && symptoms.length > 0) {
    structuredSymptoms = symptoms.map(symptom => {
      return {
        name: symptom.name,
        severity: symptom.severity || 'moderate',
        duration: symptom.duration || null,
        characteristics: symptom.characteristics || {}
      };
    });
  }
  
  // Call AI service for analysis
  const analysisResult = await aiService.analyzeSymptoms({
    text,
    structured_symptoms: structuredSymptoms,
    patient_info: patientInfo
  });
  
  // Return the analysis results
  return ApiResponse.success(res, {
    requestId: analysisResult.request_id,
    extractedSymptoms: analysisResult.extracted_symptoms,
    diagnoses: analysisResult.diagnoses,
    aiConfidence: analysisResult.ai_confidence,
    aiExplanation: analysisResult.ai_explanation,
    aiVersion: analysisResult.ai_version,
    aiProcessingTime: analysisResult.ai_processing_time
  });
});

/**
 * Save an AI-generated diagnosis to the database
 * @route POST /api/v1/ai/diagnoses
 */
exports.saveDiagnosis = catchAsync(async (req, res, next) => {
  const { 
    patientId, 
    symptoms, 
    diagnosedConditions, 
    aiConfidence, 
    aiVersion,
    aiProcessingTime,
    aiExplanation,
    aiFeatures
  } = req.body;
  
  // Validate required fields
  if (!patientId || !symptoms || !diagnosedConditions || !aiConfidence) {
    return next(new ApiError('Missing required fields for diagnosis', 400));
  }
  
  // Create new diagnosis document
  const diagnosis = await Diagnosis.create({
    patientId,
    symptoms,
    diagnosedConditions,
    aiConfidence,
    aiVersion,
    aiProcessingTime,
    aiExplanation,
    aiFeatures,
    diagnosedBy: {
      type: 'AI',
      providerName: 'AI Diagnostic System'
    }
  });
  
  // Return the created diagnosis
  return ApiResponse.success(res, { diagnosis }, 201);
});

/**
 * Get AI service health status
 * @route GET /api/v1/ai/health
 */
exports.getAiHealth = catchAsync(async (req, res) => {
  const isHealthy = await aiService.checkAiServiceHealth();
  
  return ApiResponse.success(res, {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date()
  });
});

/**
 * Get symptom suggestions based on partial text
 * @route GET /api/v1/ai/symptoms/suggest
 */
exports.suggestSymptoms = catchAsync(async (req, res) => {
  const { query, limit = 10 } = req.query;
  
  if (!query || query.length < 2) {
    return ApiResponse.success(res, { suggestions: [] });
  }
  
  // Search for symptoms matching the query
  const symptoms = await Symptom.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(parseInt(limit))
  .select('name category bodyPart');
  
  // Format suggestions
  const suggestions = symptoms.map(symptom => ({
    id: symptom._id,
    name: symptom.name,
    category: symptom.category,
    bodyPart: symptom.bodyPart
  }));
  
  return ApiResponse.success(res, { suggestions });
});

/**
 * Process batch symptom analysis
 * @route POST /api/v1/ai/analyze/batch
 */
exports.analyzeSymptomsBatch = catchAsync(async (req, res, next) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new ApiError('Batch analysis requires an array of items', 400));
  }
  
  // Prepare batch items
  const batchItems = items.map(item => ({
    text: item.text || '',
    structured_symptoms: item.symptoms || [],
    patient_info: item.patientInfo || {}
  }));
  
  // Call AI service for batch analysis
  const batchResult = await aiService.analyzeSymptomsBatch(batchItems);
  
  // Return the batch results
  return ApiResponse.success(res, {
    batchId: batchResult.batch_id,
    results: batchResult.results,
    totalProcessingTime: batchResult.total_processing_time
  });
});

/**
 * Get explanation for a specific diagnosis
 * @route GET /api/v1/ai/diagnoses/:id/explain
 */
exports.explainDiagnosis = catchAsync(async (req, res, next) => {
  const diagnosisId = req.params.id;
  
  // Find the diagnosis
  const diagnosis = await Diagnosis.findById(diagnosisId);
  
  if (!diagnosis) {
    return next(new ApiError('Diagnosis not found', 404));
  }
  
  // Check if the diagnosis has AI explanation
  if (!diagnosis.aiExplanation) {
    return next(new ApiError('No AI explanation available for this diagnosis', 404));
  }
  
  // Return the explanation with feature importance
  return ApiResponse.success(res, {
    diagnosisId: diagnosis._id,
    explanation: diagnosis.aiExplanation,
    features: diagnosis.aiFeatures || [],
    confidence: diagnosis.aiConfidence,
    aiVersion: diagnosis.aiVersion
  });
});