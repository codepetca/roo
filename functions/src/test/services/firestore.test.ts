/**
 * Firestore service tests
 * Location: functions/src/test/services/firestore.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FirestoreGradeService, type GradeData } from "../../services/firestore";
import { mockFirestore } from "../setup";
import { domainFactories } from "../factories";

// Mock Firebase admin
vi.mock("../../config/firebase", () => ({
  db: {
    collection: vi.fn()
  },
  getCurrentTimestamp: vi.fn(() => ({
    _seconds: Math.floor(Date.now() / 1000),
    _nanoseconds: 0
  }))
}));

describe("FirestoreGradeService", () => {
  let service: FirestoreGradeService;
  let mockCollection: ReturnType<typeof mockFirestore>['mockCollection'];
  let mockDb: ReturnType<typeof mockFirestore>['mockDb'];

  beforeEach(async () => {
    const mocks = mockFirestore();
    mockCollection = mocks.mockCollection;
    
    // Get the mocked db
    const { db } = await import("../../config/firebase");
    mockDb = db;
    
    // Reset and setup the database mock
    mockDb.collection.mockReturnValue(mockCollection);
    
    service = new FirestoreGradeService();
  });

  describe("saveGrade", () => {
    it("should save a grade successfully", async () => {
      // Arrange
      const gradeData: Omit<GradeData, "gradedAt"> = {
        submissionId: "submission-1",
        assignmentId: "assignment-1",
        studentId: "student-1",
        studentName: "John Doe",
        score: 85,
        maxPoints: 100,
        feedback: "Good work!",
        gradedBy: "ai"
      };

      mockCollection.add.mockResolvedValue({ id: "grade-123" });

      // Act
      const gradeId = await service.saveGrade(gradeData);

      // Assert
      expect(gradeId).toBe("grade-123");
      expect(mockDb.collection).toHaveBeenCalledWith("grades");
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...gradeData,
          gradedAt: expect.any(Object)
        })
      );
    });

    it("should update submission status after saving grade", async () => {
      // Arrange
      const gradeData: Omit<GradeData, "gradedAt"> = {
        submissionId: "submission-1",
        assignmentId: "assignment-1",
        studentId: "student-1",
        studentName: "John Doe",
        score: 85,
        maxPoints: 100,
        feedback: "Good work!",
        gradedBy: "ai"
      };

      mockCollection.add.mockResolvedValue({ id: "grade-123" });
      
      // Mock updateSubmissionStatus method
      const updateSubmissionStatusSpy = vi.spyOn(service, "updateSubmissionStatus")
        .mockResolvedValue(undefined);

      // Act
      await service.saveGrade(gradeData);

      // Assert
      expect(updateSubmissionStatusSpy).toHaveBeenCalledWith(
        "submission-1",
        "graded",
        "grade-123"
      );
    });

    it("should handle submission not found error gracefully", async () => {
      // Arrange
      const gradeData: Omit<GradeData, "gradedAt"> = {
        submissionId: "nonexistent-submission",
        assignmentId: "assignment-1",
        studentId: "student-1",
        studentName: "John Doe",
        score: 85,
        maxPoints: 100,
        feedback: "Good work!",
        gradedBy: "ai"
      };

      mockCollection.add.mockResolvedValue({ id: "grade-123" });
      
      // Mock updateSubmissionStatus to throw NOT_FOUND error
      vi.spyOn(service, "updateSubmissionStatus")
        .mockRejectedValue({ code: 5 }); // Firebase NOT_FOUND error code

      // Act & Assert
      const gradeId = await service.saveGrade(gradeData);
      expect(gradeId).toBe("grade-123");
      // Should not throw error even if submission update fails
    });

    it("should throw error if save fails", async () => {
      // Arrange
      const gradeData: Omit<GradeData, "gradedAt"> = {
        submissionId: "submission-1",
        assignmentId: "assignment-1",
        studentId: "student-1",
        studentName: "John Doe",
        score: 85,
        maxPoints: 100,
        feedback: "Good work!",
        gradedBy: "ai"
      };

      mockCollection.add.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(service.saveGrade(gradeData)).rejects.toThrow("Database error");
    });
  });

  describe("getGradeBySubmissionId", () => {
    it("should retrieve a grade by submission ID", async () => {
      // Arrange
      const gradeData = domainFactories.grade();
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            id: "grade-123",
            data: () => gradeData
          }
        ]
      };

      mockCollection.where.mockReturnThis();
      mockCollection.limit.mockReturnThis();
      mockCollection.get.mockResolvedValue(mockQuerySnapshot);

      // Act
      const result = await service.getGradeBySubmissionId("submission-123");

      // Assert
      expect(result).toEqual({
        ...gradeData,
        id: "grade-123"
      });
      expect(mockDb.collection).toHaveBeenCalledWith("grades");
      expect(mockCollection.where).toHaveBeenCalledWith("submissionId", "==", "submission-123");
    });

    it("should return null for non-existent grade", async () => {
      // Arrange
      const mockQuerySnapshot = {
        empty: true,
        docs: []
      };

      mockCollection.where.mockReturnThis();
      mockCollection.limit.mockReturnThis();
      mockCollection.get.mockResolvedValue(mockQuerySnapshot);

      // Act
      const result = await service.getGradeBySubmissionId("nonexistent-submission");

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error if retrieval fails", async () => {
      // Arrange
      mockCollection.where.mockReturnThis();
      mockCollection.limit.mockReturnThis();
      mockCollection.get.mockRejectedValue(new Error("Database error"));
      mockDb.collection.mockReturnValue(mockCollection);

      // Act & Assert
      await expect(service.getGradeBySubmissionId("submission-123")).rejects.toThrow("Database error");
    });
  });

  describe("getGradesByAssignmentId", () => {
    it("should retrieve grades for an assignment", async () => {
      // Arrange
      const gradeData = domainFactories.grade({ assignmentId: "assignment-1" });
      const mockQuerySnapshot = {
        docs: [
          {
            id: "grade-123",
            data: () => gradeData
          }
        ],
        empty: false
      };

      mockCollection.where.mockReturnThis();
      mockCollection.orderBy.mockReturnThis();
      mockCollection.get.mockResolvedValue(mockQuerySnapshot);

      // Act
      const result = await service.getGradesByAssignmentId("assignment-1");

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...gradeData,
        id: "grade-123"
      });
      expect(mockCollection.where).toHaveBeenCalledWith("assignmentId", "==", "assignment-1");
    });

    it("should return empty array for assignment with no grades", async () => {
      // Arrange
      const mockQuerySnapshot = {
        docs: [],
        empty: true
      };

      mockCollection.where.mockReturnThis();
      mockCollection.orderBy.mockReturnThis();
      mockCollection.get.mockResolvedValue(mockQuerySnapshot);

      // Act
      const result = await service.getGradesByAssignmentId("assignment-no-grades");

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("updateSubmissionStatus", () => {
    it("should update submission status with grade ID", async () => {
      // Arrange
      const submissionDoc = mockCollection.doc();

      // Act
      await service.updateSubmissionStatus("submission-1", "graded", "grade-123");

      // Assert
      expect(mockDb.collection).toHaveBeenCalledWith("submissions");
      expect(mockCollection.doc).toHaveBeenCalledWith("submission-1");
      expect(submissionDoc.update).toHaveBeenCalledWith({
        status: "graded",
        gradeId: "grade-123",
        updatedAt: expect.any(Object)
      });
    });

    it("should update submission status without grade ID", async () => {
      // Arrange
      const submissionDoc = mockCollection.doc();

      // Act
      await service.updateSubmissionStatus("submission-1", "grading");

      // Assert
      expect(submissionDoc.update).toHaveBeenCalledWith({
        status: "grading",
        updatedAt: expect.any(Object)
      });
    });

    it("should throw error if update fails", async () => {
      // Arrange
      const submissionDoc = mockCollection.doc();
      submissionDoc.update.mockRejectedValue(new Error("Update failed"));
      mockDb.collection.mockReturnValue(mockCollection);

      // Act & Assert
      await expect(
        service.updateSubmissionStatus("submission-1", "graded")
      ).rejects.toThrow("Update failed");
    });
  });


  describe("createFirestoreGradeService", () => {
    it("should create service instance", async () => {
      // We can't easily test the factory function due to module mocking
      // This is more of an integration test
      const { createFirestoreGradeService } = await import("../../services/firestore");
      const serviceInstance = createFirestoreGradeService();
      
      expect(serviceInstance).toBeInstanceOf(FirestoreGradeService);
    });
  });

  describe("error handling", () => {
    it("should handle network errors gracefully", async () => {
      // Arrange
      const networkError = new Error("Network timeout");
      mockCollection.add.mockRejectedValue(networkError);

      const gradeData: Omit<GradeData, "gradedAt"> = {
        submissionId: "submission-1",
        assignmentId: "assignment-1",
        studentId: "student-1",
        studentName: "John Doe",
        score: 85,
        maxPoints: 100,
        feedback: "Good work!",
        gradedBy: "ai"
      };

      // Act & Assert
      await expect(service.saveGrade(gradeData)).rejects.toThrow("Network timeout");
    });

    it("should handle malformed data gracefully", async () => {
      // Arrange
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            id: "grade-123",
            data: () => null // Malformed data
          }
        ]
      };

      mockCollection.where.mockReturnThis();
      mockCollection.limit.mockReturnThis();
      mockCollection.get.mockResolvedValue(mockQuerySnapshot);

      // Act
      const result = await service.getGradeBySubmissionId("submission-123");

      // Assert
      expect(result).toEqual({
        id: "grade-123"
      });
    });
  });
});