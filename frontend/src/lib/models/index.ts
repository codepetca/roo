/**
 * Model exports - Schema-first types from Zod schemas
 * Location: frontend/src/lib/models/index.ts
 */

// All types are now inferred from Zod schemas for consistency and validation
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
