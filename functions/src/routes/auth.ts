/**
 * Authentication route handlers
 * Location: functions/src/routes/auth.ts
 */

import { Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { z } from "zod";

// Validation schemas
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["teacher", "student"], {
    errorMap: () => ({ message: "Role must be either 'teacher' or 'student'" })
  }),
  displayName: z.string().optional()
});

/**
 * Create a new user with the specified role
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = signupSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        error: "Validation error",
        details: validationResult.error.errors
      });
      return;
    }

    const { email, password, role, displayName } = validationResult.data;
    const auth = getAuth();
    const db = getFirestore();

    // Create the user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      emailVerified: false
    });

    logger.info("User created in Firebase Auth", {
      uid: userRecord.uid,
      email: userRecord.email,
      role
    });

    // Set custom claims for the role
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // Create the user profile in Firestore
    const profileData = {
      uid: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName || email.split('@')[0],
      role: role,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false,
      photoURL: null,
      phoneNumber: null,
      disabled: false,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: null
      }
    };

    // Add role-specific fields
    if (role === 'teacher') {
      Object.assign(profileData, {
        teacherData: {
          configuredSheets: false,
          sheetId: null,
          lastSync: null,
          classrooms: []
        }
      });
    } else if (role === 'student') {
      Object.assign(profileData, {
        studentData: {
          enrolledClasses: [],
          submittedAssignments: []
        }
      });
    }

    // Save to Firestore
    await db.collection("users").doc(userRecord.uid).set(profileData);

    logger.info("User profile created successfully", {
      uid: userRecord.uid,
      email: userRecord.email,
      role
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: role
      }
    });

  } catch (error: any) {
    logger.error("Signup error", error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({
        error: "Email already exists",
        message: "An account with this email already exists"
      });
      return;
    }
    
    if (error.code === 'auth/invalid-email') {
      res.status(400).json({
        error: "Invalid email",
        message: "The email address is not valid"
      });
      return;
    }
    
    if (error.code === 'auth/weak-password') {
      res.status(400).json({
        error: "Weak password",
        message: "The password is too weak"
      });
      return;
    }

    // Generic error
    res.status(500).json({
      error: "Signup failed",
      message: error.message || "Failed to create user account"
    });
  }
}

/**
 * Get current user info from token
 * GET /api/auth/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: "Unauthorized",
        message: "No valid authorization token provided"
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const auth = getAuth();
    
    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    const db = getFirestore();
    
    // Get user profile from Firestore
    const profileDoc = await db.collection("users").doc(decodedToken.uid).get();
    
    if (!profileDoc.exists) {
      res.status(404).json({
        error: "Profile not found",
        message: "User profile not found. Please complete signup."
      });
      return;
    }

    const profile = profileDoc.data();
    
    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: profile?.displayName || decodedToken.name,
      role: profile?.role || decodedToken.role || 'student',
      emailVerified: decodedToken.email_verified,
      photoURL: profile?.photoURL || decodedToken.picture
    });

  } catch (error: any) {
    logger.error("Get current user error", error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please log in again."
      });
      return;
    }

    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token"
    });
  }
}