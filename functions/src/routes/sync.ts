import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { z } from "zod";
import { createSyncService } from "../services/sync";
import { isTeacherConfigured } from "../config/teachers";
import { handleRouteError, sendApiResponse, validateData } from "../middleware/validation";

// Schema for sync requests with teacher identification
const syncRequestSchema = z.object({
  teacherEmail: z.string().email().optional()
});

/**
 * Get teacher email from request (header or body)
 * For now, we'll use a simple approach. In production, this would use proper authentication.
 */
function getTeacherEmail(req: Request): string {
  // Check for teacher email in Authorization header (simple approach)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Teacher ')) {
    return authHeader.substring(8); // Remove 'Teacher ' prefix
  }
  
  // Check in request body
  const body = req.body;
  if (body && body.teacherEmail) {
    return body.teacherEmail;
  }
  
  // Default fallback for development
  return "teacher@test.com";
}

/**
 * Sync assignments from Google Sheets to Firestore
 * Location: functions/src/routes/sync.ts:8
 * Route: POST /sync/assignments
 */
export async function syncAssignments(req: Request, res: Response) {
  try {
    const teacherEmail = getTeacherEmail(req);
    logger.info("Sync assignments endpoint called", { teacherEmail });
    
    // Check if teacher is configured
    if (!isTeacherConfigured(teacherEmail)) {
      return sendApiResponse(
        res,
        { error: `Teacher ${teacherEmail} is not configured for sheets access` },
        false,
        `Teacher ${teacherEmail} needs to be configured with a Google Sheets ID`
      );
    }
    
    const syncService = createSyncService();
    const result = await syncService.syncAssignmentsToFirestore(teacherEmail);
    
    sendApiResponse(
      res,
      result,
      result.errors.length === 0,
      result.errors.length === 0 
        ? `Successfully synced ${result.count} assignments for ${teacherEmail}`
        : `Synced ${result.count} assignments for ${teacherEmail} with ${result.errors.length} errors`
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Sync submissions from Google Sheets to Firestore
 * Location: functions/src/routes/sync.ts:28
 * Route: POST /sync/submissions
 */
export async function syncSubmissions(req: Request, res: Response) {
  try {
    const teacherEmail = getTeacherEmail(req);
    logger.info("Sync submissions endpoint called", { teacherEmail });
    
    // Check if teacher is configured
    if (!isTeacherConfigured(teacherEmail)) {
      return sendApiResponse(
        res,
        { error: `Teacher ${teacherEmail} is not configured for sheets access` },
        false,
        `Teacher ${teacherEmail} needs to be configured with a Google Sheets ID`
      );
    }
    
    const syncService = createSyncService();
    const result = await syncService.syncSubmissionsToFirestore(teacherEmail);
    
    sendApiResponse(
      res,
      result,
      result.errors.length === 0,
      result.errors.length === 0 
        ? `Successfully synced ${result.count} submissions for ${teacherEmail}`
        : `Synced ${result.count} submissions for ${teacherEmail} with ${result.errors.length} errors`
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Sync all data (assignments and submissions) from Google Sheets to Firestore
 * Location: functions/src/routes/sync.ts:48
 * Route: POST /sync/all
 */
export async function syncAllData(req: Request, res: Response) {
  try {
    const teacherEmail = getTeacherEmail(req);
    logger.info("Sync all data endpoint called", { teacherEmail });
    
    // Check if teacher is configured
    if (!isTeacherConfigured(teacherEmail)) {
      return sendApiResponse(
        res,
        { error: `Teacher ${teacherEmail} is not configured for sheets access` },
        false,
        `Teacher ${teacherEmail} needs to be configured with a Google Sheets ID`
      );
    }
    
    const syncService = createSyncService();
    const result = await syncService.syncAllData(teacherEmail);
    
    sendApiResponse(
      res,
      result,
      result.success,
      result.success 
        ? `Successfully synced ${result.assignmentsProcessed} assignments and ${result.submissionsProcessed} submissions for ${teacherEmail}`
        : `Sync completed with errors for ${teacherEmail}: ${result.assignmentsProcessed} assignments, ${result.submissionsProcessed} submissions, ${result.errors.length} errors`
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}