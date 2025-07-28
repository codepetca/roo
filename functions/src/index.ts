// Clear any explicit credential environment variables FIRST - before any imports
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log('Cleared GOOGLE_APPLICATION_CREDENTIALS environment variable');
}

import { onRequest, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { Request } from "express";
import { auth } from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

// Extended request interface with params
interface RequestWithParams extends Request {
  params: { [key: string]: string };
}

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

// Route handlers
import { getApiStatus, testGeminiConnection, testSheetsConnection } from "./routes/health";
import { createAssignment, listAssignments, testFirestoreWrite, testFirestoreRead } from "./routes/assignments";
import { testGrading, gradeQuiz, gradeQuizTest, gradeCode } from "./routes/grading";
import { getSheetsAssignments, getSheetsSubmissions, getAllSubmissions, getUngradedSubmissions, getAnswerKey, listSheetNames } from "./routes/sheets";
import { getGradesByAssignment, getGradeBySubmission, getUngradedSubmissions as getFirestoreUngradedSubmissions, createSubmission, getSubmissionsByAssignment, getSubmissionById, updateSubmissionStatus } from "./routes/grades";
import { syncAssignments, syncSubmissions, syncAllData } from "./routes/sync";
import { startTeacherOnboarding, completeTeacherOnboarding, createTeacherSheet, getTeacherOnboardingStatus, checkTeacherOnboardingStatus, listConfiguredTeachers, generateAppScriptForTeacher } from "./routes/teacher-onboarding";
import { getTeacherClassrooms, getClassroomAssignments } from "./routes/classrooms";
import { createUserProfile, getUserProfile, updateUserProfile, checkUserProfileExists } from "./routes/users";
import { debugSheetsPermissions } from "./routes/debug";

// Define secrets and parameters  
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const googleCredentials = defineSecret("GOOGLE_CREDENTIALS_JSON");

/**
 * Main API router for Roo auto-grading system
 * Location: functions/src/index.ts:15
 * Architecture: Modular route handlers for maintainability
 */
export const api = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey, googleCredentials]
  },
  async (request, response): Promise<void> => {
    // Set CORS headers manually for development
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    response.set('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return Promise.resolve();
    }

    logger.info("Roo API function called", {
      method: request.method,
      path: request.path,
      structuredData: true
    });

    // Make secrets available to route handlers
    try {
      request.app.locals.geminiApiKey = geminiApiKey.value();
      request.app.locals.googleCredentials = googleCredentials.value();
      logger.info("Secrets loaded successfully");
    } catch (error) {
      logger.error("Failed to load secrets", error);
      request.app.locals.geminiApiKey = null;
      request.app.locals.googleCredentials = null;
    }

    try {
      const { method, path } = request;
      
      // Note: Auth signup removed - using Firebase Auth SDK directly in frontend
      
      // Health check routes
      if (method === "GET" && path === "/") {
        await getApiStatus(request, response);
        return;
      }
      if (method === "GET" && path === "/gemini/test") {
        await testGeminiConnection(request, response); return;
      }
      if (method === "GET" && path === "/sheets/test") {
        await testSheetsConnection(request, response); return;
      }
      
      // Debug routes
      if (method === "GET" && path === "/debug/sheets-permissions") {
        await debugSheetsPermissions(request, response); return;
      }

      // Assignment routes
      if (method === "POST" && path === "/assignments") {
        await createAssignment(request, response); return;
      }
      if (method === "GET" && path === "/assignments") {
        await listAssignments(request, response); return;
      }
      if (method === "POST" && path === "/test-write") {
        await testFirestoreWrite(request, response); return;
      }
      if (method === "GET" && path === "/test-read") {
        await testFirestoreRead(request, response); return;
      }

      // Grading routes
      if (method === "POST" && path === "/test-grading") {
        await testGrading(request, response); return;
      }
      if (method === "POST" && path === "/grade-quiz-test") {
        await gradeQuizTest(request, response); return;
      }
      if (method === "POST" && path === "/grade-quiz") {
        await gradeQuiz(request, response); return;
      }
      if (method === "POST" && path === "/grade-code") {
        await gradeCode(request, response); return;
      }

      // Sheets integration routes
      if (method === "GET" && path === "/sheets/assignments") {
        await getSheetsAssignments(request, response); return;
      }
      if (method === "POST" && path === "/sheets/submissions") {
        await getSheetsSubmissions(request, response); return;
      }
      if (method === "GET" && path === "/sheets/all-submissions") {
        await getAllSubmissions(request, response); return;
      }
      if (method === "GET" && path === "/sheets/ungraded") {
        await getUngradedSubmissions(request, response); return;
      }
      if (method === "POST" && path === "/sheets/answer-key") {
        await getAnswerKey(request, response); return;
      }
      if (method === "GET" && path === "/sheets/list-sheets") {
        await listSheetNames(request, response); return;
      }

      // Sync routes
      if (method === "POST" && path === "/sync/assignments") {
        await syncAssignments(request, response); return;
      }
      if (method === "POST" && path === "/sync/submissions") {
        await syncSubmissions(request, response); return;
      }
      if (method === "POST" && path === "/sync/all") {
        await syncAllData(request, response); return;
      }

      // Teacher onboarding routes
      if (method === "POST" && path === "/teacher/create-sheet") {
        await createTeacherSheet(request, response); return;
      }
      if (method === "GET" && path === "/teacher/onboarding-status") {
        await checkTeacherOnboardingStatus(request, response); return;
      }
      if (method === "POST" && path === "/teacher/onboarding/start") {
        await startTeacherOnboarding(request, response); return;
      }
      if (method === "POST" && path === "/teacher/onboarding/complete") {
        await completeTeacherOnboarding(request, response); return;
      }
      if (method === "GET" && path.startsWith("/teacher/onboarding/status/")) {
        const email = path.split("/teacher/onboarding/status/")[1];
        (request as RequestWithParams).params = { email };
        await getTeacherOnboardingStatus(request, response); return;
      }
      if (method === "GET" && path === "/teacher/list") {
        await listConfiguredTeachers(request, response); return;
      }
      if (method === "GET" && path.includes("/teacher/") && path.endsWith("/appscript")) {
        const pathParts = path.split("/");
        const email = pathParts[pathParts.indexOf("teacher") + 1];
        (request as RequestWithParams).params = { email };
        await generateAppScriptForTeacher(request, response); return;
      }

      // Classroom routes
      if (method === "GET" && path === "/classrooms/teacher") {
        await getTeacherClassrooms(request, response); return;
      }
      if (method === "GET" && path.startsWith("/classrooms/") && path.includes("/assignments")) {
        const classroomId = path.split("/classrooms/")[1].split("/assignments")[0];
        (request as RequestWithParams).params = { classroomId };
        await getClassroomAssignments(request, response); return;
      }

      // Firestore Grade Management Routes
      if (method === "GET" && path.startsWith("/grades/assignment/")) {
        const assignmentId = path.split("/grades/assignment/")[1];
        (request as RequestWithParams).params = { assignmentId };
        await getGradesByAssignment(request, response); return;
      }
      if (method === "GET" && path.startsWith("/grades/submission/")) {
        const submissionId = path.split("/grades/submission/")[1];
        (request as RequestWithParams).params = { submissionId };
        await getGradeBySubmission(request, response); return;
      }
      if (method === "GET" && path === "/grades/ungraded") {
        await getFirestoreUngradedSubmissions(request, response); return;
      }
      if (method === "POST" && path === "/submissions") {
        await createSubmission(request, response); return;
      }
      if (method === "GET" && path.startsWith("/submissions/assignment/")) {
        const assignmentId = path.split("/submissions/assignment/")[1];
        (request as RequestWithParams).params = { assignmentId };
        await getSubmissionsByAssignment(request, response); return;
      }
      if (method === "GET" && path.startsWith("/submissions/") && !path.includes("/assignment/")) {
        const submissionId = path.split("/submissions/")[1];
        (request as RequestWithParams).params = { submissionId };
        await getSubmissionById(request, response); return;
      }
      if (method === "PATCH" && path.includes("/submissions/") && path.endsWith("/status")) {
        const pathParts = path.split("/");
        const submissionId = pathParts[pathParts.indexOf("submissions") + 1];
        (request as RequestWithParams).params = { submissionId };
        await updateSubmissionStatus(request, response); return;
      }

      // User profile routes
      if (method === "POST" && path === "/users/profile") {
        await createUserProfile(request, response); return;
      }
      if (method === "GET" && path === "/users/profile") {
        await getUserProfile(request, response); return;
      }
      if (method === "PUT" && path === "/users/profile") {
        await updateUserProfile(request, response); return;
      }
      if (method === "GET" && path === "/users/profile/exists") {
        await checkUserProfileExists(request, response); return;
      }

      // Default 404
      response.status(404).json({
        error: "Endpoint not found",
        path: request.path,
        method: request.method
      });
      
    } catch (error) {
      logger.error("API error", error);
      response.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

/**
 * Firebase Auth trigger - Creates user profile when a new user is created
 * Location: functions/src/index.ts:235
 */

/**
 * Automatically create user profile when a new user is created in Firebase Auth
 */
export const onUserCreated = auth.user().onCreate(async (user) => {
  logger.info("New user created in Firebase Auth", {
    uid: user.uid,
    email: user.email,
    customClaims: user.customClaims
  });

  const db = getFirestore();

  try {
    // Wait a short time to allow frontend to create profile with correct role
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    
    // Check if user profile already exists (may have been created by frontend)
    const profileDoc = await db.collection("users").doc(user.uid).get();
    if (profileDoc.exists) {
      logger.info("User profile already exists (created by frontend)", { uid: user.uid });
      return;
    }

    // If no profile exists after waiting, create with default role
    // This handles edge cases where frontend fails to create profile
    const role = user.customClaims?.role || 'student';

    // Create user profile
    const profileData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      role: role,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: user.emailVerified || false,
      photoURL: user.photoURL || null,
      phoneNumber: user.phoneNumber || null,
      disabled: user.disabled || false,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime || null
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

    await db.collection("users").doc(user.uid).set(profileData);
    
    logger.info("User profile created successfully", {
      uid: user.uid,
      email: user.email,
      role: role,
      calledBy: 'onUserCreated (after 2s delay)'
    });

  } catch (error) {
    logger.error("Failed to create user profile", {
      uid: user.uid,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
});

/**
 * Callable function to create profile for existing auth users
 * Can be called manually to fix users created before the trigger was added
 */
export const createProfileForExistingUser = onCall(
  { cors: true },
  async (request) => {
    const { uid, role } = request.data;
    
    logger.info("createProfileForExistingUser called", { uid, role });
    
    if (!uid) {
      throw new Error("User ID is required");
    }

    const db = getFirestore();
    
    try {
      // Check if profile already exists
      const profileDoc = await db.collection("users").doc(uid).get();
      if (profileDoc.exists) {
        logger.info("Profile already exists, not overwriting", { 
          uid, 
          existingRole: profileDoc.data()?.role 
        });
        return { 
          success: false, 
          message: "User profile already exists",
          profile: profileDoc.data()
        };
      }

      // Get user from Firebase Auth
      const { getAuth } = await import("firebase-admin/auth");
      const adminAuth = getAuth();
      const user = await adminAuth.getUser(uid);

      // Create profile
      const profileData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: role || user.customClaims?.role || 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: user.emailVerified || false,
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || null,
        disabled: user.disabled || false,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime || null
        }
      };

      // Add role-specific fields
      if (profileData.role === 'teacher') {
        Object.assign(profileData, {
          teacherData: {
            configuredSheets: false,
            sheetId: null,
            lastSync: null,
            classrooms: []
          }
        });
      } else if (profileData.role === 'student') {
        Object.assign(profileData, {
          studentData: {
            enrolledClasses: [],
            submittedAssignments: []
          }
        });
      }

      await db.collection("users").doc(user.uid).set(profileData);
      
      logger.info("User profile created successfully", { 
        uid: user.uid, 
        role: profileData.role,
        calledBy: 'createProfileForExistingUser'
      });
      
      return { 
        success: true, 
        message: "User profile created successfully",
        profile: profileData
      };

    } catch (error) {
      logger.error("Failed to create profile for existing user", {
        uid,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
);