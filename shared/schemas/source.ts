import { z } from "zod";

/**
 * Source schemas that match the Google Sheets structure exactly
 * These schemas validate data coming from Google Sheets API
 */

// ============================================
// Sheet1 (Assignments) - 8 columns
// ============================================
export const sheetAssignmentSchema = z.object({
  // Column A: Assignment ID
  id: z.string().min(1),
  
  // Column B: Course ID
  courseId: z.string().min(1),
  
  // Column C: Title
  title: z.string().min(1),
  
  // Column D: Description
  description: z.string().default(""),
  
  // Column E: Due Date
  dueDate: z.string().default(""),
  
  // Column F: Max Points
  maxPoints: z.union([z.string(), z.number()]).transform(val => {
    if (typeof val === 'number') return val;
    const num = parseInt(val);
    return isNaN(num) ? undefined : num;
  }).optional(),
  
  // Column G: Submission Type
  submissionType: z.enum(["forms", "files", "mixed"]).default("mixed"),
  
  // Column H: Created Date
  createdDate: z.string().default("")
});

export type SheetAssignment = z.infer<typeof sheetAssignmentSchema>;

// ============================================
// Submissions Sheet - 17 columns
// ============================================
export const sheetSubmissionSchema = z.object({
  // Column A: Submission ID
  id: z.string().min(1),
  
  // Column B: Assignment Title
  assignmentTitle: z.string().min(1),
  
  // Column C: Course ID
  courseId: z.string().min(1),
  
  // Column D: Student First Name
  studentFirstName: z.string().min(1),
  
  // Column E: Student Last Name
  studentLastName: z.string().min(1),
  
  // Column F: Student Email
  studentEmail: z.string().email(),
  
  // Column G: Submission Text
  submissionText: z.string().default(""),
  
  // Column H: Submission Date
  submissionDate: z.string().default(""),
  
  // Column I: Current Grade
  currentGrade: z.string().optional(),
  
  // Column J: Grading Status
  gradingStatus: z.enum(["pending", "graded", "reviewed"]).default("pending"),
  
  // Column K: Max Points
  maxPoints: z.union([z.string(), z.number()]).transform(val => {
    if (typeof val === 'number') return val;
    const num = parseInt(val);
    return isNaN(num) ? 100 : num;
  }),
  
  // Column L: Source Sheet Name
  sourceSheetName: z.string().default(""),
  
  // Column M: Assignment Description
  assignmentDescription: z.string().default(""),
  
  // Column N: Last Processed
  lastProcessed: z.string().default(""),
  
  // Column O: Source File ID
  sourceFileId: z.string().default(""),
  
  // Column P: Is Quiz
  isQuiz: z.union([z.string(), z.boolean()]).transform(val => {
    if (typeof val === 'boolean') return val;
    return val === "TRUE" || val === "true";
  }),
  
  // Column Q: Form ID
  formId: z.string().default("")
});

export type SheetSubmission = z.infer<typeof sheetSubmissionSchema>;

// ============================================
// Answer Keys Sheet - 10 columns
// ============================================
export const sheetAnswerKeySchema = z.object({
  // Column A: Form ID
  formId: z.string().min(1),
  
  // Column B: Assignment Title
  assignmentTitle: z.string().min(1),
  
  // Column C: Course ID
  courseId: z.string().min(1),
  
  // Column D: Question Number
  questionNumber: z.string().transform(val => {
    const num = parseInt(val);
    return isNaN(num) ? 0 : num;
  }),
  
  // Column E: Question Text
  questionText: z.string().default(""),
  
  // Column F: Question Type
  questionType: z.string().default(""),
  
  // Column G: Points
  points: z.string().transform(val => {
    const num = parseInt(val);
    return isNaN(num) ? 0 : num;
  }),
  
  // Column H: Correct Answer
  correctAnswer: z.string().default(""),
  
  // Column I: Answer Explanation
  answerExplanation: z.string().default(""),
  
  // Column J: Grading Strictness
  gradingStrictness: z.enum(["strict", "standard", "generous"]).default("generous")
});

export type SheetAnswerKey = z.infer<typeof sheetAnswerKeySchema>;

// ============================================
// Array schemas for batch operations
// ============================================
export const sheetAssignmentsArraySchema = z.array(sheetAssignmentSchema);
export const sheetSubmissionsArraySchema = z.array(sheetSubmissionSchema);
export const sheetAnswerKeysArraySchema = z.array(sheetAnswerKeySchema);

// ============================================
// Raw sheet row schemas (for parsing from sheets API)
// ============================================
export const rawAssignmentRowSchema = z.tuple([
  z.string(), // id
  z.string(), // courseId
  z.string(), // title
  z.string(), // description
  z.string(), // dueDate
  z.string(), // maxPoints
  z.string(), // submissionType
  z.string()  // createdDate
]);

export const rawSubmissionRowSchema = z.tuple([
  z.string(), // id
  z.string(), // assignmentTitle
  z.string(), // courseId
  z.string(), // studentFirstName
  z.string(), // studentLastName
  z.string(), // studentEmail
  z.string(), // submissionText
  z.string(), // submissionDate
  z.string(), // currentGrade
  z.string(), // gradingStatus
  z.string(), // maxPoints
  z.string(), // sourceSheetName
  z.string(), // assignmentDescription
  z.string(), // lastProcessed
  z.string(), // sourceFileId
  z.string(), // isQuiz
  z.string()  // formId
]);

export const rawAnswerKeyRowSchema = z.tuple([
  z.string(), // formId
  z.string(), // assignmentTitle
  z.string(), // courseId
  z.string(), // questionNumber
  z.string(), // questionText
  z.string(), // questionType
  z.string(), // points
  z.string(), // correctAnswer
  z.string(), // answerExplanation
  z.string()  // gradingStrictness
]);

// ============================================
// Sheet response schemas
// ============================================
export const sheetsApiResponseSchema = z.object({
  values: z.array(z.array(z.string())).optional()
});