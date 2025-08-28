import { z } from 'zod';

/**
 * Core Business Schemas for Normalized Data Model
 * Location: shared/schemas/core.ts
 * 
 * These schemas define the normalized business entities stored in Firestore.
 * They are separate from the import schemas (classroom-snapshot) to allow
 * for clean transformation and data management.
 */

// Helper for date/timestamp handling - flexible parsing for various Firebase formats
const dateTimeSchema = z.union([
  // ISO datetime string
  z.string().datetime().transform(val => new Date(val)),
  // Firebase Timestamp object (admin SDK)
  z.object({
    _seconds: z.number(),
    _nanoseconds: z.number()
  }).transform(val => new Date(val._seconds * 1000 + val._nanoseconds / 1000000)),
  // Firebase Timestamp object (client SDK)
  z.object({
    seconds: z.number(),
    nanoseconds: z.number()
  }).transform(val => new Date(val.seconds * 1000 + val.nanoseconds / 1000000)),
  // Raw timestamp number (milliseconds)
  z.number().transform(val => new Date(val)),
  // Date object (already parsed)
  z.date(),
  // Empty object (API returning {}) - default to current date
  z.object({}).transform(() => new Date()),
  // null or undefined - default to current date
  z.null().transform(() => new Date()),
  z.undefined().transform(() => new Date()),
  // String that can be parsed as date
  z.string().transform(val => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${val}`);
    }
    return date;
  })
]).transform(val => val instanceof Date ? val : val);

// Firestore-safe record schema that rejects empty string keys
const firestoreRecordSchema = z.record(
  z.string().min(1, "Field names cannot be empty strings"),
  z.unknown()
);

// Base entity schema with common fields
const baseEntitySchema = z.object({
  id: z.string(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema
});

/**
 * User Schema - For teacher dashboard (replaces Teacher schema)
 * This is a simplified user type for the dashboard response
 */
export const dashboardUserSchema = baseEntitySchema.extend({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(['teacher', 'student', 'admin']),
  
  // School board email for classroom ownership (different from sign-in email)
  schoolEmail: z.string().email().optional(),
  
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
 * Assignment Classification Schema - Future-proof categorization system
 * Separates submission format from content type from grading strategy
 */
export const assignmentClassificationSchema = z.object({
  // Platform/format where assignment is submitted
  platform: z.enum([
    'google_form',      // Google Forms quiz
    'google_classroom', // Direct GC question (MC/SA)
    'google_docs',      // Google Docs submission
    'external_link',    // GitHub, CodeHS, etc.
    'file_upload',      // Direct file upload
    'inline_text'       // Text entered in GC
  ]),
  
  // Type of content being assessed
  contentType: z.enum([
    'code',            // Programming exercises
    'text',            // Essays, written responses
    'mixed',           // Combination of code and text
    'choice',          // Multiple choice only
    'short_answer',    // Brief text responses
    'mathematical'     // Math problems (future)
  ]),
  
  // How the assignment should be graded
  gradingApproach: z.enum([
    'generous_code',   // Lenient grading for handwritten code
    'strict_code',     // Strict syntax checking (future)
    'standard_quiz',   // Regular quiz grading
    'essay_rubric',    // Rubric-based essay grading
    'ai_analysis',     // AI determines criteria
    'auto_grade',      // Automatic grading (MC)
    'manual'           // Teacher grades manually
  ]),
  
  // Additional metadata for future extensions
  tags: z.array(z.string()).optional(),
  
  // Confidence score for auto-classification (0.0 to 1.0)
  confidence: z.number().min(0).max(1).optional()
});

/**
 * Assignment Base Schema - Core assignment fields without transform
 * Exported for use in .extend() operations since the main assignmentSchema uses .transform()
 */
export const assignmentBaseSchema = baseEntitySchema.extend({
  classroomId: z.string(),
  title: z.string().min(1).optional(),
  name: z.string().min(1).optional(), // Google Classroom uses 'name' instead of 'title'
  description: z.string().optional(),
  type: z.enum(['coding', 'quiz', 'written', 'form']).optional(),
  
  // New: Advanced classification system
  classification: assignmentClassificationSchema.optional(),
  
  // Legacy compatibility fields
  isQuiz: z.boolean().optional(),
  maxPoints: z.number().min(0).optional(),
  
  // Timing
  dueDate: dateTimeSchema.optional(),
  
  // Grading
  maxScore: z.number().min(0).default(100),
  
  // Rubric (optional) - handle both new and legacy formats
  rubric: z.object({
    enabled: z.boolean().default(false),
    criteria: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      maxPoints: z.number().min(0)
    })).default([])
  }).optional(),
  
  // Legacy rubric format compatibility
  gradingRubric: z.object({
    enabled: z.boolean().optional(),
    criteria: z.array(z.string()).optional(),
    promptTemplate: z.string().optional()
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
 * Assignment Schema - Individual assignments with legacy compatibility transform
 */
export const assignmentSchema = assignmentBaseSchema.transform(data => {
  // Transform legacy fields to new format
  const result = { ...data };
  
  // Handle legacy isQuiz -> type conversion
  if (data.isQuiz === true && !data.type) {
    result.type = 'quiz' as const;
  }
  
  // Handle legacy maxPoints -> maxScore conversion
  if (data.maxPoints && !data.maxScore) {
    result.maxScore = data.maxPoints;
  }
  
  // Clean up legacy fields from result
  delete result.isQuiz;
  delete result.maxPoints;
  delete result.gradingRubric;
  
  return result;
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
  gradeId: z.string().optional(),
  
  // AI processing status (optional for backward compatibility)
  aiProcessingStatus: z.object({
    contentExtracted: z.boolean().default(false),
    readyForGrading: z.boolean().default(false),
    processingErrors: z.array(z.string()).default([]),
    lastProcessedAt: z.string().datetime().optional()
  }).optional(),
  
  // Content extraction cache (for AI grading)
  extractedContent: z.object({
    text: z.string().optional(),
    structuredData: firestoreRecordSchema.optional(),
    images: z.array(z.string()).optional(), // Base64 or URLs
    metadata: firestoreRecordSchema.optional()
  }).optional()
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
  
  // Question-by-question scores and feedback (for quizzes)
  questionGrades: z.array(z.object({
    questionNumber: z.number(),
    score: z.number().min(0),
    maxScore: z.number().min(0),
    feedback: z.string()
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
export type AssignmentClassification = z.infer<typeof assignmentClassificationSchema>;
export type DashboardUser = z.infer<typeof dashboardUserSchema>;
export type Classroom = z.infer<typeof classroomSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type Grade = z.infer<typeof gradeSchema>;
export type StudentEnrollment = z.infer<typeof studentEnrollmentSchema>;

/**
 * Input types for creation (without auto-generated fields)
 */
export type DashboardUserInput = Omit<DashboardUser, 
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
  details: firestoreRecordSchema
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
  teacher: dashboardUserSchema,
  classrooms: z.array(classroomSchema.extend({
    assignments: z.array(assignmentSchema)
  })),
  recentActivity: z.array(recentActivitySchema),
  stats: teacherDashboardStatsSchema
});

// Student dashboard stats schema
export const studentDashboardStatsSchema = z.object({
  totalAssignments: z.number(),
  completedAssignments: z.number(),
  averageGrade: z.number().optional()
});

// Complete student dashboard schema
export const studentDashboardSchema = z.object({
  studentId: z.string(),
  classrooms: z.array(z.object({
    classroom: classroomSchema,
    assignments: z.array(assignmentBaseSchema.extend({
      hasSubmission: z.boolean().optional(),
      isGraded: z.boolean().optional(),
      isPending: z.boolean().optional(),
      isReturned: z.boolean().optional(),
      submissions: z.array(submissionSchema.extend({
        grade: gradeSchema.optional()
      })).optional(),
      recentSubmissions: z.array(submissionSchema).optional()
    })),
    grades: z.array(gradeSchema),
    averageGrade: z.number().optional()
  })),
  overallStats: studentDashboardStatsSchema
});

export interface TeacherDashboard {
  teacher: DashboardUser;
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