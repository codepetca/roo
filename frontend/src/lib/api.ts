/**
 * API Module - Firebase Functions integration (REFACTORED)
 * @module frontend/src/lib/api
 * @size 15 lines (was 648 lines - successfully split!)
 * @exports All API functionality from modular structure
 * @dependencies ./api/index (client + endpoints)
 * @patterns Clean re-export, backward compatibility maintained
 * @refactoring Split into: api/client.ts + api/endpoints.ts + api/index.ts
 */

// Re-export everything from the new modular API structure
export * from './api/index';
