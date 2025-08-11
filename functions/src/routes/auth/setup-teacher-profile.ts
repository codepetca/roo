/**
 * Setup Teacher Profile API Endpoint
 * Location: functions/src/routes/auth/setup-teacher-profile.ts
 * 
 * Creates the Firestore user profile needed for API authentication
 * Used by E2E tests to set up test teacher accounts
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { z } from "zod";
import { getUserFromRequest, handleRouteError } from "../../middleware/validation";
import { db } from "../../config/firebase";
import { userDomainSchema } from "../../schemas/domain";
import * as admin from "firebase-admin";

const setupTeacherProfileSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  schoolEmail: z.string().email().optional(),
  role: z.literal("teacher")
});

/**
 * Setup teacher profile in Firestore
 * POST /api/auth/setup-teacher-profile
 */
export async function setupTeacherProfile(req: Request, res: Response): Promise<Response> {
  try {
    logger.info("Setting up teacher profile", { method: req.method });
    
    // Validate request body
    const validatedInput = setupTeacherProfileSchema.parse(req.body);
    
    // Get authenticated user - this will be null if no profile exists yet
    // For this endpoint, we'll extract the user from the token directly
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        error: "No authorization token provided" 
      });
    }

    const token = authHeader.substring(7);
    
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!decodedToken.uid || !decodedToken.email) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid authentication token" 
      });
    }

    // Create user profile document
    const userProfile = {
      id: decodedToken.uid,
      email: validatedInput.email,
      displayName: validatedInput.displayName,
      role: validatedInput.role,
      schoolEmail: validatedInput.schoolEmail,
      classroomIds: [],
      totalClassrooms: 0,
      totalStudents: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Validate with domain schema
    const validatedUser = userDomainSchema.omit({ 
      createdAt: true, 
      updatedAt: true 
    }).parse({
      ...userProfile,
      createdAt: new Date(), // Temp dates for validation
      updatedAt: new Date()
    });

    // Save to Firestore
    await db.collection("users").doc(decodedToken.uid).set({
      ...validatedUser,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Set custom claims for role-based access
    await admin.auth().setCustomUserClaims(decodedToken.uid, { 
      role: validatedInput.role 
    });

    logger.info("Teacher profile created successfully", {
      uid: decodedToken.uid,
      email: validatedInput.email,
      role: validatedInput.role
    });

    return res.status(200).json({
      success: true,
      data: {
        uid: decodedToken.uid,
        email: validatedInput.email,
        displayName: validatedInput.displayName,
        role: validatedInput.role,
        message: "Teacher profile created successfully"
      }
    });

  } catch (error) {
    return handleRouteError(error, req, res);
  }
}