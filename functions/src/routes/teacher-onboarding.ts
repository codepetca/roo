/**
 * Simplified teacher onboarding API endpoints - app owns all sheets
 * Location: functions/src/routes/teacher-onboarding.ts:1
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { z } from "zod";
import { handleRouteError, sendApiResponse, validateData, getUserFromRequest } from "../middleware/validation";
import { createOAuthSheetTemplateService } from "../services/sheet-template";
import { getTeacherSheetsConfig, updateTeacherConfiguration, verifyTeacherSheetAccess } from "../config/teachers";
import { db } from "../config/firebase";

// Validation schemas
const createTeacherSheetSchema = z.object({
  boardAccountEmail: z.string().email(), // Legacy field name for backward compatibility
  sheetTitle: z.string().min(1).optional(),
});

const createTeacherSheetOAuthSchema = z.object({
  boardAccountEmail: z.string().email(), // Legacy field name for backward compatibility
  sheetTitle: z.string().min(1).optional(),
  googleAccessToken: z.string().min(1),
});

/**
 * Create a Google Sheet for a teacher (legacy endpoint - redirects to OAuth)
 * Location: functions/src/routes/teacher-onboarding.ts:18
 * Route: POST /teacher/create-sheet
 */
export async function createTeacherSheet(req: Request, res: Response) {
  try {
    sendApiResponse(
      res,
      {
        error: "This endpoint has been deprecated. Please use OAuth flow instead.",
        redirectTo: "/teacher/create-sheet-oauth",
        message: "Service account authentication is no longer supported. Please use the OAuth flow.",
      },
      false,
      "Deprecated endpoint - use OAuth flow instead"
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Create a Google Sheet for a teacher using OAuth (new approach)
 * Location: functions/src/routes/teacher-onboarding.ts:125
 * Route: POST /teacher/create-sheet-oauth
 */
export async function createTeacherSheetOAuth(req: Request, res: Response) {
  try {
    const validatedData = validateData(createTeacherSheetOAuthSchema, req.body);
    logger.info("Creating OAuth sheet for board account", { boardAccountEmail: validatedData.boardAccountEmail });

    // Get authenticated user from token
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return sendApiResponse(
        res,
        { error: "Only authenticated teachers can create sheets" },
        false,
        "Unauthorized - teacher authentication required"
      );
    }

    // Check if board account already has a sheet
    const existingConfig = await getTeacherSheetsConfig();
    if (existingConfig[validatedData.boardAccountEmail]) {
      return sendApiResponse(
        res,
        {
          alreadyConfigured: true,
          spreadsheetId: existingConfig[validatedData.boardAccountEmail],
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${existingConfig[validatedData.boardAccountEmail]}/edit`,
        },
        true,
        "Board account already has a configured Google Sheet"
      );
    }

    // Create sheet template service using teacher's OAuth access token
    let oauthSheetService;
    try {
      oauthSheetService = createOAuthSheetTemplateService(validatedData.googleAccessToken);
    } catch (error) {
      logger.error("Failed to initialize OAuth Google Sheets service", error);
      return sendApiResponse(
        res,
        { error: "Failed to initialize Google Sheets service with your credentials. Please try signing in again." },
        false,
        "OAuth Sheets service initialization failed"
      );
    }

    // Generate sheet title
    const sheetTitle =
      validatedData.sheetTitle || `Roo Auto-Grading - ${validatedData.boardAccountEmail.split("@")[0]}`;

    // Create the sheet in teacher's Drive and share with board account
    const sheetResult = await oauthSheetService.createTeacherSheet({
      title: sheetTitle,
      boardAccountEmail: validatedData.boardAccountEmail,
    });

    if (!sheetResult.success) {
      return sendApiResponse(res, { error: sheetResult.error }, false, "Failed to create Google Sheet using OAuth");
    }

    // Update configuration (save to Firestore)
    await updateTeacherConfiguration(user.uid, validatedData.boardAccountEmail, sheetResult.spreadsheetId, "oauth");

    // Store the teacher's Google access token in their profile for future use
    await db.collection("users").doc(user.uid).update({
      "teacherData.googleAccessToken": validatedData.googleAccessToken,
      "teacherData.configuredSheets": true,
      "teacherData.sheetId": sheetResult.spreadsheetId,
      "teacherData.boardAccountEmail": validatedData.boardAccountEmail, // Legacy field
      "schoolEmail": validatedData.boardAccountEmail, // New normalized field
      "teacherData.lastSync": new Date(),
      updatedAt: new Date(),
    });

    // Generate AppScript code for the board account
    const appScriptCode = oauthSheetService.generateAppScriptCode(
      sheetResult.spreadsheetId,
      validatedData.boardAccountEmail
    );

    sendApiResponse(
      res,
      {
        spreadsheetId: sheetResult.spreadsheetId,
        spreadsheetUrl: sheetResult.spreadsheetUrl,
        sheetTitle: sheetResult.title,
        appScriptCode,
        method: "oauth",
        teacherEmail: user.email,
        nextSteps: [
          "Google Sheet created in your personal Google Drive",
          `Sheet shared with board account: ${validatedData.boardAccountEmail}`,
          "Copy the complete AppScript code below (scroll down to see all)",
          "Open Google Apps Script (script.google.com) in your board account",
          "Create a new project and name it 'roo'",
          "Replace all default code with the code below",
          "Save the project (Ctrl+S or Cmd+S)",
          "Run 'setupTriggers' function once to enable daily sync",
          "Run 'processAllSubmissions' to test immediately",
          "Board data will sync automatically daily at 10 PM",
        ],
      },
      true,
      "Google Sheet created successfully using OAuth!"
    );

    logger.info("OAuth sheet created successfully", {
      teacherUid: user.uid,
      teacherEmail: user.email,
      boardAccountEmail: validatedData.boardAccountEmail,
      spreadsheetId: sheetResult.spreadsheetId,
    });
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Get teacher onboarding status
 * Location: functions/src/routes/teacher-onboarding.ts:85
 * Route: GET /teacher/onboarding/status/{email}
 */
export async function getTeacherOnboardingStatus(req: Request, res: Response) {
  try {
    const teacherEmail = req.params.email;

    if (!teacherEmail) {
      return sendApiResponse(res, { error: "Teacher email is required" }, false, "Missing teacher email parameter");
    }

    // Check current configuration
    const existingConfig = getTeacherSheetsConfig();
    const isConfigured = !!existingConfig[teacherEmail];

    sendApiResponse(
      res,
      {
        teacherEmail,
        isConfigured,
        spreadsheetId: isConfigured ? existingConfig[teacherEmail] : null,
        nextSteps: isConfigured
          ? ["Teacher is fully configured and ready to sync"]
          : ["Create Google Sheet for this teacher", "Configure AppScript in board account"],
      },
      true,
      isConfigured ? "Teacher is configured" : "Teacher needs sheet creation"
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * List all configured teachers (admin endpoint)
 * Location: functions/src/routes/teacher-onboarding.ts:122
 * Route: GET /teacher/list
 */
export async function listConfiguredTeachers(req: Request, res: Response) {
  try {
    const teacherConfig = getTeacherSheetsConfig();

    const teachers = Object.entries(teacherConfig).map(([email, spreadsheetId]) => ({
      email,
      spreadsheetId,
      isConfigured: true,
    }));

    sendApiResponse(
      res,
      {
        teachers,
        count: teachers.length,
      },
      true,
      `Found ${teachers.length} configured teachers`
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Generate fresh AppScript code for an existing teacher
 * Location: functions/src/routes/teacher-onboarding.ts:150
 * Route: GET /teacher/{email}/appscript
 */
export async function generateAppScriptForTeacher(req: Request, res: Response) {
  try {
    const teacherEmail = req.params.email;

    if (!teacherEmail) {
      return sendApiResponse(res, { error: "Teacher email is required" }, false, "Missing teacher email parameter");
    }

    // Get teacher's spreadsheet ID
    const teacherConfig = getTeacherSheetsConfig();
    const spreadsheetId = teacherConfig[teacherEmail];

    if (!spreadsheetId) {
      return sendApiResponse(
        res,
        { error: "Teacher is not configured" },
        false,
        "Teacher needs to have a sheet created first"
      );
    }

    // Get authenticated user from token
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return sendApiResponse(
        res,
        { error: "Only authenticated teachers can generate AppScript code" },
        false,
        "Unauthorized - teacher authentication required"
      );
    }

    // Get teacher's stored access token
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const googleAccessToken = userData?.teacherData?.googleAccessToken;

    if (!googleAccessToken) {
      return sendApiResponse(
        res,
        { error: "No Google access token found. Please re-authenticate with Google." },
        false,
        "Google access token required"
      );
    }

    // Create OAuth sheet service for code generation
    const oauthSheetService = createOAuthSheetTemplateService(googleAccessToken);
    const appScriptCode = oauthSheetService.generateAppScriptCode(spreadsheetId, teacherEmail);

    sendApiResponse(
      res,
      {
        teacherEmail,
        spreadsheetId,
        appScriptCode,
        instructions: [
          "Copy this code to your board account's Google Apps Script",
          "Create a new project if needed",
          "Run 'setupTriggers' function once to enable daily sync",
          "Run 'processAllSubmissions' to test immediately",
        ],
      },
      true,
      "AppScript code generated successfully"
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

// Keep these exports for compatibility but they now use the simplified flow
export const startTeacherOnboarding = createTeacherSheet;
export const completeTeacherOnboarding = createTeacherSheet;

/**
 * Check teacher onboarding status
 * Location: functions/src/routes/teacher-onboarding.ts:240
 * Route: GET /teacher/onboarding-status
 */
export async function checkTeacherOnboardingStatus(req: Request, res: Response): Promise<void> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      res.status(403).json({
        success: false,
        error: "Only teachers can check onboarding status",
      });
      return;
    }

    // Check if teacher has any classrooms
    const classroomsSnapshot = await db.collection("classrooms").where("teacherId", "==", user.uid).limit(1).get();

    const hasClassrooms = !classroomsSnapshot.empty;

    // Check if teacher has sheet configured in their Firestore profile
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const teacherData = userData?.teacherData || {};
    
    const hasSheetConfigured = !!teacherData.configuredSheets && !!teacherData.sheetId;
    const boardAccountEmail = teacherData.boardAccountEmail || userData?.schoolEmail || "";
    
    // Also check the global config to ensure consistency
    const existingConfig = await getTeacherSheetsConfig();
    const sheetIdFromConfig = boardAccountEmail ? existingConfig[boardAccountEmail] : null;

    // Verify that the sheet actually exists in the teacher's Drive
    let sheetVerification = null;
    let sheetExistsInTeacherDrive = false;
    
    if (hasSheetConfigured && teacherData.sheetId) {
      // First check if the sheet exists using the board account verification
      if (boardAccountEmail) {
        try {
          sheetVerification = await verifyTeacherSheetAccess(boardAccountEmail);
        } catch (error) {
          logger.warn("Sheet verification failed during onboarding status check", {
            teacherId: user.uid,
            boardAccountEmail,
            error,
          });
        }
      }
      
      // Additionally, check if the _roo_data sheet exists in teacher's Drive using their access token
      if (teacherData.googleAccessToken) {
        try {
          const oauthSheetService = createOAuthSheetTemplateService(teacherData.googleAccessToken);
          const rooDataSheetId = await oauthSheetService.getRooDataSheetId();
          
          // Verify the sheet ID matches what we have stored
          sheetExistsInTeacherDrive = rooDataSheetId === teacherData.sheetId;
          
          if (!sheetExistsInTeacherDrive && rooDataSheetId) {
            // If there's a mismatch, log it for debugging
            logger.warn("Sheet ID mismatch detected", {
              teacherId: user.uid,
              storedSheetId: teacherData.sheetId,
              foundSheetId: rooDataSheetId
            });
          }
        } catch (error) {
          logger.warn("Failed to verify sheet in teacher's Drive", {
            teacherId: user.uid,
            error
          });
        }
      } else {
        // No access token means they haven't set up sheets yet
        sheetExistsInTeacherDrive = false;
      }
    }

    // Determine if onboarding is needed
    // Sheet must be configured AND accessible for teacher to be fully onboarded
    const sheetAccessible = Boolean(sheetVerification?.exists && sheetVerification?.accessible);
    const needsOnboarding = !hasClassrooms || !hasSheetConfigured || !sheetAccessible || !sheetExistsInTeacherDrive;

    logger.info("Teacher onboarding status checked", {
      teacherId: user.uid,
      hasClassrooms,
      hasSheetConfigured,
      sheetAccessible,
      sheetExistsInTeacherDrive,
      needsOnboarding,
      boardAccountEmail,
      sheetIdFromFirestore: teacherData.sheetId,
      sheetIdFromConfig,
      sheetVerificationError: sheetVerification?.error,
    });

    sendApiResponse(
      res,
      {
        hasClassrooms: Boolean(hasClassrooms),
        hasSheetConfigured: Boolean(hasSheetConfigured),
        sheetAccessible: Boolean(sheetAccessible),
        sheetExistsInTeacherDrive: Boolean(sheetExistsInTeacherDrive),
        needsOnboarding: Boolean(needsOnboarding),
        boardAccountEmail: hasSheetConfigured ? boardAccountEmail : undefined,
        sheetVerification: sheetVerification || undefined,
      },
      true,
      "Onboarding status retrieved"
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}
