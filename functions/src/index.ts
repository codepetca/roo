import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {db, FieldValue} from "./config/firebase";
import {Assignment} from "./types";

export const api = onRequest({cors: true}, async (request, response) => {
  logger.info("Roo API function called", {
    method: request.method,
    path: request.path,
    structuredData: true
  });

  try {
    const {method, path} = request;
    
    // Route handling
    if (method === "GET" && path === "/") {
      response.json({
        message: "Roo auto-grading system API",
        timestamp: new Date().toISOString(),
        status: "active",
        version: "1.0.0",
        endpoints: {
          "GET /": "API status",
          "POST /test-write": "Test Firestore write",
          "GET /test-read": "Test Firestore read",
          "GET /assignments": "List all assignments",
          "POST /assignments": "Create test assignment"
        }
      });
      return;
    }

    // Test Firestore write
    if (method === "POST" && path === "/test-write") {
      const testDoc = {
        message: "Test document from Roo",
        timestamp: FieldValue.serverTimestamp(),
        testData: request.body || {}
      };
      
      const docRef = await db.collection("test").add(testDoc);
      logger.info("Test document written", {docId: docRef.id});
      
      response.json({
        success: true,
        docId: docRef.id,
        message: "Test document written to Firestore"
      });
      return;
    }

    // Test Firestore read
    if (method === "GET" && path === "/test-read") {
      const snapshot = await db.collection("test")
        .orderBy("timestamp", "desc")
        .limit(5)
        .get();
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      response.json({
        success: true,
        count: documents.length,
        documents
      });
      return;
    }

    // Create test assignment
    if (method === "POST" && path === "/assignments") {
      const assignmentData: Omit<Assignment, "id"> = {
        classroomId: "test-classroom-1",
        title: request.body.title || "Test Assignment",
        description: request.body.description || "This is a test assignment",
        dueDate: FieldValue.serverTimestamp() as any,
        maxPoints: request.body.maxPoints || 100,
        gradingRubric: {
          enabled: true,
          criteria: ["Content", "Grammar", "Structure"],
          promptTemplate: "Grade this assignment based on content, grammar, and structure."
        },
        createdAt: FieldValue.serverTimestamp() as any,
        updatedAt: FieldValue.serverTimestamp() as any
      };
      
      const docRef = await db.collection("assignments").add(assignmentData);
      logger.info("Assignment created", {assignmentId: docRef.id});
      
      response.json({
        success: true,
        assignmentId: docRef.id,
        message: "Test assignment created"
      });
      return;
    }

    // List assignments
    if (method === "GET" && path === "/assignments") {
      const snapshot = await db.collection("assignments")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      response.json({
        success: true,
        count: assignments.length,
        assignments
      });
      return;
    }

    // Default 404
    response.status(404).json({
      error: "Endpoint not found",
      path: request.path,
      method: request.method
    });
    
  } catch (error) {
    logger.error("API error", error);
    response.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});