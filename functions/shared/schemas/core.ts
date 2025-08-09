import { z } from 'zod';

/**
 * Core Business Schemas for Normalized Data Model
 * Location: shared/schemas/core.ts
 * 
 * These schemas define the normalized business entities stored in Firestore.
 * They are separate from the import schemas (classroom-snapshot) to allow
 * for clean transformation and data management.
 */

// Helper for date/timestamp handling - expects ISO strings from API
const dateTimeSchema = z.string().datetime().transform(val => new Date(val));

// Base entity schema with common fields
const baseEntitySchema = z.object({
  id: z.string(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema
});

/**
 * Teacher Schema - Normalized teacher profile
 */
export const teacherSchema = baseEntitySchema.extend({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.literal('teacher'),
  
  // Denormalized references for quick access
  classroomIds: z.array(z.string()).default([]),
  
  // Cached counts for dashboard
  totalStudents: z.number().int().min(0).default(0),
  totalClassrooms: z.number().int().min(0).default(0)
});

/**
 * Classroom Schema - Core classroom entity
 */
export const classroomSchema = baseEntitySchema.extend({
  teacherId: z.string(),
  name: z.string().min(1),
  section: z.string().optional(),
  description: z.string().optional(),
  
  // Google Classroom integration
  externalId: z.string().optional(), // Original Google Classroom ID
  enrollmentCode: z.string().optional(),
  alternateLink: z.string().url().optional(),
  
  // Status
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED']).default('ACTIVE'),
  
  // Denormalized references for efficient queries
  studentIds: z.array(z.string()).default([]),
  assignmentIds: z.array(z.string()).default([]),
  
  // Cached counts for performance
  studentCount: z.number().int().min(0).default(0),
  assignmentCount: z.number().int().min(0).default(0),
  activeSubmissions: z.number().int().min(0).default(0),
  ungradedSubmissions: z.number().int().min(0).default(0)
});

/**
 * Assignment Schema - Individual assignments
 */
export const assignmentSchema = baseEntitySchema.extend({
  classroomId: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  type: z.enum(['coding', 'quiz', 'written', 'form']),
  
  // Timing
  dueDate: dateTimeSchema.optional(),
  
  // Grading
  maxScore: z.number().min(0).default(100),
  
  // Rubric (optional)
  rubric: z.object({
    enabled: z.boolean().default(false),
    criteria: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      maxPoints: z.number().min(0)
    })).default([])
  }).optional(),
  
  // Status
  status: z.enum(['draft', 'published', 'closed']).default('draft'),
  
  // Google Classroom integration
  externalId: z.string().optional(),
  alternateLink: z.string().url().optional(),
  workType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']).optional(),
  
  // Cached statistics
  submissionCount: z.number().int().min(0).default(0),
  gradedCount: z.number().int().min(0).default(0),
  pendingCount: z.number().int().min(0).default(0)
});

/**
 * Submission Schema - Individual student submissions with versioning
 */
export const submissionSchema = baseEntitySchema.extend({
  assignmentId: z.string(),
  classroomId: z.string(), // Denormalized for efficient queries
  
  // Student info (denormalized)
  studentId: z.string(),
  studentEmail: z.string().email(),
  studentName: z.string(),
  
  // Versioning system
  version: z.number().int().min(1).default(1),
  previousVersionId: z.string().optional(),
  isLatest: z.boolean().default(true), // Only one per student per assignment
  
  // Content
  content: z.string().default(''),
  attachments: z.array(z.object({
    type: z.enum(['link', 'file', 'driveFile']),
    url: z.string().url(),
    name: z.string(),
    mimeType: z.string().optional()
  })).default([]),
  
  // Status and timing
  status: z.enum(['draft', 'submitted', 'graded', 'returned']).default('draft'),
  submittedAt: dateTimeSchema,
  
  // Import tracking
  importedAt: dateTimeSchema.optional(),
  source: z.enum(['google-classroom', 'roo-direct', 'import']).default('import'),
  
  // Google Classroom integration
  externalId: z.string().optional(),
  late: z.boolean().default(false),
  
  // Grade reference (if graded)
  gradeId: z.string().optional()
});

/**
 * Grade Schema - Grade records with full history
 */
export const gradeSchema = baseEntitySchema.extend({
  submissionId: z.string(),
  assignmentId: z.string(), // Denormalized for efficient queries
  studentId: z.string(), // Denormalized for efficient queries
  classroomId: z.string(), // Denormalized for efficient queries
  
  // Grade details
  score: z.number().min(0),
  maxScore: z.number().min(0),
  percentage: z.number().min(0).max(100),
  
  // Feedback
  feedback: z.string().default(''),
  privateComments: z.string().optional(),
  
  // Rubric scores (if applicable)
  rubricScores: z.array(z.object({
    criterionId: z.string(),
    criterionTitle: z.string(),
    score: z.number().min(0),
    maxScore: z.number().min(0),
    feedback: z.string().optional()
  })).optional(),
  
  // Grading metadata
  gradedAt: dateTimeSchema,
  gradedBy: z.enum(['ai', 'manual', 'auto']),
  gradingMethod: z.enum(['rubric', 'points', 'completion']).default('points'),
  
  // Version system for grade history
  version: z.number().int().min(1).default(1),
  isLatest: z.boolean().default(true), // Only one per student per assignment
  
  // Context - which submission version was graded
  submissionVersionGraded: z.number().int().min(1),
  submissionContentSnapshot: z.string().optional(), // Snapshot of graded content
  
  // Grade protection
  isLocked: z.boolean().default(false), // Manual grades are locked
  lockedReason: z.string().optional(),
  
  // AI grading metadata
  aiGradingInfo: z.object({
    model: z.string(),
    confidence: z.number().min(0).max(1),
    processingTime: z.number(), // milliseconds
    tokenUsage: z.number().optional()
  }).optional()
});

/**
 * Student enrollment schema (for classroom rosters)
 */
export const studentEnrollmentSchema = baseEntitySchema.extend({
  classroomId: z.string(),
  
  // Student info
  studentId: z.string(),
  email: z.string().email(),
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  
  // Enrollment details
  enrolledAt: dateTimeSchema,
  status: z.enum(['active', 'inactive', 'removed']).default('active'),
  
  // Performance tracking (cached)
  submissionCount: z.number().int().min(0).default(0),
  gradedSubmissionCount: z.number().int().min(0).default(0),
  averageGrade: z.number().min(0).max(100).optional(),
  
  // Google Classroom integration
  externalId: z.string().optional(),
  userId: z.string().optional()
});

/**
 * Export TypeScript types from Zod schemas
 */
export type Teacher = z.infer<typeof teacherSchema>;
export type Classroom = z.infer<typeof classroomSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type Grade = z.infer<typeof gradeSchema>;
export type StudentEnrollment = z.infer<typeof studentEnrollmentSchema>;

/**
 * Input types for creation (without auto-generated fields)
 */
export type TeacherInput = Omit<Teacher, 
  'id' | 'createdAt' | 'updatedAt' | 'totalStudents' | 'totalClassrooms'
>;

export type ClassroomInput = Omit<Classroom,
  'id' | 'createdAt' | 'updatedAt' | 'studentCount' | 'assignmentCount' | 'activeSubmissions' | 'ungradedSubmissions'
>;

export type AssignmentInput = Omit<Assignment,
  'id' | 'createdAt' | 'updatedAt' | 'submissionCount' | 'gradedCount' | 'pendingCount'
>;

export type SubmissionInput = Omit<Submission,
  'id' | 'createdAt' | 'updatedAt' | 'version' | 'isLatest' | 'gradeId'
>;

export type GradeInput = Omit<Grade,
  'id' | 'createdAt' | 'updatedAt' | 'version' | 'isLatest' | 'percentage'
>;

/**
 * Query result types with relations
 */
export interface ClassroomWithAssignments extends Classroom {
  assignments: Assignment[];
}

export interface ClassroomWithStudents extends Classroom {
  students: StudentEnrollment[];
}

export interface SubmissionWithGrade extends Submission {
  grade: Grade | null;
}

export interface AssignmentWithStats extends Assignment {
  submissions: SubmissionWithGrade[];
  recentSubmissions: Submission[];
}

/**
 * Dashboard aggregation types
 */

// Recent activity schema with proper union types
export const recentActivitySchema = z.object({
  type: z.enum(['submission', 'grade', 'assignment']),
  timestamp: dateTimeSchema,
  details: z.record(z.unknown())
});

// Teacher dashboard stats schema
export const teacherDashboardStatsSchema = z.object({
  totalStudents: z.number(),
  totalAssignments: z.number(),
  ungradedSubmissions: z.number(),
  averageGrade: z.number().optional()
});

// Complete teacher dashboard schema
export const teacherDashboardSchema = z.object({
  teacher: teacherSchema,
  classrooms: z.array(classroomSchema.extend({
    assignments: z.array(assignmentSchema)
  })),
  recentActivity: z.array(recentActivitySchema),
  stats: teacherDashboardStatsSchema
});

export interface TeacherDashboard {
  teacher: Teacher;
  classrooms: ClassroomWithAssignments[];
  recentActivity: Array<{
    type: 'submission' | 'grade' | 'assignment';
    timestamp: Date;
    details: Record<string, unknown>;
  }>;
  stats: {
    totalStudents: number;
    totalAssignments: number;
    ungradedSubmissions: number;
    averageGrade?: number;
  };
}

export interface StudentDashboard {
  studentId: string;
  classrooms: Array<{
    classroom: Classroom;
    assignments: AssignmentWithStats[];
    grades: Grade[];
    averageGrade?: number;
  }>;
  overallStats: {
    totalAssignments: number;
    completedAssignments: number;
    averageGrade?: number;
  };
}