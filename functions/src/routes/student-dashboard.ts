import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { FirestoreRepository, serializeTimestamps } from "../services/firestore-repository";
import { getUserFromRequest } from "../middleware/validation";
import { 
  StudentDashboard,
  Classroom,
  Assignment,
  Submission,
  Grade,
  StudentEnrollment
} from "@shared/schemas/core";

/**
 * Student Dashboard API Routes
 * Location: functions/src/routes/student-dashboard.ts
 * 
 * Provides aggregated data for student dashboard using normalized entities
 * Shows pending and returned work for enrolled students
 */

const repository = new FirestoreRepository();

/**
 * Get comprehensive student dashboard data
 * GET /api/student/dashboard
 */
export async function getStudentDashboard(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "student") {
      return res.status(403).json({ 
        success: false, 
        error: "Only students can access dashboard data" 
      });
    }

    logger.info("Loading student dashboard", { studentId: user.uid });

    // Step 1: Get student's enrollments (classrooms they're in)
    const enrollments = await repository.getEnrollmentsByStudent(user.uid);
    if (enrollments.length === 0) {
      logger.info("Student has no active enrollments", { studentId: user.uid });
      return res.status(200).json({
        success: true,
        data: {
          studentId: user.uid,
          classrooms: [],
          overallStats: {
            totalAssignments: 0,
            completedAssignments: 0,
            averageGrade: undefined
          }
        }
      });
    }

    logger.info("Found student enrollments", { 
      studentId: user.uid, 
      enrollmentCount: enrollments.length,
      classroomIds: enrollments.map(e => e.classroomId)
    });

    // Step 2: Get classroom details and assignments for each enrollment
    const dashboardClassrooms = [];
    let totalAssignments = 0;
    let completedAssignments = 0;
    const allGrades: Grade[] = [];

    for (const enrollment of enrollments) {
      // Get classroom details
      const classroom = await repository.getClassroom(enrollment.classroomId);
      if (!classroom) {
        logger.warn("Classroom not found for enrollment", { 
          classroomId: enrollment.classroomId 
        });
        continue;
      }

      // Get assignments for this classroom
      const assignments = await repository.getAssignmentsByClassroom(enrollment.classroomId);
      
      // Get student's submissions for this classroom
      const submissions = await repository.getSubmissionsByStudent(user.uid, enrollment.classroomId);
      
      // Get student's grades for this classroom
      const grades = await repository.getGradesByStudentAndClassroom(user.uid, enrollment.classroomId);
      
      // Calculate assignment stats - determine which assignments have submissions/grades
      const assignmentsWithStats = assignments.map(assignment => {
        const submission = submissions.find(s => s.assignmentId === assignment.id);
        const grade = grades.find(g => g.assignmentId === assignment.id);
        
        return {
          ...assignment,
          submissions: submission ? [{ ...submission, grade }] : [],
          recentSubmissions: submission ? [submission] : [],
          hasSubmission: !!submission,
          isGraded: !!grade,
          isPending: !!submission && !grade,
          isReturned: !!grade
        };
      });

      // Calculate classroom-level average grade
      const classroomGrades = grades.filter(g => g.percentage !== undefined);
      const classroomAverage = classroomGrades.length > 0
        ? Math.round((classroomGrades.reduce((sum, g) => sum + g.percentage, 0) / classroomGrades.length) * 100) / 100
        : undefined;

      dashboardClassrooms.push({
        classroom,
        assignments: assignmentsWithStats,
        grades,
        averageGrade: classroomAverage
      });

      // Update overall counters
      totalAssignments += assignments.length;
      completedAssignments += assignmentsWithStats.filter(a => a.hasSubmission).length;
      allGrades.push(...grades);
    }

    // Calculate overall average grade
    const validGrades = allGrades.filter(g => g.percentage !== undefined);
    const overallAverage = validGrades.length > 0
      ? Math.round((validGrades.reduce((sum, g) => sum + g.percentage, 0) / validGrades.length) * 100) / 100
      : undefined;

    const dashboardData: StudentDashboard = {
      studentId: user.uid,
      classrooms: dashboardClassrooms,
      overallStats: {
        totalAssignments,
        completedAssignments,
        averageGrade: overallAverage
      }
    };

    logger.info("Student dashboard loaded successfully", {
      studentId: user.uid,
      classroomCount: dashboardClassrooms.length,
      totalAssignments,
      completedAssignments,
      overallAverage
    });

    // Serialize all timestamps to ISO strings before sending to frontend
    const serializedData = serializeTimestamps(dashboardData);
    
    return res.status(200).json({
      success: true,
      data: serializedData
    });

  } catch (error) {
    logger.error("Failed to load student dashboard", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load dashboard data",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get student's assignments with status (pending vs returned)
 * GET /api/student/assignments
 */
export async function getStudentAssignments(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "student") {
      return res.status(403).json({ 
        success: false, 
        error: "Only students can access assignment data" 
      });
    }

    const classroomId = req.query.classroomId as string;

    // Get student's submissions
    const submissions = await repository.getSubmissionsByStudent(user.uid, classroomId);
    
    // Get student's grades  
    const grades = classroomId 
      ? await repository.getGradesByStudentAndClassroom(user.uid, classroomId)
      : await repository.getGradesByStudent(user.uid);

    // Group by assignment status
    const pendingSubmissions = submissions.filter(s => 
      s.status === "submitted" && !grades.find(g => g.submissionId === s.id)
    );
    
    const returnedWork = submissions.filter(s => 
      grades.find(g => g.submissionId === s.id)
    ).map(s => ({
      ...s,
      grade: grades.find(g => g.submissionId === s.id)
    }));

    return res.status(200).json({
      success: true,
      data: {
        pending: pendingSubmissions,
        returned: returnedWork,
        allSubmissions: submissions,
        allGrades: grades
      }
    });

  } catch (error) {
    logger.error("Failed to get student assignments", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get student assignments",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get student's recent activity across all classrooms  
 * GET /api/student/activity
 */
export async function getStudentActivity(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "student") {
      return res.status(403).json({ 
        success: false, 
        error: "Only students can access activity data" 
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get recent activity
    const recentActivity = await repository.getStudentRecentActivity(user.uid, limit);
    
    return res.status(200).json({
      success: true,
      data: recentActivity
    });

  } catch (error) {
    logger.error("Failed to get student activity", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get student activity", 
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}