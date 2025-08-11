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
  OverallSyncResult,
  ClassroomSyncResult,
  ExtractedClassroom,
  ExtractedStudent,
  SyncOperationResult,
  StudentSyncResult,
} from "./types";

// Core sync functions
import { extractClassroomsAndStudents } from "./data-extractor";
import { syncStudent } from "./student-sync";
import { syncClassroom } from "./classroom-sync";
import { updateStudentClassroomAssociations, updateTeacherClassroomAssociations } from "./association-sync";
import { syncClassroomsFromSheets } from "./orchestrator";

// Re-export for public API
export { extractClassroomsAndStudents } from "./data-extractor";
export { syncStudent } from "./student-sync";
export { syncClassroom } from "./classroom-sync";
export { updateStudentClassroomAssociations, updateTeacherClassroomAssociations } from "./association-sync";
export { syncClassroomsFromSheets } from "./orchestrator";

// Backward compatibility - ClassroomSyncService class wrapper
export class ClassroomSyncService {
  async extractClassroomsAndStudents(...args: Parameters<typeof extractClassroomsAndStudents>) {
    return extractClassroomsAndStudents(...args);
  }
  
  async syncStudent(...args: Parameters<typeof syncStudent>) {
    return syncStudent(...args);
  }
  
  async syncClassroom(...args: Parameters<typeof syncClassroom>) {
    return syncClassroom(...args);
  }
  
  async updateStudentClassroomAssociations(...args: Parameters<typeof updateStudentClassroomAssociations>) {
    return updateStudentClassroomAssociations(...args);
  }
  
  async updateTeacherClassroomAssociations(...args: Parameters<typeof updateTeacherClassroomAssociations>) {
    return updateTeacherClassroomAssociations(...args);
  }
  
  async syncClassroomsFromSheets(...args: Parameters<typeof syncClassroomsFromSheets>) {
    return syncClassroomsFromSheets(...args);
  }
}

/**
 * Create a ClassroomSyncService instance (backward compatibility)
 */
export function createClassroomSyncService(): ClassroomSyncService {
  return new ClassroomSyncService();
}
