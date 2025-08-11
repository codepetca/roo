/**
 * User profile management API endpoints
 * Location: functions/src/routes/users.ts:1
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { handleRouteError, sendApiResponse, validateData } from "../middleware/validation";
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

    // Get user profile from Firestore
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return sendApiResponse(
        res,
        { error: "User profile not found", needsProfile: true },
        false,
        "User profile does not exist"
      );
    }

    const userData = userDoc.data();
    const userDomain = userDomainSchema.parse({ ...userData, id: userDoc.id });

    // Update last login timestamp
    await db.collection("users").doc(decodedToken.uid).update({
      lastLogin: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    });

    // Return user profile (now using domain object directly)
    sendApiResponse(
      res,
      userDomain,
      true,
      "User profile retrieved successfully"
    );

    logger.info("User profile retrieved", { uid: decodedToken.uid });

  } catch (error) {
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