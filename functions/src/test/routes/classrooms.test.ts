/**
 * Tests for classroom sync API endpoint
 * Location: functions/src/test/routes/classrooms.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { syncClassroomsFromSheets } from "../../routes/classrooms";
import type { Request, Response } from "express";

// Mock Firebase dependencies first (before other imports)
vi.mock("../../config/firebase", () => ({
  db: {
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn()
          }))
        })),
        limit: vi.fn(() => ({
          get: vi.fn()
        })),
        get: vi.fn()
      })),
      add: vi.fn(),
      doc: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(),
        set: vi.fn()
      }))
    }))
  },
  getCurrentTimestamp: vi.fn(() => ({
    _seconds: Math.floor(Date.now() / 1000),
    _nanoseconds: 0
  }))
}));

// Setup test environment
import "../setup";

// Mock dependencies
vi.mock("../../middleware/validation", () => ({
  getUserFromRequest: vi.fn()
}));

vi.mock("../../services/classroom-sync", () => ({
  createClassroomSyncService: vi.fn()
}));

vi.mock("firebase-functions", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { getUserFromRequest } from "../../middleware/validation";
import { createClassroomSyncService } from "../../services/classroom-sync";

describe("syncClassroomsFromSheets API endpoint", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn().mockReturnThis();
    mockStatus = vi.fn().mockReturnThis();
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    mockRequest = {
      body: {}
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should reject non-teacher users", async () => {
    // Mock non-teacher user
    (getUserFromRequest as any).mockResolvedValue({
      uid: "user123",
      role: "student"
    });

    mockRequest.body = { spreadsheetId: "sheet123" };

    await syncClassroomsFromSheets(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Only teachers can sync classrooms from sheets"
    });
  });

  it("should reject requests without spreadsheetId", async () => {
    // Mock teacher user
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      role: "teacher"
    });

    mockRequest.body = {}; // Missing spreadsheetId

    await syncClassroomsFromSheets(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "spreadsheetId is required and must be a string"
    });
  });

  it("should reject requests with invalid spreadsheetId type", async () => {
    // Mock teacher user
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      role: "teacher"
    });

    mockRequest.body = { spreadsheetId: 123 }; // Wrong type

    await syncClassroomsFromSheets(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "spreadsheetId is required and must be a string"
    });
  });

  it("should handle successful sync", async () => {
    // Mock teacher user
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      role: "teacher"
    });

    // Mock successful sync service
    const mockSyncService = {
      syncClassroomsFromSheets: vi.fn().mockResolvedValue({
        success: true,
        classroomsCreated: 2,
        classroomsUpdated: 1,
        studentsCreated: 5,
        studentsUpdated: 3,
        errors: []
      })
    };
    (createClassroomSyncService as any).mockReturnValue(mockSyncService);

    mockRequest.body = { spreadsheetId: "sheet123" };

    await syncClassroomsFromSheets(mockRequest as Request, mockResponse as Response);

    expect(mockSyncService.syncClassroomsFromSheets).toHaveBeenCalledWith("teacher123", "sheet123");
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      data: {
        classroomsCreated: 2,
        classroomsUpdated: 1,
        studentsCreated: 5,
        studentsUpdated: 3,
        totalErrors: 0
      },
      message: "Successfully synced 3 classrooms and 8 students"
    });
  });

  it("should handle sync with errors", async () => {
    // Mock teacher user
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      role: "teacher"
    });

    // Mock sync service with errors
    const mockSyncService = {
      syncClassroomsFromSheets: vi.fn().mockResolvedValue({
        success: false,
        classroomsCreated: 1,
        classroomsUpdated: 0,
        studentsCreated: 2,
        studentsUpdated: 1,
        errors: ["Failed to sync classroom CS101", "Student email invalid"]
      })
    };
    (createClassroomSyncService as any).mockReturnValue(mockSyncService);

    mockRequest.body = { spreadsheetId: "sheet123" };

    await syncClassroomsFromSheets(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(207); // Multi-Status
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      data: {
        classroomsCreated: 1,
        classroomsUpdated: 0,
        studentsCreated: 2,
        studentsUpdated: 1,
        errors: ["Failed to sync classroom CS101", "Student email invalid"]
      },
      error: "Sync completed with some errors. Check the errors array for details."
    });
  });

  it("should handle service exceptions", async () => {
    // Mock teacher user
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      role: "teacher"
    });

    // Mock sync service that throws
    const mockSyncService = {
      syncClassroomsFromSheets: vi.fn().mockRejectedValue(new Error("Database connection failed"))
    };
    (createClassroomSyncService as any).mockReturnValue(mockSyncService);

    mockRequest.body = { spreadsheetId: "sheet123" };

    await syncClassroomsFromSheets(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Failed to sync classrooms from sheets",
      details: "Database connection failed"
    });
  });

  it("should handle authentication errors", async () => {
    // Mock authentication failure
    (getUserFromRequest as any).mockResolvedValue(null);

    mockRequest.body = { spreadsheetId: "sheet123" };

    await syncClassroomsFromSheets(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Only teachers can sync classrooms from sheets"
    });
  });
});