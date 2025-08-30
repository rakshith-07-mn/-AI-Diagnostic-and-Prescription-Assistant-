const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

// Import error handling utilities
const ApiError = require('./utils/apiError');
const errorMiddleware = require('./middleware/errorMiddleware');

// Import route handlers
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const diagnosisRoutes = require('./routes/diagnosisRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

// Create Express app
const app = express();

// Global Middleware

// Enable CORS
app.use(cors());

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same IP
const limiter = rateLimit({
  max: 100, // 100 requests per windowMs
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'name', 
    'age', 
    'gender', 
    'category', 
    'severity', 
    'bodyPart', 
    'condition',
    'rating',
    'status'
  ]
}));

// Compression middleware
app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/symptoms', symptomRoutes);
app.use('/api/v1/diagnoses', diagnosisRoutes);
app.use('/api/v1/medications', medicationRoutes);
app.use('/api/v1/feedback', feedbackRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
app.get('/api/v1/docs', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API documentation',
    docsUrl: process.env.API_DOCS_URL || '/api-docs'
  });
});

// Global error handling middleware
app.use(errorMiddleware);

// 404 handler for undefined routes
app.use(errorMiddleware.notFound);

module.exports = app;