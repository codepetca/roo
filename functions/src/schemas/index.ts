import { z } from "zod";

// Base schemas for common fields
const timestampSchema = z.object({
  _seconds: z.number(),
  _nanoseconds: z.number()
});

// Enums
export const submissionStatusEnum = z.enum(["pending", "grading", "graded", "error"]);
export const gradedByEnum = z.enum(["ai", "manual"]);
export const gradingStrictnessEnum = z.enum(["strict", "standard", "generous"]);

// Assignment schemas
export const createAssignmentSchema = z.object({
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

export const assignmentSchema = createAssignmentSchema.extend({
  id: z.string(),
  classroomId: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  dueDate: timestampSchema
});

// Submission schemas
export const submissionStatusSchema = submissionStatusEnum;

export const createSubmissionSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  studentEmail: z.string().email(),
  studentName: z.string().min(1),
  documentUrl: z.string().url(),
  content: z.string().optional()
});

export const submissionSchema = createSubmissionSchema.extend({
  id: z.string(),
  submittedAt: timestampSchema,
  status: submissionStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

// Grade schemas
export const gradeDetailSchema = z.object({
  name: z.string(),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  feedback: z.string()
});

export const createGradeSchema = z.object({
  submissionId: z.string().min(1),
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  feedback: z.string(),
  gradingDetails: z.object({
    criteria: z.array(gradeDetailSchema)
  })
});

export const gradeSchema = createGradeSchema.extend({
  id: z.string(),
  gradedBy: gradedByEnum,
  gradedAt: timestampSchema,
  postedToClassroom: z.boolean().default(false),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

// Grading request schemas
export const gradeQuizTestSchema = z.object({
  submissionId: z.string().min(1),
  formId: z.string().min(1),
  studentAnswers: z.record(z.string(), z.string()) // questionNumber -> answer
});

export const gradeQuizSchema = z.object({
  submissionId: z.string().min(1),
  formId: z.string().min(1),
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentAnswers: z.record(z.string(), z.string()) // questionNumber -> answer
});

export const gradeCodeSchema = z.object({
  submissionId: z.string().min(1),
  submissionText: z.string().min(1),
  assignmentId: z.string().min(1),
  assignmentTitle: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  assignmentDescription: z.string().optional().default(""),
  maxPoints: z.number().min(1).default(100),
  isCodeAssignment: z.boolean().default(false),
  gradingStrictness: gradingStrictnessEnum.default("generous")
});

// Submission management schemas
export const createSubmissionRequestSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentEmail: z.string().email(),
  submissionText: z.string().min(1),
  submittedAt: z.string().datetime().optional(),
  status: submissionStatusEnum.default("pending")
});

export const updateSubmissionStatusSchema = z.object({
  status: submissionStatusEnum,
  gradeId: z.string().optional()
});

// Sheets-related schemas
export const getSheetsSubmissionsSchema = z.object({
  assignmentId: z.string().min(1)
});

export const getAnswerKeySchema = z.object({
  formId: z.string().min(1)
});

// API request schemas
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

export const testGradingSchema = z.object({
  text: z.string().min(1, "Text to grade is required"),
  criteria: z.array(z.string()).default(["Content", "Grammar", "Structure"]),
  maxPoints: z.number().min(1).max(1000).default(100),
  promptTemplate: z.string().optional()
});

// Google Classroom schemas
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

// Type exports (inferred from schemas)
export type CreateAssignment = z.infer<typeof createAssignmentSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type CreateSubmission = z.infer<typeof createSubmissionSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type CreateGrade = z.infer<typeof createGradeSchema>;
export type Grade = z.infer<typeof gradeSchema>;
export type TestWrite = z.infer<typeof testWriteSchema>;
export type GradeSubmissionRequest = z.infer<typeof gradeSubmissionSchema>;
export type TestGrading = z.infer<typeof testGradingSchema>;
export type ClassroomCourseRequest = z.infer<typeof classroomCourseSchema>;
export type AssignmentFetchRequest = z.infer<typeof assignmentFetchSchema>;
export type PostGradeRequest = z.infer<typeof postGradeSchema>;

// Grading request types
export type GradeQuizTestRequest = z.infer<typeof gradeQuizTestSchema>;
export type GradeQuizRequest = z.infer<typeof gradeQuizSchema>;
export type GradeCodeRequest = z.infer<typeof gradeCodeSchema>;

// Submission management types
export type CreateSubmissionRequest = z.infer<typeof createSubmissionRequestSchema>;
export type UpdateSubmissionStatusRequest = z.infer<typeof updateSubmissionStatusSchema>;

// Sheets-related types
export type GetSheetsSubmissionsRequest = z.infer<typeof getSheetsSubmissionsSchema>;
export type GetAnswerKeyRequest = z.infer<typeof getAnswerKeySchema>;

// Status types
export type SubmissionStatus = z.infer<typeof submissionStatusEnum>;
export type GradedBy = z.infer<typeof gradedByEnum>;
export type GradingStrictness = z.infer<typeof gradingStrictnessEnum>;

// Response schemas for API validation
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional()
});

export const gradingResultSchema = z.object({
  score: z.number(),
  feedback: z.string(),
  criteriaScores: z.array(z.object({
    name: z.string(),
    score: z.number(),
    maxScore: z.number(),
    feedback: z.string()
  })).optional()
});

export const quizGradingResultSchema = z.object({
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

export const answerKeySchema = z.object({
  formId: z.string(),
  totalPoints: z.number(),
  questions: z.array(z.object({
    questionNumber: z.number(),
    correctAnswer: z.string(),
    points: z.number()
  }))
});