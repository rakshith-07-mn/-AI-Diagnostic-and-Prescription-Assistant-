const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * User Routes
 * Handles user management for the AI Diagnostic and Prescription system
 */

// Public routes
router.post('/forgotPassword', userController.forgotPassword);
router.patch('/resetPassword/:token', userController.resetPassword);

// Protected routes (require authentication)
router.use(authController.protect);

// Routes for all authenticated users
router.get('/me', userController.getMe);
router.patch('/updateMe', userController.updateMe);
router.patch('/updateMyPassword', userController.updatePassword);
router.patch('/deactivateAccount', userController.deactivateAccount);
router.get('/activity', userController.getUserActivityLog);

// Healthcare provider routes
router.get(
  '/healthcare-providers',
  authController.restrictTo('admin', 'doctor', 'nurse'),
  userController.getHealthcareProviders
);

// Admin only routes
router.use(authController.restrictTo('admin'));

router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

router.patch('/:id/role', userController.updateUserRole);
router.patch('/:id/reactivate', userController.reactivateAccount);
router.patch('/:id/lock', userController.lockAccount);
router.patch('/:id/unlock', userController.unlockAccount);
router.get('/permission/:permission', userController.getUsersByPermission);
router.get('/statistics', userController.getUserStatistics);
router.get('/:id/activity', userController.getUserActivityLog);

module.exports = router;