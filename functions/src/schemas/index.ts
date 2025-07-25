import { z } from "zod";

// Base schemas for common fields
const timestampSchema = z.object({
  _seconds: z.number(),
  _nanoseconds: z.number()
});

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
export const submissionStatusSchema = z.enum(["pending", "grading", "graded", "error"]);

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
  gradedBy: z.enum(["ai", "manual"]),
  gradedAt: timestampSchema,
  postedToClassroom: z.boolean().default(false),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
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