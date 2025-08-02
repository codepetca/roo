/**
 * User Registration - Account creation and profile setup
 * @module functions/src/routes/auth/signup
 * @size ~200 lines (extracted from 760-line auth.ts)
 * @exports signup, createOrUpdateProfile
 * @dependencies firebase-admin/auth, firebase-admin/firestore, zod
 * @patterns User creation, profile management, error handling
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

const profileSchema = z.object({
  role: z.enum(["teacher", "student"], {
    errorMap: () => ({ message: "Role must be either 'teacher' or 'student'" })
  }),
  email: z.string().email("Invalid email address"),
  displayName: z.string().optional(),
  isSignup: z.boolean().optional()
});

/**
 * Create a new user with the specified role
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    logger.info("Signup attempt started", { body: req.body });

    // Validate input
    const validatedData = signupSchema.parse(req.body);
    const { email, password, role, displayName } = validatedData;

    const auth = getAuth();
    const db = getFirestore();

    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      if (existingUser) {
        logger.warn("Signup failed - user already exists", { email });
        res.status(409).json({
          error: "User already exists",
          message: "An account with this email already exists"
        });
        return;
      }
    } catch (error: any) {
      // User doesn't exist, which is what we want for signup
      if (error.code !== "auth/user-not-found") {
        logger.error("Error checking existing user", { error: error.message, email });
        res.status(500).json({
          error: "Internal server error",
          message: "Failed to verify user status"
        });
        return;
      }
    }

    // Create Firebase Auth user
    logger.info("Creating Firebase Auth user", { email, role });
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split("@")[0]
    });

    logger.info("Firebase Auth user created successfully", {
      uid: userRecord.uid,
      email: userRecord.email
    });

    // Create user profile document in Firestore
    const userProfile = {
      uid: userRecord.uid,
      email: userRecord.email!,
      role,
      displayName: userRecord.displayName || email.split("@")[0],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("users").doc(userRecord.uid).set(userProfile);
    logger.info("User profile created in Firestore", { uid: userRecord.uid });

    // Generate a custom token for immediate login
    const customToken = await auth.createCustomToken(userRecord.uid, { role });

    // Return success response with token
    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      role,
      firebaseToken: customToken,
      isNewUser: true,
      message: "User created successfully"
    });

    logger.info("Signup completed successfully", {
      uid: userRecord.uid,
      email: userRecord.email,
      role
    });
  } catch (error: any) {
    logger.error("Signup error", { error: error.message, stack: error.stack });

    if (error.name === "ZodError") {
      res.status(400).json({
        error: "Validation error",
        message: "Invalid input data",
        details: error.errors
      });
      return;
    }

    if (error.code === "auth/email-already-exists") {
      res.status(409).json({
        error: "User already exists",
        message: "An account with this email already exists"
      });
      return;
    }

    if (error.code === "auth/invalid-password") {
      res.status(400).json({
        error: "Invalid password",
        message: "Password does not meet requirements"
      });
      return;
    }

    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create user account"
    });
  }
}

/**
 * Create or update user profile in Firestore
 * POST /api/auth/profile
 */
export async function createOrUpdateProfile(req: Request, res: Response): Promise<void> {
  try {
    logger.info("Profile creation/update started", { body: req.body });

    // Validate input
    const { role, email, displayName, isSignup } = profileSchema.parse(req.body);

    const auth = getAuth();
    const db = getFirestore();

    // Get or create user
    let userRecord;
    let isNewUser = false;

    try {
      userRecord = await auth.getUserByEmail(email);
      logger.info("Existing user found", { uid: userRecord.uid, email });
    } catch (error: any) {
      if (error.code === "auth/user-not-found" && isSignup) {
        // Create new user if this is a signup flow
        logger.info("Creating new user during profile setup", { email, role });
        userRecord = await auth.createUser({
          email,
          displayName: displayName || email.split("@")[0]
        });
        isNewUser = true;
        logger.info("New user created", { uid: userRecord.uid });
      } else {
        logger.error("User lookup failed", { error: error.message, email });
        res.status(404).json({
          error: "User not found",
          message: "No user found with this email address"
        });
        return;
      }
    }

    // Create or update user profile document
    const userProfile = {
      uid: userRecord.uid,
      email: userRecord.email!,
      role,
      displayName: displayName || userRecord.displayName || email.split("@")[0],
      createdAt: isNewUser ? new Date() : undefined,
      updatedAt: new Date()
    };

    // Remove undefined fields
    const cleanProfile = Object.fromEntries(
      Object.entries(userProfile).filter(([_, value]) => value !== undefined)
    );

    await db.collection("users").doc(userRecord.uid).set(cleanProfile, { merge: true });
    logger.info("User profile updated in Firestore", { uid: userRecord.uid });

    // Set custom claims for role-based access
    await auth.setCustomUserClaims(userRecord.uid, { role });
    logger.info("Custom claims updated", { uid: userRecord.uid, role });

    // Generate custom token with role claim
    const customToken = await auth.createCustomToken(userRecord.uid, { role });

    res.status(200).json({
      uid: userRecord.uid,
      email: userRecord.email,
      role,
      displayName: cleanProfile.displayName,
      firebaseToken: customToken,
      isNewUser,
      message: isNewUser ? "Profile created successfully" : "Profile updated successfully"
    });

    logger.info("Profile operation completed successfully", {
      uid: userRecord.uid,
      email: userRecord.email,
      role,
      isNewUser
    });
  } catch (error: any) {
    logger.error("Profile operation error", { error: error.message, stack: error.stack });

    if (error.name === "ZodError") {
      res.status(400).json({
        error: "Validation error",
        message: "Invalid input data",
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create or update profile"
    });
  }
}