import { Request, Response } from "express";
import { 
  getSheetsSubmissionsSchema,
  getAnswerKeySchema 
} from "../schemas";
import { handleRouteError, validateData } from "../middleware/validation";
import { getPrimaryTeacherEmail } from "../config/teachers";

/**
 * Get assignments from Google Sheets
 * Location: functions/src/routes/sheets.ts:8
 * Route: GET /sheets/assignments
 */
export async function getSheetsAssignments(req: Request, res: Response) {
  try {
    const { createSheetsService } = await import("../services/sheets");
    const { getTeacherSpreadsheetId } = await import("../config/teachers");
    
    // For now, use default teacher for development
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
    const assignments = await sheetsService.getAssignments();
    
    res.json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch assignments from Sheets",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get submissions for a specific assignment from Google Sheets
 * Location: functions/src/routes/sheets.ts:27
 * Route: POST /sheets/submissions
 */
export async function getSheetsSubmissions(req: Request, res: Response) {
  try {
    const validatedData = validateData(getSheetsSubmissionsSchema, req.body);
    const { createSheetsService } = await import("../services/sheets");
    const { getTeacherSpreadsheetId } = await import("../config/teachers");
    
    // For now, use default teacher for development
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
    const submissions = await sheetsService.getSubmissions(validatedData.assignmentId);
    
    res.json({
      success: true,
      assignmentId: validatedData.assignmentId,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Get all submissions from Google Sheets
 * Location: functions/src/routes/sheets.ts:46
 * Route: GET /sheets/all-submissions
 */
export async function getAllSubmissions(req: Request, res: Response) {
  try {
    const { createSheetsService } = await import("../services/sheets");
    const { getTeacherSpreadsheetId } = await import("../config/teachers");
    
    // For now, use default teacher for development
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
    const submissions = await sheetsService.getAllSubmissions();
    
    res.json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch all submissions",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get ungraded submissions from Google Sheets
 * Location: functions/src/routes/sheets.ts:66
 * Route: GET /sheets/ungraded
 */
export async function getUngradedSubmissions(req: Request, res: Response) {
  try {
    const { createSheetsService } = await import("../services/sheets");
    const { getTeacherSpreadsheetId } = await import("../config/teachers");
    
    // For now, use default teacher for development
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
    const submissions = await sheetsService.getUngraduatedSubmissions();
    
    res.json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch ungraded submissions",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get answer key for a quiz form from Google Sheets
 * Location: functions/src/routes/sheets.ts:86
 * Route: POST /sheets/answer-key
 */
export async function getAnswerKey(req: Request, res: Response) {
  try {
    const validatedData = validateData(getAnswerKeySchema, req.body);
    const { createSheetsService } = await import("../services/sheets");
    const { getTeacherSpreadsheetId } = await import("../config/teachers");
    
    // For now, use default teacher for development
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
    const answerKey = await sheetsService.getAnswerKey(validatedData.formId);
    
    res.json({
      success: true,
      answerKey
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch answer key",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Debug endpoint to list all sheet names in the spreadsheet
 * Location: functions/src/routes/sheets.ts:127
 * Route: GET /sheets/list-sheets
 */
export async function listSheetNames(req: Request, res: Response) {
  try {
    const { createSheetsService } = await import("../services/sheets");
    const { getTeacherSpreadsheetId } = await import("../config/teachers");
    
    // For now, use default teacher for development
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
    const sheetNames = await sheetsService.listSheetNames();
    
    res.json({
      success: true,
      sheetNames,
      count: sheetNames.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to list sheet names",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}