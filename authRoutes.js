const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Authentication Routes
 * Handles user authentication and authorization for the AI Diagnostic and Prescription system
 */

// Registration and login routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Password management routes
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protected routes (require authentication)
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', authController.getMe);
router.patch('/updateMe', authController.updateMe);

// Admin only routes
router.use(authController.restrictTo('admin'));

router.route('/users')
  .get(authController.getAllUsers);

router.route('/users/:id')
  .get(authController.getUser)
  .patch(authController.updateUser)
  .delete(authController.deleteUser);

module.exports = router;