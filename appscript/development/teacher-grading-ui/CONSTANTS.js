/**
 * CONSTANTS.js - Central configuration for Teacher Grading UI
 * All deployment-specific values and configuration in one place
 */

// Deployment Configuration
const DEPLOYMENT_ID = 'AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw';

// API Configuration  
const API_CONFIG = {
  USE_MOCK: true,  // Toggle between mock and real data
  API_BASE_URL: 'https://roo-dev-12345.cloudfunctions.net/api/v2',
  API_KEY: 'YOUR_API_KEY_HERE',
  DEBUG: true
};

// Cache Configuration
const CACHE_CONFIG = {
  EXPIRATION_MINUTES: 30,
  ENABLED: true
};

// UI Configuration
const UI_CONFIG = {
  APP_TITLE: 'Roo Teacher Grading Portal',
  PAGE_WIDTH: 1400,
  PAGE_HEIGHT: 900,
  TOAST_DURATION: 3000,
  LOADING_DELAY: 300
};

// Grading Configuration
const GRADING_CONFIG = {
  DEFAULT_MAX_SCORE: 100,
  CONFIDENCE_THRESHOLD: 0.85,
  BATCH_SIZE_LIMIT: 50,
  AI_TIMEOUT_MS: 30000,
  MOCK_PROCESSING_DELAY: 3000
};

// Mock Data Configuration
const MOCK_CONFIG = {
  CLASSROOMS_COUNT: 1,  // Reduced from 3
  STUDENTS_PER_CLASS: 10,  // Reduced from 30
  SUBMISSIONS_PER_ASSIGNMENT: 3  // Reduced for efficiency
};

// Google API Configuration
const GOOGLE_API_CONFIG = {
  CLASSROOM_API_BASE: 'https://classroom.googleapis.com/v1',
  FORMS_API_BASE: 'https://forms.googleapis.com/v1',
  RATE_LIMIT_DELAY: 200  // ms between API calls
};

// OAuth Scopes (defined in appsscript.json)
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/script.external_request'
];

// Status Types
const STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  GRADING: 'grading',
  GRADED: 'graded',
  RETURNED: 'returned',
  ERROR: 'error'
};

// Assignment Types
const ASSIGNMENT_TYPES = {
  ASSIGNMENT: 'assignment',
  QUIZ: 'quiz',
  CODING: 'coding'
};

// Content Types
const CONTENT_TYPES = {
  DOCUMENT: 'document',
  SPREADSHEET: 'spreadsheet',
  PRESENTATION: 'presentation',
  PDF: 'pdf',
  IMAGE: 'image',
  TEXT: 'text',
  QUIZ_RESPONSE: 'quiz_response',
  MIXED: 'mixed',
  OTHER: 'other'
};

// Grading Strictness Levels
const GRADING_STRICTNESS = {
  STRICT: 'strict',
  MODERATE: 'moderate',
  GENEROUS: 'generous'
};

// Error Messages
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  AUTH_ERROR: 'Authorization required. Please reload the page.',
  NO_CLASSROOMS: 'No classrooms found. Please check your Google Classroom access.',
  NO_SUBMISSIONS: 'No submissions found for this assignment.',
  GRADING_FAILED: 'Grading failed. Please try again.',
  SAVE_FAILED: 'Failed to save grade. Please try again.'
};

// Success Messages
const SUCCESS_MESSAGES = {
  GRADE_SAVED: 'Grade saved successfully!',
  BATCH_COMPLETE: 'Batch grading completed!',
  EXPORT_COMPLETE: 'Export completed successfully!'
};

// Export as global object for Apps Script
var CONSTANTS = {
  DEPLOYMENT_ID,
  API_CONFIG,
  CACHE_CONFIG,
  UI_CONFIG,
  GRADING_CONFIG,
  MOCK_CONFIG,
  GOOGLE_API_CONFIG,
  OAUTH_SCOPES,
  STATUS,
  ASSIGNMENT_TYPES,
  CONTENT_TYPES,
  GRADING_STRICTNESS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};