const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Feedback Routes
 * Handles feedback-related operations for the AI Diagnostic and Prescription system
 */

// Public routes for submitting feedback
router.post('/', feedbackController.createFeedback);

// Protect all routes after this middleware
router.use(authController.protect);

// Basic CRUD operations (protected)
router.route('/')
  .get(
    authController.restrictTo('admin', 'support'),
    feedbackController.getAllFeedback
  );

router.route('/:id')
  .get(feedbackController.getFeedback)
  .patch(
    authController.restrictTo('admin', 'support'),
    feedbackController.updateFeedback
  )
  .delete(
    authController.restrictTo('admin'),
    feedbackController.deleteFeedback
  );

// Status and response management
router.patch('/:id/status', 
  authController.restrictTo('admin', 'support'),
  feedbackController.updateFeedbackStatus
);

router.post('/:id/response', 
  authController.restrictTo('admin', 'support'),
  feedbackController.addFeedbackResponse
);

router.patch('/:id/assign', 
  authController.restrictTo('admin', 'support'),
  feedbackController.assignFeedback
);

// Specialized queries
router.get('/rating/:min/:max', 
  authController.restrictTo('admin', 'support'),
  feedbackController.getFeedbackByRatingRange
);

router.get('/unresolved', 
  authController.restrictTo('admin', 'support'),
  feedbackController.getUnresolvedFeedback
);

router.get('/tag/:tag', 
  authController.restrictTo('admin', 'support'),
  feedbackController.getFeedbackByTag
);

// Statistics and analysis
router.get('/statistics', 
  authController.restrictTo('admin', 'support'),
  feedbackController.getFeedbackStatistics
);

router.post('/:id/analyze', 
  authController.restrictTo('admin', 'support'),
  feedbackController.analyzeFeedback
);

router.get('/trends', 
  authController.restrictTo('admin', 'support'),
  feedbackController.getFeedbackTrends
);

module.exports = router;