import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logger } from "firebase-functions";

/**
 * Express middleware for validating request bodies using Zod schemas
 * Location: functions/src/middleware/validation.ts:8
 * Usage: Validates API requests before processing
 */
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Request validation failed", {
          path: req.path,
          errors: error.issues
        });
        
        res.status(400).json({
          error: "Validation failed",
          details: error.issues
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Error handler for API routes
 * Location: functions/src/middleware/validation.ts:32
 * Usage: Consistent error response formatting
 */
export function handleRouteError(error: unknown, req: Request, res: Response) {
  logger.error("Route error", { path: req.path, error });
  
  res.status(500).json({
    error: "Internal server error",
    message: error instanceof Error ? error.message : "Unknown error"
  });
}