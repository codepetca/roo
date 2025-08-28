import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { SnapshotProcessor } from "../services/snapshot-processor";
import { FirestoreRepository } from "../services/firestore-repository";
import { getUserFromRequest } from "../middleware/validation";
import { classroomSnapshotSchema } from "@shared/schemas/classroom-snapshot";
import { z } from "zod";
import { db } from "../config/firebase";
import { areSnapshotsContentEqual } from "@shared/utils/snapshot-normalization";

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

    // Detailed schema validation with comprehensive error logging
    const snapshot = req.body;
    if (!snapshot || typeof snapshot !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON format"
      });
    }

    // Log snapshot structure for debugging
    logger.info("SCHEMA DEBUG: Raw snapshot structure", {
      teacherEmail: user.email,
      keys: Object.keys(snapshot),
      hasTeacher: !!snapshot.teacher,
      hasClassrooms: !!snapshot.classrooms,
      hasGlobalStats: !!snapshot.globalStats,
      teacherKeys: snapshot.teacher ? Object.keys(snapshot.teacher) : [],
      classroomCount: snapshot.classrooms?.length || 0,
      firstClassroomKeys: snapshot.classrooms?.[0] ? Object.keys(snapshot.classrooms[0]) : [],
      globalStatsKeys: snapshot.globalStats ? Object.keys(snapshot.globalStats) : []
    });

    // Attempt schema validation and log specific failures
    try {
      const validatedSnapshot = classroomSnapshotSchema.parse(snapshot);
      logger.info("SCHEMA DEBUG: Snapshot schema validation passed", {
        teacherEmail: user.email,
        validatedClassroomCount: validatedSnapshot.classrooms.length
      });
    } catch (validationError) {
      logger.error("SCHEMA DEBUG: Snapshot schema validation failed", {
        teacherEmail: user.email,
        error: validationError,
        issues: validationError instanceof z.ZodError ? validationError.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          received: 'received' in issue ? issue.received : undefined,
          expected: issue.code
        })) : 'Not a Zod error'
      });

      return res.status(400).json({
        success: false,
        error: "Snapshot schema validation failed",
        details: validationError instanceof z.ZodError ? {
          issues: validationError.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            received: 'received' in issue ? issue.received : undefined
          }))
        } : { message: validationError instanceof Error ? validationError.message : 'Unknown validation error' }
      });
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
      classroomCount: snapshot.classrooms.length,
      snapshotId: `${user.uid}_${Date.now()}`
    });

    // OPTIMIZATION: Fast-skip if content is identical to last import
    try {
      const lastSnapshot = await repository.getCompressedSnapshot(user.uid);
      if (lastSnapshot) {
        const contentIdentical = areSnapshotsContentEqual(snapshot, lastSnapshot);
        
        if (contentIdentical) {
          logger.info("Identical content detected - skipping processing", { 
            teacherEmail: user.email 
          });
          
          // Return successful import with complete zero stats
          return res.status(200).json({
            success: true,
            message: "No changes detected - snapshot already up to date",
            data: {
              snapshotId: `${user.uid}_${Date.now()}`,
              stats: {
                classroomsCreated: 0,
                classroomsUpdated: 0,
                assignmentsCreated: 0,
                assignmentsUpdated: 0,
                submissionsCreated: 0,
                submissionsVersioned: 0,
                gradesPreserved: 0,
                gradesCreated: 0,
                enrollmentsCreated: 0,
                enrollmentsUpdated: 0,
                enrollmentsArchived: 0
              },
              processingTime: 0,
              summary: "No changes detected - all data is already up to date"
            }
          });
        } else {
          logger.info("Content differences detected - proceeding with full processing", {
            teacherEmail: user.email
          });
        }
      } else {
        logger.info("No previous import found - proceeding with first import", {
          teacherEmail: user.email
        });
      }
    } catch (error) {
      logger.warn("Failed to compare with last snapshot - proceeding with full processing", {
        teacherEmail: user.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Continue with full processing on error
    }

    // Process the snapshot
    const processingResult = await snapshotProcessor.processSnapshot(snapshot, user.email);
    
    if (processingResult.success) {
      logger.info("Snapshot import successful", {
        teacherEmail: user.email,
        stats: processingResult.stats,
        processingTime: processingResult.processingTime
      });

      // Save compressed snapshot for future diff comparison
      try {
        await repository.saveCompressedSnapshot(user.uid, snapshot);
        logger.info("Compressed snapshot saved for future comparison", {
          teacherEmail: user.email
        });
      } catch (error) {
        logger.warn("Failed to save compressed snapshot - diff comparison may show false positives", {
          teacherEmail: user.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't fail the import if compression save fails
      }

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
    
    logger.info("Generating snapshot diff", { teacherEmail: user.email });

    // FIRST: Check if content is identical to last import using compressed comparison
    try {
      const lastSnapshot = await repository.getCompressedSnapshot(user.uid);
      if (lastSnapshot) {
        const contentIdentical = areSnapshotsContentEqual(snapshot, lastSnapshot);
        
        if (contentIdentical) {
          logger.info("Identical content detected - no changes", { 
            teacherEmail: user.email 
          });
          
          // Return empty diff to indicate no changes
          return res.status(200).json({
            success: true,
            data: {} // Empty data indicates no changes detected
          });
        } else {
          logger.info("Content differences detected - proceeding with entity diff", {
            teacherEmail: user.email
          });
        }
      } else {
        logger.info("No previous import found - proceeding with first import logic", {
          teacherEmail: user.email
        });
      }
    } catch (error) {
      logger.warn("Failed to compare with last snapshot - proceeding with entity diff", {
        teacherEmail: user.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Continue with entity-based comparison on error
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

    // Get existing data for proper entity-based comparison
    const existingClassrooms = await repository.getClassroomsByTeacher(user.email!);
    
    // Build sets of external IDs for comparison
    const existingClassroomIds = new Set(existingClassrooms.map(c => c.externalId).filter(id => id));
    const newClassroomIds = new Set((snapshot.classrooms || []).map((c: any) => c.id));
    
    // Get existing assignments for comparison
    const existingAssignments = [];
    for (const classroom of existingClassrooms) {
      const classroomAssignments = await repository.getAssignmentsByClassroom(classroom.id);
      existingAssignments.push(...classroomAssignments);
    }
    const existingAssignmentIds = new Set(existingAssignments.map(a => a.externalId).filter(id => id));
    
    // Collect all assignment IDs from snapshot
    const newAssignmentIds = new Set();
    for (const classroom of snapshot.classrooms || []) {
      for (const assignment of classroom.assignments || []) {
        newAssignmentIds.add(assignment.id);
      }
    }
    
    // Calculate actual entity differences
    const newClassrooms = [...newClassroomIds].filter(id => !existingClassroomIds.has(id as string));
    const newAssignments = [...newAssignmentIds].filter(id => !existingAssignmentIds.has(id as string));
    
    // Count new submissions (simplified - just count from snapshot for new assignments)
    let newSubmissionCount = 0;
    for (const classroom of snapshot.classrooms || []) {
      for (const assignment of classroom.assignments || []) {
        if (newAssignments.includes(assignment.id as string)) {
          newSubmissionCount += (assignment.submissionStats?.submitted || 0);
        }
      }
    }

    // Only show changes if there are actual new entities
    const hasRealChanges = newClassrooms.length > 0 || newAssignments.length > 0 || newSubmissionCount > 0;
    
    if (!hasRealChanges) {
      // No real changes detected
      return res.status(200).json({
        success: true,
        data: {}
      });
    }

    // Entity-based diff with actual changes
    const diff = {
      hasExistingData: true,
      isFirstImport: false,
      existing: {
        classroomCount: existingClassrooms.length,
        assignmentCount: existingAssignments.length
      },
      new: {
        classroomCount: snapshot.classrooms?.length || 0,
        assignmentCount: newAssignmentIds.size,
        submissionCount: newSubmissionCount
      },
      changes: {
        newClassrooms: newClassrooms.length,
        newAssignments: newAssignments.length,
        newSubmissions: newSubmissionCount
      }
    };

    // Only return diff if there are meaningful changes
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