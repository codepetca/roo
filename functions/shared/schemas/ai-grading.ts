import { z } from "zod";
import { rubricSchema } from "./rubric";
import { quizQuestionSchema } from "./quiz-data";

/**
 * AI Grading Context Schema
 * Everything needed to send assignment and submission data to AI for grading
 * 
 * Location: shared/schemas/ai-grading.ts
 */

// Assignment context for AI grading
export const aiAssignmentContextSchema = z.object({
  // Basic assignment info
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['assignment', 'quiz', 'form']),
  maxScore: z.number(),
  
  // Instructions and materials
  instructions: z.string().optional(),
  materials: z.array(z.object({
    title: z.string(),
    type: z.string(),
    url: z.string().url().optional(),
    content: z.string().optional() // Extracted content if applicable
  })).optional(),
  
  // Subject/topic classification
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  topics: z.array(z.string()).optional()
});

// Grading criteria for AI
export const aiGradingCriteriaSchema = z.union([
  // Rubric-based grading
  z.object({
    type: z.literal('rubric'),
    rubric: rubricSchema,
    gradingInstructions: z.string().optional()
  }),
  
  // Quiz with answer keys
  z.object({
    type: z.literal('quiz'),
    questions: z.array(quizQuestionSchema),
    gradingInstructions: z.string().optional()
  }),
  
  // Point-based grading
  z.object({
    type: z.literal('points'),
    maxPoints: z.number(),
    gradingInstructions: z.string(),
    keyPoints: z.array(z.string()).optional()
  }),
  
  // Completion-based grading
  z.object({
    type: z.literal('completion'),
    requirements: z.array(z.string()),
    gradingInstructions: z.string().optional()
  })
]);

// Student submission content for AI
export const aiSubmissionContentSchema = z.object({
  // Student identification
  studentId: z.string(),
  studentName: z.string(),
  
  // Content classification
  contentType: z.enum(['text', 'document', 'spreadsheet', 'presentation', 'quiz_response', 'mixed']),
  
  // Primary content
  text: z.string().optional(),
  
  // Structured content (for spreadsheets, quiz responses)
  structuredData: z.record(z.unknown()).optional(),
  
  // Multiple text sections (for presentations, complex documents)
  sections: z.array(z.object({
    title: z.string().optional(),
    content: z.string(),
    type: z.enum(['heading', 'paragraph', 'list', 'code', 'table', 'image_caption']).optional()
  })).optional(),
  
  // Images (base64 encoded or URLs)
  images: z.array(z.object({
    data: z.string(), // Base64 or URL
    caption: z.string().optional(),
    filename: z.string().optional()
  })).optional(),
  
  // Quiz-specific responses
  quizAnswers: z.array(z.object({
    questionId: z.string(),
    questionText: z.string(),
    answer: z.union([z.string(), z.array(z.string()), z.number()]),
    isAutoGraded: z.boolean(),
    autoScore: z.number().optional()
  })).optional(),
  
  // Metadata
  wordCount: z.number().optional(),
  attachmentCount: z.number().optional(),
  submittedAt: z.string().datetime(),
  
  // Processing metadata
  extractedAt: z.string().datetime().optional(),
  extractionMethod: z.string().optional(),
  extractionQuality: z.enum(['high', 'medium', 'low']).optional()
});

// Complete AI grading context
export const aiGradingContextSchema = z.object({
  // Unique identifier for this grading request
  requestId: z.string(),
  
  // Assignment context
  assignment: aiAssignmentContextSchema,
  
  // Grading criteria
  criteria: aiGradingCriteriaSchema,
  
  // Student submission
  submission: aiSubmissionContentSchema,
  
  // Grading parameters
  gradingOptions: z.object({
    // Grading strictness
    strictness: z.enum(['lenient', 'moderate', 'strict']).default('moderate'),
    
    // Focus areas
    focusAreas: z.array(z.enum([
      'accuracy', 'completeness', 'clarity', 'creativity', 
      'critical_thinking', 'organization', 'grammar', 'citations'
    ])).optional(),
    
    // Feedback preferences
    feedbackStyle: z.enum(['brief', 'detailed', 'constructive']).default('constructive'),
    includePositives: z.boolean().default(true),
    includeSuggestions: z.boolean().default(true),
    
    // AI model preferences
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().optional()
  }).optional(),
  
  // Context metadata
  metadata: z.object({
    classroomId: z.string(),
    teacherId: z.string(),
    gradingTimestamp: z.string().datetime(),
    timezone: z.string().optional(),
    
    // Batch grading info
    batchId: z.string().optional(),
    batchSize: z.number().optional(),
    itemIndex: z.number().optional()
  }).optional()
});

// AI grading response schema
export const aiGradingResponseSchema = z.object({
  // Request identification
  requestId: z.string(),
  
  // Grading results
  grade: z.object({
    score: z.number().min(0),
    maxScore: z.number().min(0),
    percentage: z.number().min(0).max(100),
    
    // Detailed breakdown (for rubric grading)
    criterionScores: z.array(z.object({
      criterion: z.string(),
      score: z.number(),
      maxScore: z.number(),
      feedback: z.string().optional()
    })).optional(),
    
    // Quiz question breakdown
    questionScores: z.array(z.object({
      questionId: z.string(),
      score: z.number(),
      maxScore: z.number(),
      isCorrect: z.boolean().optional(),
      feedback: z.string().optional()
    })).optional()
  }),
  
  // Feedback
  feedback: z.object({
    // Overall feedback
    summary: z.string(),
    
    // Specific strengths and areas for improvement
    strengths: z.array(z.string()).optional(),
    improvements: z.array(z.string()).optional(),
    
    // Detailed feedback by section/criterion
    detailed: z.array(z.object({
      section: z.string(),
      feedback: z.string(),
      score: z.number().optional()
    })).optional(),
    
    // Suggestions for improvement
    suggestions: z.array(z.string()).optional()
  }),
  
  // AI processing metadata
  metadata: z.object({
    model: z.string(),
    confidence: z.number().min(0).max(1),
    processingTime: z.number(), // milliseconds
    tokenUsage: z.object({
      input: z.number(),
      output: z.number(),
      total: z.number()
    }).optional(),
    
    // Quality indicators
    needsReview: z.boolean(),
    reviewReason: z.string().optional(),
    
    // Processing timestamp
    gradedAt: z.string().datetime()
  })
});

// Batch grading request
export const aiBatchGradingRequestSchema = z.object({
  batchId: z.string(),
  requests: z.array(aiGradingContextSchema),
  
  // Batch options
  options: z.object({
    parallelProcessing: z.boolean().default(true),
    maxConcurrency: z.number().default(5),
    failureHandling: z.enum(['stop', 'continue', 'retry']).default('continue')
  }).optional(),
  
  metadata: z.object({
    teacherId: z.string(),
    classroomId: z.string(),
    assignmentId: z.string(),
    requestedAt: z.string().datetime()
  })
});

// Type exports for TypeScript
export type AIAssignmentContext = z.infer<typeof aiAssignmentContextSchema>;
export type AIGradingCriteria = z.infer<typeof aiGradingCriteriaSchema>;
export type AISubmissionContent = z.infer<typeof aiSubmissionContentSchema>;
export type AIGradingContext = z.infer<typeof aiGradingContextSchema>;
export type AIGradingResponse = z.infer<typeof aiGradingResponseSchema>;
export type AIBatchGradingRequest = z.infer<typeof aiBatchGradingRequestSchema>;