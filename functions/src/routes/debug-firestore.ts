import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { db } from "../config/firebase";

/**
 * Debug endpoint to test Firestore data fetching
 * GET /api/debug/firestore
 */
export async function debugFirestore(req: Request, res: Response): Promise<Response> {
  try {
    logger.info("Starting Firestore debug test");
    
    // Test 1: Can we fetch ANY document from Firestore?
    const usersSnapshot = await db.collection("users").limit(1).get();
    const anyUser = !usersSnapshot.empty ? usersSnapshot.docs[0].data() : null;
    
    logger.info("Test 1 - Any user found", { 
      found: !usersSnapshot.empty,
      userId: anyUser ? usersSnapshot.docs[0].id : null 
    });
    
    // Test 2: Can we fetch classrooms?
    const classroomsSnapshot = await db.collection("classrooms").limit(3).get();
    const classrooms = classroomsSnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
    
    logger.info("Test 2 - Classrooms found", { 
      count: classrooms.length,
      firstClassroomId: classrooms[0]?.id 
    });
    
    // Test 3: Check the actual structure of classroom data
    if (classrooms.length > 0) {
      const firstClassroom = classrooms[0].data;
      logger.info("Test 3 - First classroom structure", {
        keys: Object.keys(firstClassroom),
        teacherId: firstClassroom.teacherId,
        name: firstClassroom.name,
        createdAt: typeof firstClassroom.createdAt,
        updatedAt: typeof firstClassroom.updatedAt
      });
    }
    
    // Test 4: Check for teacher with test.codepet@gmail.com
    const teacherQuery = await db.collection("classrooms")
      .where("teacherId", "==", "test.codepet@gmail.com")
      .limit(5)
      .get();
    
    const teacherClassrooms = teacherQuery.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      teacherId: doc.data().teacherId
    }));
    
    logger.info("Test 4 - Classrooms for test.codepet@gmail.com", {
      count: teacherClassrooms.length,
      classrooms: teacherClassrooms
    });
    
    // Test 5: Check users collection for teacher@test.com
    const teacherUserQuery = await db.collection("users")
      .where("email", "==", "teacher@test.com")
      .limit(1)
      .get();
    
    const teacherUser = !teacherUserQuery.empty ? {
      id: teacherUserQuery.docs[0].id,
      data: teacherUserQuery.docs[0].data()
    } : null;
    
    logger.info("Test 5 - User teacher@test.com", {
      found: teacherUser !== null,
      userId: teacherUser?.id,
      schoolEmail: teacherUser?.data?.schoolEmail,
      role: teacherUser?.data?.role
    });
    
    return res.status(200).json({
      success: true,
      tests: {
        anyUserFound: anyUser !== null,
        classroomsFound: classrooms.length,
        firstClassroom: classrooms[0] || null,
        teacherClassrooms: teacherClassrooms,
        teacherUser: teacherUser
      }
    });
    
  } catch (error) {
    logger.error("Debug Firestore failed", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Debug endpoint to validate data against Zod schemas
 * GET /api/debug/validate
 */
export async function debugValidation(req: Request, res: Response): Promise<Response> {
  try {
    const { classroomSchema, assignmentSchema } = require("@shared/schemas/core");
    
    // Fetch a classroom and try to validate it
    const classroomSnapshot = await db.collection("classrooms").limit(1).get();
    
    if (classroomSnapshot.empty) {
      return res.status(200).json({
        success: false,
        error: "No classrooms found"
      });
    }
    
    const rawClassroom = {
      id: classroomSnapshot.docs[0].id,
      ...classroomSnapshot.docs[0].data()
    };
    
    // Try to validate against the schema
    const validationResult = classroomSchema.safeParse(rawClassroom);
    
    logger.info("Validation test", {
      rawDataKeys: Object.keys(rawClassroom),
      validationSuccess: validationResult.success,
      validationErrors: validationResult.success ? null : validationResult.error.errors
    });
    
    return res.status(200).json({
      success: true,
      rawData: rawClassroom,
      validationResult: {
        success: validationResult.success,
        errors: validationResult.success ? null : validationResult.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        }))
      }
    });
    
  } catch (error) {
    logger.error("Debug validation failed", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}