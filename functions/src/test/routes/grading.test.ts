/**
 * Tests for Grade All API endpoint
 * Location: functions/src/test/routes/grading.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";
import { gradeAllAssignments } from "../../routes/grading";
import { domainFactories, requestFactories, responseFactories } from "../factories";

// Mock middleware validation
vi.mock("../../middleware/validation", () => ({
  validateData: vi.fn(),
  handleRouteError: vi.fn(),
  sendApiResponse: vi.fn()
}));

// Mock Firestore repository
vi.mock("../../services/firestore-repository", () => ({
  FirestoreRepository: vi.fn()
}));

// Mock Gemini service
vi.mock("../../services/gemini", () => ({
  createGeminiService: vi.fn(),
  GRADING_PROMPTS: {
    default: "Default grading prompt",
    generousCode: "Generous code grading prompt"
  }
}));

// Mock Firestore grade service
vi.mock("../../services/firestore", () => ({
  createFirestoreGradeService: vi.fn()
}));

// Import mocked functions
import { validateData, handleRouteError, sendApiResponse } from "../../middleware/validation";
import { FirestoreRepository } from "../../services/firestore-repository";
import { createGeminiService } from "../../services/gemini";
import { createFirestoreGradeService } from "../../services/firestore";

describe("Grade All Assignments", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockRepository: any;
  let mockGeminiService: any;
  let mockFirestoreService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request/response
    mockRequest = {
      body: { assignmentId: "assignment_123" },
      app: {
        locals: {
          geminiApiKey: "test-api-key"
        }
      }
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    // Create mock services
    mockRepository = {
      getAllSubmissionsByAssignment: vi.fn(),
      getAssignment: vi.fn(),
      getGradesByClassroom: vi.fn()
    };

    mockGeminiService = {
      gradeSubmission: vi.fn()
    };

    mockFirestoreService = {
      saveGrade: vi.fn()
    };

    // Setup mock implementations
    (validateData as any).mockReturnValue({ assignmentId: "assignment_123" });
    (FirestoreRepository as any).mockImplementation(() => mockRepository);
    (createGeminiService as any).mockReturnValue(mockGeminiService);
    (createFirestoreGradeService as any).mockReturnValue(mockFirestoreService);
    (sendApiResponse as any).mockImplementation((res, data, success, message) => {
      res.status(success ? 200 : 500).json({ success, data, message });
    });
  });

  describe("Successful Grading Scenarios", () => {
    it("should grade all ungraded submissions successfully", async () => {
      // Create test submissions
      const submissions = [
        domainFactories.submission({
          id: "sub-1",
          studentId: "student-1", 
          studentName: "Aaron Adams",
          assignmentId: "assignment_123",
          classroomId: "classroom_737123279360",
          content: "function hello() { console.log('Hello World'); }",
          status: "submitted"
        }),
        domainFactories.submission({
          id: "sub-2", 
          studentId: "student-2",
          studentName: "Beth Baker",
          assignmentId: "assignment_123",
          classroomId: "classroom_737123279360", 
          content: "function greet(name) { return `Hello ${name}`; }",
          status: "submitted"
        })
      ];

      // Create test assignment
      const assignment = domainFactories.assignment({
        id: "assignment_123",
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        isQuiz: false
      });

      // Mock repository responses
      mockRepository.getAllSubmissionsByAssignment.mockResolvedValue(submissions);
      mockRepository.getAssignment.mockResolvedValue(assignment);
      mockRepository.getGradesByClassroom.mockResolvedValue([]);
      mockFirestoreService.saveGrade.mockResolvedValue("grade-123");

      // Mock grading service responses
      const gradingResult = responseFactories.gradingResult({
        score: 85,
        feedback: "Good implementation with proper syntax and logic."
      });

      mockGeminiService.gradeSubmission.mockResolvedValue(gradingResult);

      // Execute Grade All
      await gradeAllAssignments(mockRequest as Request, mockResponse as Response);

      // Verify input validation
      expect(validateData).toHaveBeenCalledWith(
        expect.any(Object),
        { assignmentId: "assignment_123" }
      );

      // Verify submissions fetched
      expect(mockRepository.getAllSubmissionsByAssignment).toHaveBeenCalledWith("assignment_123");

      // Verify assignment data retrieved
      expect(mockRepository.getAssignment).toHaveBeenCalledWith("assignment_123");

      // Verify grading service called for each submission
      expect(mockGeminiService.gradeSubmission).toHaveBeenCalledTimes(2);

      // Verify grades saved
      expect(mockFirestoreService.saveGrade).toHaveBeenCalledTimes(2);

      // Verify success response
      expect(sendApiResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          totalSubmissions: 2,
          gradedCount: 2,
          failedCount: 0,
          skippedCount: 0,
          results: expect.arrayContaining([
            expect.objectContaining({
              submissionId: "sub-1",
              gradeId: "grade-123",
              score: 85
            }),
            expect.objectContaining({
              submissionId: "sub-2",
              gradeId: "grade-123",
              score: 85
            })
          ])
        }),
        true,
        "Smart Grade All completed: 2 graded, 0 skipped (2 total)"
      );
    });

    it("should handle assignment with no submissions", async () => {
      // Mock empty submissions
      mockRepository.getAllSubmissionsByAssignment.mockResolvedValue([]);

      await gradeAllAssignments(mockRequest as Request, mockResponse as Response);

      expect(mockRepository.getAllSubmissionsByAssignment).toHaveBeenCalledWith("assignment_123");
      expect(mockGeminiService.gradeSubmission).not.toHaveBeenCalled();
      
      expect(sendApiResponse).toHaveBeenCalledWith(
        mockResponse,
        {
          totalSubmissions: 0,
          gradedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          results: []
        },
        true,
        "No submissions found for this assignment"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle validation failure", async () => {
      (validateData as any).mockImplementation(() => {
        throw new Error("Validation failed: classroomId is required");
      });

      await gradeAllAssignments(mockRequest as Request, mockResponse as Response);

      expect(handleRouteError).toHaveBeenCalledWith(
        expect.any(Error),
        mockRequest,
        mockResponse
      );
    });

    it("should handle repository errors", async () => {
      mockRepository.getAllSubmissionsByAssignment.mockRejectedValue(new Error("Database connection failed"));

      await gradeAllAssignments(mockRequest as Request, mockResponse as Response);

      expect(handleRouteError).toHaveBeenCalledWith(
        expect.any(Error),
        mockRequest,
        mockResponse
      );
    });

    it("should handle partial grading failures", async () => {
      const submissions = [
        domainFactories.submission({
          id: "sub-1",
          studentName: "Aaron Adams",
          assignmentId: "assignment_123",
          classroomId: "classroom_737123279360",
          content: "valid code",
          status: "submitted"
        }),
        domainFactories.submission({
          id: "sub-2", 
          studentName: "Beth Baker",
          assignmentId: "assignment_123",
          classroomId: "classroom_737123279360",
          content: "invalid code",
          status: "submitted"
        })
      ];

      const assignment = domainFactories.assignment({
        id: "assignment_123",
        title: "Test Assignment"
      });

      mockRepository.getAllSubmissionsByAssignment.mockResolvedValue(submissions);
      mockRepository.getAssignment.mockResolvedValue(assignment);
      mockRepository.getGradesByClassroom.mockResolvedValue([]);
      mockFirestoreService.saveGrade.mockResolvedValue("grade-123");

      // First submission succeeds, second fails
      mockGeminiService.gradeSubmission
        .mockResolvedValueOnce(responseFactories.gradingResult())
        .mockRejectedValueOnce(new Error("AI service timeout"));

      await gradeAllAssignments(mockRequest as Request, mockResponse as Response);

      expect(sendApiResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          totalSubmissions: 2,
          gradedCount: 1,
          failedCount: 1,
          skippedCount: 0,
          results: expect.arrayContaining([
            expect.objectContaining({ submissionId: "sub-1" })
          ]),
          failures: expect.arrayContaining([
            expect.objectContaining({
              submissionId: "sub-2",
              error: expect.any(String)
            })
          ])
        }),
        true,
        "Smart Grade All completed: 1 graded, 0 skipped (2 total)"
      );
    });
  });

  describe("Batch Processing", () => {
    it("should process multiple submissions and return results", async () => {
      // Create test submissions for the same assignment
      const submissions = [
        domainFactories.submission({
          id: "sub-1",
          assignmentId: "assignment_123",
          classroomId: "classroom_737123279360",
          studentName: "Student 1",
          status: "submitted"
        }),
        domainFactories.submission({
          id: "sub-2",
          assignmentId: "assignment_123",
          classroomId: "classroom_737123279360", 
          studentName: "Student 2",
          status: "submitted"
        })
      ];

      const assignment = domainFactories.assignment({ id: "assignment_123", title: "Test Assignment" });

      mockRepository.getAllSubmissionsByAssignment.mockResolvedValue(submissions);
      mockRepository.getAssignment.mockResolvedValue(assignment);
      mockRepository.getGradesByClassroom.mockResolvedValue([]);
      mockFirestoreService.saveGrade.mockResolvedValue("grade-123");
      mockGeminiService.gradeSubmission.mockResolvedValue(responseFactories.gradingResult());

      await gradeAllAssignments(mockRequest as Request, mockResponse as Response);

      expect(mockGeminiService.gradeSubmission).toHaveBeenCalledTimes(2);
      expect(mockFirestoreService.saveGrade).toHaveBeenCalledTimes(2);
      expect(sendApiResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          totalSubmissions: 2,
          gradedCount: 2,
          failedCount: 0,
          skippedCount: 0
        }),
        true,
        "Smart Grade All completed: 2 graded, 0 skipped (2 total)"
      );
    });
  });
});