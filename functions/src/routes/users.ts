/**
 * User profile management API endpoints
 * Location: functions/src/routes/users.ts:1
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { handleRouteError, sendApiResponse, validateData } from "../middleware/validation";
import { userDomainSchema } from "../schemas/domain";
import { createUserProfileRequestSchema, updateUserProfileRequestSchema } from "../schemas/dto";
import { userDomainToDto } from "../schemas/transformers";
import { db, getCurrentTimestamp } from "../config/firebase";
import * as admin from "firebase-admin";

/**
 * Create a new user profile
 * Location: functions/src/routes/users.ts:18
 * Route: POST /users/profile
 */
export async function createUserProfile(req: Request, res: Response) {
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
    
    // Validate request data
    const validatedData = validateData(createUserProfileRequestSchema, req.body);
    logger.info("Creating user profile", { 
      uid: decodedToken.uid, 
      email: decodedToken.email,
      role: validatedData.role 
    });

    // Check if user profile already exists
    const existingUserDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (existingUserDoc.exists) {
      return sendApiResponse(
        res,
        { error: "User profile already exists" },
        false,
        "User profile already created"
      );
    }

    // Create user profile
    const now = getCurrentTimestamp();
    const userDomain = {
      id: decodedToken.uid,
      email: decodedToken.email || "",
      displayName: validatedData.displayName || decodedToken.name || decodedToken.email?.split("@")[0] || "User",
      role: validatedData.role,
      classroomIds: [],
      isActive: true,
      lastLogin: now,
      createdAt: now,
      updatedAt: now
    };

    // Validate with domain schema
    const validatedUser = userDomainSchema.parse(userDomain);

    // Save to Firestore
    await db.collection("users").doc(decodedToken.uid).set(validatedUser);

    // Also set custom claims in Firebase Auth for faster role checking
    await admin.auth().setCustomUserClaims(decodedToken.uid, { 
      role: validatedData.role 
    });

    // Return user profile
    const userResponse = userDomainToDto(validatedUser);
    
    sendApiResponse(
      res,
      userResponse,
      true,
      "User profile created successfully"
    );

    logger.info("User profile created successfully", {
      uid: decodedToken.uid,
      role: validatedData.role
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

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

    // Return user profile
    const userResponse = userDomainToDto(userDomain);
    
    sendApiResponse(
      res,
      userResponse,
      true,
      "User profile retrieved successfully"
    );

    logger.info("User profile retrieved", { uid: decodedToken.uid });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Update user profile
 * Location: functions/src/routes/users.ts:131
 * Route: PUT /users/profile
 */
export async function updateUserProfile(req: Request, res: Response) {
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
    
    // Validate request data
    const validatedData = validateData(updateUserProfileRequestSchema, req.body);
    logger.info("Updating user profile", { 
      uid: decodedToken.uid,
      updates: validatedData 
    });

    // Get existing user profile
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return sendApiResponse(
        res,
        { error: "User profile not found", needsProfile: true },
        false,
        "User profile does not exist"
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: getCurrentTimestamp()
    };

    if (validatedData.displayName) {
      updateData.displayName = validatedData.displayName;
    }

    if (validatedData.role) {
      updateData.role = validatedData.role;
      // Update Firebase Auth custom claims too
      await admin.auth().setCustomUserClaims(decodedToken.uid, { 
        role: validatedData.role 
      });
    }

    // Update in Firestore
    await db.collection("users").doc(decodedToken.uid).update(updateData);

    // Get updated user profile
    const updatedUserDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = updatedUserDoc.data();
    const userDomain = userDomainSchema.parse({ ...userData, id: updatedUserDoc.id });

    // Return updated user profile
    const userResponse = userDomainToDto(userDomain);
    
    sendApiResponse(
      res,
      userResponse,
      true,
      "User profile updated successfully"
    );

    logger.info("User profile updated successfully", {
      uid: decodedToken.uid,
      updates: validatedData
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

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