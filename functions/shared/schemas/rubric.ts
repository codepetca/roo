import { z } from "zod";

/**
 * Rubric Schema
 * Grading rubrics with criteria and performance levels
 * 
 * Location: shared/schemas/rubric.ts
 */

// Individual performance level within a criterion
export const rubricLevelSchema = z.object({
  title: z.string(),
  description: z.string(),
  points: z.number().min(0)
});

// Individual grading criterion
export const rubricCriterionSchema = z.object({
  title: z.string(),
  description: z.string(),
  levels: z.array(rubricLevelSchema).min(1), // Must have at least one level
  weight: z.number().min(0).optional() // Optional weighting for criterion
});

// Complete rubric structure
export const rubricSchema = z.object({
  // Rubric metadata
  id: z.string().optional(),
  title: z.string().optional(),
  
  // Grading criteria
  criteria: z.array(rubricCriterionSchema).min(1), // Must have at least one criterion
  
  // Calculated totals
  totalPoints: z.number().min(0),
  
  // Usage settings
  useForGrading: z.boolean().default(true),
  showToStudents: z.boolean().default(true),
  
  // Metadata
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  source: z.enum(['google-classroom', 'roo-api']).optional()
});

// Rubric score for a specific student submission
export const rubricScoreSchema = z.object({
  // Reference to the rubric used
  rubricId: z.string().optional(),
  
  // Score for each criterion
  criterionScores: z.array(z.object({
    criterionTitle: z.string(),
    levelTitle: z.string(),
    points: z.number(),
    feedback: z.string().optional()
  })),
  
  // Overall totals
  totalScore: z.number().min(0),
  maxScore: z.number().min(0),
  percentage: z.number().min(0).max(100),
  
  // Grading metadata
  gradedAt: z.string().datetime().optional(),
  gradedBy: z.enum(['ai', 'manual', 'system']).optional()
});

// Type exports for TypeScript
export type RubricLevel = z.infer<typeof rubricLevelSchema>;
export type RubricCriterion = z.infer<typeof rubricCriterionSchema>;
export type Rubric = z.infer<typeof rubricSchema>;
export type RubricScore = z.infer<typeof rubricScoreSchema>;