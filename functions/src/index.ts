import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { Request } from "express";

// Extended request interface with params
interface RequestWithParams extends Request {
  params: { [key: string]: string };
}

// Route handlers
import { getApiStatus, testGeminiConnection, testSheetsConnection } from "./routes/health";
import { createAssignment, listAssignments, testFirestoreWrite, testFirestoreRead } from "./routes/assignments";
import { testGrading, gradeQuiz, gradeQuizTest, gradeCode } from "./routes/grading";
import { getSheetsAssignments, getSheetsSubmissions, getAllSubmissions, getUngradedSubmissions, getAnswerKey, listSheetNames } from "./routes/sheets";
import { getGradesByAssignment, getGradeBySubmission, getUngradedSubmissions as getFirestoreUngradedSubmissions, createSubmission, getSubmissionsByAssignment, getSubmissionById, updateSubmissionStatus } from "./routes/grades";
import { syncAssignments, syncSubmissions, syncAllData } from "./routes/sync";

// Define secrets and parameters  
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Main API router for Roo auto-grading system
 * Location: functions/src/index.ts:15
 * Architecture: Modular route handlers for maintainability
 */
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

    // Make Gemini API key available to route handlers
    request.app.locals.geminiApiKey = geminiApiKey.value();

    try {
      const { method, path } = request;
      
      // Health check routes
      if (method === "GET" && path === "/") {
        return await getApiStatus(request, response);
      }
      if (method === "GET" && path === "/gemini/test") {
        return await testGeminiConnection(request, response);
      }
      if (method === "GET" && path === "/sheets/test") {
        return await testSheetsConnection(request, response);
      }

      // Assignment routes
      if (method === "POST" && path === "/assignments") {
        return await createAssignment(request, response);
      }
      if (method === "GET" && path === "/assignments") {
        return await listAssignments(request, response);
      }
      if (method === "POST" && path === "/test-write") {
        return await testFirestoreWrite(request, response);
      }
      if (method === "GET" && path === "/test-read") {
        return await testFirestoreRead(request, response);
      }

      // Grading routes
      if (method === "POST" && path === "/test-grading") {
        return await testGrading(request, response);
      }
      if (method === "POST" && path === "/grade-quiz-test") {
        return await gradeQuizTest(request, response);
      }
      if (method === "POST" && path === "/grade-quiz") {
        return await gradeQuiz(request, response);
      }
      if (method === "POST" && path === "/grade-code") {
        return await gradeCode(request, response);
      }

      // Sheets integration routes
      if (method === "GET" && path === "/sheets/assignments") {
        return await getSheetsAssignments(request, response);
      }
      if (method === "POST" && path === "/sheets/submissions") {
        return await getSheetsSubmissions(request, response);
      }
      if (method === "GET" && path === "/sheets/all-submissions") {
        return await getAllSubmissions(request, response);
      }
      if (method === "GET" && path === "/sheets/ungraded") {
        return await getUngradedSubmissions(request, response);
      }
      if (method === "POST" && path === "/sheets/answer-key") {
        return await getAnswerKey(request, response);
      }
      if (method === "GET" && path === "/sheets/list-sheets") {
        return await listSheetNames(request, response);
      }

      // Sync routes
      if (method === "POST" && path === "/sync/assignments") {
        return await syncAssignments(request, response);
      }
      if (method === "POST" && path === "/sync/submissions") {
        return await syncSubmissions(request, response);
      }
      if (method === "POST" && path === "/sync/all") {
        return await syncAllData(request, response);
      }

      // Firestore Grade Management Routes
      if (method === "GET" && path.startsWith("/grades/assignment/")) {
        const assignmentId = path.split("/grades/assignment/")[1];
        (request as RequestWithParams).params = { assignmentId };
        return await getGradesByAssignment(request, response);
      }
      if (method === "GET" && path.startsWith("/grades/submission/")) {
        const submissionId = path.split("/grades/submission/")[1];
        (request as RequestWithParams).params = { submissionId };
        return await getGradeBySubmission(request, response);
      }
      if (method === "GET" && path === "/grades/ungraded") {
        return await getFirestoreUngradedSubmissions(request, response);
      }
      if (method === "POST" && path === "/submissions") {
        return await createSubmission(request, response);
      }
      if (method === "GET" && path.startsWith("/submissions/assignment/")) {
        const assignmentId = path.split("/submissions/assignment/")[1];
        (request as RequestWithParams).params = { assignmentId };
        return await getSubmissionsByAssignment(request, response);
      }
      if (method === "GET" && path.startsWith("/submissions/") && !path.includes("/assignment/")) {
        const submissionId = path.split("/submissions/")[1];
        (request as RequestWithParams).params = { submissionId };
        return await getSubmissionById(request, response);
      }
      if (method === "PATCH" && path.includes("/submissions/") && path.endsWith("/status")) {
        const pathParts = path.split("/");
        const submissionId = pathParts[pathParts.indexOf("submissions") + 1];
        (request as RequestWithParams).params = { submissionId };
        return await updateSubmissionStatus(request, response);
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
  }
);