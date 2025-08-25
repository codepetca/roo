import { z } from "zod";
import { quizResponseSchema } from "./quiz-data";

/**
 * Enhanced Submission Schema
 * Student submissions with detailed attachment information for AI grading
 * 
 * Location: shared/schemas/submission.ts
 */

// Drive file attachment (Google Docs, Sheets, Slides, etc.)
export const driveFileAttachmentSchema = z.object({
  type: z.literal('driveFile'),
  id: z.string(),
  title: z.string(),
  alternateLink: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  
  // Enhanced file information for AI processing
  mimeType: z.string(),
  fileExtension: z.string().optional(),
  size: z.number().optional(), // Bytes
  
  // Content type classification
  contentType: z.enum(['document', 'spreadsheet', 'presentation', 'pdf', 'image', 'other']),
  
  // AI processing readiness
  textExtractable: z.boolean().default(false),
  needsDownload: z.boolean().default(true),
  
  // Access information
  downloadUrl: z.string().url().optional(),
  exportUrl: z.string().url().optional(), // For Google Workspace files
  viewUrl: z.string().url().optional()
});

// Web link attachment
export const linkAttachmentSchema = z.object({
  type: z.literal('link'),
  url: z.string().url(),
  title: z.string(),
  thumbnailUrl: z.string().url().optional(),
  
  // Link classification
  domain: z.string().optional(),
  linkType: z.enum(['webpage', 'video', 'document', 'repository', 'other']).optional(),
  
  // Content accessibility
  accessible: z.boolean().default(true),
  requiresAuth: z.boolean().default(false)
});

// YouTube video attachment
export const youtubeAttachmentSchema = z.object({
  type: z.literal('youtubeVideo'),
  id: z.string(),
  title: z.string(),
  alternateLink: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  
  // Video metadata
  duration: z.string().optional(),
  channelName: z.string().optional(),
  description: z.string().optional()
});

// Google Form response attachment
export const formAttachmentSchema = z.object({
  type: z.literal('form'),
  formUrl: z.string().url(),
  responseUrl: z.string().url().optional(),
  title: z.string(),
  thumbnailUrl: z.string().url().optional(),
  
  // Form response data
  formId: z.string(),
  responseId: z.string().optional(),
  
  // Processing status
  responseProcessed: z.boolean().default(false),
  structuredData: z.record(z.unknown()).optional() // Flexible for form data
});

// Union type for all attachment types
export const submissionAttachmentSchema = z.union([
  driveFileAttachmentSchema,
  linkAttachmentSchema,
  youtubeAttachmentSchema,
  formAttachmentSchema
]);

// Grade information
export const gradeSchema = z.object({
  score: z.number().min(0),
  maxScore: z.number().min(0),
  percentage: z.number().min(0).max(100).optional(),
  
  // Feedback and comments
  feedback: z.string().optional(),
  privateComments: z.string().optional(),
  
  // Grading metadata
  gradedAt: z.string().datetime(),
  gradedBy: z.enum(['ai', 'manual', 'system']),
  gradingMethod: z.enum(['rubric', 'points', 'completion']).optional(),
  
  // Rubric grading (if applicable)
  rubricScore: z.object({
    criterionScores: z.array(z.object({
      criterionTitle: z.string(),
      points: z.number(),
      feedback: z.string().optional()
    })),
    totalRubricScore: z.number()
  }).optional(),
  
  // AI grading metadata
  aiGradingInfo: z.object({
    model: z.string(),
    confidence: z.number().min(0).max(1),
    processingTime: z.number(), // milliseconds
    tokenUsage: z.number().optional()
  }).optional(),
  
  // Review status
  needsReview: z.boolean().default(false),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().datetime().optional()
});

// Main submission schema
export const enhancedSubmissionSchema = z.object({
  // Basic identification
  id: z.string(),
  assignmentId: z.string(),
  
  // Student information
  studentId: z.string(),
  studentEmail: z.string().email(),
  studentName: z.string(),
  
  // Submission content
  studentWork: z.string().optional(), // Student work content from Google Classroom
  attachments: z.array(submissionAttachmentSchema).default([]),
  
  // For quiz submissions
  quizResponse: quizResponseSchema.optional(),
  
  // Status and timing
  status: z.enum(['pending', 'submitted', 'grading', 'graded', 'returned', 'error']),
  submittedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
  
  // Grading information
  grade: gradeSchema.optional(),
  
  // Google Classroom specific
  late: z.boolean().default(false),
  draftGrade: z.number().optional(),
  assignedGrade: z.number().optional(),
  
  // AI processing status
  aiProcessingStatus: z.object({
    contentExtracted: z.boolean().default(false),
    readyForGrading: z.boolean().default(false),
    processingErrors: z.array(z.string()).default([]),
    lastProcessedAt: z.string().datetime().optional()
  }).optional(),
  
  // Content extraction cache (for AI grading)
  extractedContent: z.object({
    text: z.string().optional(),
    structuredData: z.record(z.unknown()).optional(),
    images: z.array(z.string()).optional(), // Base64 or URLs
    metadata: z.record(z.unknown()).optional()
  }).optional()
});

// Submission with full context (for AI grading)
export const submissionWithContextSchema = enhancedSubmissionSchema.extend({
  // Assignment context
  assignmentTitle: z.string(),
  assignmentDescription: z.string(),
  maxScore: z.number(),
  
  // Grading context
  rubric: z.object({
    criteria: z.array(z.object({
      title: z.string(),
      description: z.string(),
      maxPoints: z.number()
    }))
  }).optional(),
  
  // Quiz context (if applicable)
  quizQuestions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    correctAnswer: z.string().optional(),
    sampleSolution: z.string().optional(),
    points: z.number()
  })).optional()
});

// Type exports for TypeScript
export type DriveFileAttachment = z.infer<typeof driveFileAttachmentSchema>;
export type LinkAttachment = z.infer<typeof linkAttachmentSchema>;
export type YoutubeAttachment = z.infer<typeof youtubeAttachmentSchema>;
export type FormAttachment = z.infer<typeof formAttachmentSchema>;
export type SubmissionAttachment = z.infer<typeof submissionAttachmentSchema>;
export type Grade = z.infer<typeof gradeSchema>;
export type EnhancedSubmission = z.infer<typeof enhancedSubmissionSchema>;
export type SubmissionWithContext = z.infer<typeof submissionWithContextSchema>;