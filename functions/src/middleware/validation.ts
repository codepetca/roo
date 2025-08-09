import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logger } from "firebase-functions";

// Extended request type with params
export interface RequestWithParams extends Request {
  params: { [key: string]: string };
}

/**
 * Validation options for request validation
 */
interface ValidationOptions {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}

/**
 * Express middleware for validating request bodies using Zod schemas
 * Location: functions/src/middleware/validation.ts:17
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
 * Enhanced validation middleware that can validate body, params, and query
 * Location: functions/src/middleware/validation.ts:44
 * Usage: Comprehensive request validation
 */
export function validate(options: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body if schema provided
      if (options.body) {
        req.body = options.body.parse(req.body);
      }
      
      // Validate params if schema provided
      if (options.params) {
        (req as RequestWithParams).params = options.params.parse(
          (req as RequestWithParams).params || {}
        );
      }
      
      // Validate query if schema provided
      if (options.query) {
        req.query = options.query.parse(req.query);
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Request validation failed", {
          path: req.path,
          errors: error.issues
        });
        
        res.status(400).json({
          error: "Validation failed",
          details: error.issues.map(issue => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validates and transforms request data directly (non-middleware)
 * Location: functions/src/middleware/validation.ts:89
 * Usage: For manual validation in route handlers
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Data validation failed", {
        errors: error.issues
      });
      throw new ValidationError("Validation failed", error.issues);
    }
    throw error;
  }
}

/**
 * Custom validation error class
 * Location: functions/src/middleware/validation.ts:106
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Wraps a route handler with response validation
 * Location: functions/src/middleware/validation.ts:119
 * Usage: Validates response data before sending
 */
export function withResponseValidation<T>(
  responseSchema: z.ZodSchema<T>,
  handler: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    // Override res.json to validate response
    const originalJson = res.json.bind(res);
    
    res.json = function(data: unknown) {
      try {
        // Validate response data
        const validatedData = responseSchema.parse(data);
        return originalJson(validatedData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error("Response validation failed", {
            path: req.path,
            errors: error.issues,
            data
          });
          
          // Send error response without validating it
          return originalJson({
            error: "Internal server error",
            message: "Response validation failed",
            details: process.env.NODE_ENV === "development" ? error.issues : undefined
          });
        }
        throw error;
      }
    };
    
    try {
      await handler(req, res);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };
}

/**
 * Standard API response wrapper
 * Location: functions/src/middleware/validation.ts:169
 */
export function sendApiResponse<T>(
  res: Response,
  data: T,
  success = true,
  message?: string
) {
  res.json({
    success,
    data: success ? data : undefined,
    error: !success ? (data as { error?: string }).error : undefined,
    message
  });
}

/**
 * Error handler for API routes
 * Location: functions/src/middleware/validation.ts:119
 * Usage: Consistent error response formatting
 */
/**
 * Extract user information from request using Firebase Auth token verification
 * Now checks Firestore user profile for role instead of inferring from email
 */
export async function getUserFromRequest(req: Request): Promise<{ uid: string; email: string; role: "teacher" | "student"; displayName?: string } | null> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Import Firebase Admin here to avoid circular dependencies
    const admin = await import("firebase-admin");
    const { db } = await import("../config/firebase");
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    let role: "teacher" | "student" = "student";
    
    // First try to get role from Firebase Auth custom claims (fastest)
    if (decodedToken.role) {
      role = decodedToken.role as "teacher" | "student";
    } else {
      // Get role from Firestore user profile
      try {
        const userDoc = await db.collection("users").doc(decodedToken.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          role = userData?.role || "student";
        } else {
          // User profile doesn't exist - they need to complete onboarding
          console.error("User profile not found for UID:", decodedToken.uid);
          return null;
        }
      } catch (firestoreError) {
        console.error("Failed to fetch user profile from Firestore:", firestoreError);
        return null;
      }
    }
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      role,
      displayName: decodedToken.name || decodedToken.email?.split("@")[0]
    };
  } catch (error) {
    console.error("Failed to verify Firebase token:", error);
    return null;
  }
}

export function handleRouteError(error: unknown, req: Request, res: Response) {
  logger.error("Route error", { path: req.path, error });
  
  // Handle validation errors - check type name instead of instanceof to avoid compilation issues
  if (error && typeof error === "object" && "name" in error && error.name === "ValidationError") {
    const validationError = error as ValidationError;
    return res.status(400).json({
      error: "Validation failed",
      details: validationError.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }
  
  // Handle Zod errors
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: error.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }
  
  // Default error response
  return res.status(500).json({
    error: "Internal server error",
    message: error instanceof Error ? error.message : "Unknown error"
  });
}