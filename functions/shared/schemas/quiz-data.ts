import { z } from "zod";

/**
 * Quiz Data Schema
 * Google Forms quiz structure with questions, answer keys, and sample solutions
 * 
 * MATCHING MECHANISM:
 * - quizData.questions[].id matches structuredData[questionId].questionId
 * - quizData = form structure with correct answers (from QuizExtractor)
 * - structuredData = student responses keyed by questionId (from ContentExtractor)
 * 
 * Location: shared/schemas/quiz-data.ts
 */

// Individual quiz question
export const quizQuestionSchema = z.object({
  // Question identification (matches structuredData key for student responses)
  id: z.string(), // From Google Forms item.getId() - critical for matching student responses
  title: z.string(),
  description: z.string().optional(),
  
  // Question type from Google Forms
  type: z.enum([
    'RADIO',           // Single choice (multiple choice)
    'CHECKBOX',        // Multiple choice (checkboxes)
    'DROPDOWN',        // Dropdown selection
    'SHORT_ANSWER',    // Short text answer
    'PARAGRAPH',       // Long text answer
    'LINEAR_SCALE',    // Rating scale
    'MULTIPLE_CHOICE_GRID', // Grid of choices
    'CHECKBOX_GRID',   // Grid of checkboxes
    'UNKNOWN'          // Unknown/unrecognized question type
  ]),
  
  // Grading information
  points: z.number().min(0),
  required: z.boolean().default(false),
  
  // Answer options (for choice-based questions)
  options: z.array(z.string()).optional(),
  
  // Correct answers (for auto-gradable questions)
  correctAnswers: z.array(z.string()).optional(),
  
  // Sample solution (from generalFeedback for manual grading)
  sampleSolution: z.string().optional(),
  
  // Feedback for students
  feedback: z.object({
    correct: z.string().optional(),     // whenRight feedback
    incorrect: z.string().optional(),   // whenWrong feedback
    general: z.string().optional()      // generalFeedback (contains sample solution)
  }).optional(),
  
  // Grading characteristics
  autoGradable: z.boolean(),
  caseSensitive: z.boolean().default(false),
  
  // Question ordering
  index: z.number().min(0).optional()
});

// Student's answer to a quiz question
export const quizAnswerSchema = z.object({
  questionId: z.string(),
  questionTitle: z.string(),
  
  // Student's response
  answer: z.union([
    z.string(),                    // Text answer
    z.array(z.string()),          // Multiple selections
    z.number()                    // Scale/numeric answer
  ]).optional(),
  
  // Grading results
  isCorrect: z.boolean().optional(),
  pointsEarned: z.number().min(0).optional(),
  maxPoints: z.number().min(0),
  
  // Auto vs manual grading
  autoGraded: z.boolean(),
  feedback: z.string().optional(),
  
  // Metadata
  answeredAt: z.string().datetime().optional()
});

// Complete quiz structure
export const quizDataSchema = z.object({
  // Form identification
  formId: z.string(),
  formUrl: z.string().url(),
  
  // Quiz metadata
  title: z.string(),
  description: z.string().optional(),
  
  // Settings
  isQuiz: z.boolean().default(true),
  collectEmailAddresses: z.boolean().default(true),
  allowResponseEditing: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  
  // Questions and structure
  questions: z.array(quizQuestionSchema),
  totalQuestions: z.number().min(0),
  totalPoints: z.number().min(0),
  
  // Auto-grading capabilities
  autoGradableQuestions: z.number().min(0),
  manualGradingRequired: z.boolean(),
  
  // Timing
  timeLimit: z.number().optional(), // Minutes
  
  // Access control
  requireSignIn: z.boolean().default(true),
  restrictToDomain: z.string().optional(),
  
  // Creation metadata
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

// Student's complete quiz response
export const quizResponseSchema = z.object({
  // Response identification
  responseId: z.string(),
  formId: z.string(),
  
  // Student information
  studentId: z.string(),
  studentEmail: z.string().email(),
  studentName: z.string().optional(),
  
  // Response data
  answers: z.array(quizAnswerSchema),
  
  // Grading summary
  totalScore: z.number().min(0).optional(),
  maxScore: z.number().min(0),
  percentage: z.number().min(0).max(100).optional(),
  
  // Status
  isComplete: z.boolean(),
  isGraded: z.boolean(),
  needsManualGrading: z.boolean(),
  
  // Timing
  submittedAt: z.string().datetime(),
  gradedAt: z.string().datetime().optional(),
  timeSpent: z.number().optional(), // Minutes
  
  // Processing status
  autoGradingComplete: z.boolean().default(false),
  manualGradingComplete: z.boolean().default(false)
});

// Type exports for TypeScript
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type QuizData = z.infer<typeof quizDataSchema>;
export type QuizResponse = z.infer<typeof quizResponseSchema>;