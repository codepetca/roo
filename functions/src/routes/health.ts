import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { handleRouteError } from "../middleware/validation";

/**
 * API status endpoint - provides system overview and available endpoints
 * Location: functions/src/routes/health.ts:8
 * Route: GET /
 */
export async function getApiStatus(req: Request, res: Response) {
  try {
    logger.info("API status check", { structuredData: true });
    
    res.json({
      message: "Roo auto-grading system API",
      timestamp: new Date().toISOString(),
      status: "active",
      version: "1.0.0",
      endpoints: {
        "GET /": "API status",
        "POST /test-write": "Test Firestore write",
        "GET /test-read": "Test Firestore read",
        "GET /assignments": "List all assignments",
        "POST /assignments": "Create test assignment",
        "POST /test-grading": "Test AI grading with sample text",
        "GET /gemini/test": "Test Gemini API connection",
        "GET /sheets/test": "Test Google Sheets connection",
        "GET /sheets/assignments": "Get assignments from Google Sheets",
        "POST /sheets/submissions": "Get submissions for an assignment from Sheets",
        "GET /sheets/all-submissions": "Get all submissions from Sheets",
        "GET /sheets/ungraded": "Get ungraded submissions",
        "POST /sheets/answer-key": "Get answer key for a quiz form",
        "POST /grade-quiz-test": "Grade a quiz submission (test mode - no sheet updates)",
        "POST /grade-quiz": "Grade a quiz submission using answer key",
        "POST /grade-code": "Grade a single coding assignment with generous mode",
        "GET /grades/assignment/{id}": "Get all grades for an assignment",
        "GET /grades/submission/{id}": "Get grade for a specific submission",
        "GET /grades/ungraded": "Get all ungraded submissions from Firestore",
        "POST /submissions": "Create a new submission in Firestore",
        "GET /submissions/assignment/{id}": "Get all submissions for an assignment",
        "GET /submissions/{id}": "Get a specific submission by ID",
        "PATCH /submissions/{id}/status": "Update submission status",
        "POST /webhooks/classroom-sync": "Sync classrooms from Google Sheets (webhook)",
        "GET /webhooks/status": "Get webhook status",
        "POST /snapshots/validate": "Validate classroom snapshot",
        "POST /snapshots/import": "Import classroom snapshot",
        "GET /snapshots/history": "Get import history",
        "POST /snapshots/diff": "Generate snapshot diff"
      }
    });
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Test Gemini AI API connection
 * Location: functions/src/routes/health.ts:40
 * Route: GET /gemini/test
 */
export async function testGeminiConnection(req: Request, res: Response) {
  try {
    const { createGeminiService } = await import("../services/gemini");
    const geminiApiKey = req.app.locals.geminiApiKey; // Will be set in main router
    
    const geminiService = createGeminiService(geminiApiKey);
    const isConnected = await geminiService.testConnection();
    
    res.json({
      success: isConnected,
      message: isConnected ? "Gemini API is working" : "Gemini API connection failed",
      service: "gemini-1.5-flash"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to test Gemini connection",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Test Google Sheets API connection
 * Location: functions/src/routes/health.ts:62
 * Route: GET /sheets/test
 */
export async function testSheetsConnection(req: Request, res: Response) {
  try {
    const { createSheetsService } = await import("../services/sheets");
    const { getTeacherSpreadsheetId, getPrimaryTeacherEmail } = await import("../config/teachers");
    
    // Use real board account for testing
    const teacherEmail = getPrimaryTeacherEmail();
    const spreadsheetId = await getTeacherSpreadsheetId(teacherEmail);
    
    if (!spreadsheetId) {
      return res.status(404).json({
        success: false,
        error: "No spreadsheet configured",
        message: `Teacher ${teacherEmail} needs to be configured with a Google Sheets ID`
      });
    }
    
    const sheetsService = await createSheetsService(spreadsheetId);
    const isConnected = await sheetsService.testConnection();
    
    res.json({
      success: isConnected,
      message: isConnected ? "Google Sheets API is working" : "Google Sheets connection failed",
      service: "sheets-v4"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to test Sheets connection",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}