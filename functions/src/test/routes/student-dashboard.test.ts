/**
 * Student Dashboard Route Tests
 * Location: functions/src/test/routes/student-dashboard.test.ts
 * 
 * Tests for student dashboard API endpoints and repository methods
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Request, Response } from "express";
import { getStudentDashboard, getStudentAssignments, getStudentActivity } from "../../routes/student-dashboard";
import { FirestoreRepository } from "../../services/firestore-repository";

// Mock the middleware
vi.mock("../../middleware/validation", () => ({
  getUserFromRequest: vi.fn()
}));

// Mock Firebase Functions logger
vi.mock("firebase-functions", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock FirebaseAdmin
vi.mock("../../config/firebase", () => ({
  db: {
    collection: vi.fn()
  },
  getCurrentTimestamp: vi.fn(() => new Date()),
  FieldValue: {
    serverTimestamp: vi.fn()
  }
}));

describe("Student Dashboard Routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockRepository: Partial<FirestoreRepository>;

  // Import mocked functions - will be properly imported in beforeEach
  let getUserFromRequest: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Import mocked functions
    const validationModule = await import("../../middleware/validation");
    getUserFromRequest = validationModule.getUserFromRequest;

    // Setup response mocks
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    mockRequest = {
      query: {},
      headers: {}
    };

    // Mock repository methods
    mockRepository = {
      getEnrollmentsByStudent: vi.fn(),
      getClassroom: vi.fn(),
      getAssignmentsByClassroom: vi.fn(),
      getSubmissionsByStudent: vi.fn(),
      getGradesByStudentAndClassroom: vi.fn(),
      getGradesByStudent: vi.fn(),
      getStudentRecentActivity: vi.fn()
    };

    // Mock the repository constructor to return our mocked methods
    vi.spyOn(FirestoreRepository.prototype, 'getEnrollmentsByStudent').mockImplementation(
      mockRepository.getEnrollmentsByStudent as any
    );
    vi.spyOn(FirestoreRepository.prototype, 'getClassroom').mockImplementation(
      mockRepository.getClassroom as any
    );
    vi.spyOn(FirestoreRepository.prototype, 'getAssignmentsByClassroom').mockImplementation(
      mockRepository.getAssignmentsByClassroom as any
    );
    vi.spyOn(FirestoreRepository.prototype, 'getSubmissionsByStudent').mockImplementation(
      mockRepository.getSubmissionsByStudent as any
    );
    vi.spyOn(FirestoreRepository.prototype, 'getGradesByStudentAndClassroom').mockImplementation(
      mockRepository.getGradesByStudentAndClassroom as any
    );
    vi.spyOn(FirestoreRepository.prototype, 'getGradesByStudent').mockImplementation(
      mockRepository.getGradesByStudent as any
    );
    vi.spyOn(FirestoreRepository.prototype, 'getStudentRecentActivity').mockImplementation(
      mockRepository.getStudentRecentActivity as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /student/dashboard", () => {
    it("should return 403 if user is not a student", async () => {
      // Mock non-student user
      getUserFromRequest.mockResolvedValue({
        uid: "teacher-123",
        role: "teacher",
        email: "teacher@school.edu"
      });

      await getStudentDashboard(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Only students can access dashboard data"
      });
    });

    it("should return empty dashboard if student has no enrollments", async () => {
      // Mock student user
      getUserFromRequest.mockResolvedValue({
        uid: "student-123",
        role: "student",
        email: "student@school.edu"
      });

      // Mock empty enrollments
      (mockRepository.getEnrollmentsByStudent as any).mockResolvedValue([]);

      await getStudentDashboard(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          studentId: "student-123",
          classrooms: [],
          overallStats: {
            totalAssignments: 0,
            completedAssignments: 0,
            averageGrade: undefined
          }
        }
      });
    });

    it("should return student dashboard with classroom data", async () => {
      // Mock student user
      getUserFromRequest.mockResolvedValue({
        uid: "student-123",
        role: "student",
        email: "student@school.edu"
      });

      // Mock student enrollments
      (mockRepository.getEnrollmentsByStudent as any).mockResolvedValue([
        {
          id: "enrollment-1",
          classroomId: "classroom-1",
          studentId: "student-123",
          email: "student@school.edu",
          name: "John Doe"
        }
      ]);

      // Mock classroom details
      (mockRepository.getClassroom as any).mockResolvedValue({
        id: "classroom-1",
        name: "Computer Science 101",
        teacherId: "teacher@school.edu",
        studentCount: 25,
        assignmentCount: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock assignments
      (mockRepository.getAssignmentsByClassroom as any).mockResolvedValue([
        {
          id: "assignment-1",
          classroomId: "classroom-1",
          title: "Homework 1",
          type: "coding",
          maxScore: 100,
          dueDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "assignment-2",
          classroomId: "classroom-1",
          title: "Quiz 1",
          type: "quiz",
          maxScore: 50,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      // Mock submissions (one submitted, one not)
      (mockRepository.getSubmissionsByStudent as any).mockResolvedValue([
        {
          id: "submission-1",
          assignmentId: "assignment-1",
          studentId: "student-123",
          studentEmail: "student@school.edu",
          content: "console.log('Hello World');",
          status: "submitted",
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      // Mock grades
      (mockRepository.getGradesByStudentAndClassroom as any).mockResolvedValue([
        {
          id: "grade-1",
          submissionId: "submission-1",
          assignmentId: "assignment-1",
          studentId: "student-123",
          score: 85,
          maxScore: 100,
          percentage: 85,
          feedback: "Good work!",
          gradedAt: new Date(),
          gradedBy: "ai",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      await getStudentDashboard(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            studentId: "student-123",
            classrooms: expect.arrayContaining([
              expect.objectContaining({
                classroom: expect.objectContaining({
                  id: "classroom-1",
                  name: "Computer Science 101"
                }),
                assignments: expect.arrayContaining([
                  expect.objectContaining({
                    id: "assignment-1",
                    title: "Homework 1",
                    hasSubmission: true,
                    isGraded: true
                  }),
                  expect.objectContaining({
                    id: "assignment-2",
                    title: "Quiz 1",
                    hasSubmission: false,
                    isGraded: false
                  })
                ]),
                grades: expect.any(Array),
                averageGrade: 85
              })
            ]),
            overallStats: expect.objectContaining({
              totalAssignments: 2,
              completedAssignments: 1,
              averageGrade: 85
            })
          })
        })
      );
    });

    it("should handle repository errors gracefully", async () => {
      // Mock student user
      getUserFromRequest.mockResolvedValue({
        uid: "student-123",
        role: "student",
        email: "student@school.edu"
      });

      // Mock repository error
      (mockRepository.getEnrollmentsByStudent as any).mockRejectedValue(
        new Error("Database connection failed")
      );

      await getStudentDashboard(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Failed to load dashboard data",
        message: "Database connection failed"
      });
    });
  });

  describe("GET /student/assignments", () => {
    it("should return 403 if user is not a student", async () => {
      getUserFromRequest.mockResolvedValue({
        uid: "teacher-123",
        role: "teacher"
      });

      await getStudentAssignments(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
    });

    it("should return student assignments with pending and returned work", async () => {
      getUserFromRequest.mockResolvedValue({
        uid: "student-123", 
        role: "student"
      });

      // Mock submissions
      (mockRepository.getSubmissionsByStudent as any).mockResolvedValue([
        {
          id: "submission-1",
          assignmentId: "assignment-1",
          status: "submitted",
          submittedAt: new Date()
        },
        {
          id: "submission-2", 
          assignmentId: "assignment-2",
          status: "submitted",
          submittedAt: new Date()
        }
      ]);

      // Mock grades (only one assignment graded)
      (mockRepository.getGradesByStudent as any).mockResolvedValue([
        {
          id: "grade-1",
          submissionId: "submission-1",
          assignmentId: "assignment-1",
          score: 90,
          percentage: 90
        }
      ]);

      await getStudentAssignments(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          pending: expect.arrayContaining([
            expect.objectContaining({ id: "submission-2" })
          ]),
          returned: expect.arrayContaining([
            expect.objectContaining({ 
              id: "submission-1",
              grade: expect.objectContaining({ id: "grade-1" })
            })
          ])
        })
      });
    });
  });

  describe("GET /student/activity", () => {
    it("should return recent student activity", async () => {
      getUserFromRequest.mockResolvedValue({
        uid: "student-123",
        role: "student"
      });

      const mockActivity = [
        {
          id: "submission-1",
          type: "submission",
          timestamp: new Date(),
          assignmentId: "assignment-1"
        },
        {
          id: "grade-1", 
          type: "grade",
          timestamp: new Date(),
          score: 85
        }
      ];

      (mockRepository.getStudentRecentActivity as any).mockResolvedValue(mockActivity);

      await getStudentActivity(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockActivity
      });
    });
  });
});

describe("FirestoreRepository Student Methods", () => {
  let repository: FirestoreRepository;
  let mockDb: any;

  beforeEach(async () => {
    // Get mocked firebase
    const { db } = await import("../../config/firebase");
    mockDb = db;
    
    // Setup collection mock
    const mockCollection = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn()
    };

    mockDb.collection.mockReturnValue(mockCollection);
    
    repository = new FirestoreRepository();
  });

  describe("getGradesByStudent", () => {
    it("should fetch grades for a student with correct filters", async () => {
      const mockSnapshot = {
        docs: [
          {
            data: () => ({
              studentId: "student-123",
              score: 85,
              percentage: 85,
              isLatest: true
            }),
            id: "grade-1"
          }
        ]
      };

      const mockCollection = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const grades = await repository.getGradesByStudent("student-123");

      expect(mockCollection.where).toHaveBeenCalledWith("studentId", "==", "student-123");
      expect(mockCollection.where).toHaveBeenCalledWith("isLatest", "==", true);
      expect(mockCollection.orderBy).toHaveBeenCalledWith("gradedAt", "desc");
      expect(grades).toHaveLength(1);
      expect(grades[0].id).toBe("grade-1");
    });
  });

  describe("getGradesByStudentAndClassroom", () => {
    it("should fetch grades for a student in a specific classroom", async () => {
      const mockSnapshot = {
        docs: [
          {
            data: () => ({
              studentId: "student-123",
              classroomId: "classroom-1",
              score: 90,
              isLatest: true
            }),
            id: "grade-1"
          }
        ]
      };

      const mockCollection = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const grades = await repository.getGradesByStudentAndClassroom("student-123", "classroom-1");

      expect(mockCollection.where).toHaveBeenCalledWith("studentId", "==", "student-123");
      expect(mockCollection.where).toHaveBeenCalledWith("classroomId", "==", "classroom-1");
      expect(mockCollection.where).toHaveBeenCalledWith("isLatest", "==", true);
      expect(grades).toHaveLength(1);
    });
  });
});