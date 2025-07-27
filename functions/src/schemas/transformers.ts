import * as admin from "firebase-admin";
import { getCurrentTimestamp } from "../config/firebase";
import type {
  SheetAssignment,
  SheetSubmission,
  SheetAnswerKey
} from "./source";
import type {
  AssignmentDomain,
  SubmissionDomain,
  QuizAnswerKeyDomain,
  GradeDomain,
  ClassroomDomain
} from "./domain";
import type {
  AssignmentResponse,
  SubmissionResponse,
  GradeResponse,
  SerializedTimestamp,
  ClassroomResponse
} from "./dto";

/**
 * Transformer utilities for converting between different schema representations
 */

// ============================================
// Timestamp Transformers
// ============================================

/**
 * Convert Firebase Timestamp to serialized format for API responses
 */
export function serializeTimestamp(timestamp: admin.firestore.Timestamp): SerializedTimestamp {
  return {
    _seconds: timestamp.seconds,
    _nanoseconds: timestamp.nanoseconds
  };
}

/**
 * Convert serialized timestamp to Firebase Timestamp
 */
export function deserializeTimestamp(serialized: SerializedTimestamp): admin.firestore.Timestamp {
  return new admin.firestore.Timestamp(serialized._seconds, serialized._nanoseconds);
}

/**
 * Parse date string to Firebase Timestamp
 */
export function parseDateToTimestamp(dateString: string): admin.firestore.Timestamp | undefined {
  if (!dateString) return undefined;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;
    return admin.firestore.Timestamp.fromDate(date);
  } catch {
    return undefined;
  }
}

// ============================================
// Source to Domain Transformers
// ============================================

/**
 * Transform SheetAssignment to AssignmentDomain
 */
export function sheetAssignmentToDomain(
  sheet: SheetAssignment,
  classroomId: string
): Omit<AssignmentDomain, "createdAt" | "updatedAt"> {
  return {
    id: sheet.id,
    classroomId,
    title: sheet.title,
    description: sheet.description,
    dueDate: parseDateToTimestamp(sheet.dueDate),
    maxPoints: parseInt(sheet.maxPoints?.toString() || "100"),
    gradingRubric: {
      enabled: true,
      criteria: ["Content", "Grammar", "Structure"],
      promptTemplate: undefined
    },
    isQuiz: false, // Will be determined by checking if formId exists
    formId: undefined,
    sourceFileId: undefined,
    submissionType: sheet.submissionType
  };
}

/**
 * Transform SheetSubmission to SubmissionDomain
 */
export function sheetSubmissionToDomain(
  sheet: SheetSubmission
): Omit<SubmissionDomain, "id" | "createdAt" | "updatedAt"> {
  const studentName = `${sheet.studentFirstName} ${sheet.studentLastName}`.trim();
  
  return {
    assignmentId: sheet.id, // Using submission ID as assignment reference
    studentId: sheet.studentEmail, // Using email as student ID for now
    studentEmail: sheet.studentEmail,
    studentName: studentName || sheet.studentEmail,
    submittedAt: parseDateToTimestamp(sheet.submissionDate) || getCurrentTimestamp() as admin.firestore.Timestamp,
    documentUrl: undefined,
    content: sheet.submissionText,
    status: sheet.gradingStatus === "graded" ? "graded" : "pending",
    sourceSheetName: sheet.sourceSheetName,
    sourceFileId: sheet.sourceFileId,
    formId: sheet.formId,
    gradeId: undefined
  };
}

/**
 * Transform array of SheetAnswerKey rows to QuizAnswerKeyDomain
 */
export function sheetAnswerKeysToDomain(
  sheets: SheetAnswerKey[]
): QuizAnswerKeyDomain | null {
  if (sheets.length === 0) return null;
  
  const firstRow = sheets[0];
  const questions = sheets.map(sheet => ({
    questionNumber: sheet.questionNumber,
    questionText: sheet.questionText,
    questionType: sheet.questionType,
    points: sheet.points,
    correctAnswer: sheet.correctAnswer,
    answerExplanation: sheet.answerExplanation,
    gradingStrictness: sheet.gradingStrictness
  }));
  
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  
  return {
    formId: firstRow.formId,
    assignmentTitle: firstRow.assignmentTitle,
    courseId: firstRow.courseId,
    questions,
    totalPoints
  };
}

// ============================================
// Domain to DTO Transformers
// ============================================

/**
 * Transform AssignmentDomain to AssignmentResponse DTO
 */
export function assignmentDomainToDto(domain: AssignmentDomain): AssignmentResponse {
  return {
    id: domain.id,
    createdAt: serializeTimestamp(domain.createdAt),
    updatedAt: serializeTimestamp(domain.updatedAt),
    classroomId: domain.classroomId,
    title: domain.title,
    description: domain.description,
    dueDate: domain.dueDate ? serializeTimestamp(domain.dueDate) : undefined,
    maxPoints: domain.maxPoints,
    gradingRubric: domain.gradingRubric,
    isQuiz: domain.isQuiz,
    formId: domain.formId,
    sourceFileId: domain.sourceFileId
  };
}

/**
 * Transform SubmissionDomain to SubmissionResponse DTO
 */
export function submissionDomainToDto(domain: SubmissionDomain): SubmissionResponse {
  return {
    id: domain.id,
    createdAt: serializeTimestamp(domain.createdAt),
    updatedAt: serializeTimestamp(domain.updatedAt),
    assignmentId: domain.assignmentId,
    studentId: domain.studentId,
    studentEmail: domain.studentEmail,
    studentName: domain.studentName,
    submittedAt: serializeTimestamp(domain.submittedAt),
    documentUrl: domain.documentUrl,
    content: domain.content,
    status: domain.status
  };
}

/**
 * Transform GradeDomain to GradeResponse DTO
 */
export function gradeDomainToDto(domain: GradeDomain): GradeResponse {
  return {
    id: domain.id,
    createdAt: serializeTimestamp(domain.createdAt),
    updatedAt: serializeTimestamp(domain.updatedAt),
    submissionId: domain.submissionId,
    assignmentId: domain.assignmentId,
    studentId: domain.studentId,
    score: domain.score,
    maxScore: domain.maxScore,
    feedback: domain.feedback,
    gradingDetails: domain.gradingDetails,
    gradedBy: domain.gradedBy,
    gradedAt: serializeTimestamp(domain.gradedAt),
    postedToClassroom: domain.postedToClassroom
  };
}

/**
 * Transform ClassroomDomain to ClassroomResponse DTO
 */
export function classroomDomainToDto(domain: ClassroomDomain): ClassroomResponse {
  return {
    id: domain.id,
    createdAt: serializeTimestamp(domain.createdAt),
    updatedAt: serializeTimestamp(domain.updatedAt),
    name: domain.name,
    courseCode: domain.courseCode,
    teacherId: domain.teacherId,
    studentIds: domain.studentIds || []
  };
}

// ============================================
// Batch Transformers
// ============================================

/**
 * Transform array of AssignmentDomain to AssignmentResponse DTOs
 */
export function assignmentsDomainToDto(domains: AssignmentDomain[]): AssignmentResponse[] {
  return domains.map(assignmentDomainToDto);
}

/**
 * Transform array of SubmissionDomain to SubmissionResponse DTOs
 */
export function submissionsDomainToDto(domains: SubmissionDomain[]): SubmissionResponse[] {
  return domains.map(submissionDomainToDto);
}

/**
 * Transform array of GradeDomain to GradeResponse DTOs
 */
export function gradesDomainToDto(domains: GradeDomain[]): GradeResponse[] {
  return domains.map(gradeDomainToDto);
}

// ============================================
// Sheet Row Parsers
// ============================================

/**
 * Parse raw sheet rows into objects that match schema input expectations
 * These will be validated and transformed by the schemas
 */
export function parseAssignmentRow(row: string[]): Partial<SheetAssignment> {
  return {
    id: row[0] || "",
    courseId: row[1] || "",
    title: row[2] || "",
    description: row[3] || "",
    dueDate: row[4] || "",
    maxPoints: parseInt(row[5] || "100"),
    submissionType: (row[6] as "forms" | "files" | "mixed") || "mixed",
    createdDate: row[7] || ""
  };
}

export function parseSubmissionRow(row: string[]): Partial<SheetSubmission> {
  return {
    id: row[0] || "",
    assignmentTitle: row[1] || "",
    courseId: row[2] || "",
    studentFirstName: row[3] || "",
    studentLastName: row[4] || "",
    studentEmail: row[5] || "",
    submissionText: row[6] || "",
    submissionDate: row[7] || "",
    currentGrade: row[8] || undefined,
    gradingStatus: (row[9] as "pending" | "graded" | "reviewed") || "pending",
    maxPoints: parseInt(row[10] || "100"),
    sourceSheetName: row[11] || "",
    assignmentDescription: row[12] || "",
    lastProcessed: row[13] || "",
    sourceFileId: row[14] || "",
    isQuiz: row[15] === "true",
    formId: row[16] || ""
  };
}

export function parseAnswerKeyRow(row: string[]): Partial<SheetAnswerKey> {
  return {
    formId: row[0] || "",
    assignmentTitle: row[1] || "",
    courseId: row[2] || "",
    questionNumber: parseInt(row[3] || "0"),
    questionText: row[4] || "",
    questionType: row[5] || "",
    points: parseInt(row[6] || "0"),
    correctAnswer: row[7] || "",
    answerExplanation: row[8] || "",
    gradingStrictness: (row[9] as "strict" | "standard" | "generous") || "generous"
  };
}