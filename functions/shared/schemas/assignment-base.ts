import { z } from "zod";

/**
 * Base Assignment Schema
 * Core assignment data that applies to ALL assignment types
 * 
 * Location: shared/schemas/assignment-base.ts
 */

// Basic assignment information
export const baseAssignmentSchema = z.object({
  // Identifiers
  id: z.string(),
  title: z.string(),
  description: z.string(),
  
  // Assignment classification
  type: z.enum(['assignment', 'quiz', 'form']),
  maxScore: z.number().min(0),
  
  // Timing information
  dueDate: z.string().datetime().optional(),
  creationTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  
  // Google Classroom specific
  workType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']).optional(),
  alternateLink: z.string().url().optional(),
  
  // Status and state
  status: z.enum(['draft', 'published', 'partial', 'graded', 'closed']).default('published'),
  state: z.enum(['DRAFT', 'PUBLISHED', 'DELETED']).optional(),
  
  // Optional metadata
  points: z.number().optional(),
  gradingPeriodId: z.string().optional(),
  categoryId: z.string().optional(),
  
  // Submission statistics (calculated)
  submissionStats: z.object({
    total: z.number().min(0),
    submitted: z.number().min(0),
    graded: z.number().min(0),
    pending: z.number().min(0)
  }).optional()
});

// Type export for TypeScript
export type BaseAssignment = z.infer<typeof baseAssignmentSchema>;