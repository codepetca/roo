import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { FirestoreRepository, serializeTimestamps } from "../services/firestore-repository";
import { getUserFromRequest } from "../middleware/validation";
import { 
  TeacherDashboard,
  ClassroomWithAssignments,
  AssignmentWithStats,
  DashboardUser
} from "@shared/schemas/core";
import { db, getCurrentTimestamp } from "../config/firebase";

/**
 * Teacher Dashboard API Routes
 * Location: functions/src/routes/teacher-dashboard.ts
 * 
 * Provides aggregated data for teacher dashboard using normalized entities
 */

const repository = new FirestoreRepository();

/**
 * Get comprehensive teacher dashboard data
 * GET /api/teacher/dashboard
 */
export async function getTeacherDashboard(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can access dashboard data" 
      });
    }

    logger.info("Loading teacher dashboard", { teacherId: user.uid });

    // Get user profile (normalized by repository)
    logger.info("Dashboard step 1: Getting user profile", { uid: user.uid });
    let userData = await repository.getUserById(user.uid);
    if (!userData) {
      // If user profile doesn't exist, it should be created through the 
      // createProfileForExistingUser callable function, not here.
      // For now, return an error indicating profile setup is needed.
      logger.warn("Dashboard step 2: User profile not found, profile setup required", { uid: user.uid });
      return res.status(400).json({
        success: false,
        error: "User profile not found",
        needsProfile: true,
        message: "Please complete your profile setup first"
      });
    }
    logger.info("Dashboard step 2: User profile found (normalized)", { 
      userData: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        hasSchoolEmail: !!userData.schoolEmail,
        normalizedFields: Object.keys(userData)
      }
    });

    // Get school email from teacherData if not in main user object
    if (!userData.schoolEmail && userData.teacherData?.boardAccountEmail) {
      userData.schoolEmail = userData.teacherData.boardAccountEmail;
      // Update user with school email
      await repository.updateUser(user.uid, {
        schoolEmail: userData.teacherData.boardAccountEmail
      });
    }

    // Create dashboard user object - repository already provides normalized data
    const dashboardUser: DashboardUser = serializeTimestamps({
      id: userData.id,  // Use the ID from normalized data
      email: userData.email,
      name: userData.displayName,
      role: userData.role,
      schoolEmail: userData.schoolEmail,
      classroomIds: userData.classroomIds,
      totalStudents: userData.totalStudents,
      totalClassrooms: userData.totalClassrooms,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    });

    // Get teacher's classrooms with assignments
    logger.info("Dashboard step 4: Getting classrooms", { teacherEmail: userData.email });
    const classrooms = await repository.getClassroomsByTeacher(userData.email);
    logger.info("Dashboard step 5: Classrooms retrieved", { classroomCount: classrooms.length, classrooms: classrooms.map(c => ({ id: c.id, name: c.name })) });
    const classroomsWithAssignments: ClassroomWithAssignments[] = [];
    
    // Calculate global statistics
    let totalStudents = 0;
    let totalAssignments = 0;
    let ungradedSubmissions = 0;
    const recentActivity: Array<{ type: "submission" | "grade" | "assignment"; timestamp: Date; details: Record<string, unknown> }> = [];

    for (const classroom of classrooms) {
      // Get assignments for this classroom
      const assignments = await repository.getAssignmentsByClassroom(classroom.id);
      
      classroomsWithAssignments.push({
        ...classroom,
        assignments
      });

      // Update counters
      totalStudents += classroom.studentCount;
      totalAssignments += assignments.length;
      ungradedSubmissions += classroom.ungradedSubmissions;

      // Get recent activity for this classroom (simplified)
      const recentClassroomActivity = await repository.getRecentActivity(classroom.id, 5);
      
      // Transform to dashboard activity format
      recentClassroomActivity.forEach(item => {
        // Helper to convert Firestore Timestamp to Date
        const convertTimestamp = (timestamp: any): Date => {
          if (timestamp instanceof Date) return timestamp;
          if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
          if (timestamp && timestamp._seconds !== undefined) return new Date(timestamp._seconds * 1000);
          return new Date();
        };

        if ("submittedAt" in item) {
          // It's a submission
          recentActivity.push({
            type: "submission",
            timestamp: convertTimestamp(item.submittedAt),
            details: {
              classroomId: item.classroomId,
              classroomName: classroom.name,
              studentName: item.studentName,
              assignmentId: item.assignmentId
            }
          });
        } else if ("gradedAt" in item) {
          // It's a grade
          recentActivity.push({
            type: "grade",
            timestamp: convertTimestamp(item.gradedAt),
            details: {
              classroomId: item.classroomId,
              classroomName: classroom.name,
              studentId: item.studentId,
              score: item.score,
              maxScore: item.maxScore
            }
          });
        }
      });
    }

    // Sort recent activity by timestamp
    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Calculate average grade (simplified - would need more complex query in production)
    const allGrades = await Promise.all(
      classrooms.map(c => repository.getGradesByClassroom(c.id))
    );
    const flatGrades = allGrades.flat();
    const averageGrade = flatGrades.length > 0 
      ? flatGrades.reduce((sum, grade) => sum + grade.percentage, 0) / flatGrades.length
      : undefined;

    const dashboardData: TeacherDashboard = {
      teacher: dashboardUser,
      classrooms: classroomsWithAssignments,
      recentActivity: recentActivity.slice(0, 10), // Latest 10 activities
      stats: {
        totalStudents,
        totalAssignments,
        ungradedSubmissions,
        averageGrade: averageGrade ? Math.round(averageGrade * 100) / 100 : undefined
      }
    };

    logger.info("Teacher dashboard loaded successfully", {
      teacherId: user.uid,
      classroomCount: classrooms.length,
      totalStudents,
      totalAssignments
    });

    // Debug logging to help identify schema validation issues
    logger.info("Dashboard response structure debug", {
      teacherId: user.uid,
      teacher: {
        id: dashboardUser.id,
        email: dashboardUser.email,
        name: dashboardUser.name,
        role: dashboardUser.role,
        createdAt: dashboardUser.createdAt,
        updatedAt: dashboardUser.updatedAt
      },
      classroomsCount: classroomsWithAssignments.length,
      recentActivityCount: recentActivity.length,
      recentActivitySample: recentActivity.slice(0, 2).map(activity => ({
        type: activity.type,
        timestamp: activity.timestamp,
        timestampType: typeof activity.timestamp,
        detailsKeys: Object.keys(activity.details)
      })),
      stats: dashboardData.stats,
      sampleClassroom: classroomsWithAssignments[0] ? {
        id: classroomsWithAssignments[0].id,
        name: classroomsWithAssignments[0].name,
        createdAt: classroomsWithAssignments[0].createdAt,
        updatedAt: classroomsWithAssignments[0].updatedAt,
        createdAtType: typeof classroomsWithAssignments[0].createdAt,
        assignmentsCount: classroomsWithAssignments[0].assignments.length
      } : null
    });

    // Serialize all timestamps to ISO strings before sending to frontend
    const serializedData = serializeTimestamps(dashboardData);
    
    return res.status(200).json({
      success: true,
      data: serializedData
    });

  } catch (error) {
    logger.error("Failed to load teacher dashboard", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load dashboard data",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get teacher's classrooms with basic info
 * GET /api/teacher/classrooms
 */
export async function getTeacherClassroomsBasic(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can access classroom data" 
      });
    }

    // Get user profile
    const userData = await repository.getUserById(user.uid);
    if (!userData) {
      return res.status(200).json({ 
        success: true, 
        data: [] 
      });
    }

    // Get classrooms
    const classrooms = await repository.getClassroomsByTeacher(userData.email);
    
    return res.status(200).json({
      success: true,
      data: classrooms
    });

  } catch (error) {
    logger.error("Failed to get teacher classrooms", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get classrooms",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get detailed statistics for a specific classroom
 * GET /api/classrooms/:id/stats
 */
export async function getClassroomStats(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can access classroom statistics" 
      });
    }

    const classroomId = (req as any).params.classroomId;
    if (!classroomId) {
      return res.status(400).json({
        success: false,
        error: "Classroom ID is required"
      });
    }

    // Get classroom details
    const classroom = await repository.getClassroom(classroomId);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: "Classroom not found"
      });
    }

    // Get assignments, students, and recent activity
    const [assignments, students, recentActivity, grades] = await Promise.all([
      repository.getAssignmentsByClassroom(classroomId),
      repository.getEnrollmentsByClassroom(classroomId),
      repository.getRecentActivity(classroomId, 15),
      repository.getGradesByClassroom(classroomId)
    ]);

    // Calculate statistics
    const stats = {
      studentCount: students.length,
      assignmentCount: assignments.length,
      activeSubmissions: classroom.activeSubmissions,
      ungradedSubmissions: classroom.ungradedSubmissions,
      averageGrade: grades.length > 0 
        ? Math.round((grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length) * 100) / 100
        : undefined,
      submissionRate: classroom.activeSubmissions > 0 
        ? Math.round((classroom.activeSubmissions / (students.length * assignments.length || 1)) * 100)
        : 0
    };

    return res.status(200).json({
      success: true,
      data: {
        classroom,
        students,
        recentActivity,
        statistics: stats
      }
    });

  } catch (error) {
    logger.error("Failed to get classroom stats", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get classroom statistics",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Get assignments with submission stats for a classroom
 * GET /api/classrooms/:id/assignments/stats
 */
export async function getClassroomAssignmentsWithStats(req: Request, res: Response): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can access assignment statistics" 
      });
    }

    const classroomId = (req as any).params.classroomId;
    if (!classroomId) {
      return res.status(400).json({
        success: false,
        error: "Classroom ID is required"
      });
    }

    // Get assignments for this classroom
    const assignments = await repository.getAssignmentsByClassroom(classroomId);
    const assignmentsWithStats: AssignmentWithStats[] = [];

    for (const assignment of assignments) {
      // Get submissions for this assignment
      const submissions = await repository.getSubmissionsByAssignment(assignment.id);
      
      // Get grades by filtering from classroom grades (workaround until getGradesByAssignment is implemented)
      const allGrades = await repository.getGradesByClassroom(classroomId);
      const grades = allGrades.filter(grade => 
        submissions.some(sub => sub.id === grade.submissionId)
      );

      // Calculate statistics
      const submissionsWithGrades = submissions.map(submission => ({
        ...submission,
        grade: grades.find(grade => grade.submissionId === submission.id) || null
      }));

      assignmentsWithStats.push({
        ...assignment,
        submissions: submissionsWithGrades,
        recentSubmissions: submissions
          .filter(s => s.submittedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
          .slice(0, 5) // Latest 5
      });
    }

    return res.status(200).json({
      success: true,
      data: assignmentsWithStats
    });

  } catch (error) {
    logger.error("Failed to get classroom assignments with stats", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get assignment statistics",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}