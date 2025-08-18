import { z } from "zod";
import * as admin from "firebase-admin";

/**
 * Domain schemas for internal business logic
 * These schemas represent the core domain models used throughout the backend
 */

// ============================================
// Firebase Timestamp Schema
// ============================================
export const firebaseTimestampSchema = z.custom<admin.firestore.Timestamp | admin.firestore.FieldValue>(
  (val) => val instanceof admin.firestore.Timestamp || val instanceof admin.firestore.FieldValue,
  {
    message: "Expected Firebase Timestamp or FieldValue"
  }
);

// ============================================
// Base Document Schema
// ============================================
export const baseDocumentSchema = z.object({
  id: z.string().min(1),
  createdAt: firebaseTimestampSchema,
  updatedAt: firebaseTimestampSchema
});

// ============================================
// Assignment Domain Schema
// ============================================
export const assignmentDomainSchema = baseDocumentSchema.extend({
  classroomId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  dueDate: firebaseTimestampSchema.optional(),
  maxPoints: z.number().min(0).max(1000),
  gradingRubric: z.object({
    enabled: z.boolean().default(true),
    criteria: z.array(z.string()).default(["Content", "Grammar", "Structure"]),
    promptTemplate: z.string().optional()
  }),
  isQuiz: z.boolean().default(false),
  formId: z.string().optional(),
  sourceFileId: z.string().optional(),
  submissionType: z.enum(["forms", "files", "mixed"]).default("mixed")
});

export type AssignmentDomain = z.infer<typeof assignmentDomainSchema>;

// ============================================
// Submission Domain Schema
// ============================================
export const submissionStatusSchema = z.enum(["pending", "grading", "graded", "error"]);

export const submissionDomainSchema = baseDocumentSchema.extend({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  studentEmail: z.string().email(),
  studentName: z.string().min(1),
  submittedAt: firebaseTimestampSchema,
  documentUrl: z.string().url().optional(),
  content: z.string().optional(),
  status: submissionStatusSchema,
  
  // Additional metadata from sheets
  sourceSheetName: z.string().optional(),
  sourceFileId: z.string().optional(),
  formId: z.string().optional(),
  
  // Grading reference
  gradeId: z.string().optional()
});

export type SubmissionDomain = z.infer<typeof submissionDomainSchema>;

// ============================================
// Grade Domain Schema
// ============================================
export const gradedBySchema = z.enum(["ai", "manual"]);

export const gradeDetailSchema = z.object({
  name: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  feedback: z.string()
});

export const gradeDomainSchema = baseDocumentSchema.extend({
  submissionId: z.string().min(1),
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  feedback: z.string(),
  gradingDetails: z.object({
    criteria: z.array(gradeDetailSchema)
  }),
  gradedBy: gradedBySchema,
  gradedAt: firebaseTimestampSchema,
  postedToClassroom: z.boolean().default(false),
  
  // Metadata for tracking
  metadata: z.object({
    submissionLength: z.number().optional(),
    criteria: z.array(z.string()).optional(),
    promptLength: z.number().optional(),
    gradingDuration: z.number().optional(),
    formId: z.string().optional(),
    correctAnswers: z.number().optional(),
    totalQuestions: z.number().optional(),
    questionCount: z.number().optional(),
    gradingMode: z.string().optional(),
    isCodeAssignment: z.boolean().optional(),
    questionGrades: z.array(z.object({
      questionNumber: z.number(),
      score: z.number(),
      feedback: z.string(),
      maxScore: z.number()
    })).optional()
  }).optional()
});

export type GradeDomain = z.infer<typeof gradeDomainSchema>;

// ============================================
// Quiz Answer Key Domain Schema
// ============================================
export const quizQuestionDomainSchema = z.object({
  questionNumber: z.number().min(1),
  questionText: z.string(),
  questionType: z.string(),
  points: z.number().min(0),
  correctAnswer: z.string(),
  answerExplanation: z.string().default(""),
  gradingStrictness: z.enum(["strict", "standard", "generous"]).default("generous")
});

export const quizAnswerKeyDomainSchema = z.object({
  formId: z.string().min(1),
  assignmentTitle: z.string().min(1),
  courseId: z.string().min(1),
  questions: z.array(quizQuestionDomainSchema),
  totalPoints: z.number().min(0)
});

export type QuizAnswerKeyDomain = z.infer<typeof quizAnswerKeyDomainSchema>;

// ============================================
// Grading Request Domain Schemas
// ============================================
export const gradingStrictnessSchema = z.enum(["strict", "standard", "generous"]);

export const gradeQuizRequestDomainSchema = z.object({
  submissionId: z.string().min(1),
  formId: z.string().min(1),
  studentAnswers: z.record(z.number(), z.string()),
  answerKey: quizAnswerKeyDomainSchema
});

export const gradeCodeRequestDomainSchema = z.object({
  submissionId: z.string().min(1),
  assignmentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  maxPoints: z.number().min(1).default(100),
  criteria: z.array(z.string()).default(["Content", "Grammar", "Structure"]),
  submission: z.string().min(1),
  promptTemplate: z.string().optional(),
  isCodeAssignment: z.boolean().default(false),
  gradingStrictness: gradingStrictnessSchema.default("generous")
});

// ============================================
// Grading Result Domain Schemas
// ============================================
export const gradingResultDomainSchema = z.object({
  score: z.number().min(0),
  feedback: z.string(),
  criteriaScores: z.array(gradeDetailSchema).optional()
});

export const quizGradingResultDomainSchema = z.object({
  totalScore: z.number().min(0),
  totalPossible: z.number().min(0),
  questionGrades: z.array(z.object({
    questionNumber: z.number(),
    isCorrect: z.boolean(),
    studentAnswer: z.string(),
    correctAnswer: z.string(),
    points: z.number().min(0)
  }))
});

// ============================================
// Classroom Domain Schema
// ============================================
export const classroomDomainSchema = baseDocumentSchema.extend({
  name: z.string().min(1),
  courseCode: z.string().min(1),
  teacherId: z.string().min(1),
  studentIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true)
});

export type ClassroomDomain = z.infer<typeof classroomDomainSchema>;

// ============================================
// User Domain Schema
// ============================================
export const userRoleSchema = z.enum(["teacher", "student", "admin"]);

export const userDomainSchema = baseDocumentSchema.extend({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: userRoleSchema,
  schoolEmail: z.string().email().optional(), // School/board email for teachers
  classroomIds: z.array(z.string()).default([]),
  totalClassrooms: z.number().int().min(0).default(0), // Cached count for teachers
  totalStudents: z.number().int().min(0).default(0), // Cached count for teachers
  isActive: z.boolean().default(true),
  lastLogin: firebaseTimestampSchema.optional(),
  // Email integration now handled by Brevo service
  // Gmail fields removed - no longer needed
});

export type UserDomain = z.infer<typeof userDomainSchema>;