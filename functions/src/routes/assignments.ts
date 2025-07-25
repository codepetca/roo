import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { db, FieldValue } from "../config/firebase";
import { Assignment } from "../types";
import { createAssignmentSchema, testWriteSchema } from "../schemas";
import { handleRouteError } from "../middleware/validation";

/**
 * Create a new test assignment in Firestore
 * Location: functions/src/routes/assignments.ts:10
 * Route: POST /assignments
 */
export async function createAssignment(req: Request, res: Response) {
  try {
    const validatedData = createAssignmentSchema.parse(req.body);
    
    const assignmentData: Omit<Assignment, "id"> = {
      classroomId: "test-classroom-1",
      title: validatedData.title,
      description: validatedData.description,
      dueDate: FieldValue.serverTimestamp() as any,
      maxPoints: validatedData.maxPoints,
      gradingRubric: validatedData.gradingRubric || {
        enabled: true,
        criteria: ["Content", "Grammar", "Structure"],
        promptTemplate: "Grade this assignment based on content, grammar, and structure."
      },
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any
    };
    
    const docRef = await db.collection("assignments").add(assignmentData);
    logger.info("Assignment created", { assignmentId: docRef.id });
    
    res.json({
      success: true,
      assignmentId: docRef.id,
      assignment: {
        ...assignmentData,
        id: docRef.id
      },
      message: "Assignment created successfully"
    });
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * List all assignments from Firestore
 * Location: functions/src/routes/assignments.ts:45
 * Route: GET /assignments
 */
export async function listAssignments(req: Request, res: Response) {
  try {
    const snapshot = await db.collection("assignments")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
    
    const assignments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Test Firestore write operation
 * Location: functions/src/routes/assignments.ts:68
 * Route: POST /test-write
 */
export async function testFirestoreWrite(req: Request, res: Response) {
  try {
    const validatedData = testWriteSchema.parse(req.body);
    
    const testDoc = {
      message: "Test document from Roo",
      timestamp: FieldValue.serverTimestamp(),
      testData: validatedData
    };
    
    const docRef = await db.collection("test").add(testDoc);
    logger.info("Test document written", { docId: docRef.id });
    
    res.json({
      success: true,
      docId: docRef.id,
      message: "Test document written to Firestore"
    });
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Test Firestore read operation
 * Location: functions/src/routes/assignments.ts:92
 * Route: GET /test-read
 */
export async function testFirestoreRead(req: Request, res: Response) {
  try {
    const snapshot = await db.collection("test")
      .orderBy("timestamp", "desc")
      .limit(5)
      .get();
    
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    handleRouteError(error, req, res);
  }
}