import { Request, Response } from "express";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { db } from "../config/firebase";
import { classroomDomainSchema, assignmentDomainSchema } from "../schemas/domain";
import { type ClassroomResponse } from "../schemas/dto";
import { classroomDomainToDto, assignmentDomainToDto } from "../schemas/transformers";
import { getUserFromRequest } from "../middleware/validation";

/**
 * Get all classrooms for the authenticated teacher
 * Location: functions/src/routes/classrooms.ts:10
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

    // Query classrooms where teacherId matches
    const classroomsSnapshot = await db
      .collection("classrooms")
      .where("teacherId", "==", user.uid)
      .orderBy("name")
      .get();

    const classrooms: ClassroomResponse[] = [];
    for (const doc of classroomsSnapshot.docs) {
      try {
        const data = doc.data();
        logger.info("Raw classroom data:", { classroomId: doc.id, data });
        
        // Convert timestamp objects to Timestamp instances if needed
        const processedData: any = { ...data, id: doc.id };
        if (data.createdAt && typeof data.createdAt === "object" && "_seconds" in data.createdAt) {
          processedData.createdAt = admin.firestore.Timestamp.fromDate(new Date((data.createdAt as any)._seconds * 1000 + ((data.createdAt as any)._nanoseconds || 0) / 1000000));
        }
        if (data.updatedAt && typeof data.updatedAt === "object" && "_seconds" in data.updatedAt) {
          processedData.updatedAt = admin.firestore.Timestamp.fromDate(new Date((data.updatedAt as any)._seconds * 1000 + ((data.updatedAt as any)._nanoseconds || 0) / 1000000));
        }
        
        const classroom = classroomDomainSchema.parse(processedData);
        
        // Get assignment count for this classroom
        const assignmentsSnapshot = await db
          .collection("assignments")
          .where("classroomId", "==", doc.id)
          .get();
        
        const assignmentCount = assignmentsSnapshot.size;
        
        // Get submission counts
        let totalSubmissions = 0;
        let ungradedSubmissions = 0;
        
        for (const assignmentDoc of assignmentsSnapshot.docs) {
          const submissionsSnapshot = await db
            .collection("submissions")
            .where("assignmentId", "==", assignmentDoc.id)
            .get();
          
          totalSubmissions += submissionsSnapshot.size;
          
          const ungradedSnapshot = await db
            .collection("submissions")
            .where("assignmentId", "==", assignmentDoc.id)
            .where("status", "==", "pending")
            .get();
          
          ungradedSubmissions += ungradedSnapshot.size;
        }
        
        // Create response with additional metadata
        const classroomResponse = {
          ...classroomDomainToDto(classroom),
          assignmentCount,
          totalSubmissions,
          ungradedSubmissions
        };
        
        classrooms.push(classroomResponse);
      } catch (error) {
        logger.error("Error parsing classroom:", { 
          classroomId: doc.id, 
          error: error instanceof Error ? error.message : error,
          data: doc.data()
        });
      }
    }

    logger.info("Retrieved teacher classrooms", { 
      teacherId: user.uid, 
      count: classrooms.length 
    });

    return res.status(200).json({ 
      success: true, 
      data: classrooms 
    });
  } catch (error) {
    logger.error("Error fetching teacher classrooms:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch classrooms" 
    });
  }
}

/**
 * Get assignments for a specific classroom with submission counts
 * Location: functions/src/routes/classrooms.ts:95
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

    // Verify classroom exists and user has access
    const classroomDoc = await db.collection("classrooms").doc(classroomId).get();
    if (!classroomDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Classroom not found" 
      });
    }

    const classroom = classroomDomainSchema.parse({ 
      ...classroomDoc.data(), 
      id: classroomDoc.id 
    });

    // Check access: teacher owns it or student is enrolled
    if (user.role === "teacher" && classroom.teacherId !== user.uid) {
      return res.status(403).json({ 
        success: false, 
        error: "Access denied to this classroom" 
      });
    }
    if (user.role === "student" && !classroom.studentIds?.includes(user.uid)) {
      return res.status(403).json({ 
        success: false, 
        error: "Access denied to this classroom" 
      });
    }

    // Get assignments for this classroom
    const assignmentsSnapshot = await db
      .collection("assignments")
      .where("classroomId", "==", classroomId)
      .orderBy("createdAt", "desc")
      .get();

    const assignments = [];
    for (const doc of assignmentsSnapshot.docs) {
      try {
        const data = doc.data();
        const assignment = assignmentDomainSchema.parse({ ...data, id: doc.id });
        
        // Get submission count for this assignment
        const submissionsSnapshot = await db
          .collection("submissions")
          .where("assignmentId", "==", doc.id)
          .get();
        
        const submissionCount = submissionsSnapshot.size;
        
        // Get graded count
        const gradedSnapshot = await db
          .collection("submissions")
          .where("assignmentId", "==", doc.id)
          .where("status", "==", "graded")
          .get();
        
        const gradedCount = gradedSnapshot.size;
        
        // Create response with additional metadata
        const assignmentResponse = {
          ...assignmentDomainToDto(assignment),
          submissionCount,
          gradedCount,
          classroomName: classroom.name
        };
        
        assignments.push(assignmentResponse);
      } catch (error) {
        logger.error("Error parsing assignment:", { 
          assignmentId: doc.id, 
          error 
        });
      }
    }

    logger.info("Retrieved classroom assignments", { 
      classroomId, 
      count: assignments.length 
    });

    return res.status(200).json({ 
      success: true, 
      data: assignments 
    });
  } catch (error) {
    logger.error("Error fetching classroom assignments:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch assignments" 
    });
  }
}