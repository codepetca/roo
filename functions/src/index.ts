// Clear any explicit credential environment variables FIRST - before any imports
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log("Cleared GOOGLE_APPLICATION_CREDENTIALS environment variable");
}

import { onRequest, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { Request } from "express";
import { auth } from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { userDomainSchema } from "./schemas/domain";
import { getCurrentTimestamp } from "./config/firebase";

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
import { testGrading, gradeQuiz, gradeQuizTest, gradeCode, gradeAllAssignments } from "./routes/grading";
import { getSheetsAssignments, getSheetsSubmissions, getAllSubmissions, getUngradedSubmissions, getAnswerKey, listSheetNames } from "./routes/sheets";
import { getGradesByAssignment, getGradeBySubmission, getUngradedSubmissions as getFirestoreUngradedSubmissions, createSubmission, getSubmissionsByAssignment, getSubmissionById, updateSubmissionStatus } from "./routes/grades";
import { syncAssignments, syncSubmissions, syncAllData } from "./routes/sync";
import { startTeacherOnboarding, completeTeacherOnboarding, createTeacherSheet, createTeacherSheetOAuth, getTeacherOnboardingStatus, checkTeacherOnboardingStatus, listConfiguredTeachers, generateAppScriptForTeacher } from "./routes/teacher-onboarding";
import { getTeacherClassrooms, getClassroomAssignments, getClassroomDetails, processClassroomSnapshot, getUngradedSubmissions as getClassroomUngradedSubmissions, updateClassroomCounts } from "./routes/classrooms";
import { validateSnapshot, importSnapshot, getImportHistory, generateSnapshotDiff } from "./routes/snapshots";
import { getUserFromRequest } from "./middleware/validation";
import { getTeacherDashboard, getTeacherClassroomsBasic, getClassroomStats, getClassroomAssignmentsWithStats } from "./routes/teacher-dashboard";
import { getStudentDashboard, getStudentAssignments, getStudentActivity } from "./routes/student-dashboard";
import { handleClassroomSyncWebhook, getWebhookStatus } from "./routes/webhooks";
import { getUserProfile, checkUserProfileExists, updateSchoolEmail } from "./routes/users";
import { deleteUser, setupTeacherProfile, generateAndSendPasscode } from "./routes/auth";
import { studentRequestPasscode } from "./routes/auth/student-request-passcode";
import { debugSheetsPermissions } from "./routes/debug";
import { getServiceAccountInfo, testSheetAccess } from "./routes/webhook-debug";

// Define secrets and parameters  
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const googleCredentials = defineSecret("GOOGLE_CREDENTIALS_JSON");
const brevoApiKey = defineSecret("BREVO_API_KEY");

/**
 * Main API router for Roo auto-grading system
 * Location: functions/src/index.ts:15
 * Architecture: Modular route handlers for maintainability
 */
export const api = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey, googleCredentials, brevoApiKey]
  },
  async (request, response): Promise<void> => {
    // Set CORS headers manually for development
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    response.set("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      response.status(204).send("");
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
      request.app.locals.brevoApiKey = brevoApiKey.value();
      logger.info("Secrets loaded successfully");
    } catch (error) {
      logger.error("Failed to load secrets", error);
      request.app.locals.geminiApiKey = null;
      request.app.locals.googleCredentials = null;
      request.app.locals.brevoApiKey = null;
    }

    try {
      const { method, path } = request;
      
      // Note: Auth signup removed - using Firebase Auth SDK directly in frontend
      // Force deployment: includes enrollment fix for assignments view
      
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
      if (method === "POST" && path === "/grade-assignment") {
        await gradeCode(request, response); return;
      }
      if (method === "POST" && path === "/grade-all-assignments") {
        await gradeAllAssignments(request, response); return;
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
      if (method === "POST" && path === "/teacher/create-sheet-oauth") {
        await createTeacherSheetOAuth(request, response); return;
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
      if (method === "GET" && path.startsWith("/classrooms/") && path.endsWith("/stats")) {
        const classroomId = path.split("/classrooms/")[1].split("/stats")[0];
        (request as RequestWithParams).params = { classroomId };
        await getClassroomStats(request, response); return;
      }
      if (method === "GET" && path.startsWith("/classrooms/") && path.includes("/assignments/stats")) {
        const classroomId = path.split("/classrooms/")[1].split("/assignments/stats")[0];
        (request as RequestWithParams).params = { classroomId };
        await getClassroomAssignmentsWithStats(request, response); return;
      }
      if (method === "POST" && path === "/classrooms/sync-from-sheets") {
        // Legacy route - replaced with snapshot processing
        await processClassroomSnapshot(request, response); return;
      }

      // Snapshot import routes
      if (method === "POST" && path === "/snapshots/validate") {
        await validateSnapshot(request, response); return;
      }
      if (method === "POST" && path === "/snapshots/import") {
        await importSnapshot(request, response); return;
      }
      if (method === "GET" && path === "/snapshots/history") {
        await getImportHistory(request, response); return;
      }
      if (method === "POST" && path === "/snapshots/diff") {
        await generateSnapshotDiff(request, response); return;
      }
      

      // Teacher dashboard routes
      if (method === "GET" && path === "/teacher/dashboard") {
        await getTeacherDashboard(request, response); return;
      }
      if (method === "GET" && path === "/teacher/classrooms") {
        await getTeacherClassroomsBasic(request, response); return;
      }

      // Student dashboard routes
      if (method === "GET" && path === "/student/dashboard") {
        await getStudentDashboard(request, response); return;
      }
      if (method === "GET" && path === "/student/assignments") {
        await getStudentAssignments(request, response); return;
      }
      if (method === "GET" && path === "/student/activity") {
        await getStudentActivity(request, response); return;
      }

      // Submission routes
      if (method === "GET" && path.startsWith("/submissions/assignment/")) {
        const assignmentId = path.split("/submissions/assignment/")[1];
        (request as RequestWithParams).params = { assignmentId };
        await getSubmissionsByAssignment(request, response); return;
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

      // Auth routes
      // Note: Profile creation now handled by 'createProfileForExistingUser' callable function
      if (method === "DELETE" && path.startsWith("/auth/user/")) {
        const pathParts = path.split("/");
        const uid = pathParts[pathParts.length - 1];
        (request as RequestWithParams).params = { uid };
        await deleteUser(request, response); return;
      }
      if (method === "POST" && path === "/auth/student-request-passcode") {
        await studentRequestPasscode(request, response); return;
      }
      if (method === "POST" && path === "/auth/setup-teacher-profile") {
        await setupTeacherProfile(request, response); return;
      }
      if (method === "POST" && path === "/auth/generate-and-send-passcode") {
        await generateAndSendPasscode(request, response); return;
      }

      // User profile routes (create/update now handled by callable function)
      if (method === "GET" && path === "/users/profile") {
        await getUserProfile(request, response); return;
      }
      if (method === "GET" && path === "/users/profile/exists") {
        await checkUserProfileExists(request, response); return;
      }
      if (method === "PATCH" && path === "/users/profile/school-email") {
        await updateSchoolEmail(request, response); return;
      }

      // Webhook routes  
      if (method === "POST" && path === "/webhooks/classroom-sync") {
        await handleClassroomSyncWebhook(request, response); return;
      }
      if (method === "GET" && path === "/webhooks/status") {
        await getWebhookStatus(request, response); return;
      }
      // Webhook debug routes
      if (method === "GET" && path === "/webhooks/debug/service-account") {
        await getServiceAccountInfo(request, response); return;
      }
      if (method === "GET" && path === "/webhooks/debug/test-sheet") {
        await testSheetAccess(request, response); return;
      }
      
      // Debug routes temporarily disabled
      // if (method === "GET" && path === "/debug/firestore") {
      //   const { debugFirestore } = await import("./routes/debug-firestore");
      //   await debugFirestore(request, response); return;
      // }
      // if (method === "GET" && path === "/debug/validate") {
      //   const { debugValidation } = await import("./routes/debug-firestore");
      //   await debugValidation(request, response); return;
      // }

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

// NOTE: Removed onUserCreated auth trigger to avoid conflicts with createProfileForExistingUser
// All user profile creation is now handled through the callable function for consistency

/**
 * Callable function to create profile for existing auth users using proper domain schema
 * Supports schoolEmail field for teachers and proper validation
 */
export const createProfileForExistingUser = onCall(
  { cors: true },
  async (request) => {
    const { uid, role, schoolEmail, displayName } = request.data;
    
    logger.info("createProfileForExistingUser called", { uid, role, schoolEmail });
    
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

      // Create user profile using domain schema
      const now = getCurrentTimestamp();
      const userDomain = {
        id: user.uid,
        email: user.email || "",
        displayName: displayName || user.displayName || user.email?.split("@")[0] || "User",
        role: role || user.customClaims?.role || "student",
        schoolEmail: schoolEmail || undefined, // Optional school email for teachers
        classroomIds: [],
        totalClassrooms: 0,
        totalStudents: 0,
        isActive: true,
        lastLogin: now,
        createdAt: now,
        updatedAt: now
      };

      // Validate with domain schema
      const validatedUser = userDomainSchema.parse(userDomain);
      
      // Save to Firestore
      await db.collection("users").doc(user.uid).set(validatedUser);
      
      // Set custom claims in Firebase Auth for role-based access
      await adminAuth.setCustomUserClaims(user.uid, { role: validatedUser.role });
      
      logger.info("User profile created successfully", { 
        uid: user.uid, 
        role: validatedUser.role,
        schoolEmail: validatedUser.schoolEmail,
        calledBy: "createProfileForExistingUser"
      });
      
      return { 
        success: true, 
        message: "User profile created successfully",
        profile: validatedUser
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