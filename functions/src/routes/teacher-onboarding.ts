/**
 * Simplified teacher onboarding API endpoints - app owns all sheets
 * Location: functions/src/routes/teacher-onboarding.ts:1
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { z } from "zod";
import { handleRouteError, sendApiResponse, validateData, getUserFromRequest } from "../middleware/validation";
import { createSheetTemplateService } from "../services/sheet-template";
import { getTeacherSheetsConfig, updateTeacherConfiguration } from "../config/teachers";
import { db } from "../config/firebase";

// Validation schemas
const createTeacherSheetSchema = z.object({
  boardAccountEmail: z.string().email(),
  sheetTitle: z.string().min(1).optional()
});

/**
 * Create a Google Sheet for a teacher (simplified - no OAuth required)
 * Location: functions/src/routes/teacher-onboarding.ts:18
 * Route: POST /teacher/create-sheet
 */
export async function createTeacherSheet(req: Request, res: Response) {
  try {
    const validatedData = validateData(createTeacherSheetSchema, req.body);
    logger.info("Creating sheet for board account", { boardAccountEmail: validatedData.boardAccountEmail });

    // Check if board account already has a sheet
    const existingConfig = getTeacherSheetsConfig();
    if (existingConfig[validatedData.boardAccountEmail]) {
      return sendApiResponse(
        res,
        { 
          alreadyConfigured: true,
          spreadsheetId: existingConfig[validatedData.boardAccountEmail],
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${existingConfig[validatedData.boardAccountEmail]}/edit`
        },
        true,
        "Board account already has a configured Google Sheet"
      );
    }

    // Create sheet template service using our service account
    let sheetTemplateService;
    try {
      const googleCredentials = req.app.locals.googleCredentials;
      sheetTemplateService = await createSheetTemplateService(googleCredentials);
    } catch (error) {
      logger.error("Failed to initialize Google Sheets service", error);
      return sendApiResponse(
        res,
        { error: "Google Sheets service is not available. Please contact administrator." },
        false,
        "Google Sheets service initialization failed"
      );
    }

    // Generate sheet title
    const sheetTitle = validatedData.sheetTitle || `Roo Auto-Grading - ${validatedData.boardAccountEmail.split("@")[0]}`;

    // Create the sheet in our account and share with board account
    const sheetResult = await sheetTemplateService.createTeacherSheet({
      title: sheetTitle,
      boardAccountEmail: validatedData.boardAccountEmail
    });

    if (!sheetResult.success) {
      return sendApiResponse(
        res,
        { error: sheetResult.error },
        false,
        "Failed to create Google Sheet"
      );
    }

    // Update configuration (use board account as key)
    await updateTeacherConfiguration(validatedData.boardAccountEmail, sheetResult.spreadsheetId);

    // Generate AppScript code for the board account
    const appScriptCode = sheetTemplateService.generateAppScriptCode(
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
        nextSteps: [
          "Google Sheet created in our system",
          `Sheet shared with board account: ${validatedData.boardAccountEmail}`,
          "Copy the AppScript code below",
          "Open Google Apps Script in your board account",
          "Create a new project and paste the code",
          "Run 'setupTriggers' function once",
          "Run 'processAllSubmissions' to test",
          "Board data will sync automatically"
        ]
      },
      true,
      "Google Sheet created successfully!"
    );

    logger.info("Sheet created successfully", {
      boardAccountEmail: validatedData.boardAccountEmail,
      spreadsheetId: sheetResult.spreadsheetId
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
      return sendApiResponse(
        res,
        { error: "Teacher email is required" },
        false,
        "Missing teacher email parameter"
      );
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
          : ["Create Google Sheet for this teacher", "Configure AppScript in board account"]
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
      isConfigured: true
    }));

    sendApiResponse(
      res,
      {
        teachers,
        count: teachers.length
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
      return sendApiResponse(
        res,
        { error: "Teacher email is required" },
        false,
        "Missing teacher email parameter"
      );
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

    // Create sheet template service for code generation
    const sheetTemplateService = await createSheetTemplateService();
    const appScriptCode = sheetTemplateService.generateAppScriptCode(spreadsheetId, teacherEmail);

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
          "Run 'processAllSubmissions' to test immediately"
        ]
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
export async function checkTeacherOnboardingStatus(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can check onboarding status" 
      });
    }

    // Check if teacher has any classrooms
    const classroomsSnapshot = await db
      .collection("classrooms")
      .where("teacherId", "==", user.uid)
      .limit(1)
      .get();
    
    const hasClassrooms = !classroomsSnapshot.empty;

    // Check if teacher has sheet configured
    const existingConfig = getTeacherSheetsConfig();
    const boardAccountEmail = user.email || "";
    const hasSheetConfigured = !!existingConfig[boardAccountEmail];

    // Determine if onboarding is needed
    const needsOnboarding = !hasClassrooms || !hasSheetConfigured;

    logger.info("Teacher onboarding status checked", {
      teacherId: user.uid,
      hasClassrooms,
      hasSheetConfigured,
      needsOnboarding
    });

    sendApiResponse(
      res,
      {
        hasClassrooms,
        hasSheetConfigured,
        needsOnboarding,
        boardAccountEmail: hasSheetConfigured ? boardAccountEmail : undefined
      },
      true,
      "Onboarding status retrieved"
    );
  } catch (error) {
    return handleRouteError(error, req, res);
  }
}