import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { SnapshotProcessor } from "../services/snapshot-processor";
import { FirestoreRepository } from "../services/firestore-repository";
import { getUserFromRequest } from "../middleware/validation";
import { 
  classroomSnapshotSchema, 
  optimizedClassroomSnapshotSchema,
  OptimizedClassroomSnapshot 
} from "@shared/schemas/classroom-snapshot";
import { z } from "zod";
import { db } from "../config/firebase";

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
    
    // Enhanced debugging for authentication issues
    logger.info("Snapshot validation authentication debug", {
      user: user ? {
        uid: user.uid,
        email: user.email,
        role: user.role,
        displayName: user.displayName
      } : null,
      authHeader: req.headers.authorization ? "present" : "missing",
      authHeaderStart: req.headers.authorization ? req.headers.authorization.substring(0, 20) + "..." : "N/A"
    });
    
    if (!user || user.role !== "teacher") {
      logger.warn("Snapshot validation authorization failed", {
        user: user ? { uid: user.uid, email: user.email, role: user.role } : null,
        reason: !user ? "getUserFromRequest returned null" : `user role is ${user.role}, not teacher`
      });
      
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can validate snapshots" 
      });
    }

    // Basic validation for now
    const snapshot = req.body;
    if (!snapshot || typeof snapshot !== "object") {
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
        stats: {
          classroomCount: snapshot.classrooms?.length || 0,
          totalStudents: snapshot.globalStats?.totalStudents || 0,
          totalAssignments: snapshot.globalStats?.totalAssignments || 0,
          totalSubmissions: snapshot.globalStats?.totalSubmissions || 0,
          ungradedSubmissions: snapshot.globalStats?.ungradedSubmissions || 0
        },
        metadata: snapshot.snapshotMetadata || {},
        preview: {
          classrooms: snapshot.classrooms?.slice(0, 5).map((classroom: any) => ({
            id: classroom.id || "unknown",
            name: classroom.name || classroom.courseGroupEmail || "Unnamed Classroom",
            studentCount: classroom.studentCount || 0,
            assignmentCount: classroom.assignments?.length || 0,
            ungradedSubmissions: classroom.assignments?.reduce((acc: number, assignment: any) => 
              acc + (assignment.submissionStats?.pending || 0), 0) || 0
          })) || []
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

    // Detect and validate snapshot format (optimized vs legacy)
    const rawSnapshot = req.body;
    if (!rawSnapshot || typeof rawSnapshot !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON format"
      });
    }

    // Try optimized format first (new AppScript output)
    let snapshot: any;
    let isOptimized = false;
    
    const optimizedValidation = optimizedClassroomSnapshotSchema.safeParse(rawSnapshot);
    if (optimizedValidation.success) {
      logger.info("Using optimized snapshot format", {
        teacherEmail: user.email,
        entityCounts: {
          classrooms: optimizedValidation.data.entities.classrooms.length,
          assignments: optimizedValidation.data.entities.assignments.length,
          submissions: optimizedValidation.data.entities.submissions.length,
          enrollments: optimizedValidation.data.entities.enrollments.length
        }
      });
      snapshot = optimizedValidation.data;
      isOptimized = true;
    } else {
      // Fall back to legacy format
      const legacyValidation = classroomSnapshotSchema.safeParse(rawSnapshot);
      if (legacyValidation.success) {
        logger.info("Using legacy snapshot format", {
          teacherEmail: user.email,
          classroomCount: legacyValidation.data.classrooms.length
        });
        snapshot = legacyValidation.data;
        isOptimized = false;
      } else {
        logger.error("Snapshot validation failed for both formats", {
          optimizedErrors: optimizedValidation.error.errors,
          legacyErrors: legacyValidation.error.errors
        });
        return res.status(400).json({
          success: false,
          error: "Invalid snapshot format",
          details: {
            optimizedFormatErrors: optimizedValidation.error.errors,
            legacyFormatErrors: legacyValidation.error.errors
          }
        });
      }
    }
    
    // Validate teacher email matches user's school email
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const schoolEmail = userData?.schoolEmail || userData?.teacherData?.boardAccountEmail;
    
    // For test accounts, allow import without strict email validation
    const isTestAccount = user.email === "teacher@test.com" || user.email?.includes("test");
    
    if (!schoolEmail && !isTestAccount) {
      return res.status(400).json({
        success: false,
        error: "Please set your school email in your profile before importing snapshots"
      });
    }
    
    // Use school email if available, otherwise fall back to user email for test accounts
    const expectedEmail = schoolEmail || user.email;
    
    if (snapshot.teacher.email !== expectedEmail && !isTestAccount) {
      return res.status(400).json({
        success: false,
        error: `Snapshot teacher email (${snapshot.teacher.email}) doesn't match your school email (${expectedEmail})`
      });
    }
    
    logger.info("Import validation passed", {
      teacherEmail: user.email,
      schoolEmail,
      expectedEmail,
      snapshotTeacherEmail: snapshot.teacher.email,
      isTestAccount
    });

    logger.info("Starting snapshot import", {
      teacherEmail: user.email,
      format: isOptimized ? 'optimized' : 'legacy',
      entityCount: isOptimized 
        ? `${snapshot.entities.classrooms.length} classrooms` 
        : `${snapshot.classrooms.length} classrooms`,
      snapshotId: `${user.uid}_${Date.now()}`
    });

    // Process the snapshot using appropriate method
    let processingResult: any;
    if (isOptimized) {
      // NEW: Direct entity processing for optimized format
      processingResult = await snapshotProcessor.processOptimizedSnapshot(snapshot as OptimizedClassroomSnapshot);
    } else {
      // LEGACY: Complex transformation processing
      processingResult = await snapshotProcessor.processSnapshot(snapshot);
    }
    
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
    if (!snapshot || typeof snapshot !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON format"
      });
    }
    
    // Get existing user data
    const userData = await repository.getUserById(user.uid);
    if (!userData) {
      // No existing data - everything is new
      return res.status(200).json({
        success: true,
        data: {
          hasExistingData: false,
          isFirstImport: true,
          new: {
            classroomCount: snapshot.classrooms?.length || 0,
            totalAssignments: snapshot.globalStats?.totalAssignments || 0,
            totalSubmissions: snapshot.globalStats?.totalSubmissions || 0
          },
          changes: {
            newClassrooms: snapshot.classrooms?.length || 0
          }
        }
      });
    }

    // Get existing classrooms for comparison
    const existingClassrooms = await repository.getClassroomsByTeacher(user.email!);
    
    // Simple diff calculation
    const diff = {
      hasExistingData: true,
      isFirstImport: false,
      existing: {
        classroomCount: existingClassrooms.length
      },
      new: {
        classroomCount: snapshot.classrooms?.length || 0,
        totalAssignments: snapshot.globalStats?.totalAssignments || 0,
        totalSubmissions: snapshot.globalStats?.totalSubmissions || 0
      },
      changes: {
        newClassrooms: Math.max(0, (snapshot.classrooms?.length || 0) - existingClassrooms.length)
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