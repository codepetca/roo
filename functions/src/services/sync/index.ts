/**
 * Sync Services Index - Re-exports all synchronization functionality
 * @module functions/src/services/sync/index
 * @size ~25 lines (extracted from 474-line classroom-sync.ts)
 * @exports All sync functions and types, ClassroomSyncService class
 * @dependencies All sync modules
 * @patterns Clean API surface, backward compatibility, service factory
 */

// Types
export type {
  ClassroomSyncResult,
  ExtractedClassroom,
  ExtractedStudent,
  SyncOperationResult,
  StudentSyncResult,
} from "./types";

// Core sync functions
export { extractClassroomsAndStudents } from "./data-extractor";
export { syncStudent } from "./student-sync";
export { syncClassroom } from "./classroom-sync";
export { updateStudentClassroomAssociations } from "./association-sync";
export { syncClassroomsFromSheets } from "./orchestrator";

// Backward compatibility - ClassroomSyncService class wrapper
export class ClassroomSyncService {
  extractClassroomsAndStudents = extractClassroomsAndStudents;
  syncStudent = syncStudent;
  syncClassroom = syncClassroom;
  updateStudentClassroomAssociations = updateStudentClassroomAssociations;
  syncClassroomsFromSheets = syncClassroomsFromSheets;
}

/**
 * Create a ClassroomSyncService instance (backward compatibility)
 */
export function createClassroomSyncService(): ClassroomSyncService {
  return new ClassroomSyncService();
}
