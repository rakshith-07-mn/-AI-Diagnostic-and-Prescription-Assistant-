require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Set up middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Request logging

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Import routes
const authRoutes = require('./api/authRoutes');
const patientRoutes = require('./api/patientRoutes');
const symptomRoutes = require('./api/symptomRoutes');
const diagnosisRoutes = require('./api/diagnosisRoutes');
const medicationRoutes = require('./api/medicationRoutes');
const feedbackRoutes = require('./api/feedbackRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/feedback', feedbackRoutes);

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app; // For testing purposes