import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { createSyncService } from "../services/sync";
import { handleRouteError, sendApiResponse } from "../middleware/validation";

/**
 * Sync assignments from Google Sheets to Firestore
 * Location: functions/src/routes/sync.ts:8
 * Route: POST /sync/assignments
 */
export async function syncAssignments(req: Request, res: Response) {
  try {
    logger.info("Sync assignments endpoint called");
    
    const syncService = createSyncService();
    const result = await syncService.syncAssignmentsToFirestore();
    
    sendApiResponse(
      res,
      result,
      result.errors.length === 0,
      result.errors.length === 0 
        ? `Successfully synced ${result.count} assignments`
        : `Synced ${result.count} assignments with ${result.errors.length} errors`
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
    logger.info("Sync submissions endpoint called");
    
    const syncService = createSyncService();
    const result = await syncService.syncSubmissionsToFirestore();
    
    sendApiResponse(
      res,
      result,
      result.errors.length === 0,
      result.errors.length === 0 
        ? `Successfully synced ${result.count} submissions`
        : `Synced ${result.count} submissions with ${result.errors.length} errors`
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
    logger.info("Sync all data endpoint called");
    
    const syncService = createSyncService();
    const result = await syncService.syncAllData();
    
    sendApiResponse(
      res,
      result,
      result.success,
      result.success 
        ? `Successfully synced ${result.assignmentsProcessed} assignments and ${result.submissionsProcessed} submissions`
        : `Sync completed with errors: ${result.assignmentsProcessed} assignments, ${result.submissionsProcessed} submissions, ${result.errors.length} errors`
    );
  } catch (error) {
    handleRouteError(error, req, res);
  }
}