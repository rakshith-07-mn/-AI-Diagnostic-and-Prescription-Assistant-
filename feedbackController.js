const Feedback = require('../models/feedbackModel');
const ApiError = require('../utils/apiError');

/**
 * Feedback Controller
 * Handles feedback-related operations for the AI Diagnostic and Prescription system
 */

// Get all feedback with pagination and filtering
exports.getAllFeedback = async (req, res, next) => {
  try {
    // Build query
    const query = {};
    
    // Filter by target type
    if (req.query.targetType) {
      query.targetType = req.query.targetType;
    }
    
    // Filter by rating range
    if (req.query.minRating || req.query.maxRating) {
      query.rating = {};
      if (req.query.minRating) query.rating.$gte = parseInt(req.query.minRating, 10);
      if (req.query.maxRating) query.rating.$lte = parseInt(req.query.maxRating, 10);
    }
    
    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by tags
    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tags };
    }
    
    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName email role');
    
    // Get total count for pagination
    const totalFeedback = await Feedback.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: feedback.length,
      pagination: {
        total: totalFeedback,
        page,
        limit,
        pages: Math.ceil(totalFeedback / limit)
      },
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single feedback by ID
exports.getFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'firstName lastName email role')
      .populate('targetId');
    
    if (!feedback) {
      return next(new ApiError('No feedback found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create new feedback
exports.createFeedback = async (req, res, next) => {
  try {
    // Add user information if authenticated
    if (req.user) {
      req.body.user = req.user.id;
      req.body.userRole = req.user.role;
    }
    
    // Add submission information
    req.body.submissionInfo = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      method: 'api',
      timestamp: new Date()
    };
    
    const newFeedback = await Feedback.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        feedback: newFeedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update feedback status
exports.updateFeedbackStatus = async (req, res, next) => {
  try {
    const { status, responseNote } = req.body;
    
    if (!status) {
      return next(new ApiError('Status is required', 400));
    }
    
    // Add response information
    const updateData = {
      status,
      'processing.updatedAt': new Date(),
      'processing.updatedBy': req.user ? req.user.id : 'system'
    };
    
    if (responseNote) {
      updateData.$push = {
        'processing.responses': {
          note: responseNote,
          respondedBy: req.user ? req.user.id : 'system',
          respondedAt: new Date()
        }
      };
    }
    
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!feedback) {
      return next(new ApiError('No feedback found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add response to feedback
exports.addFeedbackResponse = async (req, res, next) => {
  try {
    const { responseNote } = req.body;
    
    if (!responseNote) {
      return next(new ApiError('Response note is required', 400));
    }
    
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          'processing.responses': {
            note: responseNote,
            respondedBy: req.user ? req.user.id : 'system',
            respondedAt: new Date()
          }
        },
        'processing.updatedAt': new Date(),
        'processing.updatedBy': req.user ? req.user.id : 'system'
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!feedback) {
      return next(new ApiError('No feedback found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Assign feedback to a user
exports.assignFeedback = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    
    if (!assignedTo) {
      return next(new ApiError('Assigned user ID is required', 400));
    }
    
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      {
        'processing.assignedTo': assignedTo,
        'processing.assignedAt': new Date(),
        'processing.assignedBy': req.user ? req.user.id : 'system',
        'processing.updatedAt': new Date(),
        'processing.updatedBy': req.user ? req.user.id : 'system'
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!feedback) {
      return next(new ApiError('No feedback found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete feedback
exports.deleteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    
    if (!feedback) {
      return next(new ApiError('No feedback found with that ID', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Get feedback by rating range
exports.getFeedbackByRatingRange = async (req, res, next) => {
  try {
    const { minRating, maxRating } = req.params;
    
    const query = {};
    if (minRating) query.rating = { $gte: parseInt(minRating, 10) };
    if (maxRating) query.rating = { ...query.rating, $lte: parseInt(maxRating, 10) };
    
    const feedback = await Feedback.findByRatingRange(parseInt(minRating, 10), parseInt(maxRating, 10));
    
    res.status(200).json({
      status: 'success',
      results: feedback.length,
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get unresolved feedback
exports.getUnresolvedFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findUnresolved();
    
    res.status(200).json({
      status: 'success',
      results: feedback.length,
      data: {
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get feedback by tag
exports.getFeedbackByTag = async (req, res, next) => {
  try {
    const { tag } = req.params;
    
    const feedback = await Feedback.findByTag(tag);
    
    res.status(200).json({
      status: 'success',
      results: feedback.length,
      data: {
        tag,
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get feedback statistics
exports.getFeedbackStatistics = async (req, res, next) => {
  try {
    // This would normally aggregate feedback data
    // For now, we'll return a mock response
    
    const statistics = {
      totalFeedback: 256,
      averageRating: 4.2,
      ratingDistribution: {
        '1': 12,
        '2': 18,
        '3': 45,
        '4': 98,
        '5': 83
      },
      targetTypeDistribution: {
        'diagnosis': 87,
        'medication': 62,
        'system': 107
      },
      statusDistribution: {
        'pending': 42,
        'in_progress': 31,
        'resolved': 183
      },
      topTags: [
        { tag: 'ui_issue', count: 47 },
        { tag: 'accuracy', count: 38 },
        { tag: 'feature_request', count: 32 },
        { tag: 'performance', count: 28 },
        { tag: 'usability', count: 25 }
      ],
      timeToResolution: {
        average: 36, // hours
        median: 24,  // hours
        min: 0.5,    // hours
        max: 168     // hours
      },
      trendsOverTime: {
        // Mock monthly data for the last 6 months
        labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
        feedbackCount: [32, 38, 45, 52, 48, 41],
        averageRating: [3.8, 3.9, 4.0, 4.1, 4.3, 4.4]
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        statistics
      }
    });
  } catch (error) {
    next(error);
  }
};

// Analyze feedback using AI
exports.analyzeFeedback = async (req, res, next) => {
  try {
    const { feedbackIds } = req.body;
    
    if (!feedbackIds || !Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return next(new ApiError('Feedback IDs array is required', 400));
    }
    
    // This would normally call the AI/ML service
    // For now, we'll return a mock response
    
    // Mock AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock analysis results
    const analysisResults = {
      sentimentAnalysis: {
        overall: 'positive',
        score: 0.72,
        breakdown: {
          positive: 0.65,
          neutral: 0.25,
          negative: 0.10
        }
      },
      topThemes: [
        { theme: 'User Interface', sentiment: 'mixed', frequency: 0.35 },
        { theme: 'Diagnostic Accuracy', sentiment: 'positive', frequency: 0.28 },
        { theme: 'System Speed', sentiment: 'negative', frequency: 0.22 },
        { theme: 'Feature Requests', sentiment: 'neutral', frequency: 0.15 }
      ],
      keyInsights: [
        'Users appreciate the diagnostic accuracy but find the interface confusing',
        'System performance is a common pain point, especially during peak hours',
        'Mobile experience needs improvement according to 28% of feedback',
        'Medication recommendation feature receives consistently positive feedback'
      ],
      recommendedActions: [
        { action: 'Optimize system performance', priority: 'high', impact: 'medium' },
        { action: 'Simplify the diagnostic input interface', priority: 'medium', impact: 'high' },
        { action: 'Improve mobile responsiveness', priority: 'medium', impact: 'medium' },
        { action: 'Add more detailed medication information', priority: 'low', impact: 'medium' }
      ],
      processingMetadata: {
        feedbackCount: feedbackIds.length,
        processingTime: 1.2, // seconds
        aiVersion: '1.0.0',
        timestamp: new Date()
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        feedbackIds,
        analysis: analysisResults
      }
    });
  } catch (error) {
    next(error);
  }
};