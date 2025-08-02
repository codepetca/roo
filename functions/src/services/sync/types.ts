/**
 * Sync Types - TypeScript interfaces for classroom and student synchronization
 * @module functions/src/services/sync/types
 * @size ~40 lines (extracted from 474-line classroom-sync.ts)
 * @exports ClassroomSyncResult, ExtractedClassroom, ExtractedStudent
 * @dependencies none (pure types)
 * @patterns Type definitions for sync operations
 */

export interface ClassroomSyncResult {
  success: boolean;
  classroomsCreated: number;
  classroomsUpdated: number;
  studentsCreated: number;
  studentsUpdated: number;
  errors: string[];
}

export interface ExtractedClassroom {
  courseCode: string;
  name: string;
  studentEmails: string[];
}

export interface ExtractedStudent {
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  courseIds: string[];
}

export interface SyncOperationResult {
  created: boolean;
  updated: boolean;
  id: string;
}

export interface StudentSyncResult extends SyncOperationResult {
  userId: string;
}

export interface ClassroomSyncResult extends SyncOperationResult {
  classroomId: string;
}
