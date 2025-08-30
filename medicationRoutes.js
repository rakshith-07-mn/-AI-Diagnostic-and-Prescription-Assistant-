const express = require('express');
const medicationController = require('../controllers/medicationController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Medication Routes
 * Handles medication-related operations for the AI Diagnostic and Prescription system
 */

// Public routes
router.get('/search', medicationController.searchMedications);

// Protect all routes after this middleware
router.use(authController.protect);

// Basic CRUD operations
router.route('/')
  .get(medicationController.getAllMedications)
  .post(
    authController.restrictTo('admin', 'doctor', 'pharmacist'),
    medicationController.createMedication
  );

router.route('/:id')
  .get(medicationController.getMedication)
  .patch(
    authController.restrictTo('admin', 'doctor', 'pharmacist'),
    medicationController.updateMedication
  )
  .delete(
    authController.restrictTo('admin'),
    medicationController.deleteMedication
  );

// Recommendation and prescription
router.post('/recommend', medicationController.recommendMedications);
router.post('/prescriptions', 
  authController.restrictTo('admin', 'doctor'),
  medicationController.createPrescription
);

// Drug interactions
router.post('/interactions', medicationController.checkDrugInteractions);

// Specialized queries
router.get('/active-ingredient/:ingredient', medicationController.getMedicationsByActiveIngredient);
router.get('/category/:category', medicationController.getMedicationsByCategory);

module.exports = router;