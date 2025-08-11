import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { FirestoreRepository } from "../services/firestore-repository";
import { db } from "../config/firebase";
import { SnapshotProcessor } from "../services/snapshot-processor";
import { getUserFromRequest } from "../middleware/validation";
import { 
  Classroom, 
  Assignment, 
  StudentEnrollment,
  ClassroomWithAssignments,
  AssignmentWithStats
} from "@shared/schemas/core";
import { classroomSnapshotSchema } from "@shared/schemas/classroom-snapshot";

/**
 * Updated Classroom API Routes using DataConnect-Ready Architecture
 * Location: functions/src/routes/classrooms.ts
 * 
 * Uses new FirestoreRepository and core schemas for type safety
 */

const repository = new FirestoreRepository();

/**
 * Get all classrooms for the authenticated teacher
 */
export async function getTeacherClassrooms(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can access classrooms" 
      });
    }

    // Get classrooms using new repository
    const classrooms = await repository.getClassroomsByTeacher(user.email!);
    
    if (classrooms.length === 0) {
      return res.status(200).json({ 
        success: true, 
        data: [] 
      });
    }

    // Build response with assignments for each classroom
    const classroomsWithAssignments: ClassroomWithAssignments[] = [];
    
    for (const classroom of classrooms) {
      const assignments = await repository.getAssignmentsByClassroom(classroom.id);
      classroomsWithAssignments.push({
        ...classroom,
        assignments
      });
    }

    logger.info("Retrieved teacher classrooms", { 
      teacherId: user.uid, 
      count: classrooms.length
    });

    return res.status(200).json({ 
      success: true, 
      data: classroomsWithAssignments 
    });

  } catch (error) {
    logger.error("Error fetching teacher classrooms:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch classrooms",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get assignments for a specific classroom with submission statistics
 */
export async function getClassroomAssignments(req: Request, res: Response): Promise<Response> {
  try {
    const classroomId = req.params.classroomId;
    if (!classroomId) {
      return res.status(400).json({ 
        success: false, 
        error: "Classroom ID is required" 
      });
    }

    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: "Authentication required" 
      });
    }

    // Get classroom using new repository
    const classroom = await repository.getClassroom(classroomId);
    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        error: "Classroom not found" 
      });
    }

    // Check access permissions
    if (user.role === "teacher") {
      // Get user's school email
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();
      const schoolEmail = userData?.schoolEmail || user.email;
      
      // Check if classroom belongs to this teacher
      if (classroom.teacherId !== user.email && classroom.teacherId !== schoolEmail) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied to this classroom" 
        });
      }
    }

    if (user.role === "student") {
      // Check if student is enrolled in this classroom
      const enrollments = await repository.getEnrollmentsByStudent(user.uid);
      const isEnrolled = enrollments.some(e => e.classroomId === classroomId);
      
      if (!isEnrolled) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied to this classroom" 
        });
      }
    }

    // Get assignments with statistics
    const assignments = await repository.getAssignmentsByClassroom(classroomId);
    const assignmentsWithStats: AssignmentWithStats[] = [];

    for (const assignment of assignments) {
      const submissions = await repository.getSubmissionsByAssignment(assignment.id);
      const recentSubmissions = submissions.slice(0, 10); // Last 10 submissions

      // Add grade information to submissions
      const submissionsWithGrades = await Promise.all(
        submissions.map(async (submission) => {
          const grade = submission.gradeId 
            ? await repository.getGrade(submission.gradeId)
            : null;
          return { ...submission, grade };
        })
      );

      assignmentsWithStats.push({
        ...assignment,
        submissions: submissionsWithGrades,
        recentSubmissions
      });
    }

    logger.info("Retrieved classroom assignments", { 
      classroomId, 
      count: assignments.length 
    });

    return res.status(200).json({ 
      success: true, 
      data: assignmentsWithStats 
    });

  } catch (error) {
    logger.error("Error fetching classroom assignments:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch assignments",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get classroom details with student enrollments
 */
export async function getClassroomDetails(req: Request, res: Response): Promise<Response> {
  try {
    const classroomId = req.params.classroomId;
    if (!classroomId) {
      return res.status(400).json({ 
        success: false, 
        error: "Classroom ID is required" 
      });
    }

    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: "Authentication required" 
      });
    }

    // Get classroom
    const classroom = await repository.getClassroom(classroomId);
    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        error: "Classroom not found" 
      });
    }

    // Check access permissions
    if (user.role === "teacher") {
      // Get user's school email
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();
      const schoolEmail = userData?.schoolEmail || user.email;
      
      // Check if classroom belongs to this teacher
      if (classroom.teacherId !== user.email && classroom.teacherId !== schoolEmail) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied to this classroom" 
        });
      }
    }

    // Get student enrollments
    const enrollments = await repository.getEnrollmentsByClassroom(classroomId);
    
    // Get recent activity
    const recentActivity = await repository.getRecentActivity(classroomId, 20);

    const response = {
      classroom,
      students: enrollments,
      recentActivity,
      statistics: {
        studentCount: classroom.studentCount,
        assignmentCount: classroom.assignmentCount,
        activeSubmissions: classroom.activeSubmissions,
        ungradedSubmissions: classroom.ungradedSubmissions
      }
    };

    return res.status(200).json({ 
      success: true, 
      data: response 
    });

  } catch (error) {
    logger.error("Error fetching classroom details:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch classroom details",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Process a classroom snapshot (webhook endpoint)
 * This replaces the old sheet sync functionality
 */
export async function processClassroomSnapshot(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user (for webhook, this should be service auth)
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can process classroom snapshots" 
      });
    }

    // Validate request body as classroom snapshot
    const snapshotData = req.body;
    const snapshot = classroomSnapshotSchema.parse(snapshotData);

    logger.info("Processing classroom snapshot", { 
      teacherId: user.uid, 
      classroomCount: snapshot.classrooms.length,
      totalSubmissions: snapshot.globalStats.totalSubmissions
    });

    // Process snapshot using new architecture
    const processor = new SnapshotProcessor();
    const result = await processor.processSnapshot(snapshot);

    if (result.success) {
      logger.info("Classroom snapshot processed successfully", {
        teacherId: user.uid,
        stats: result.stats,
        processingTime: result.processingTime
      });

      return res.status(200).json({
        success: true,
        data: {
          stats: result.stats,
          processingTime: result.processingTime,
          errorCount: result.errors.length
        },
        message: `Successfully processed snapshot with ${result.stats.classroomsCreated + result.stats.classroomsUpdated} classrooms`
      });
    } else {
      logger.warn("Classroom snapshot processed with errors", {
        teacherId: user.uid,
        errors: result.errors
      });

      return res.status(207).json({ // 207 Multi-Status for partial success
        success: false,
        data: {
          stats: result.stats,
          processingTime: result.processingTime,
          errors: result.errors
        },
        error: "Snapshot processed with some errors. Check the errors array for details."
      });
    }

  } catch (error) {
    logger.error("Error processing classroom snapshot:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to process classroom snapshot",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get ungraded submissions for teacher dashboard
 */
export async function getUngradedSubmissions(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can access ungraded submissions" 
      });
    }

    // Get all classrooms for this teacher
    const classrooms = await repository.getClassroomsByTeacher(user.email!);
    const classroomIds = classrooms.map(c => c.id);

    // Get ungraded submissions across all classrooms
    const ungradedSubmissions = [];
    for (const classroomId of classroomIds) {
      const submissions = await repository.getUngradedSubmissions(classroomId);
      ungradedSubmissions.push(...submissions);
    }

    // Sort by submission date (oldest first for grading priority)
    ungradedSubmissions.sort((a, b) => 
      a.submittedAt.getTime() - b.submittedAt.getTime()
    );

    logger.info("Retrieved ungraded submissions", { 
      teacherId: user.uid, 
      count: ungradedSubmissions.length 
    });

    return res.status(200).json({ 
      success: true, 
      data: ungradedSubmissions 
    });

  } catch (error) {
    logger.error("Error fetching ungraded submissions:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch ungraded submissions",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Update classroom counts and statistics (maintenance endpoint)
 */
export async function updateClassroomCounts(req: Request, res: Response): Promise<Response> {
  try {
    const classroomId = req.params.classroomId;
    if (!classroomId) {
      return res.status(400).json({ 
        success: false, 
        error: "Classroom ID is required" 
      });
    }

    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can update classroom counts" 
      });
    }

    // Verify classroom ownership
    const classroom = await repository.getClassroom(classroomId);
    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        error: "Classroom not found" 
      });
    }

    // Get user's school email
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const schoolEmail = userData?.schoolEmail || user.email;
    
    // Check if classroom belongs to this teacher
    if (classroom.teacherId !== user.email && classroom.teacherId !== schoolEmail) {
      return res.status(403).json({ 
        success: false, 
        error: "Access denied to this classroom" 
      });
    }

    // Update counts using repository
    await repository.updateCounts(classroomId);

    logger.info("Updated classroom counts", { 
      teacherId: user.uid, 
      classroomId 
    });

    return res.status(200).json({ 
      success: true, 
      message: "Classroom counts updated successfully"
    });

  } catch (error) {
    logger.error("Error updating classroom counts:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to update classroom counts",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}