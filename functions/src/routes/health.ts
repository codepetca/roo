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
        "POST /grade-quiz": "Grade a quiz submission using answer key",
        "POST /grade-code": "Grade a single coding assignment with generous mode"
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
    const sheetsService = await createSheetsService();
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