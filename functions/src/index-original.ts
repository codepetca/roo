import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {db, FieldValue} from "./config/firebase";
import {Assignment} from "./types";
import {createAssignmentSchema, testWriteSchema, testGradingSchema} from "../schemas";
import {z} from "zod";
// Define secrets and parameters  
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
          "GET /gemini/test": "Test Gemini API connection",
          "GET /sheets/test": "Test Google Sheets connection",
          "GET /sheets/assignments": "Get assignments from Google Sheets",
          "POST /sheets/submissions": "Get submissions for an assignment from Sheets",
          "GET /sheets/all-submissions": "Get all submissions from Sheets",
          "GET /sheets/ungraded": "Get ungraded submissions",
          "POST /sheets/answer-key": "Get answer key for a quiz form",
          "POST /grade-quiz": "Grade a quiz submission using answer key",
          "POST /grade-code": "Grade a single coding assignment with generous mode"
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
          service: "gemini-2.0-flash-lite"
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
        
        // Import prompts and choose appropriate template
        const { GRADING_PROMPTS } = await import("./services/gemini");
        const isCodeSubmission = validatedData.text.toLowerCase().includes('function') || 
                                validatedData.text.toLowerCase().includes('karel') ||
                                validatedData.text.includes('{') || validatedData.text.includes('}');
        
        const promptTemplate = validatedData.promptTemplate || 
                              (isCodeSubmission ? GRADING_PROMPTS.generousCode : GRADING_PROMPTS.default);

        const gradingRequest = {
          submissionId: "test-submission",
          assignmentId: "test-assignment",
          title: "Test Assignment - Karel Code",
          description: "This is a test assignment for generous AI grading of Karel code",
          maxPoints: validatedData.maxPoints,
          criteria: validatedData.criteria,
          submission: validatedData.text,
          promptTemplate: promptTemplate
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

    // Test Google Sheets connection
    if (method === "GET" && path === "/sheets/test") {
      try {
        const { createSheetsService } = await import("./services/sheets");
        const sheetsService = await createSheetsService();
        const isConnected = await sheetsService.testConnection();
        
        response.json({
          success: isConnected,
          message: isConnected ? "Google Sheets API is working" : "Google Sheets connection failed",
          service: "sheets-v4"
        });
      } catch (error) {
        response.status(500).json({
          success: false,
          error: "Failed to test Sheets connection",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
      return;
    }

    // Get assignments from Google Sheets
    if (method === "GET" && path === "/sheets/assignments") {
      try {
        const { createSheetsService } = await import("./services/sheets");
        const sheetsService = await createSheetsService();
        const assignments = await sheetsService.getAssignments();
        
        response.json({
          success: true,
          count: assignments.length,
          assignments
        });
      } catch (error) {
        response.status(500).json({
          success: false,
          error: "Failed to fetch assignments from Sheets",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
      return;
    }

    // Get submissions for a specific assignment from Google Sheets
    if (method === "POST" && path === "/sheets/submissions") {
      try {
        const validatedData = z.object({ assignmentId: z.string().min(1) }).parse(request.body);
        const { createSheetsService } = await import("./services/sheets");
        const sheetsService = await createSheetsService();
        const submissions = await sheetsService.getSubmissions(validatedData.assignmentId);
        
        response.json({
          success: true,
          assignmentId: validatedData.assignmentId,
          count: submissions.length,
          submissions
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

    // Get all submissions from Google Sheets
    if (method === "GET" && path === "/sheets/all-submissions") {
      try {
        const { createSheetsService } = await import("./services/sheets");
        const sheetsService = await createSheetsService();
        const submissions = await sheetsService.getAllSubmissions();
        
        response.json({
          success: true,
          count: submissions.length,
          submissions
        });
      } catch (error) {
        response.status(500).json({
          success: false,
          error: "Failed to fetch all submissions",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
      return;
    }

    // Get ungraded submissions
    if (method === "GET" && path === "/sheets/ungraded") {
      try {
        const { createSheetsService } = await import("./services/sheets");
        const sheetsService = await createSheetsService();
        const submissions = await sheetsService.getUngraduatedSubmissions();
        
        response.json({
          success: true,
          count: submissions.length,
          submissions
        });
      } catch (error) {
        response.status(500).json({
          success: false,
          error: "Failed to fetch ungraded submissions",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
      return;
    }

    // Get answer key for a quiz form
    if (method === "POST" && path === "/sheets/answer-key") {
      try {
        const validatedData = z.object({ formId: z.string().min(1) }).parse(request.body);
        const { createSheetsService } = await import("./services/sheets");
        const sheetsService = await createSheetsService();
        const answerKey = await sheetsService.getAnswerKey(validatedData.formId);
        
        response.json({
          success: true,
          answerKey
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          response.status(400).json({
            error: "Validation failed",
            details: validationError.issues
          });
        } else {
          response.status(500).json({
            success: false,
            error: "Failed to fetch answer key",
            message: validationError instanceof Error ? validationError.message : "Unknown error"
          });
        }
      }
      return;
    }

    // Grade a quiz submission using answer key
    if (method === "POST" && path === "/grade-quiz") {
      try {
        const validatedData = z.object({
          submissionId: z.string().min(1),
          formId: z.string().min(1),
          studentAnswers: z.record(z.string(), z.string()) // questionNumber -> answer
        }).parse(request.body);

        const { createSheetsService } = await import("./services/sheets");
        const { createGeminiService } = await import("./services/gemini");
        
        const sheetsService = await createSheetsService();
        const geminiService = createGeminiService(geminiApiKey.value());

        // Get answer key
        const answerKey = await sheetsService.getAnswerKey(validatedData.formId);
        if (!answerKey) {
          response.status(404).json({
            success: false,
            error: "Answer key not found for this form"
          });
          return;
        }

        // Convert string keys to numbers for student answers
        const studentAnswers: { [questionNumber: number]: string } = {};
        Object.entries(validatedData.studentAnswers).forEach(([key, value]) => {
          studentAnswers[parseInt(key)] = value as string;
        });

        // Grade the quiz
        const gradingResult = await geminiService.gradeQuiz({
          submissionId: validatedData.submissionId,
          formId: validatedData.formId,
          studentAnswers,
          answerKey
        });

        // Update the grade in sheets
        await sheetsService.updateGrade(validatedData.submissionId, gradingResult.totalScore);

        response.json({
          success: true,
          grading: gradingResult,
          answerKey: {
            totalPoints: answerKey.totalPoints,
            questionCount: answerKey.questions.length
          }
        });

      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          response.status(400).json({
            error: "Validation failed",
            details: validationError.issues
          });
        } else {
          response.status(500).json({
            success: false,
            error: "Failed to grade quiz",
            message: validationError instanceof Error ? validationError.message : "Unknown error"
          });
        }
      }
      return;
    }

    // Grade a single coding assignment with generous mode
    if (method === "POST" && path === "/grade-code") {
      try {
        const validatedData = z.object({
          submissionId: z.string().min(1),
          submissionText: z.string().min(1),
          assignmentTitle: z.string().min(1),
          assignmentDescription: z.string().optional().default(""),
          maxPoints: z.number().min(1).default(100),
          isCodeAssignment: z.boolean().default(false),
          gradingStrictness: z.enum(['strict', 'standard', 'generous']).default('generous')
        }).parse(request.body);

        const { createGeminiService } = await import("./services/gemini");
        const { createSheetsService } = await import("./services/sheets");
        
        const geminiService = createGeminiService(geminiApiKey.value());
        const sheetsService = await createSheetsService();

        // Choose appropriate prompt template
        const { GRADING_PROMPTS } = await import("./services/gemini");
        let promptTemplate = GRADING_PROMPTS.default;
        if (validatedData.isCodeAssignment || validatedData.gradingStrictness === 'generous') {
          promptTemplate = GRADING_PROMPTS.generousCode;
        }

        // Prepare grading request
        const gradingRequest = {
          submissionId: validatedData.submissionId,
          assignmentId: "manual-grading",
          title: validatedData.assignmentTitle,
          description: validatedData.assignmentDescription,
          maxPoints: validatedData.maxPoints,
          criteria: ["Understanding", "Logic", "Implementation"],
          submission: validatedData.submissionText,
          promptTemplate
        };

        const result = await geminiService.gradeSubmission(gradingRequest);
        
        // Update grade in sheets
        await sheetsService.updateGrade(validatedData.submissionId, result.score);

        response.json({
          success: true,
          grading: result,
          metadata: {
            gradingMode: validatedData.gradingStrictness,
            isCodeAssignment: validatedData.isCodeAssignment
          }
        });

      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          response.status(400).json({
            error: "Validation failed",
            details: validationError.issues
          });
        } else {
          response.status(500).json({
            success: false,
            error: "Failed to grade submission",
            message: validationError instanceof Error ? validationError.message : "Unknown error"
          });
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