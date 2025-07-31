"use strict";
/**
 * Shared type definitions for Roo application
 * These types are now generated from Zod schemas for consistency
 * They represent JSON-serializable versions of Firebase documents
 *
 * DEPRECATED: This file is being migrated to use Zod-inferred types.
 * New code should import types from the respective schema files instead.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializedTimestampToISO = serializedTimestampToISO;
// Utility functions
function serializedTimestampToISO(timestamp) {
    return new Date(timestamp._seconds * 1000).toISOString();
}
//# sourceMappingURL=types.js.map