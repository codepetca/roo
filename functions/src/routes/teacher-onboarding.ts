/**
 * Teacher onboarding API endpoints for automated Google Sheets setup
 * Location: functions/src/routes/teacher-onboarding.ts:1
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { z } from "zod";
import { google } from "googleapis";
import { handleRouteError, sendApiResponse, validateData } from "../middleware/validation";
import { createSheetTemplateService, getServiceAccountEmail } from "../services/sheet-template";
import { getTeacherSheetsConfig } from "../config/teachers";

// Validation schemas
const startOnboardingSchema = z.object({
  teacherEmail: z.string().email(),
  teacherName: z.string().min(1).optional(),
  redirectUri: z.string().url().optional()
});

const completeOnboardingSchema = z.object({
  teacherEmail: z.string().email(),
  authCode: z.string().min(1),
  sheetTitle: z.string().min(1).optional()
});

// OAuth client configuration (would come from environment in production)
const OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "your-client-id.apps.googleusercontent.com",
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "your-client-secret",
  redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:5173/teacher/onboarding/callback"
};

// Required scopes for sheet creation
const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
  "profile"
];

/**
 * Start the teacher onboarding process
 * Location: functions/src/routes/teacher-onboarding.ts:39
 * Route: POST /teacher/onboarding/start
 */
export async function startTeacherOnboarding(req: Request, res: Response) {
  try {
    const validatedData = validateData(startOnboardingSchema, req.body);
    logger.info("Starting teacher onboarding", { teacherEmail: validatedData.teacherEmail });

    // Check if teacher is already configured
    const existingConfig = getTeacherSheetsConfig();
    if (existingConfig[validatedData.teacherEmail]) {
      return sendApiResponse(
        res,
        { 
          alreadyConfigured: true,
          spreadsheetId: existingConfig[validatedData.teacherEmail]
        },
        true,
        "Teacher is already configured with a Google Sheet"
      );
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      OAUTH_CONFIG.clientId,
      OAUTH_CONFIG.clientSecret,
      validatedData.redirectUri || OAUTH_CONFIG.redirectUri
    );

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: REQUIRED_SCOPES,
      state: JSON.stringify({
        teacherEmail: validatedData.teacherEmail,
        teacherName: validatedData.teacherName
      })
    });

    sendApiResponse(
      res,
      {
        authUrl,
        requiredScopes: REQUIRED_SCOPES,
        teacherEmail: validatedData.teacherEmail
      },
      true,
      "Authorization URL generated. Teacher should visit this URL to grant permissions."
    );

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Complete the teacher onboarding process after OAuth callback
 * Location: functions/src/routes/teacher-onboarding.ts:79
 * Route: POST /teacher/onboarding/complete
 */
export async function completeTeacherOnboarding(req: Request, res: Response) {
  try {
    const validatedData = validateData(completeOnboardingSchema, req.body);
    logger.info("Completing teacher onboarding", { teacherEmail: validatedData.teacherEmail });

    // Create OAuth2 client and exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      OAUTH_CONFIG.clientId,
      OAUTH_CONFIG.clientSecret,
      OAUTH_CONFIG.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(validatedData.authCode);
    oauth2Client.setCredentials(tokens);

    // Get service account email for sharing
    const serviceAccountEmail = await getServiceAccountEmail();

    // Create sheet template service
    const sheetTemplateService = await createSheetTemplateService(oauth2Client);

    // Generate sheet title
    const teacherName = validatedData.teacherEmail.split('@')[0];
    const sheetTitle = validatedData.sheetTitle || `Roo Auto-Grading - ${teacherName}`;

    // Create the teacher's sheet
    const sheetResult = await sheetTemplateService.createTeacherSheet({
      title: sheetTitle,
      teacherEmail: validatedData.teacherEmail,
      serviceAccountEmail
    });

    if (!sheetResult.success) {
      return sendApiResponse(
        res,
        { error: sheetResult.error },
        false,
        "Failed to create Google Sheet for teacher"
      );
    }

    // Generate AppScript code for the teacher
    const appScriptCode = sheetTemplateService.generateAppScriptCode(
      sheetResult.spreadsheetId,
      validatedData.teacherEmail
    );

    // TODO: In production, you would save the teacher configuration to a database
    // or update the environment variables programmatically
    
    sendApiResponse(
      res,
      {
        spreadsheetId: sheetResult.spreadsheetId,
        spreadsheetUrl: sheetResult.spreadsheetUrl,
        sheetTitle: sheetResult.title,
        appScriptCode,
        nextSteps: [
          "Copy the provided AppScript code",
          "Open Google Apps Script in your board account",
          "Create a new project and paste the code",
          "Run the 'setupTriggers' function once",
          "Run the 'processAllSubmissions' function to test",
          "Contact admin to complete system configuration"
        ]
      },
      true,
      "Google Sheet created successfully! Follow the next steps to complete setup."
    );

    logger.info("Teacher onboarding completed successfully", {
      teacherEmail: validatedData.teacherEmail,
      spreadsheetId: sheetResult.spreadsheetId
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Get teacher onboarding status
 * Location: functions/src/routes/teacher-onboarding.ts:142
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
          : ["Start onboarding process", "Complete OAuth flow", "Configure AppScript"]
      },
      true,
      isConfigured ? "Teacher is configured" : "Teacher needs onboarding"
    );

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * List all configured teachers (admin endpoint)
 * Location: functions/src/routes/teacher-onboarding.ts:175
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
 * Location: functions/src/routes/teacher-onboarding.ts:200
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
        "Teacher needs to complete onboarding first"
      );
    }

    // Create a temporary sheet template service just for code generation
    const sheetTemplateService = await createSheetTemplateService(null);
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