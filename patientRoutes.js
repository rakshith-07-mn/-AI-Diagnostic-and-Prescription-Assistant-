const express = require('express');
const patientController = require('../controllers/patientController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Patient Routes
 * Handles patient-related operations for the AI Diagnostic and Prescription system
 */

// Protect all routes after this middleware
router.use(authController.protect);

// Basic CRUD operations
router.route('/')
  .get(patientController.getAllPatients)
  .post(authController.restrictTo('admin', 'doctor', 'nurse'), patientController.createPatient);

router.route('/:id')
  .get(patientController.getPatient)
  .patch(authController.restrictTo('admin', 'doctor', 'nurse'), patientController.updatePatient)
  .delete(authController.restrictTo('admin'), patientController.deletePatient);

// Medical history
router.get('/:id/medical-history', patientController.getPatientMedicalHistory);

// Add medical data
router.post('/:id/vital-signs', 
  authController.restrictTo('admin', 'doctor', 'nurse'), 
  patientController.addVitalSigns
);

router.post('/:id/medications', 
  authController.restrictTo('admin', 'doctor', 'nurse'), 
  patientController.addMedication
);

router.post('/:id/allergies', 
  authController.restrictTo('admin', 'doctor', 'nurse'), 
  patientController.addAllergy
);

router.post('/:id/medical-conditions', 
  authController.restrictTo('admin', 'doctor', 'nurse'), 
  patientController.addMedicalCondition
);

// Specialized queries
router.get('/age-range/:min/:max', patientController.getPatientsByAgeRange);

module.exports = router;