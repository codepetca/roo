import { z } from "zod";
import { baseAssignmentSchema } from "./assignment-base";
import { assignmentMaterialsSchema } from "./assignment-materials";
import { rubricSchema } from "./rubric";
import { quizDataSchema } from "./quiz-data";
import { enhancedSubmissionSchema } from "./submission";

/**
 * Classroom Snapshot Schemas
 * Complete point-in-time capture of classroom data for export, import, and analysis
 * Compatible with both AppScript and Svelte frontends
 * Now using modular schema components for better maintainability
 * 
 * Location: shared/schemas/classroom-snapshot.ts
 */

// ============================================
// Snapshot Metadata Schema
// ============================================
export const snapshotMetadataSchema = z.object({
  fetchedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  source: z.enum(['mock', 'google-classroom', 'roo-api']),
  version: z.string().default('1.0.0')
});

// ============================================
// Teacher Profile Schema
// ============================================
export const teacherProfileSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  isTeacher: z.boolean().default(true),
  displayName: z.string().optional()
});

// ============================================
// Enhanced Assignment Schema for Cache
// ============================================
export const assignmentWithStatsSchema = baseAssignmentSchema.extend({
  // Enhanced data (optional for backward compatibility)
  materials: assignmentMaterialsSchema.optional(),
  rubric: rubricSchema.optional(),
  quizData: quizDataSchema.optional(),
  
  // Legacy type mapping for backward compatibility
  type: z.enum(['coding', 'quiz', 'written', 'assignment', 'form']).transform(val => {
    // Map legacy types to new types
    if (val === 'coding' || val === 'written') return 'assignment';
    return val;
  })
});

// Legacy assignment schema (for backward compatibility)
export const legacyAssignmentSchema = z.object({
  // Core assignment data (legacy format)
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['coding', 'quiz', 'written']),
  status: z.enum(['draft', 'published', 'partial', 'graded', 'closed']),
  maxScore: z.number().min(0),
  
  // Timing information
  dueDate: z.string().datetime().optional(),
  creationTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  
  // Google Classroom specific
  workType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']).optional(),
  alternateLink: z.string().url().optional(),
  
  // Submission statistics
  submissionStats: z.object({
    total: z.number().min(0),
    submitted: z.number().min(0),
    graded: z.number().min(0),
    pending: z.number().min(0)
  }),
  
  // Optional metadata
  points: z.number().optional(),
  gradingPeriodId: z.string().optional(),
  categoryId: z.string().optional()
});

// ============================================
// Student Schema
// ============================================
export const studentSnapshotSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  
  // Google Classroom specific
  userId: z.string().optional(),
  profile: z.object({
    id: z.string(),
    name: z.object({
      givenName: z.string(),
      familyName: z.string(),
      fullName: z.string()
    }),
    emailAddress: z.string().email(),
    photoUrl: z.string().url().optional()
  }).optional(),
  
  // Enrollment info
  courseId: z.string(),
  joinTime: z.string().datetime().optional(),
  
  // Academic data
  overallGrade: z.number().optional(),
  submissionCount: z.number().default(0),
  gradedSubmissionCount: z.number().default(0)
});

// ============================================
// Submission Schema (using enhanced modular schema)
// ============================================
// Note: Now using enhancedSubmissionSchema from submission.ts
export const submissionSnapshotSchema = enhancedSubmissionSchema;

// ============================================
// Classroom Schema with Nested Data
// ============================================
export const classroomWithDataSchema = z.object({
  // Core classroom information (Google Classroom format)
  id: z.string(),
  name: z.string(),
  section: z.string().optional(),
  description: z.string().optional(),
  descriptionHeading: z.string().optional(),
  room: z.string().optional(),
  
  // Classroom metadata
  enrollmentCode: z.string(),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']),
  creationTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  
  // Links and access
  alternateLink: z.string().url(),
  teacherGroupEmail: z.string().email().optional(),
  courseGroupEmail: z.string().email().optional(),
  
  // Counts and statistics
  studentCount: z.number().min(0),
  assignmentCount: z.number().min(0).default(0),
  totalSubmissions: z.number().min(0).default(0),
  ungradedSubmissions: z.number().min(0).default(0),
  
  // Nested data for complete cache
  assignments: z.array(assignmentWithStatsSchema).default([]),
  students: z.array(studentSnapshotSchema).default([]),
  submissions: z.array(submissionSnapshotSchema).default([]),
  
  // Teacher-specific settings
  teacherFolder: z.object({
    id: z.string(),
    title: z.string(),
    alternateLink: z.string().url()
  }).optional(),
  
  // Calendar integration
  calendarId: z.string().optional(),
  
  // Permissions and ownership
  ownerId: z.string(),
  guardianNotificationSettings: z.object({
    enabled: z.boolean()
  }).optional()
});

// ============================================
// OPTIMIZED Entity-Based Schemas (NEW - matches AppScript output)
// ============================================

// Clean classroom schema (no nested data, references only)
export const cleanClassroomSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: z.string().optional(),
  description: z.string().optional(),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']),
  creationTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  ownerId: z.string(),
  studentCount: z.number().min(0),
  assignmentCount: z.number().min(0),
  totalSubmissions: z.number().min(0),
  ungradedSubmissions: z.number().min(0)
});

// Clean assignment schema (with classroom reference, no nested data)
export const cleanAssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['assignment', 'quiz', 'written', 'form']),
  maxScore: z.number().min(0),
  status: z.enum(['draft', 'published', 'partial', 'graded', 'closed']),
  dueDate: z.string().datetime().optional(),
  creationTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  classroomId: z.string(), // Reference to classroom
  materials: assignmentMaterialsSchema.optional()
});

// Clean submission schema (with references, no nested data)
export const cleanSubmissionSchema = enhancedSubmissionSchema.extend({
  classroomId: z.string(),  // Reference to classroom
  assignmentId: z.string(), // Reference to assignment  
  studentId: z.string()     // Reference to student
});

// Student enrollment schema (student-classroom relationship)
export const studentEnrollmentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  classroomId: z.string(),
  studentEmail: z.string().email(),
  studentName: z.string(),
  status: z.enum(['active', 'removed']).default('active'),
  enrolledAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// OPTIMIZED: Entity-based snapshot schema (NEW - matches AppScript)
export const optimizedClassroomSnapshotSchema = z.object({
  // Teacher information
  teacher: teacherProfileSchema,
  
  // Separate entity collections (NO NESTING!)
  entities: z.object({
    classrooms: z.array(cleanClassroomSchema),
    assignments: z.array(cleanAssignmentSchema),
    submissions: z.array(cleanSubmissionSchema),
    enrollments: z.array(studentEnrollmentSchema)
  }),
  
  // Global statistics (calculated from entities)
  globalStats: z.object({
    totalClassrooms: z.number().min(0),
    totalStudents: z.number().min(0),
    totalAssignments: z.number().min(0),
    totalSubmissions: z.number().min(0),
    ungradedSubmissions: z.number().min(0),
    averageGrade: z.number().optional()
  }),
  
  // Snapshot metadata
  snapshotMetadata: snapshotMetadataSchema
});

// ============================================
// LEGACY: Complete Classroom Snapshot Schema (DEPRECATED)
// ============================================
export const classroomSnapshotSchema = z.object({
  // Teacher information
  teacher: teacherProfileSchema,
  
  // All classroom data with nested assignments, students, submissions
  classrooms: z.array(classroomWithDataSchema),
  
  // Global statistics
  globalStats: z.object({
    totalClassrooms: z.number().min(0),
    totalStudents: z.number().min(0),
    totalAssignments: z.number().min(0),
    totalSubmissions: z.number().min(0),
    ungradedSubmissions: z.number().min(0),
    averageGrade: z.number().optional()
  }),
  
  // Snapshot metadata
  snapshotMetadata: snapshotMetadataSchema
});

// ============================================
// Partial Snapshot Schemas (for incremental updates)
// ============================================
export const classroomPartialSnapshotSchema = z.object({
  classroomId: z.string(),
  assignments: z.array(assignmentWithStatsSchema).optional(),
  students: z.array(studentSnapshotSchema).optional(),
  submissions: z.array(submissionSnapshotSchema).optional(),
  lastUpdated: z.string().datetime()
});

// ============================================
// Type Exports
// ============================================
export type SnapshotMetadata = z.infer<typeof snapshotMetadataSchema>;
export type TeacherProfile = z.infer<typeof teacherProfileSchema>;

// NEW OPTIMIZED TYPES (matches AppScript output)
export type CleanClassroom = z.infer<typeof cleanClassroomSchema>;
export type CleanAssignment = z.infer<typeof cleanAssignmentSchema>;
export type CleanSubmission = z.infer<typeof cleanSubmissionSchema>;
export type StudentEnrollment = z.infer<typeof studentEnrollmentSchema>;
export type OptimizedClassroomSnapshot = z.infer<typeof optimizedClassroomSnapshotSchema>;

// LEGACY TYPES (deprecated but kept for compatibility)
export type AssignmentWithStats = z.infer<typeof assignmentWithStatsSchema>;
export type StudentSnapshot = z.infer<typeof studentSnapshotSchema>;
export type SubmissionSnapshot = z.infer<typeof submissionSnapshotSchema>; // Now uses EnhancedSubmission type
export type ClassroomWithData = z.infer<typeof classroomWithDataSchema>;
export type ClassroomSnapshot = z.infer<typeof classroomSnapshotSchema>;
export type ClassroomPartialSnapshot = z.infer<typeof classroomPartialSnapshotSchema>;

// ============================================
// Utility Functions
// ============================================

/**
 * Create snapshot metadata with expiration
 */
export function createSnapshotMetadata(
  source: 'mock' | 'google-classroom' | 'roo-api',
  expirationMinutes: number = 30
): SnapshotMetadata {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);
  
  return {
    fetchedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    source,
    version: '1.0.0'
  };
}

/**
 * Check if snapshot is expired
 */
export function isSnapshotExpired(metadata: SnapshotMetadata): boolean {
  return new Date() > new Date(metadata.expiresAt);
}

/**
 * Calculate global statistics from classroom data
 */
export function calculateGlobalStats(classrooms: ClassroomWithData[]) {
  const totalClassrooms = classrooms.length;
  const totalStudents = classrooms.reduce((sum, c) => sum + c.studentCount, 0);
  const totalAssignments = classrooms.reduce((sum, c) => sum + c.assignments.length, 0);
  const totalSubmissions = classrooms.reduce((sum, c) => sum + c.submissions.length, 0);
  const ungradedSubmissions = classrooms.reduce((sum, c) => 
    sum + c.submissions.filter(s => s.status === 'pending' || s.status === 'submitted').length, 0
  );
  
  // Calculate average grade across all graded submissions
  const gradedSubmissions = classrooms.flatMap(c => c.submissions.filter(s => s.grade));
  const averageGrade = gradedSubmissions.length > 0 
    ? gradedSubmissions.reduce((sum, s) => sum + (s.grade!.score / s.grade!.maxScore * 100), 0) / gradedSubmissions.length
    : undefined;
  
  return {
    totalClassrooms,
    totalStudents,
    totalAssignments,
    totalSubmissions,
    ungradedSubmissions,
    averageGrade: averageGrade ? Math.round(averageGrade * 100) / 100 : undefined
  };
}

