import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { db } from "../config/firebase";
import { classroomDomainSchema, assignmentDomainSchema } from "../schemas/domain";
import { type ClassroomResponse } from "../schemas/dto";
import { classroomDomainToDto, assignmentDomainToDto } from "../schemas/transformers";
import { getUserFromRequest } from "../middleware/validation";
import { processDocumentTimestamps, serializeDocumentTimestamps } from "../utils/timestamps";

/**
 * Get all classrooms for the authenticated teacher (OPTIMIZED VERSION)
 * Uses batch queries to avoid N+1 problem and proper timestamp handling
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

    // Step 1: Get all classrooms for this teacher
    const classroomsSnapshot = await db
      .collection("classrooms")
      .where("teacherId", "==", user.uid)
      .orderBy("name")
      .get();

    if (classroomsSnapshot.empty) {
      return res.status(200).json({ 
        success: true, 
        data: [] 
      });
    }

    const classroomIds = classroomsSnapshot.docs.map(doc => doc.id);
    
    // Step 2: Batch query all assignments for all classrooms
    const assignmentsSnapshot = await db
      .collection("assignments")
      .where("classroomId", "in", classroomIds)
      .get();

    // Group assignments by classroom
    const assignmentsByClassroom = new Map<string, string[]>();
    for (const doc of assignmentsSnapshot.docs) {
      const classroomId = doc.data().classroomId;
      if (!assignmentsByClassroom.has(classroomId)) {
        assignmentsByClassroom.set(classroomId, []);
      }
      assignmentsByClassroom.get(classroomId)!.push(doc.id);
    }

    // Step 3: Batch query submission counts
    const allAssignmentIds = assignmentsSnapshot.docs.map(doc => doc.id);
    
    let totalSubmissionsData = new Map<string, number>();
    let ungradedSubmissionsData = new Map<string, number>();

    if (allAssignmentIds.length > 0) {
      // Firebase 'in' queries are limited to 10 items, so we need to batch them
      const batches = [];
      for (let i = 0; i < allAssignmentIds.length; i += 10) {
        batches.push(allAssignmentIds.slice(i, i + 10));
      }

      // Get total submissions
      for (const batch of batches) {
        const submissionsSnapshot = await db
          .collection("submissions")
          .where("assignmentId", "in", batch)
          .get();

        for (const doc of submissionsSnapshot.docs) {
          const assignmentId = doc.data().assignmentId;
          totalSubmissionsData.set(assignmentId, (totalSubmissionsData.get(assignmentId) || 0) + 1);
        }
      }

      // Get ungraded submissions
      for (const batch of batches) {
        const ungradedSnapshot = await db
          .collection("submissions")
          .where("assignmentId", "in", batch)
          .where("status", "==", "pending")
          .get();

        for (const doc of ungradedSnapshot.docs) {
          const assignmentId = doc.data().assignmentId;
          ungradedSubmissionsData.set(assignmentId, (ungradedSubmissionsData.get(assignmentId) || 0) + 1);
        }
      }
    }

    // Step 4: Process classrooms with aggregated data
    const classrooms: ClassroomResponse[] = [];
    
    for (const doc of classroomsSnapshot.docs) {
      try {
        const rawData = { ...doc.data(), id: doc.id };
        
        // Process timestamps using centralized function
        const processedData = processDocumentTimestamps(rawData);
        
        // Validate with domain schema
        const classroom = classroomDomainSchema.parse(processedData);
        
        // Calculate aggregated metrics
        const assignmentIds = assignmentsByClassroom.get(doc.id) || [];
        const assignmentCount = assignmentIds.length;
        
        let totalSubmissions = 0;
        let ungradedSubmissions = 0;
        
        for (const assignmentId of assignmentIds) {
          totalSubmissions += totalSubmissionsData.get(assignmentId) || 0;
          ungradedSubmissions += ungradedSubmissionsData.get(assignmentId) || 0;
        }
        
        // Convert to DTO and serialize timestamps for API response
        const classroomDto = classroomDomainToDto(classroom);
        const serializedClassroom = serializeDocumentTimestamps(classroomDto);
        
        const classroomResponse = {
          ...serializedClassroom,
          assignmentCount,
          totalSubmissions,
          ungradedSubmissions
        };
        
        classrooms.push(classroomResponse);
        
      } catch (error) {
        logger.error("Error processing classroom:", { 
          classroomId: doc.id, 
          error: error instanceof Error ? error.message : error,
          data: doc.data()
        });
        // Continue processing other classrooms instead of failing completely
      }
    }

    logger.info("Retrieved teacher classrooms (optimized)", { 
      teacherId: user.uid, 
      count: classrooms.length
    });

    return res.status(200).json({ 
      success: true, 
      data: classrooms 
    });

  } catch (error) {
    logger.error("Error fetching teacher classrooms (optimized):", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch classrooms",
      details: error instanceof Error ? error.message : "Unknown error"
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