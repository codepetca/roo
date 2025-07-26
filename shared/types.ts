/**
 * Shared type definitions for Roo application
 * These types are now generated from Zod schemas for consistency
 * They represent JSON-serializable versions of Firebase documents
 * 
 * DEPRECATED: This file is being migrated to use Zod-inferred types.
 * New code should import types from the respective schema files instead.
 */

// Re-export types from the schema modules for backward compatibility
export type {
  SerializedTimestamp,
  CreateAssignmentRequest,
  AssignmentResponse as Assignment,
  CreateSubmissionRequest,
  SubmissionResponse as Submission,
  CreateGradeRequest,
  GradeResponse as Grade,
  GradeQuizRequest,
  GradeCodeRequest,
  GradingResultResponse as GradingResult,
  QuizGradingResultResponse as QuizGradingResult,
  GetSheetsSubmissionsRequest,
  GetAnswerKeyRequest,
  AnswerKeyResponse as AnswerKey,
  UpdateSubmissionStatusRequest,
  HealthCheckResponse
} from '../functions/lib/schemas/dto';

// Legacy type aliases for backward compatibility
export type SubmissionStatus = "pending" | "grading" | "graded" | "error";
export type GradedBy = "ai" | "manual";
export type GradingStrictness = "strict" | "standard" | "generous";

// Utility functions
export function serializedTimestampToISO(timestamp: { _seconds: number; _nanoseconds: number }): string {
  return new Date(timestamp._seconds * 1000).toISOString();
}

// Legacy interfaces for backward compatibility - use schema types instead
export interface BaseDocument {
  id: string;
  createdAt: { _seconds: number; _nanoseconds: number };
  updatedAt: { _seconds: number; _nanoseconds: number };
}

export interface Classroom extends BaseDocument {
  name: string;
  courseCode: string;
  teacherId: string;
}

export interface GradeDetail {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

// API Response wrapper - use schema types instead
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Legacy test endpoint types
export interface TestGradingRequest {
  text: string;
  criteria?: string[];
  maxPoints?: number;
  promptTemplate?: string;
}

export interface TestWriteRequest {
  test: string;
  step?: number;
  data?: any;
}