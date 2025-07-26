import { z } from "zod";

/**
 * DTO (Data Transfer Object) schemas for API boundaries
 * These schemas define the structure of data sent to and from the API
 */

// ============================================
// Serialized Timestamp for API communication
// ============================================
export const serializedTimestampSchema = z.object({
  _seconds: z.number(),
  _nanoseconds: z.number()
});

export type SerializedTimestamp = z.infer<typeof serializedTimestampSchema>;

// ============================================
// Base DTO Schema
// ============================================
export const baseDtoSchema = z.object({
  id: z.string().min(1),
  createdAt: serializedTimestampSchema,
  updatedAt: serializedTimestampSchema
});

// ============================================
// Assignment DTOs
// ============================================

// Request DTO for creating assignments
export const createAssignmentRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  maxPoints: z.number().min(0).max(1000),
  dueDate: z.string().datetime().optional(),
  gradingRubric: z.object({
    enabled: z.boolean().default(true),
    criteria: z.array(z.string()).default(["Content", "Grammar", "Structure"]),
    promptTemplate: z.string().optional()
  }).optional()
});

// Response DTO for assignments
export const assignmentResponseSchema = baseDtoSchema.extend({
  classroomId: z.string(),
  title: z.string(),
  description: z.string(),
  dueDate: serializedTimestampSchema.optional(),
  maxPoints: z.number(),
  gradingRubric: z.object({
    enabled: z.boolean(),
    criteria: z.array(z.string()),
    promptTemplate: z.string().optional()
  }),
  isQuiz: z.boolean(),
  formId: z.string().optional(),
  sourceFileId: z.string().optional()
});

// ============================================
// Submission DTOs
// ============================================

// Request DTO for creating submissions
export const createSubmissionRequestSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentEmail: z.string().email(),
  submissionText: z.string().min(1),
  submittedAt: z.string().datetime().optional(),
  status: z.enum(["pending", "grading", "graded", "error"]).default("pending")
});

// Request DTO for updating submission status
export const updateSubmissionStatusRequestSchema = z.object({
  status: z.enum(["pending", "grading", "graded", "error"]),
  gradeId: z.string().optional()
});

// Response DTO for submissions
export const submissionResponseSchema = baseDtoSchema.extend({
  assignmentId: z.string(),
  studentId: z.string(),
  studentEmail: z.string(),
  studentName: z.string(),
  submittedAt: serializedTimestampSchema,
  documentUrl: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(["pending", "grading", "graded", "error"])
});

// ============================================
// Grade DTOs
// ============================================

// Request DTO for creating grades
export const createGradeRequestSchema = z.object({
  submissionId: z.string().min(1),
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  feedback: z.string(),
  gradingDetails: z.object({
    criteria: z.array(z.object({
      name: z.string(),
      score: z.number().min(0),
      maxScore: z.number().min(0),
      feedback: z.string()
    }))
  })
});

// Response DTO for grades
export const gradeResponseSchema = baseDtoSchema.extend({
  submissionId: z.string(),
  assignmentId: z.string(),
  studentId: z.string(),
  score: z.number(),
  maxScore: z.number(),
  feedback: z.string(),
  gradingDetails: z.object({
    criteria: z.array(z.object({
      name: z.string(),
      score: z.number(),
      maxScore: z.number(),
      feedback: z.string()
    }))
  }),
  gradedBy: z.enum(["ai", "manual"]),
  gradedAt: serializedTimestampSchema,
  postedToClassroom: z.boolean()
});

// ============================================
// Grading Request DTOs
// ============================================

// Request DTO for grading quizzes
export const gradeQuizRequestSchema = z.object({
  submissionId: z.string().min(1),
  formId: z.string().min(1),
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentAnswers: z.record(z.string(), z.string()) // questionNumber -> answer
});

// Request DTO for grading code assignments
export const gradeCodeRequestSchema = z.object({
  submissionId: z.string().min(1),
  submissionText: z.string().min(1),
  assignmentId: z.string().min(1),
  assignmentTitle: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  assignmentDescription: z.string().optional().default(""),
  maxPoints: z.number().min(1).default(100),
  isCodeAssignment: z.boolean().default(false),
  gradingStrictness: z.enum(["strict", "standard", "generous"]).default("generous")
});

// Request DTO for test grading
export const testGradingRequestSchema = z.object({
  text: z.string().min(1, "Text to grade is required"),
  criteria: z.array(z.string()).default(["Content", "Grammar", "Structure"]),
  maxPoints: z.number().min(1).max(1000).default(100),
  promptTemplate: z.string().optional()
});

// ============================================
// Grading Result DTOs
// ============================================

// Response DTO for grading results
export const gradingResultResponseSchema = z.object({
  score: z.number(),
  feedback: z.string(),
  criteriaScores: z.array(z.object({
    name: z.string(),
    score: z.number(),
    maxScore: z.number(),
    feedback: z.string()
  })).optional()
});

// Response DTO for quiz grading results
export const quizGradingResultResponseSchema = z.object({
  totalScore: z.number(),
  totalPossible: z.number(),
  questionGrades: z.array(z.object({
    questionNumber: z.number(),
    isCorrect: z.boolean(),
    studentAnswer: z.string(),
    correctAnswer: z.string(),
    points: z.number()
  }))
});

// ============================================
// Sheets Integration DTOs
// ============================================

// Request DTO for getting sheets submissions
export const getSheetsSubmissionsRequestSchema = z.object({
  assignmentId: z.string().min(1)
});

// Request DTO for getting answer key
export const getAnswerKeyRequestSchema = z.object({
  formId: z.string().min(1)
});

// Response DTO for answer key
export const answerKeyResponseSchema = z.object({
  formId: z.string(),
  totalPoints: z.number(),
  questions: z.array(z.object({
    questionNumber: z.number(),
    correctAnswer: z.string(),
    points: z.number()
  }))
});

// ============================================
// API Response Wrapper
// ============================================

// Generic API response wrapper
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional()
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    path: z.string(),
    message: z.string()
  })).optional(),
  message: z.string().optional()
});

// ============================================
// List/Array Response DTOs
// ============================================

export const assignmentsListResponseSchema = apiResponseSchema(
  z.array(assignmentResponseSchema)
);

export const submissionsListResponseSchema = apiResponseSchema(
  z.array(submissionResponseSchema)
);

export const gradesListResponseSchema = apiResponseSchema(
  z.array(gradeResponseSchema)
);

// ============================================
// Specific API Response DTOs
// ============================================

export const gradeQuizResponseSchema = apiResponseSchema(
  z.object({
    gradeId: z.string(),
    grading: quizGradingResultResponseSchema
  })
);

export const gradeCodeResponseSchema = apiResponseSchema(
  z.object({
    gradeId: z.string(),
    grading: gradingResultResponseSchema
  })
);

// ============================================
// Health Check DTO
// ============================================

export const healthCheckResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
  endpoints: z.array(z.string())
});

// ============================================
// Type exports for convenience
// ============================================

export type CreateAssignmentRequest = z.infer<typeof createAssignmentRequestSchema>;
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export type CreateSubmissionRequest = z.infer<typeof createSubmissionRequestSchema>;
export type UpdateSubmissionStatusRequest = z.infer<typeof updateSubmissionStatusRequestSchema>;
export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;
export type CreateGradeRequest = z.infer<typeof createGradeRequestSchema>;
export type GradeResponse = z.infer<typeof gradeResponseSchema>;
export type GradeQuizRequest = z.infer<typeof gradeQuizRequestSchema>;
export type GradeCodeRequest = z.infer<typeof gradeCodeRequestSchema>;
export type TestGradingRequest = z.infer<typeof testGradingRequestSchema>;
export type GradingResultResponse = z.infer<typeof gradingResultResponseSchema>;
export type QuizGradingResultResponse = z.infer<typeof quizGradingResultResponseSchema>;
export type GetSheetsSubmissionsRequest = z.infer<typeof getSheetsSubmissionsRequestSchema>;
export type GetAnswerKeyRequest = z.infer<typeof getAnswerKeyRequestSchema>;
export type AnswerKeyResponse = z.infer<typeof answerKeyResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;