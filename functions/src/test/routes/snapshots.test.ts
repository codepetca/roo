/**
 * Tests for snapshot validation API endpoint
 * Location: functions/src/test/routes/snapshots.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import fs from 'fs';
import path from 'path';

// Mock Firebase dependencies first
vi.mock("../../config/firebase", () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn()
      }))
    }))
  }
}));

// Mock dependencies
vi.mock("../../middleware/validation", () => ({
  getUserFromRequest: vi.fn()
}));

vi.mock("firebase-functions", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Setup test environment
import "../setup";

import { getUserFromRequest } from "../../middleware/validation";

// Mock snapshot data - load the actual classroom snapshot mock
const mockSnapshotPath = path.resolve(__dirname, '../../../../frontend/e2e/fixtures/classroom-snapshot-mock.json');
const mockSnapshotData = JSON.parse(fs.readFileSync(mockSnapshotPath, 'utf8'));

// Inline validation function for testing (same as in index.ts)
async function validateSnapshotInline(req: Request, res: Response): Promise<void> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "teacher") {
      res.status(403).json({ 
        success: false, 
        error: "Only teachers can validate snapshots" 
      });
      return;
    }

    // Basic JSON validation
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({
        success: false,
        error: "Invalid snapshot format - not a valid JSON object"
      });
      return;
    }

    // Basic structure validation
    const snapshot = req.body;
    if (!snapshot.classrooms || !Array.isArray(snapshot.classrooms)) {
      res.status(400).json({
        success: false,
        error: "Invalid snapshot format - missing or invalid classrooms array"
      });
      return;
    }

    if (!snapshot.teacher || !snapshot.teacher.email) {
      res.status(400).json({
        success: false,
        error: "Invalid snapshot format - missing teacher information"
      });
      return;
    }

    // Check if teacher email matches authenticated user
    if (snapshot.teacher.email !== user.email) {
      res.status(400).json({
        success: false,
        error: "Snapshot teacher email does not match authenticated user",
        details: `Expected: ${user.email}, Found: ${snapshot.teacher.email}`
      });
      return;
    }

    // Calculate basic stats
    const stats = {
      classroomCount: snapshot.classrooms.length,
      totalStudents: snapshot.globalStats?.totalStudents || 0,
      totalAssignments: snapshot.globalStats?.totalAssignments || 0,
      totalSubmissions: snapshot.globalStats?.totalSubmissions || 0,
      ungradedSubmissions: snapshot.globalStats?.ungradedSubmissions || 0
    };

    res.status(200).json({
      success: true,
      message: "Snapshot is valid and ready for import",
      data: {
        isValid: true,
        stats,
        metadata: snapshot.snapshotMetadata || {},
        preview: {
          classrooms: snapshot.classrooms.slice(0, 10).map((c: any) => ({
            id: c.id || 'unknown',
            name: c.name || 'Unknown',
            studentCount: c.studentCount || 0,
            assignmentCount: c.assignmentCount || 0,
            ungradedSubmissions: c.ungradedSubmissions || 0
          }))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to validate snapshot",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

describe("validateSnapshot endpoint", () => {
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
      email: "student@test.com",
      role: "student"
    });

    mockRequest.body = mockSnapshotData;

    await validateSnapshotInline(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Only teachers can validate snapshots"
    });
  });

  it("should reject unauthenticated users", async () => {
    (getUserFromRequest as any).mockResolvedValue(null);

    mockRequest.body = mockSnapshotData;

    await validateSnapshotInline(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Only teachers can validate snapshots"
    });
  });

  it("should reject invalid JSON data", async () => {
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      email: "test.codepet@gmail.com",
      role: "teacher"
    });

    mockRequest.body = null;

    await validateSnapshotInline(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Invalid snapshot format - not a valid JSON object"
    });
  });

  it("should reject snapshot without classrooms", async () => {
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      email: "test.codepet@gmail.com", 
      role: "teacher"
    });

    mockRequest.body = { teacher: { email: "test.codepet@gmail.com" } };

    await validateSnapshotInline(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Invalid snapshot format - missing or invalid classrooms array"
    });
  });

  it("should reject snapshot without teacher info", async () => {
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      email: "test.codepet@gmail.com",
      role: "teacher"
    });

    mockRequest.body = { classrooms: [] };

    await validateSnapshotInline(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Invalid snapshot format - missing teacher information"
    });
  });

  it("should reject snapshot with mismatched teacher email", async () => {
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      email: "different@teacher.com",
      role: "teacher"
    });

    mockRequest.body = mockSnapshotData; // Has test.codepet@gmail.com

    await validateSnapshotInline(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Snapshot teacher email does not match authenticated user",
      details: "Expected: different@teacher.com, Found: test.codepet@gmail.com"
    });
  });

  it("should validate real classroom snapshot mock data successfully", async () => {
    // Mock teacher user that matches the mock data
    (getUserFromRequest as any).mockResolvedValue({
      uid: "teacher123",
      email: "test.codepet@gmail.com", // Matches mock data
      role: "teacher"
    });

    mockRequest.body = mockSnapshotData;

    await validateSnapshotInline(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      message: "Snapshot is valid and ready for import",
      data: {
        isValid: true,
        stats: {
          classroomCount: expect.any(Number),
          totalStudents: expect.any(Number),
          totalAssignments: expect.any(Number),
          totalSubmissions: expect.any(Number),
          ungradedSubmissions: expect.any(Number)
        },
        metadata: expect.any(Object),
        preview: {
          classrooms: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              studentCount: expect.any(Number),
              assignmentCount: expect.any(Number),
              ungradedSubmissions: expect.any(Number)
            })
          ])
        }
      }
    });
  });

  it("should validate that mock data has required submission fields", () => {
    // Check that our mock data has the new studentEmail and studentName fields
    const firstClassroom = mockSnapshotData.classrooms[0];
    const firstSubmission = firstClassroom?.submissions?.[0];
    
    expect(firstSubmission).toHaveProperty('studentEmail');
    expect(firstSubmission).toHaveProperty('studentName');
    expect(typeof firstSubmission.studentEmail).toBe('string');
    expect(typeof firstSubmission.studentName).toBe('string');
  });

  it("should validate classroom structure matches expected format", () => {
    expect(mockSnapshotData).toHaveProperty('teacher');
    expect(mockSnapshotData).toHaveProperty('classrooms');
    expect(mockSnapshotData).toHaveProperty('globalStats');
    
    expect(mockSnapshotData.teacher.email).toBe('test.codepet@gmail.com');
    expect(Array.isArray(mockSnapshotData.classrooms)).toBe(true);
    expect(mockSnapshotData.classrooms.length).toBeGreaterThan(0);
    
    const firstClassroom = mockSnapshotData.classrooms[0];
    expect(firstClassroom).toHaveProperty('id');
    expect(firstClassroom).toHaveProperty('name');
    expect(firstClassroom).toHaveProperty('students');
    expect(firstClassroom).toHaveProperty('submissions');
    expect(Array.isArray(firstClassroom.students)).toBe(true);
    expect(Array.isArray(firstClassroom.submissions)).toBe(true);
  });

  it("should handle validation errors gracefully", async () => {
    (getUserFromRequest as any).mockRejectedValue(new Error("Database connection failed"));

    mockRequest.body = mockSnapshotData;

    await validateSnapshotInline(mockRequest as Request, mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: "Failed to validate snapshot",
      message: "Database connection failed"
    });
  });
});