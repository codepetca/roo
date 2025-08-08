import { z } from "zod";

/**
 * Assignment Materials Schema
 * Files, links, instructions, and resources attached to assignments
 * 
 * Location: shared/schemas/assignment-materials.ts
 */

// Single material/attachment that can be attached to an assignment
export const materialSchema = z.object({
  // Material type (union field - only one will be present)
  type: z.enum(['driveFile', 'link', 'youtubeVideo', 'form']),
  
  // Common fields
  title: z.string(),
  alternateLink: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  
  // Drive file specific (Google Docs, Sheets, Slides, etc.)
  driveFile: z.object({
    id: z.string(),
    title: z.string(),
    alternateLink: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    mimeType: z.string().optional()
  }).optional(),
  
  // YouTube video specific
  youtubeVideo: z.object({
    id: z.string(),
    title: z.string(),
    alternateLink: z.string().url(),
    thumbnailUrl: z.string().url().optional()
  }).optional(),
  
  // Web link specific
  link: z.object({
    url: z.string().url(),
    title: z.string(),
    thumbnailUrl: z.string().url().optional()
  }).optional(),
  
  // Google Form specific
  form: z.object({
    formUrl: z.string().url(),
    responseUrl: z.string().url().optional(),
    title: z.string(),
    thumbnailUrl: z.string().url().optional()
  }).optional()
});

// Collection of materials for an assignment
export const assignmentMaterialsSchema = z.object({
  // Instructional materials (templates, examples, resources)
  materials: z.array(materialSchema).default([]),
  
  // Additional instructions text (beyond description)
  instructions: z.string().optional(),
  
  // Template files students should use
  templates: z.array(materialSchema).default([]),
  
  // Reference materials for completing assignment
  references: z.array(materialSchema).default([])
});

// Type exports for TypeScript
export type Material = z.infer<typeof materialSchema>;
export type AssignmentMaterials = z.infer<typeof assignmentMaterialsSchema>;