import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {db, FieldValue} from "./config/firebase";
import {Assignment} from "./types";
import {createAssignmentSchema, testWriteSchema, testGradingSchema} from "./schemas";
import {z} from "zod";
// Define the secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const api = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey]
  },
  async (request, response) => {
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
          "POST /assignments": "Create test assignment",
          "POST /test-grading": "Test AI grading with sample text",
          "GET /gemini/test": "Test Gemini API connection"
        }
      });
      return;
    }

    // Test Firestore write
    if (method === "POST" && path === "/test-write") {
      try {
        // Validate request body
        const validatedData = testWriteSchema.parse(request.body);
        
        const testDoc = {
          message: "Test document from Roo",
          timestamp: FieldValue.serverTimestamp(),
          testData: validatedData
        };
        
        const docRef = await db.collection("test").add(testDoc);
        logger.info("Test document written", {docId: docRef.id});
        
        response.json({
          success: true,
          docId: docRef.id,
          message: "Test document written to Firestore"
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          response.status(400).json({
            error: "Validation failed",
            details: validationError.issues
          });
        } else {
          throw validationError;
        }
      }
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
      try {
        // Validate request body
        const validatedData = createAssignmentSchema.parse(request.body);
        
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
        logger.info("Assignment created", {assignmentId: docRef.id});
        
        response.json({
          success: true,
          assignmentId: docRef.id,
          assignment: {
            ...assignmentData,
            id: docRef.id
          },
          message: "Assignment created successfully"
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          response.status(400).json({
            error: "Validation failed",
            details: validationError.issues
          });
        } else {
          throw validationError;
        }
      }
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

    // Test Gemini connection
    if (method === "GET" && path === "/gemini/test") {
      try {
        const { createGeminiService } = await import("./services/gemini");
        const geminiService = createGeminiService(geminiApiKey.value());
        const isConnected = await geminiService.testConnection();
        response.json({
          success: isConnected,
          message: isConnected ? "Gemini API is working" : "Gemini API connection failed",
          service: "gemini-1.5-flash"
        });
      } catch (error) {
        response.status(500).json({
          success: false,
          error: "Failed to test Gemini connection",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
      return;
    }

    // Test AI grading
    if (method === "POST" && path === "/test-grading") {
      try {
        const validatedData = testGradingSchema.parse(request.body);
        
        const gradingRequest = {
          submissionId: "test-submission",
          assignmentId: "test-assignment",
          title: "Test Assignment",
          description: "This is a test assignment for AI grading",
          maxPoints: validatedData.maxPoints,
          criteria: validatedData.criteria,
          submission: validatedData.text,
          promptTemplate: validatedData.promptTemplate
        };

        const { createGeminiService } = await import("./services/gemini");
        const geminiService = createGeminiService(geminiApiKey.value());
        const result = await geminiService.gradeSubmission(gradingRequest);
        
        response.json({
          success: true,
          grading: result,
          metadata: {
            submissionLength: validatedData.text.length,
            criteria: validatedData.criteria,
            maxPoints: validatedData.maxPoints
          }
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          response.status(400).json({
            error: "Validation failed",
            details: validationError.issues
          });
        } else {
          throw validationError;
        }
      }
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