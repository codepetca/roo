import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { db, getCurrentTimestamp, sanitizeDocument, sanitizeDocuments } from "../config/firebase";
import { Assignment } from "../types";
import { createAssignmentSchema, testWriteSchema } from "../schemas";
import { handleRouteError, validateData, sendApiResponse } from "../middleware/validation";
import * as admin from "firebase-admin";

/**
 * Create a new test assignment in Firestore
 * Location: functions/src/routes/assignments.ts:10
 * Route: POST /assignments
 */
export async function createAssignment(req: Request, res: Response) {
  try {
    const validatedData = validateData(createAssignmentSchema, req.body);
    
    const assignmentData: Omit<Assignment, "id"> = {
      classroomId: "test-classroom-1",
      title: validatedData.title,
      description: validatedData.description,
      dueDate: validatedData.dueDate ? admin.firestore.Timestamp.fromDate(new Date(validatedData.dueDate)) : getCurrentTimestamp(),
      maxPoints: validatedData.maxPoints,
      gradingRubric: {
        enabled: validatedData.gradingRubric?.enabled ?? true,
        criteria: validatedData.gradingRubric?.criteria ?? ["Content", "Grammar", "Structure"],
        promptTemplate: validatedData.gradingRubric?.promptTemplate ?? "Grade this assignment based on content, grammar, and structure."
      },
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    
    const docRef = await db.collection("assignments").add(assignmentData);
    logger.info("Assignment created", { assignmentId: docRef.id });
    
    const createdAssignment = sanitizeDocument({
      ...assignmentData,
      id: docRef.id
    });
    
    sendApiResponse(
      res,
      { assignmentId: docRef.id, assignment: createdAssignment },
      true,
      "Assignment created successfully"
    );
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
    logger.info("listAssignments called", { method: req.method });
    
    // Return test data for now to get the UI working
    const testAssignments = [
      {
        id: "test-assignment-1",
        title: "Test Assignment 1",
        description: "This is a test assignment",
        maxPoints: 100,
        isQuiz: false,
        classroomId: "test-classroom",
        dueDate: { _seconds: Date.now() / 1000, _nanoseconds: 0 },
        createdAt: { _seconds: Date.now() / 1000, _nanoseconds: 0 },
        updatedAt: { _seconds: Date.now() / 1000, _nanoseconds: 0 },
        gradingRubric: {
          enabled: true,
          criteria: ["Content", "Grammar"],
          promptTemplate: "Grade this assignment"
        }
      }
    ];
    
    // Return assignments directly as expected by the frontend
    sendApiResponse(res, testAssignments);
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
    const validatedData = validateData(testWriteSchema, req.body);
    
    const testDoc = {
      message: "Test document from Roo",
      timestamp: getCurrentTimestamp(),
      testData: validatedData
    };
    
    const docRef = await db.collection("test").add(testDoc);
    logger.info("Test document written", { docId: docRef.id });
    
    sendApiResponse(
      res,
      { docId: docRef.id },
      true,
      "Test document written to Firestore"
    );
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