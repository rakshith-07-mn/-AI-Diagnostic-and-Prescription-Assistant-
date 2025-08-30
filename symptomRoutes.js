const express = require('express');
const symptomController = require('../controllers/symptomController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Symptom Routes
 * Handles symptom-related operations for the AI Diagnostic and Prescription system
 */

// Public routes
router.get('/search', symptomController.searchSymptoms);

// Protect all routes after this middleware
router.use(authController.protect);

// Basic CRUD operations
router.route('/')
  .get(symptomController.getAllSymptoms)
  .post(
    authController.restrictTo('admin', 'doctor'),
    symptomController.createSymptom
  );

router.route('/:id')
  .get(symptomController.getSymptom)
  .patch(
    authController.restrictTo('admin', 'doctor'),
    symptomController.updateSymptom
  )
  .delete(
    authController.restrictTo('admin'),
    symptomController.deleteSymptom
  );

// Symptom reports
router.post('/report', symptomController.submitSymptomReport);
router.get('/patient/:patientId/history', symptomController.getPatientSymptomHistory);
router.get('/patient/:patientId/trends/:symptomId', symptomController.getPatientSymptomTrends);

// Specialized queries
router.get('/body-part/:bodyPart', symptomController.getSymptomsByBodyPart);
router.get('/category/:category', symptomController.getSymptomsByCategory);

// AI analysis
router.post('/analyze', symptomController.analyzeSymptoms);

module.exports = router;