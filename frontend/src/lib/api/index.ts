/**
 * API Module - Main exports for Firebase Functions integration
 * @module frontend/src/lib/api
 * @size ~20 lines (was 648 lines - successful split!)
 * @exports All client functions and API endpoints
 * @dependencies ./client, ./endpoints
 * @patterns Re-export pattern, clean module boundaries
 */

// Re-export HTTP client functions
export { apiRequest, typedApiRequest, callFunction, API_BASE_URL } from './client';

// Re-export all API endpoints
export { api } from './endpoints';

// Export for backward compatibility (if needed)
export * from './client';
export * from './endpoints';
