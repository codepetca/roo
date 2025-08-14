/**
 * Model exports - Central import point for all models and collections
 * Location: frontend/src/lib/models/index.ts
 */

// Base classes
export { BaseModel } from './base.model';
export { BaseCollection } from './base.collection';

// Domain models
export { ClassroomModel } from './classroom.model';
export { AssignmentModel } from './assignment.model';

// Domain collections
export { ClassroomCollection } from './classroom.collection';
export { AssignmentCollection } from './assignment.collection';

// Types (re-exported from Zod schemas for convenience)
export type {
	Classroom,
	Assignment,
	Grade,
	Submission,
	StudentEnrollment,
	ClassroomWithAssignments,
	AssignmentWithStats,
	TeacherDashboard,
	StudentDashboard,
	DashboardUser
} from '@shared/schemas/core';
