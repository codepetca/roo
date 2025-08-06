import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { SnapshotProcessor } from "../services/snapshot-processor";
import { FirestoreRepository } from "../services/firestore-repository";
import { getUserFromRequest } from "../middleware/validation";
import { classroomSnapshotSchema } from "../../../shared/schemas/classroom-snapshot";
import { z } from "zod";

/**
 * Snapshot Import API Routes
 * Location: functions/src/routes/snapshots.ts
 * 
 * Handles classroom snapshot validation, import, and history
 */

const repository = new FirestoreRepository();
const snapshotProcessor = new SnapshotProcessor(repository);

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

    // Validate snapshot schema
    const validationResult = classroomSnapshotSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid snapshot format",
        details: validationResult.error.errors,
        validationErrors: validationResult.error.format()
      });
    }

    const snapshot = validationResult.data;
    
    // Basic snapshot validation
    const stats = {
      classroomCount: snapshot.classrooms.length,
      totalStudents: snapshot.globalStats.totalStudents,
      totalAssignments: snapshot.globalStats.totalAssignments,
      totalSubmissions: snapshot.globalStats.totalSubmissions,
      ungradedSubmissions: snapshot.globalStats.ungradedSubmissions
    };

    // Check if teacher email matches authenticated user
    if (snapshot.teacher.email !== user.email) {
      return res.status(400).json({
        success: false,
        error: "Snapshot teacher email does not match authenticated user",
        details: `Expected: ${user.email}, Found: ${snapshot.teacher.email}`
      });
    }

    logger.info("Snapshot validation successful", {
      teacherEmail: user.email,
      stats
    });

    return res.status(200).json({
      success: true,
      message: "Snapshot is valid and ready for import",
      data: {
        isValid: true,
        stats,
        metadata: snapshot.snapshotMetadata,
        preview: {
          classrooms: snapshot.classrooms.map(c => ({
            id: c.id,
            name: c.name,
            studentCount: c.studentCount,
            assignmentCount: c.assignmentCount,
            ungradedSubmissions: c.ungradedSubmissions
          }))
        }
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

    // Validate snapshot schema
    const validationResult = classroomSnapshotSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid snapshot format",
        details: validationResult.error.errors
      });
    }

    const snapshot = validationResult.data;
    
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
    const processingResult = await snapshotProcessor.processSnapshot(snapshot, user.uid);
    
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
    logger.error("Failed to import snapshot", error);
    return res.status(500).json({
      success: false,
      error: "Failed to import snapshot",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get import history for the authenticated teacher
 * GET /api/snapshots/history
 */
export async function getImportHistory(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can view import history" 
      });
    }

    // For now, return placeholder data
    // TODO: Implement actual import history tracking in Firestore
    const mockHistory = [
      {
        id: `${user.uid}_${Date.now() - 86400000}`, // 1 day ago
        timestamp: new Date(Date.now() - 86400000),
        status: 'success',
        stats: {
          classroomsCreated: 3,
          assignmentsCreated: 12,
          submissionsCreated: 245
        }
      }
    ];

    return res.status(200).json({
      success: true,
      data: mockHistory
    });

  } catch (error) {
    logger.error("Failed to get import history", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get import history",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
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

    // Validate snapshot schema
    const validationResult = classroomSnapshotSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid snapshot format",
        details: validationResult.error.errors
      });
    }

    const snapshot = validationResult.data;
    
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
    logger.error("Failed to generate snapshot diff", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate snapshot diff",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}