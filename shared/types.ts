/**
 * Shared type definitions for Roo application
 * These types are now generated from Zod schemas for consistency
 * They represent JSON-serializable versions of Firebase documents
 *
 * DEPRECATED: This file is being migrated to use Zod-inferred types.
 * New code should import types from the respective schema files instead.
 */

// Re-export types from the schema modules for backward compatibility
// Import from local schemas to avoid build order issues
import type {
  SerializedTimestamp,
  CreateAssignmentRequest,
  AssignmentResponse,
  CreateSubmissionRequest,
  SubmissionResponse,
  CreateGradeRequest,
  GradeResponse,
  GradeQuizRequest,
  GradeCodeRequest,
  GradingResultResponse,
  QuizGradingResultResponse,
  GetSheetsSubmissionsRequest,
  GetAnswerKeyRequest,
  AnswerKeyResponse,
  UpdateSubmissionStatusRequest,
  HealthCheckResponse
} from './schemas/dto';

// Re-export all imported types
export type {
  SerializedTimestamp,
  CreateAssignmentRequest,
  AssignmentResponse,
  CreateSubmissionRequest,
  SubmissionResponse,
  CreateGradeRequest,
  GradeResponse,
  GradeQuizRequest,
  GradeCodeRequest,
  GradingResultResponse,
  QuizGradingResultResponse,
  GetSheetsSubmissionsRequest,
  GetAnswerKeyRequest,
  AnswerKeyResponse,
  UpdateSubmissionStatusRequest,
  HealthCheckResponse
};

// Frontend-friendly aliases
export type Assignment = AssignmentResponse;
export type Submission = SubmissionResponse;
export type Grade = GradeResponse;
export type GradingResult = GradingResultResponse;
export type QuizGradingResult = QuizGradingResultResponse;
export type AnswerKey = AnswerKeyResponse;

// SerializedTimestamp is now imported from schemas/dto

// Legacy type aliases for backward compatibility
export type SubmissionStatus = "pending" | "grading" | "graded" | "error";
export type GradedBy = "ai" | "manual";
export type GradingStrictness = "strict" | "standard" | "generous";

// Utility functions
export function serializedTimestampToISO(timestamp: {
  _seconds: number;
  _nanoseconds: number;
}): string {
  return new Date(timestamp._seconds * 1000).toISOString();
}

// Teacher configuration types
export interface TeacherConfiguration {
  teacherId: string;
  email: string;
  spreadsheetId: string;
  method: "oauth" | "service-account";
  createdAt: SerializedTimestamp;
  lastVerified?: SerializedTimestamp;
}

export interface SheetVerificationResult {
  exists: boolean;
  accessible: boolean;
  error?: string;
  verifiedAt: SerializedTimestamp;
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
