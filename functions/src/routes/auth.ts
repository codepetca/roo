/**
 * Authentication route handlers
 * Location: functions/src/routes/auth.ts
 */

import { Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { z } from "zod";
import * as crypto from "crypto";

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

const sendPasscodeSchema = z.object({
  email: z.string().email("Invalid email address")
});

const verifyPasscodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  passcode: z.string().min(6, "Passcode must be 6 digits").max(6, "Passcode must be 6 digits")
});

const resetStudentAuthSchema = z.object({
  studentEmail: z.string().email("Invalid email address")
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
 * Create or update user profile for OAuth users (Google)
 * POST /api/auth/profile
 */
export async function createOrUpdateProfile(req: Request, res: Response): Promise<void> {
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
    
    // Verify the token and get user info
    const decodedToken = await auth.verifyIdToken(token);
    
    // Validate request body
    const validationResult = profileSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: "Validation error",
        details: validationResult.error.errors
      });
      return;
    }

    const { role, email, displayName, isSignup } = validationResult.data;
    const db = getFirestore();

    // Check if profile already exists
    const profileDoc = await db.collection("users").doc(decodedToken.uid).get();
    const profileExists = profileDoc.exists;

    // Set custom claims for the role
    await auth.setCustomUserClaims(decodedToken.uid, { role });

    // Prepare profile data
    const profileData = {
      uid: decodedToken.uid,
      email: email,
      displayName: displayName || decodedToken.name || email.split('@')[0],
      role: role,
      updatedAt: new Date(),
      emailVerified: decodedToken.email_verified || false,
      photoURL: decodedToken.picture || null,
      phoneNumber: decodedToken.phone_number || null,
      disabled: false,
      metadata: {
        lastSignInTime: new Date()
      }
    };

    if (!profileExists) {
      // Creating new profile
      Object.assign(profileData, {
        createdAt: new Date(),
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date()
        }
      });

      // Add role-specific fields for new profiles
      if (role === 'teacher') {
        Object.assign(profileData, {
          teacherData: {
            configuredSheets: false,
            sheetId: null,
            lastSync: null,
            classrooms: [],
            googleAccessToken: null, // Will be set separately for security
            boardAccountEmail: null
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
    }

    // Save to Firestore (merge if exists, create if new)
    await db.collection("users").doc(decodedToken.uid).set(profileData, { merge: true });

    logger.info(`User profile ${profileExists ? 'updated' : 'created'} successfully`, {
      uid: decodedToken.uid,
      email: email,
      role: role,
      isSignup: isSignup,
      profileExists
    });

    // Return success response
    res.status(profileExists ? 200 : 201).json({
      success: true,
      message: `User profile ${profileExists ? 'updated' : 'created'} successfully`,
      user: {
        uid: decodedToken.uid,
        email: email,
        displayName: profileData.displayName,
        role: role
      },
      isNewProfile: !profileExists
    });

  } catch (error: any) {
    logger.error("Profile creation/update error", error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please log in again."
      });
      return;
    }

    if (error.code === 'auth/invalid-id-token') {
      res.status(401).json({
        error: "Invalid token",
        message: "The provided token is invalid."
      });
      return;
    }

    // Generic error
    res.status(500).json({
      error: "Profile operation failed",
      message: error.message || "Failed to create or update user profile"
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

/**
 * Generate and send login passcode to student email
 * POST /api/auth/send-passcode
 */
export async function sendPasscode(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = sendPasscodeSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: "Validation error",
        details: validationResult.error.errors
      });
      return;
    }

    const { email } = validationResult.data;
    const db = getFirestore();

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
      attempts: 0
    });

    // TODO: Send email with passcode
    // For now, we'll just log it (in production, integrate with email service)
    logger.info("Passcode generated for student", {
      email,
      passcode, // Remove this in production!
      expiresAt
    });

    // In development/testing, return the passcode in response
    // Remove this in production and only send via email
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(200).json({
      success: true,
      message: "Passcode sent to your email address",
      ...(isDevelopment && { passcode }) // Only include in development
    });

  } catch (error: any) {
    logger.error("Send passcode error", error);
    res.status(500).json({
      error: "Failed to send passcode",
      message: error.message || "An error occurred while sending the passcode"
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
        error: "Validation error",
        details: validationResult.error.errors
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
        error: "Invalid passcode",
        message: "No passcode found for this email address"
      });
      return;
    }

    const passcodeData = passcodeDoc.data()!;

    // Check if passcode is expired
    if (new Date() > passcodeData.expiresAt.toDate()) {
      res.status(400).json({
        error: "Passcode expired",
        message: "The passcode has expired. Please request a new one."
      });
      return;
    }

    // Check if passcode has been used
    if (passcodeData.used) {
      res.status(400).json({
        error: "Passcode already used",
        message: "This passcode has already been used. Please request a new one."
      });
      return;
    }

    // Check attempt limit
    if (passcodeData.attempts >= 3) {
      res.status(400).json({
        error: "Too many attempts",
        message: "Too many failed attempts. Please request a new passcode."
      });
      return;
    }

    // Verify passcode
    if (passcodeData.passcode !== passcode) {
      // Increment attempts
      await db.collection("passcodes").doc(email).update({
        attempts: passcodeData.attempts + 1
      });

      res.status(400).json({
        error: "Invalid passcode",
        message: "The passcode is incorrect"
      });
      return;
    }

    // Mark passcode as used
    await db.collection("passcodes").doc(email).update({
      used: true,
      usedAt: new Date()
    });

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user account
        userRecord = await auth.createUser({
          email,
          emailVerified: true, // Email verified via passcode
          displayName: email.split('@')[0]
        });

        logger.info("New student user created", {
          uid: userRecord.uid,
          email: userRecord.email
        });
      } else {
        throw error;
      }
    }

    // Set custom claims for student role
    await auth.setCustomUserClaims(userRecord.uid, { role: 'student' });

    // Create or update user profile
    const profileData = {
      uid: userRecord.uid,
      email: email,
      displayName: userRecord.displayName || email.split('@')[0],
      role: 'student',
      updatedAt: new Date(),
      emailVerified: true,
      photoURL: null,
      phoneNumber: null,
      disabled: false,
      authMethod: 'passcode',
      lastPasscodeLogin: new Date(),
      studentData: {
        enrolledClasses: [],
        submittedAssignments: []
      }
    };

    // Check if profile exists
    const profileDoc = await db.collection("users").doc(userRecord.uid).get();
    
    if (!profileDoc.exists) {
      // Create new profile
      Object.assign(profileData, {
        createdAt: new Date(),
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date()
        }
      });
    }

    // Save profile to Firestore
    await db.collection("users").doc(userRecord.uid).set(profileData, { merge: true });

    // Generate custom token for authentication
    const customToken = await auth.createCustomToken(userRecord.uid);

    logger.info("Student authenticated successfully", {
      uid: userRecord.uid,
      email: email,
      isNewUser: !profileDoc.exists
    });

    res.status(200).json({
      success: true,
      message: "Authentication successful",
      customToken,
      user: {
        uid: userRecord.uid,
        email: email,
        displayName: profileData.displayName,
        role: 'student'
      },
      isNewUser: !profileDoc.exists
    });

  } catch (error: any) {
    logger.error("Verify passcode error", error);
    
    // Handle specific errors
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({
        error: "Email already exists",
        message: "An account with this email already exists"
      });
      return;
    }

    res.status(500).json({
      error: "Authentication failed",
      message: error.message || "An error occurred during authentication"
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Teacher authentication required"
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const auth = getAuth();
    
    // Verify teacher token
    const decodedToken = await auth.verifyIdToken(token);
    const db = getFirestore();
    
    // Get teacher profile to verify role
    const teacherDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!teacherDoc.exists || teacherDoc.data()?.role !== 'teacher') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only teachers can reset student authentication"
      });
      return;
    }

    // Validate request body
    const validationResult = resetStudentAuthSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: "Validation error",
        details: validationResult.error.errors
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
        studentEmail
      });
    }

    // Check if student account exists
    let studentExists = false;
    let studentUid = null;
    
    try {
      const studentRecord = await auth.getUserByEmail(studentEmail);
      studentExists = true;
      studentUid = studentRecord.uid;
      
      // Optionally disable the account temporarily for security
      // await auth.updateUser(studentRecord.uid, { disabled: false });
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Student doesn't have an account yet - that's fine
        studentExists = false;
      } else {
        throw error;
      }
    }

    // Generate a new passcode for immediate use
    const newPasscode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry for teacher-generated codes

    // Store the new passcode
    await db.collection("passcodes").doc(studentEmail).set({
      email: studentEmail,
      passcode: newPasscode,
      expiresAt,
      createdAt: new Date(),
      used: false,
      attempts: 0,
      teacherReset: true,
      resetByTeacher: decodedToken.uid,
      resetByTeacherEmail: decodedToken.email
    });

    logger.info("Teacher reset student authentication", {
      teacherUid: decodedToken.uid,
      teacherEmail: decodedToken.email,
      studentEmail,
      studentExists,
      studentUid
    });

    // Return the new passcode for teacher to share with student
    res.status(200).json({
      success: true,
      message: "Student authentication reset successfully",
      studentEmail,
      newPasscode,
      expiresAt: expiresAt.toISOString(),
      studentAccountExists: studentExists,
      instructions: [
        "Share this passcode with the student",
        "Student can use this passcode to log in immediately",
        "Passcode expires in 30 minutes",
        "Student should log in promptly to establish their account"
      ]
    });

  } catch (error: any) {
    logger.error("Reset student auth error", error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please log in again."
      });
      return;
    }

    res.status(500).json({
      error: "Reset failed",
      message: error.message || "An error occurred while resetting student authentication"
    });
  }
}