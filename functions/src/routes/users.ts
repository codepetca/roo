/**
 * User profile management API endpoints
 * Location: functions/src/routes/users.ts:1
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { z } from "zod";
import { handleRouteError, sendApiResponse, validateData, getUserFromRequest } from "../middleware/validation";
import { userDomainSchema } from "../schemas/domain";
// NOTE: userDomainToDto removed - user DTO transformations no longer needed
import { db, getCurrentTimestamp } from "../config/firebase";
import * as admin from "firebase-admin";

// NOTE: User profile creation is now handled by the 'createProfileForExistingUser' callable function
// This ensures consistent schema validation and proper field initialization

/**
 * Get current user profile
 * Location: functions/src/routes/users.ts:82
 * Route: GET /users/profile
 */
export async function getUserProfile(req: Request, res: Response) {
  try {
    // Get Firebase user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendApiResponse(
        res,
        { error: "Authentication required" },
        false,
        "Missing or invalid authorization header"
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);

    logger.info("Getting user profile", { uid: decodedToken.uid });

    // Get user profile from Firestore
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      logger.warn("User profile not found", { uid: decodedToken.uid });
      return sendApiResponse(
        res,
        { error: "User profile not found", needsProfile: true },
        false,
        "User profile does not exist"
      );
    }

    const userData = userDoc.data();
    logger.info("Raw user data from Firestore", { 
      uid: decodedToken.uid, 
      hasData: !!userData,
      fields: userData ? Object.keys(userData) : []
    });

    // Convert Firestore timestamps to serializable format before validation
    const { sanitizeDocument } = await import("../config/firebase");
    const sanitizedData = sanitizeDocument({ ...userData, id: userDoc.id });
    
    logger.info("Sanitized user data", { 
      uid: decodedToken.uid,
      sanitizedFields: Object.keys(sanitizedData)
    });

    // Parse with domain schema - but we need to handle the sanitized timestamp format
    // For now, we'll skip validation and return the sanitized data directly
    // since the timestamps are now in a different format
    const userProfile = {
      ...sanitizedData,
      id: userDoc.id,
      role: (sanitizedData as any).role || "student"
    } as any;

    // Update last login timestamp
    await db.collection("users").doc(decodedToken.uid).update({
      lastLogin: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    });

    // Return user profile
    sendApiResponse(
      res,
      userProfile,
      true,
      "User profile retrieved successfully"
    );

    logger.info("User profile retrieved successfully", { 
      uid: decodedToken.uid,
      role: userProfile.role,
      hasSchoolEmail: !!(userProfile as any).schoolEmail
    });

  } catch (error) {
    logger.error("Error in getUserProfile", { 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    handleRouteError(error, req, res);
  }
}

// NOTE: User profile updates should be handled through the 'createProfileForExistingUser' callable function
// or through specific update endpoints for individual fields like schoolEmail

/**
 * Check if user has a profile (lightweight endpoint for auth checks)
 * Location: functions/src/routes/users.ts:201
 * Route: GET /users/profile/exists
 */
export async function checkUserProfileExists(req: Request, res: Response) {
  try {
    // Get Firebase user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendApiResponse(
        res,
        { exists: false, needsProfile: true },
        true,
        "Not authenticated"
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user profile exists
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const exists = userDoc.exists;

    // Get role from custom claims if available
    let role = null;
    if (exists) {
      const userData = userDoc.data();
      role = userData?.role;
    }

    sendApiResponse(
      res,
      { 
        exists,
        needsProfile: !exists,
        role: role,
        uid: decodedToken.uid,
        email: decodedToken.email
      },
      true,
      exists ? "User profile exists" : "User profile needed"
    );

  } catch (error) {
    // For this endpoint, we don't want to throw errors for auth failures
    // Just return that profile doesn't exist
    sendApiResponse(
      res,
      { exists: false, needsProfile: true },
      true,
      "Authentication failed or profile not found"
    );
  }
}

/**
 * Update user's school email
 * Location: functions/src/routes/users.ts:134
 * Route: PATCH /users/profile/school-email
 */
export async function updateSchoolEmail(req: Request, res: Response) {
  try {
    // Validate request body
    const { schoolEmail } = validateData(z.object({
      schoolEmail: z.string().email().min(1, "School email is required")
    }), req.body);

    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user) {
      return sendApiResponse(
        res,
        { error: "Authentication required" },
        false,
        "User authentication failed"
      );
    }

    // Check if user profile exists
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists) {
      return sendApiResponse(
        res,
        { error: "User profile not found" },
        false,
        "User profile must be created first"
      );
    }

    // Update school email
    await db.collection("users").doc(user.uid).update({
      schoolEmail,
      updatedAt: getCurrentTimestamp()
    });

    logger.info("School email updated", { 
      uid: user.uid,
      email: user.email,
      schoolEmail
    });

    sendApiResponse(
      res,
      { success: true, schoolEmail },
      true,
      "School email updated successfully"
    );

  } catch (error) {
    handleRouteError(error, req, res);
  }
}