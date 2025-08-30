/**
 * Configuration Module
 * Centralizes environment variable management for the AI Diagnostic and Prescription system
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
    apiDocsUrl: process.env.API_DOCS_URL || '/api-docs',
  },
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-diagnostic-system',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-should-be-long-and-secure',
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
    cookieExpiresIn: process.env.JWT_COOKIE_EXPIRES_IN || 90,
  },
  
  // Email configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD,
    fromEmail: process.env.EMAIL_FROM || 'noreply@ai-diagnostic.com',
    fromName: process.env.EMAIL_FROM_NAME || 'AI Diagnostic System',
  },
  
  // Security configuration
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  
  // AI/ML configuration
  ai: {
    modelEndpoint: process.env.AI_MODEL_ENDPOINT,
    apiKey: process.env.AI_API_KEY,
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.7'),
    maxSymptoms: parseInt(process.env.AI_MAX_SYMPTOMS || '10', 10),
    maxDiagnoses: parseInt(process.env.AI_MAX_DIAGNOSES || '5', 10),
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    directory: process.env.LOG_DIRECTORY || 'logs',
  },
  
  // File upload configuration
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5000000', 10), // 5MB
    directory: process.env.UPLOAD_DIRECTORY || 'uploads',
    allowedFormats: (process.env.UPLOAD_ALLOWED_FORMATS || 'jpg,jpeg,png,pdf').split(','),
  },
  
  // Feature flags
  features: {
    enableAI: process.env.ENABLE_AI === 'true',
    enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    enableSMSNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
    enableDataExport: process.env.ENABLE_DATA_EXPORT === 'true',
    enableAuditLog: process.env.ENABLE_AUDIT_LOG !== 'false', // Default to true
  },
};