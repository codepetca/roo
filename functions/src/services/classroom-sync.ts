/**
 * Classroom Sync Service - Re-exports modular sync functionality
 * @module functions/src/services/classroom-sync
 * @size 11 lines (was 474 lines - split into focused sync/ modules)
 * @exports All sync functions, types, and service class for backward compatibility
 * @dependencies ./sync/index
 * @patterns Clean re-export, maintained API surface, token optimization
 */

export * from "./sync/index";
