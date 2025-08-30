/**
 * AI Routes - Routes for AI-related endpoints
 */

const express = require('express');
const aiController = require('../controllers/aiController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.get('/health', aiController.getAiHealth);

// Protected routes - require authentication
router.use(authController.protect);

// Symptom analysis and diagnosis
router.post('/analyze', aiController.analyzeSymptoms);
router.post('/analyze/batch', aiController.analyzeSymptomsBatch);
router.post('/diagnoses', aiController.saveDiagnosis);

// Symptom suggestions
router.get('/symptoms/suggest', aiController.suggestSymptoms);

// Diagnosis explanation
router.get('/diagnoses/:id/explain', aiController.explainDiagnosis);

module.exports = router;