const express = require('express');
const diagnosisController = require('../controllers/diagnosisController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Diagnosis Routes
 * Handles diagnosis-related operations for the AI Diagnostic and Prescription system
 */

// Protect all routes after this middleware
router.use(authController.protect);

// Basic CRUD operations
router.route('/')
  .post(
    authController.restrictTo('admin', 'doctor'),
    diagnosisController.createDiagnosis
  );

router.route('/:id')
  .get(diagnosisController.getDiagnosis)
  .patch(
    authController.restrictTo('admin', 'doctor'),
    diagnosisController.updateDiagnosis
  )
  .delete(
    authController.restrictTo('admin'),
    diagnosisController.deleteDiagnosis
  );

// Patient diagnoses
router.get('/patient/:patientId', diagnosisController.getPatientDiagnoses);

// Feedback and verification
router.post('/:id/feedback', diagnosisController.submitDiagnosisFeedback);
router.patch('/:id/verify', 
  authController.restrictTo('admin', 'doctor'),
  diagnosisController.verifyDiagnosis
);

// Specialized queries
router.get('/condition/:condition', diagnosisController.getDiagnosesByCondition);
router.get('/icd-code/:code', diagnosisController.getDiagnosesByIcdCode);

// Statistics
router.get('/statistics', 
  authController.restrictTo('admin', 'doctor'),
  diagnosisController.getDiagnosisStatistics
);

module.exports = router;