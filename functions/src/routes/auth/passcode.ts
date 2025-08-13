/**
 * Passcode Authentication - Student login via email passcode system
 * @module functions/src/routes/auth/passcode
 * @size ~300 lines (extracted from 760-line auth.ts)
 * @exports sendPasscode, verifyPasscode, resetStudentAuth
 * @dependencies firebase-admin/auth, firebase-admin/firestore, crypto, zod
 * @patterns Passcode generation, verification, rate limiting, teacher oversight
 */

import { Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { z } from "zod";
import * as crypto from "crypto";
import { sendStudentPasscode } from "../../services/gmail-email-service";
import { 
  sendPasscodeResponseSchema, 
  verifyPasscodeResponseSchema,
  resetStudentAuthResponseSchema,
  type SendPasscodeResponse,
  type VerifyPasscodeResponse,
  type ResetStudentAuthResponse
} from "@shared/schemas/auth-responses";

// Validation schemas
const sendPasscodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  teacherId: z.string().optional(), // Optional - will be extracted from auth token if not provided
});

const verifyPasscodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  passcode: z.string().min(6, "Passcode must be 6 digits").max(6, "Passcode must be 6 digits"),
});

const resetStudentAuthSchema = z.object({
  studentEmail: z.string().email("Invalid email address"),
});

/**
 * Generate and send login passcode to student email
 * POST /api/auth/send-passcode
 * Requires teacher authentication - passcode is sent from teacher's Gmail account
 */
export async function sendPasscode(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = sendPasscodeSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: validationResult.error.errors,
      });
      return;
    }

    const { email, teacherId } = validationResult.data;
    const db = getFirestore();
    const auth = getAuth();

    // Get teacher from authentication token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Teacher authentication required to send passcodes",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Get teacher profile to verify role and get Gmail access
    const teacherDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!teacherDoc.exists || teacherDoc.data()?.role !== "teacher") {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Only teachers can send student passcodes",
      });
      return;
    }

    const teacherData = teacherDoc.data()!;

    // Check if teacher has Gmail access token
    if (!teacherData.gmailAccessToken) {
      res.status(400).json({
        success: false,
        error: "Gmail access required",
        message: "Please sign in with Google to enable email sending",
      });
      return;
    }

    // Generate 6-digit passcode
    const passcode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store passcode in Firestore
    await db.collection("passcodes").doc(email).set({
      email,
      passcode,
      expiresAt,
      createdAt: new Date(),
      used: false,
      attempts: 0,
      teacherId: decodedToken.uid, // Track which teacher sent the passcode
      teacherEmail: teacherData.email,
    });

    // Send passcode via teacher's Gmail
    try {
      await sendStudentPasscode(decodedToken.uid, email, passcode);

      logger.info("Passcode sent via Gmail successfully", {
        studentEmail: email,
        teacherId: decodedToken.uid,
        teacherEmail: teacherData.email,
      });

      // In development/testing, return the passcode in response for easy testing
      const isDevelopment = process.env.NODE_ENV === "development";

      const responseData: SendPasscodeResponse = {
        email: email,
        sent: true,
        message: `Passcode sent to ${email} from your Gmail account`,
        sentFrom: teacherData.email,
        ...(isDevelopment && { passcode }), // Only include in development
      };

      // Validate response before sending
      const validatedResponse = sendPasscodeResponseSchema.parse(responseData);

      logger.info("🚀 Sending passcode response:", {
        endpoint: "/auth/send-passcode",
        responseData: validatedResponse,
        isDevelopment,
      });

      // Wrap in ApiResponse format expected by frontend
      res.status(200).json({
        success: true,
        data: validatedResponse
      });
    } catch (emailError: any) {
      logger.error("Failed to send passcode email", {
        error: emailError.message,
        studentEmail: email,
        teacherId: decodedToken.uid,
        teacherEmail: teacherData.email,
      });

      // Delete the passcode since it wasn't sent
      await db.collection("passcodes").doc(email).delete();

      res.status(500).json({
        success: false,
        error: "Email sending failed",
        message: "Failed to send passcode email. Please check your Gmail permissions and try again.",
      });
    }
  } catch (error: any) {
    logger.error("Send passcode error", { error: error.message, stack: error.stack });

    if (error.code === "auth/id-token-expired" || error.code === "auth/invalid-id-token") {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Invalid or expired authentication token",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to send passcode",
      message: error.message || "An error occurred while sending the passcode",
    });
  }
}

/**
 * Verify passcode and create/authenticate student account
 * POST /api/auth/verify-passcode
 */
export async function verifyPasscode(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = verifyPasscodeSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: validationResult.error.errors,
      });
      return;
    }

    const { email, passcode } = validationResult.data;
    const db = getFirestore();
    const auth = getAuth();

    // Get passcode document
    const passcodeDoc = await db.collection("passcodes").doc(email).get();

    if (!passcodeDoc.exists) {
      res.status(400).json({
        success: false,
        error: "Invalid passcode",
        message: "No passcode found for this email address",
      });
      return;
    }

    const passcodeData = passcodeDoc.data()!;

    // Check if passcode is expired
    if (new Date() > passcodeData.expiresAt.toDate()) {
      res.status(400).json({
        success: false,
        error: "Passcode expired",
        message: "The passcode has expired. Please request a new one.",
      });
      return;
    }

    // Check if passcode has been used
    if (passcodeData.used) {
      res.status(400).json({
        success: false,
        error: "Passcode already used",
        message: "This passcode has already been used. Please request a new one.",
      });
      return;
    }

    // Check attempt limit
    if (passcodeData.attempts >= 3) {
      res.status(400).json({
        success: false,
        error: "Too many attempts",
        message: "Too many failed attempts. Please request a new passcode.",
      });
      return;
    }

    // Verify passcode
    if (passcodeData.passcode !== passcode) {
      // Increment attempts
      await db
        .collection("passcodes")
        .doc(email)
        .update({
          attempts: passcodeData.attempts + 1,
        });

      res.status(400).json({
        success: false,
        error: "Invalid passcode",
        message: "The passcode is incorrect",
      });
      return;
    }

    // Mark passcode as used
    await db.collection("passcodes").doc(email).update({
      used: true,
      usedAt: new Date(),
    });

    // Check if user already exists
    let userRecord;
    let isNewUser = false;

    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // Create new user account
        userRecord = await auth.createUser({
          email,
          emailVerified: true, // Email verified via passcode
          displayName: email.split("@")[0],
        });
        isNewUser = true;

        logger.info("New student user created", {
          uid: userRecord.uid,
          email: userRecord.email,
        });
      } else {
        throw error;
      }
    }

    // Set custom claims for student role
    await auth.setCustomUserClaims(userRecord.uid, { role: "student" });

    // Create or update user profile
    const profileData = {
      uid: userRecord.uid,
      email: email,
      displayName: userRecord.displayName || email.split("@")[0],
      role: "student",
      updatedAt: new Date(),
      emailVerified: true,
      authMethod: "passcode",
      lastPasscodeLogin: new Date(),
      studentData: {
        enrolledClasses: [],
        submittedAssignments: [],
      },
    };

    // Check if profile exists
    const profileDoc = await db.collection("users").doc(userRecord.uid).get();

    if (isNewUser || !profileDoc.exists) {
      // Create new profile
      Object.assign(profileData, {
        createdAt: new Date(),
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date(),
        },
      });
    }

    // Save profile to Firestore
    await db.collection("users").doc(userRecord.uid).set(profileData, { merge: true });

    // Generate custom token for authentication
    const customToken = await auth.createCustomToken(userRecord.uid);

    logger.info("Student authenticated successfully", {
      uid: userRecord.uid,
      email: email,
      isNewUser: isNewUser || !profileDoc.exists,
    });

    const responseData: VerifyPasscodeResponse = {
      email: email,
      valid: true,
      firebaseToken: customToken,
      isNewUser: isNewUser || !profileDoc.exists,
      userProfile: {
        uid: userRecord.uid,
        email: email,
        displayName: profileData.displayName,
        role: "student",
      },
    };

    // Validate response before sending
    const validatedResponse = verifyPasscodeResponseSchema.parse(responseData);

    // Wrap in ApiResponse format expected by frontend
    res.status(200).json({
      success: true,
      data: validatedResponse
    });
  } catch (error: any) {
    logger.error("Verify passcode error", { error: error.message, stack: error.stack });

    // Handle specific errors
    if (error.code === "auth/email-already-exists") {
      res.status(409).json({
        success: false,
        error: "Email already exists",
        message: "An account with this email already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Authentication failed",
      message: error.message || "An error occurred during authentication",
    });
  }
}

/**
 * Teacher override to reset student authentication (clear passcodes, allow new login)
 * POST /api/auth/reset-student
 */
export async function resetStudentAuth(req: Request, res: Response): Promise<void> {
  try {
    // Get authenticated teacher from token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Teacher authentication required",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const auth = getAuth();

    // Verify teacher token
    const decodedToken = await auth.verifyIdToken(token);
    const db = getFirestore();

    // Get teacher profile to verify role
    const teacherDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!teacherDoc.exists || teacherDoc.data()?.role !== "teacher") {
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Only teachers can reset student authentication",
      });
      return;
    }

    // Validate request body
    const validationResult = resetStudentAuthSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: validationResult.error.errors,
      });
      return;
    }

    const { studentEmail } = validationResult.data;

    // Clear any existing passcodes for the student
    const passcodeRef = db.collection("passcodes").doc(studentEmail);
    const passcodeDoc = await passcodeRef.get();

    if (passcodeDoc.exists) {
      await passcodeRef.delete();
      logger.info("Cleared existing passcode for student", {
        teacherUid: decodedToken.uid,
        teacherEmail: decodedToken.email,
        studentEmail,
      });
    }

    // Optional: Reset failed login attempts in user profile
    try {
      const studentUser = await auth.getUserByEmail(studentEmail);
      const studentProfileRef = db.collection("users").doc(studentUser.uid);
      await studentProfileRef.update({
        "authStatus.failedAttempts": 0,
        "authStatus.lockedUntil": null,
        "authStatus.lastReset": new Date(),
        "authStatus.resetByTeacher": decodedToken.uid,
      });
    } catch (error: any) {
      // Student might not exist yet, which is fine
      if (error.code !== "auth/user-not-found") {
        logger.warn("Could not reset student auth status", {
          error: error.message,
          studentEmail,
        });
      }
    }

    const responseData: ResetStudentAuthResponse = {
      success: true,
      message: "Student authentication has been reset",
      studentEmail,
      resetBy: decodedToken.email,
      resetAt: new Date().toISOString(),
    };

    // Validate response before sending
    const validatedResponse = resetStudentAuthResponseSchema.parse(responseData);

    // Wrap in ApiResponse format expected by frontend
    res.status(200).json({
      success: true,
      data: validatedResponse
    });

    logger.info("Student authentication reset by teacher", {
      teacherUid: decodedToken.uid,
      teacherEmail: decodedToken.email,
      studentEmail,
      resetAt: new Date(),
    });
  } catch (error: any) {
    logger.error("Reset student auth error", { error: error.message, stack: error.stack });

    if (error.code === "auth/id-token-expired" || error.code === "auth/invalid-id-token") {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Invalid or expired teacher token",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Reset failed",
      message: error.message || "An error occurred while resetting student authentication",
    });
  }
}
