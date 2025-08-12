/**
 * Sheets service tests
 * Location: functions/src/test/services/sheets.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SheetsService, createSheetsService } from "../../services/sheets";
import { mockSheetsApi } from "../setup";

// Mock googleapis
vi.mock("googleapis", () => ({
  google: {
    sheets: vi.fn(),
    auth: {
      GoogleAuth: vi.fn()
    }
  }
}));

describe("SheetsService", () => {
  let service: SheetsService;
  let mockSheets: ReturnType<typeof mockSheetsApi>;
  let mockAuth: { getClient: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSheets = mockSheetsApi();
    mockAuth = {
      getClient: vi.fn().mockResolvedValue({ 
        credentials: { access_token: "test-token" } 
      })
    };
    
    service = new SheetsService(mockAuth, "test-spreadsheet-id");
    // Override the sheets property with our mock
    (service as { sheets: unknown }).sheets = mockSheets;
  });

  describe("testConnection", () => {
    it("should return true for successful connection", async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          properties: { title: "Test Spreadsheet" }
        }
      });

      const result = await service.testConnection();
      
      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id"
      });
    });

    it("should return false for failed connection", async () => {
      mockSheets.spreadsheets.get.mockRejectedValue(new Error("Network error"));

      const result = await service.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe("listSheetNames", () => {
    it("should return list of sheet names", async () => {
      const mockResponse = {
        data: {
          sheets: [
            { properties: { title: "Sheet1" } },
            { properties: { title: "Submissions" } },
            { properties: { title: "Answer Keys" } }
          ]
        }
      };

      mockSheets.spreadsheets.get.mockResolvedValue(mockResponse);

      const result = await service.listSheetNames();
      
      expect(result).toEqual(["Sheet1", "Submissions", "Answer Keys"]);
    });

    it("should handle empty sheets response", async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { sheets: [] }
      });

      const result = await service.listSheetNames();
      
      expect(result).toEqual([]);
    });

    it("should throw error on API failure", async () => {
      mockSheets.spreadsheets.get.mockRejectedValue(new Error("API Error"));

      await expect(service.listSheetNames()).rejects.toThrow("API Error");
    });
  });

  describe("getAssignments", () => {
    it("should fetch and parse assignments correctly", async () => {
      const mockRows = [
        ["assignment-1", "course-101", "Test Assignment", "Description", "2024-01-01", "100", "mixed", "2024-01-01"]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      const result = await service.getAssignments();
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "assignment-1",
        courseId: "course-101",
        title: "Test Assignment",
        description: "Description",
        dueDate: "2024-01-01",
        maxPoints: 100, // Transformed from string to number
        submissionType: "mixed",
        createdDate: "2024-01-01"
      });
      
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id",
        range: "Sheet1!A2:H"
      });
    });

    it("should handle empty assignments response", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] }
      });

      const result = await service.getAssignments();
      
      expect(result).toEqual([]);
    });

    it("should validate assignment data with schema", async () => {
      const invalidRows = [
        ["", "", "", "", "", "", "", ""] // Empty row should cause validation error
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: invalidRows }
      });

      await expect(service.getAssignments()).rejects.toThrow();
    });
  });

  describe("getAllSubmissions", () => {
    it("should fetch and parse submissions correctly", async () => {
      const mockRows = [
        [
          "submission-1", "Test Assignment", "course-101", "John", "Doe", 
          "john@test.com", "My submission", "2024-01-01", "85", "graded", 
          "100", "Submissions", "Description", "2024-01-01", "file-1", 
          "false", "form-1"
        ]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      const result = await service.getAllSubmissions();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("submission-1");
      expect(result[0].studentEmail).toBe("john@test.com");
      expect(result[0].isQuiz).toBe(false); // Transformed from string
      expect(result[0].maxPoints).toBe(100); // Transformed from string
      
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id",
        range: "Submissions!A2:Q"
      });
    });

    it("should handle quiz submissions with boolean conversion", async () => {
      const mockRows = [
        [
          "submission-1", "Quiz Assignment", "course-101", "Jane", "Smith", 
          "jane@test.com", "Quiz answers", "2024-01-01", "", "pending", 
          "50", "Submissions", "Quiz description", "2024-01-01", "file-2", 
          "TRUE", "quiz-form-1"
        ]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      const result = await service.getAllSubmissions();
      
      expect(result[0].isQuiz).toBe(true); // Transformed from string
      expect(result[0].formId).toBe("quiz-form-1");
    });
  });

  describe("getSubmissions", () => {
    it("should filter submissions by assignment title", async () => {
      const mockRows = [
        ["sub-1", "Assignment A", "course-1", "John", "Doe", "john@test.com", "content1", "2024-01-01", "", "pending", "100", "sheet", "desc", "2024-01-01", "file-1", "false", ""],
        ["sub-2", "Assignment B", "course-1", "Jane", "Smith", "jane@test.com", "content2", "2024-01-01", "", "pending", "100", "sheet", "desc", "2024-01-01", "file-2", "false", ""],
        ["sub-3", "Assignment A", "course-1", "Bob", "Wilson", "bob@test.com", "content3", "2024-01-01", "", "pending", "100", "sheet", "desc", "2024-01-01", "file-3", "false", ""]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      const result = await service.getSubmissions("Assignment A");
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("sub-1");
      expect(result[1].id).toBe("sub-3");
    });
  });

  describe("getAnswerKey", () => {
    it("should fetch and parse answer key correctly", async () => {
      const mockRows = [
        ["form-1", "Quiz 1", "course-101", "1", "What is 2+2?", "multiple-choice", "10", "4", "Basic math", "standard"],
        ["form-1", "Quiz 1", "course-101", "2", "What is 3+3?", "multiple-choice", "10", "6", "Basic math", "standard"]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      const result = await service.getAnswerKey("form-1");
      
      expect(result).toBeDefined();
      expect(result!.formId).toBe("form-1");
      expect(result!.questions).toHaveLength(2);
      expect(result!.questions[0].questionNumber).toBe(1); // Transformed to number
      expect(result!.questions[0].points).toBe(10); // Transformed to number
      expect(result!.totalPoints).toBe(20);
      
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id",
        range: "Answer Keys!A2:J"
      });
    });

    it("should return null for non-existent form", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] }
      });

      const result = await service.getAnswerKey("non-existent-form");
      
      expect(result).toBeNull();
    });

    it("should filter answer keys by form ID", async () => {
      const mockRows = [
        ["form-1", "Quiz 1", "course-101", "1", "Question 1", "mc", "10", "Answer 1", "Explanation", "standard"],
        ["form-2", "Quiz 2", "course-101", "1", "Question 2", "mc", "10", "Answer 2", "Explanation", "standard"],
        ["form-1", "Quiz 1", "course-101", "2", "Question 3", "mc", "10", "Answer 3", "Explanation", "standard"]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      const result = await service.getAnswerKey("form-1");
      
      expect(result!.questions).toHaveLength(2);
      expect(result!.questions[0].questionNumber).toBe(1);
      expect(result!.questions[1].questionNumber).toBe(2);
    });
  });

  describe("updateGrade", () => {
    it("should update grade for existing submission", async () => {
      const mockRows = [
        ["submission-1", "Assignment", "course-1", "John", "Doe", "john@test.com", "content", "2024-01-01", "", "pending", "100", "sheet", "desc", "2024-01-01", "file-1", "false", ""]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      mockSheets.spreadsheets.values.update.mockResolvedValue({});

      await service.updateGrade("submission-1", 85);
      
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id",
        range: "Submissions!I2:J2",
        valueInputOption: "RAW",
        requestBody: {
          values: [[85, "graded"]]
        }
      });
    });

    it("should throw error for non-existent submission", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] }
      });

      await expect(service.updateGrade("non-existent", 85))
        .rejects.toThrow("Submission non-existent not found in sheet");
    });

    it("should handle API errors during update", async () => {
      const mockRows = [
        ["submission-1", "Assignment", "course-1", "John", "Doe", "john@test.com", "content", "2024-01-01", "", "pending", "100", "sheet", "desc", "2024-01-01", "file-1", "false", ""]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      mockSheets.spreadsheets.values.update.mockRejectedValue(new Error("Update failed"));

      await expect(service.updateGrade("submission-1", 85))
        .rejects.toThrow("Update failed");
    });
  });

  describe("getUngraduatedSubmissions", () => {
    it("should filter ungraded submissions", async () => {
      const mockRows = [
        ["sub-1", "Assignment", "course-1", "John", "Doe", "john@test.com", "content1", "2024-01-01", "", "pending", "100", "sheet", "desc", "2024-01-01", "file-1", "false", ""],
        ["sub-2", "Assignment", "course-1", "Jane", "Smith", "jane@test.com", "content2", "2024-01-01", "85", "graded", "100", "sheet", "desc", "2024-01-01", "file-2", "false", ""],
        ["sub-3", "Assignment", "course-1", "Bob", "Wilson", "bob@test.com", "content3", "2024-01-01", "", "pending", "100", "sheet", "desc", "2024-01-01", "file-3", "false", ""]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      const result = await service.getUngraduatedSubmissions();
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("sub-1");
      expect(result[1].id).toBe("sub-3");
    });

    it("should return empty array when all submissions are graded", async () => {
      const mockRows = [
        ["sub-1", "Assignment", "course-1", "John", "Doe", "john@test.com", "content1", "2024-01-01", "85", "graded", "100", "sheet", "desc", "2024-01-01", "file-1", "false", ""],
        ["sub-2", "Assignment", "course-1", "Jane", "Smith", "jane@test.com", "content2", "2024-01-01", "90", "graded", "100", "sheet", "desc", "2024-01-01", "file-2", "false", ""]
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      const result = await service.getUngraduatedSubmissions();
      
      expect(result).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should handle network timeouts gracefully", async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValue(new Error("Request timeout"));

      await expect(service.getAssignments()).rejects.toThrow("Request timeout");
    });

    it("should handle malformed sheet data", async () => {
      // Mock response with inconsistent data
      const mockRows = [
        ["assignment-1"] // Missing required columns
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: mockRows }
      });

      await expect(service.getAssignments()).rejects.toThrow();
    });

    it("should handle Google Sheets API quota errors", async () => {
      const quotaError = new Error("Quota exceeded");
      (quotaError as any).code = 403;
      
      mockSheets.spreadsheets.values.get.mockRejectedValue(quotaError);

      await expect(service.getAllSubmissions()).rejects.toThrow("Quota exceeded");
    });
  });
});

describe.skip("createSheetsService", () => {
  it("should create service instance with proper authentication", async () => {
    // Mock the google.auth.GoogleAuth constructor and its methods
    const mockGoogleAuth = {
      getClient: vi.fn().mockResolvedValue({
        credentials: { access_token: "test-token" }
      })
    };

    const { google } = await import("googleapis");
    (google.auth.GoogleAuth as any).mockImplementation(() => mockGoogleAuth);

    const service = await createSheetsService();
    
    expect(service).toBeInstanceOf(SheetsService);
    expect(mockGoogleAuth.getClient).toHaveBeenCalled();
  });

  it("should handle authentication errors", async () => {
    const { google } = await import("googleapis");
    (google.auth.GoogleAuth as any).mockImplementation(() => {
      throw new Error("Authentication failed");
    });

    await expect(createSheetsService()).rejects.toThrow("Authentication failed");
  });
});