/**
 * Shared type definitions for Roo application
 * These types are used by both frontend and backend
 * They represent JSON-serializable versions of Firebase documents
 */

// Timestamp representation for API communication
export interface SerializedTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

// Convert to ISO string for frontend display
export function serializedTimestampToISO(timestamp: SerializedTimestamp): string {
  return new Date(timestamp._seconds * 1000).toISOString();
}

// Base document fields
export interface BaseDocument {
  id: string;
  createdAt: SerializedTimestamp;
  updatedAt: SerializedTimestamp;
}

// Classroom type
export interface Classroom extends BaseDocument {
  name: string;
  courseCode: string;
  teacherId: string;
}

// Assignment types
export interface Assignment extends BaseDocument {
  classroomId: string;
  title: string;
  description: string;
  dueDate: SerializedTimestamp;
  maxPoints: number;
  gradingRubric: {
    enabled: boolean;
    criteria: string[];
    promptTemplate?: string;
  };
  isQuiz: boolean;
  formId?: string;
  sourceFileId?: string;
}

export interface CreateAssignmentRequest {
  title: string;
  description: string;
  maxPoints: number;
  dueDate?: string; // ISO datetime string
  gradingRubric?: {
    enabled: boolean;
    criteria: string[];
    promptTemplate?: string;
  };
}

// Submission types
export type SubmissionStatus = "pending" | "grading" | "graded" | "error";

export interface Submission extends BaseDocument {
  assignmentId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  submittedAt: SerializedTimestamp;
  documentUrl: string;
  status: SubmissionStatus;
  content?: string;
}

export interface CreateSubmissionRequest {
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submissionText: string;
  submittedAt?: string; // ISO datetime string
  status?: SubmissionStatus;
}

export interface UpdateSubmissionStatusRequest {
  status: SubmissionStatus;
  gradeId?: string;
}

// Grade types
export type GradedBy = "ai" | "manual";

export interface GradeDetail {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface Grade extends BaseDocument {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  score: number;
  maxScore: number;
  feedback: string;
  gradingDetails: {
    criteria: GradeDetail[];
  };
  gradedBy: GradedBy;
  gradedAt: SerializedTimestamp;
  postedToClassroom: boolean;
}

export interface CreateGradeRequest {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  score: number;
  maxScore: number;
  feedback: string;
  gradingDetails: {
    criteria: GradeDetail[];
  };
}

// Grading request types
export type GradingStrictness = "strict" | "standard" | "generous";

export interface GradeQuizTestRequest {
  submissionId: string;
  formId: string;
  studentAnswers: Record<string, string>; // questionNumber -> answer
}

export interface GradeQuizRequest {
  submissionId: string;
  formId: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentAnswers: Record<string, string>; // questionNumber -> answer
}

export interface GradeCodeRequest {
  submissionId: string;
  submissionText: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  assignmentDescription?: string;
  maxPoints?: number;
  isCodeAssignment?: boolean;
  gradingStrictness?: GradingStrictness;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GradingResult {
  score: number;
  feedback: string;
  criteriaScores?: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
}

export interface QuizGradingResult {
  totalScore: number;
  totalPossible: number;
  questionGrades: Array<{
    questionNumber: number;
    isCorrect: boolean;
    studentAnswer: string;
    correctAnswer: string;
    points: number;
  }>;
}

// Sheet-related types
export interface GetSheetsSubmissionsRequest {
  assignmentId: string;
}

export interface GetAnswerKeyRequest {
  formId: string;
}

export interface AnswerKey {
  formId: string;
  totalPoints: number;
  questions: Array<{
    questionNumber: number;
    correctAnswer: string;
    points: number;
  }>;
}

// Test endpoints
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