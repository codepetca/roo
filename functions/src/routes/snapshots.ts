import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { SnapshotProcessor } from "../services/snapshot-processor";
import { FirestoreRepository } from "../services/firestore-repository";
import { getUserFromRequest } from "../middleware/validation";
import { classroomSnapshotSchema } from "@shared/schemas/classroom-snapshot";
import { z } from "zod";

/**
 * Snapshot Import API Routes
 * Location: functions/src/routes/snapshots.ts
 * 
 * Handles classroom snapshot validation, import, and history
 */

const repository = new FirestoreRepository();
const snapshotProcessor = new SnapshotProcessor();

/**
 * Validate classroom snapshot without importing
 * POST /api/snapshots/validate
 */
export async function validateSnapshot(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can validate snapshots" 
      });
    }

    // Basic validation for now
    const snapshot = req.body;
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON format"
      });
    }
    
    logger.info("Snapshot validation request", {
      teacherEmail: user.email
    });

    return res.status(200).json({
      success: true,
      message: "Snapshot validation endpoint is working",
      data: {
        isValid: true,
        validated: true
      }
    });

  } catch (error) {
    logger.error("Failed to validate snapshot", error);
    return res.status(500).json({
      success: false,
      error: "Failed to validate snapshot",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Import classroom snapshot into normalized schema
 * POST /api/snapshots/import
 */
export async function importSnapshot(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can import snapshots" 
      });
    }

    // Basic validation for now
    const snapshot = req.body;
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON format"
      });
    }
    
    // Verify teacher email matches authenticated user
    if (snapshot.teacher.email !== user.email) {
      return res.status(400).json({
        success: false,
        error: "Snapshot teacher email does not match authenticated user"
      });
    }

    logger.info("Starting snapshot import", {
      teacherEmail: user.email,
      classroomCount: snapshot.classrooms.length,
      snapshotId: `${user.uid}_${Date.now()}`
    });

    // Process the snapshot
    const processingResult = await snapshotProcessor.processSnapshot(snapshot);
    
    if (processingResult.success) {
      logger.info("Snapshot import successful", {
        teacherEmail: user.email,
        stats: processingResult.stats,
        processingTime: processingResult.processingTime
      });

      return res.status(200).json({
        success: true,
        message: "Snapshot imported successfully",
        data: {
          snapshotId: `${user.uid}_${Date.now()}`,
          stats: processingResult.stats,
          processingTime: processingResult.processingTime,
          summary: `Created ${processingResult.stats.classroomsCreated} classrooms, ${processingResult.stats.assignmentsCreated} assignments, and ${processingResult.stats.submissionsCreated} submissions`
        }
      });
    } else {
      logger.error("Snapshot import failed", {
        teacherEmail: user.email,
        errors: processingResult.errors
      });

      return res.status(422).json({
        success: false,
        error: "Snapshot import failed",
        data: {
          stats: processingResult.stats,
          errors: processingResult.errors,
          processingTime: processingResult.processingTime
        }
      });
    }

  } catch (error) {
    logger.error("Snapshot import error", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get import history for the authenticated teacher
 * GET /api/snapshots/history
 */
export async function getImportHistory(req: Request, res: Response): Promise<Response> {
  return res.status(501).json({
    success: false,
    error: "History temporarily disabled"
  });
}

/**
 * Generate diff between new snapshot and existing data
 * POST /api/snapshots/diff
 */
export async function generateSnapshotDiff(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can generate snapshot diffs" 
      });
    }

    // Basic validation for now
    const snapshot = req.body;
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON format"
      });
    }
    
    // Get existing teacher data
    const teacher = await repository.getTeacherByEmail(user.email!);
    if (!teacher) {
      // No existing data - everything is new
      return res.status(200).json({
        success: true,
        data: {
          hasExistingData: false,
          isFirstImport: true,
          newClassrooms: snapshot.classrooms.length,
          newAssignments: snapshot.globalStats.totalAssignments,
          newSubmissions: snapshot.globalStats.totalSubmissions
        }
      });
    }

    // Get existing classrooms for comparison
    const existingClassrooms = await repository.getClassroomsByTeacher(teacher.id);
    
    // Simple diff calculation
    const diff = {
      hasExistingData: true,
      isFirstImport: false,
      existing: {
        classroomCount: existingClassrooms.length,
        // Add more existing data statistics
      },
      new: {
        classroomCount: snapshot.classrooms.length,
        totalAssignments: snapshot.globalStats.totalAssignments,
        totalSubmissions: snapshot.globalStats.totalSubmissions
      },
      changes: {
        newClassrooms: Math.max(0, snapshot.classrooms.length - existingClassrooms.length),
        // TODO: Add more detailed diff logic
      }
    };

    return res.status(200).json({
      success: true,
      data: diff
    });

  } catch (error) {
    logger.error("Snapshot diff error", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}