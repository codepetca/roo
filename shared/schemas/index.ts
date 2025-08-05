import { z } from "zod";

// ============================================
// Re-export all schemas from the new structure
// ============================================

// Source schemas (Google Sheets structure)
export * from "./source";

// Domain schemas (business logic)
export * from "./domain";

// DTO schemas (API boundaries)
export * from "./dto";

// Dashboard cache schemas (for UI state management)
export * from "./dashboard-cache";

// Modular schemas for AI grading
export * from "./assignment-base";
export * from "./assignment-materials";
export * from "./rubric";
export * from "./quiz-data";
export * from "./submission";
export * from "./ai-grading";

// Transformer utilities
export * from "./transformers";

// ============================================
// Legacy exports for backward compatibility
// ============================================

// Legacy timestamp schema for backward compatibility
export const timestampSchema = z.object({
  _seconds: z.number(),
  _nanoseconds: z.number()
});

// Enums
export const submissionStatusEnum = z.enum(["pending", "grading", "graded", "error"]);
export const gradedByEnum = z.enum(["ai", "manual"]);
export const gradingStrictnessEnum = z.enum(["strict", "standard", "generous"]);

// Legacy assignment schemas - use new DTO schemas instead
export { createAssignmentRequestSchema as createAssignmentSchema } from "./dto";
export { assignmentResponseSchema as assignmentSchema } from "./dto";

// Legacy submission schemas - use new DTO schemas instead
export const submissionStatusSchema = submissionStatusEnum;
export { createSubmissionRequestSchema as createSubmissionSchema } from "./dto";
export { submissionResponseSchema as submissionSchema } from "./dto";

// Legacy grade schemas - use new DTO schemas instead  
export { createGradeRequestSchema as createGradeSchema } from "./dto";
export { gradeResponseSchema as gradeSchema } from "./dto";

// Legacy grading request schemas - use new DTO schemas instead
export const gradeQuizTestSchema = z.object({
  submissionId: z.string().min(1),
  formId: z.string().min(1),
  studentAnswers: z.record(z.string(), z.string()) // questionNumber -> answer
});

export { gradeQuizRequestSchema as gradeQuizSchema } from "./dto";
export { gradeCodeRequestSchema as gradeCodeSchema } from "./dto";

// Legacy API schemas - use new DTO schemas instead
export { updateSubmissionStatusRequestSchema as updateSubmissionStatusSchema } from "./dto";
export { getSheetsSubmissionsRequestSchema as getSheetsSubmissionsSchema } from "./dto";
export { getAnswerKeyRequestSchema as getAnswerKeySchema } from "./dto";
export { testGradingRequestSchema as testGradingSchema } from "./dto";

// Keep these legacy schemas that don't have DTO equivalents yet
export const testWriteSchema = z.object({
  test: z.string(),
  step: z.number().optional(),
  data: z.any().optional()
});

export const gradeSubmissionSchema = z.object({
  submissionText: z.string().min(1, "Submission text is required"),
  assignmentId: z.string().min(1, "Assignment ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  studentName: z.string().min(1, "Student name is required"),
  customPrompt: z.string().optional()
});

// Google Classroom schemas (keep these as they don't have DTO equivalents)
export const classroomCourseSchema = z.object({
  courseId: z.string().min(1, "Course ID is required")
});

export const assignmentFetchSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  courseWorkId: z.string().min(1, "Assignment ID is required")
});

export const postGradeSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  courseWorkId: z.string().min(1, "Assignment ID is required"),
  submissionId: z.string().min(1, "Submission ID is required"),
  grade: z.number().min(0).max(1000, "Grade must be between 0 and 1000")
});

// ============================================
// Legacy type exports for backward compatibility
// ============================================

// Import types from DTO module
import type {
  CreateAssignmentRequest,
  AssignmentResponse,
  CreateSubmissionRequest,
  SubmissionResponse,
  CreateGradeRequest,
  GradeResponse,
  TestGradingRequest
} from "./dto";

// Use DTO types instead of inferring from legacy schemas
export type CreateAssignment = CreateAssignmentRequest;
export type Assignment = AssignmentResponse;
export type CreateSubmission = CreateSubmissionRequest;
export type Submission = SubmissionResponse;
export type CreateGrade = CreateGradeRequest;
export type Grade = GradeResponse;
export type TestWrite = z.infer<typeof testWriteSchema>;
export type GradeSubmissionRequest = z.infer<typeof gradeSubmissionSchema>;
export type TestGrading = TestGradingRequest;
export type ClassroomCourseRequest = z.infer<typeof classroomCourseSchema>;
export type AssignmentFetchRequest = z.infer<typeof assignmentFetchSchema>;
export type PostGradeRequest = z.infer<typeof postGradeSchema>;

// Grading request types
export type GradeQuizTestRequest = z.infer<typeof gradeQuizTestSchema>;
// Note: GradeQuizRequest and GradeCodeRequest are exported from DTO

// Submission management types - already exported from DTO

// Sheets-related types - already exported from DTO

// Status types
export type SubmissionStatus = z.infer<typeof submissionStatusEnum>;
export type GradedBy = z.infer<typeof gradedByEnum>;
export type GradingStrictness = z.infer<typeof gradingStrictnessEnum>;

// Use DTO response schemas instead
export { gradingResultResponseSchema as gradingResultSchema } from "./dto";
export { quizGradingResultResponseSchema as quizGradingResultSchema } from "./dto";
export { answerKeyResponseSchema as answerKeySchema } from "./dto";