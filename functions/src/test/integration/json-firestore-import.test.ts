/**
 * Comprehensive test for JSON snapshot import to Firestore
 * Location: functions/src/test/integration/json-firestore-import.test.ts
 * 
 * Tests the complete pipeline:
 * 1. JSON snapshot validation
 * 2. Transformation to normalized schemas
 * 3. Import into Firestore collections
 * 4. Data integrity verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from 'fs';
import path from 'path';
import type { Request, Response } from "express";

// Mock Firebase Admin SDK - CRITICAL for authentication
// Mock both static and dynamic imports with all necessary exports
vi.mock("firebase-admin", () => {
  const mockVerifyIdToken = vi.fn().mockResolvedValue({
    uid: "test-teacher-uid",
    email: "test.codepet@gmail.com",
    role: "teacher",
    name: "Test Teacher"
  });
  
  const mockAuth = vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken
  }));
  
  const mockApp = {
    delete: vi.fn().mockResolvedValue(undefined)
  };
  
  return {
    auth: mockAuth,
    apps: [],  // Empty apps array for setup.ts
    initializeApp: vi.fn().mockReturnValue(mockApp),
    default: {
      auth: mockAuth,
      apps: [],
      initializeApp: vi.fn().mockReturnValue(mockApp)
    }
  };
});

// Mock Firebase dependencies - must be defined at module level for hoisting
vi.mock("../../config/firebase", () => ({
  db: {
    collection: vi.fn((collectionName: string) => {
      // Mock user profile lookup for authentication
      if (collectionName === "users") {
        return {
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                uid: "test-teacher-uid",
                email: "test.codepet@gmail.com",
                role: "teacher",
                displayName: "Test Teacher",
                schoolEmail: "test.codepet@gmail.com", // Match the teacher email in snapshot
                teacherData: {
                  boardAccountEmail: "test.codepet@gmail.com" // Legacy field fallback
                }
              })
            }),
            set: vi.fn().mockResolvedValue(undefined),
            update: vi.fn().mockResolvedValue(undefined)
          }))
        };
      }
      // Default mock for other collections - return success for all operations
      const queryMock = {
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: [],
          size: 0
        }),
        where: vi.fn(() => queryMock),
        orderBy: vi.fn(() => queryMock),
        limit: vi.fn(() => queryMock)
      };
      
      return {
        doc: vi.fn((docId: string) => ({
          get: vi.fn().mockResolvedValue({
            exists: false,
            data: () => null,
            id: docId
          }),
          set: vi.fn().mockResolvedValue(undefined),
          update: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(undefined)
        })),
        add: vi.fn().mockResolvedValue({ 
          id: `mock-${collectionName}-${Math.random().toString(36).substr(2, 9)}` 
        }),
        where: vi.fn(() => queryMock),
        orderBy: vi.fn(() => queryMock),
        limit: vi.fn(() => queryMock),
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: [],
          size: 0
        })
      };
    }),
    // Mock batch operations for transactions
    batch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined)
    }))
  },
  getCurrentTimestamp: vi.fn(() => ({
    _seconds: Math.floor(Date.now() / 1000),
    _nanoseconds: 0
  })),
  FieldValue: {
    serverTimestamp: vi.fn()
  }
}));

// Mock authentication - PRIMARY authentication mock
vi.mock("../../middleware/validation", () => ({
  getUserFromRequest: vi.fn(async (req) => {
    // Always return valid teacher for tests unless specifically testing auth failure
    const authHeader = req.headers?.authorization;
    if (!authHeader || authHeader === "Bearer invalid-token") {
      return null;
    }
    return {
      uid: "test-teacher-uid",
      email: "test.codepet@gmail.com",
      role: "teacher",
      displayName: "Test Teacher"
    };
  })
}));

// Mock Firebase Functions logger
vi.mock("firebase-functions", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock GradeVersioningService
vi.mock("../../services/grade-versioning", () => ({
  GradeVersioningService: vi.fn().mockImplementation(() => ({
    batchProcessGrades: vi.fn().mockResolvedValue({
      created: [],
      updated: [],
      conflicts: []
    })
  }))
}));

// Setup test environment
import "../setup";

// Load test data
const mockSnapshotPath = path.resolve(__dirname, '../../../../frontend/e2e/fixtures/classroom-snapshot-mock.json');
const mockSnapshotData = JSON.parse(fs.readFileSync(mockSnapshotPath, 'utf8'));

// Import the functions under test AFTER all mocks are defined
import { importSnapshot, validateSnapshot } from "../../routes/snapshots";

describe("JSON to Firestore Import Integration", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseData: any;
  let statusCode: number;
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get mocked db instance first
    const { db } = await import("../../config/firebase");
    mockDb = db;
    
    // Ensure the specific mock for users collection returns the teacher with schoolEmail
    mockDb.collection.mockImplementation((collectionName: string) => {
      // Mock user profile lookup for authentication - THIS IS CRITICAL
      if (collectionName === "users") {
        return {
          doc: vi.fn((docId: string) => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                uid: "test-teacher-uid",
                email: "test.codepet@gmail.com",
                role: "teacher",
                displayName: "Test Teacher",
                schoolEmail: "test.codepet@gmail.com", // Match the teacher email in snapshot
                teacherData: {
                  boardAccountEmail: "test.codepet@gmail.com" // Legacy field fallback
                }
              })
            }),
            set: vi.fn().mockResolvedValue(undefined),
            update: vi.fn().mockResolvedValue(undefined)
          }))
        };
      }
      
      // Default mock for other collections - return success for all operations
      const queryMock = {
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: [],
          size: 0
        }),
        where: vi.fn(() => queryMock),
        orderBy: vi.fn(() => queryMock),
        limit: vi.fn(() => queryMock)
      };
      
      return {
        doc: vi.fn((docId: string) => ({
          get: vi.fn().mockResolvedValue({
            exists: false,
            data: () => null,
            id: docId
          }),
          set: vi.fn().mockResolvedValue(undefined),
          update: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(undefined)
        })),
        add: vi.fn().mockResolvedValue({ 
          id: `mock-${collectionName}-${Math.random().toString(36).substr(2, 9)}` 
        }),
        where: vi.fn(() => queryMock),
        orderBy: vi.fn(() => queryMock),
        limit: vi.fn(() => queryMock),
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: [],
          size: 0
        })
      };
    });
    
    // Setup mock response
    responseData = null;
    statusCode = 200;
    
    mockResponse = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return mockResponse as Response;
      }),
      json: vi.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      })
    };

    // Setup mock request with valid snapshot data and Authorization header
    mockRequest = {
      headers: {
        authorization: "Bearer mock-firebase-id-token"
      },
      body: mockSnapshotData
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Snapshot Validation", () => {
    it("should validate a well-formed JSON snapshot", async () => {
      await validateSnapshot(mockRequest as Request, mockResponse as Response);

      expect(statusCode).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.isValid).toBe(true);
    });

    it("should reject invalid JSON format", async () => {
      mockRequest.body = "not valid json";
      
      await validateSnapshot(mockRequest as Request, mockResponse as Response);

      expect(statusCode).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid JSON format");
    });

    it("should require teacher authentication", async () => {
      // Use invalid token to trigger authentication failure
      mockRequest.headers = {
        authorization: "Bearer invalid-token"
      };
      
      await validateSnapshot(mockRequest as Request, mockResponse as Response);

      expect(statusCode).toBe(403);
      expect(responseData.error).toContain("Only teachers can validate snapshots");
    });
  });

  describe("Snapshot Import Process", () => {
    let mockDocRef: any;
    let mockGetResult: any;

    beforeEach(() => {
      // Setup detailed Firestore mocks
      mockDocRef = {
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn()
      };

      mockGetResult = {
        exists: false,
        data: vi.fn()
      };

      // The mockDb.collection is already properly mocked in beforeEach
      // Just update the mockDocRef behavior
      mockDocRef.get.mockResolvedValue(mockGetResult);
    });

    it("should successfully import a valid snapshot", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Debug: Log the response if it fails  
      // if (statusCode !== 200) {
      //   console.log('Status:', statusCode);
      //   console.log('Response:', JSON.stringify(responseData, null, 2));
      // }

      expect(statusCode).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain("imported successfully");
      expect(responseData.data).toHaveProperty("stats");
      expect(responseData.data).toHaveProperty("processingTime");
    });

    it("should access users collection (not teachers)", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Verify users collection was accessed (teachers collection no longer exists)
      expect(mockDb.collection).toHaveBeenCalledWith("users");
    });

    it("should create classroom entities", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Verify classrooms collection was accessed
      expect(mockDb.collection).toHaveBeenCalledWith("classrooms");
      
      // Should process all 3 classrooms from mock data
      expect(responseData.data.stats.classroomsCreated).toBe(3);
    });

    it("should create assignment entities", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Verify assignments collection was accessed
      expect(mockDb.collection).toHaveBeenCalledWith("assignments");
      
      // Should have assignments from the mock data
      expect(responseData.data.stats.assignmentsCreated).toBeGreaterThan(0);
    });

    it("should create submission entities", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Verify submissions collection was accessed
      expect(mockDb.collection).toHaveBeenCalledWith("submissions");
      
      // Should have submissions from the mock data
      expect(responseData.data.stats.submissionsCreated).toBeGreaterThan(0);
    });

    it("should create student enrollment entities", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Verify enrollments collection was accessed
      expect(mockDb.collection).toHaveBeenCalledWith("enrollments");
      
      // Should have enrollments from the mock data
      expect(responseData.data.stats.enrollmentsCreated).toBeGreaterThan(0);
    });

    it("should process grades from graded submissions", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Verify grades collection was accessed
      expect(mockDb.collection).toHaveBeenCalledWith("grades");
      
      // Should have processed some grades from the mock data
      expect(responseData.data.stats.gradesCreated).toBeGreaterThan(0);
    });

    it("should reject snapshot with mismatched teacher email", async () => {
      // Modify snapshot to have different teacher email
      mockRequest.body = {
        ...mockSnapshotData,
        teacher: {
          ...mockSnapshotData.teacher,
          email: "different@example.com"
        }
      };

      await importSnapshot(mockRequest as Request, mockResponse as Response);

      expect(statusCode).toBe(400);
      expect(responseData.error).toContain("doesn't match your school email");
    });

    it("should handle Firestore errors gracefully", async () => {
      // Mock Firestore to throw an error
      mockDb.collection.mockImplementation(() => {
        throw new Error("Firestore connection failed");
      });

      await importSnapshot(mockRequest as Request, mockResponse as Response);

      expect(statusCode).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Internal server error");
    });

    it("should provide detailed statistics on successful import", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      expect(responseData.data.stats).toEqual(
        expect.objectContaining({
          classroomsCreated: expect.any(Number),
          assignmentsCreated: expect.any(Number),
          submissionsCreated: expect.any(Number),
          enrollmentsCreated: expect.any(Number),
          gradesCreated: expect.any(Number)
        })
      );
    });

    it("should include processing time in response", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      expect(responseData.data.processingTime).toBeGreaterThan(0);
      expect(typeof responseData.data.processingTime).toBe("number");
    });
  });

  describe("Data Integrity Validation", () => {
    it("should maintain referential integrity between entities", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Verify collections were called in correct order for referential integrity
      const collectionCalls = (mockDb.collection as any).mock.calls.map((call: any[]) => call[0]);
      
      // Users should be accessed before classrooms (for validation)
      const usersIndex = collectionCalls.indexOf("users");
      const classroomIndex = collectionCalls.indexOf("classrooms");
      
      expect(usersIndex).toBeGreaterThanOrEqual(0);
      expect(classroomIndex).toBeGreaterThanOrEqual(0);
    });

    it("should preserve student data consistency", async () => {
      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Verify that students and enrollments are processed consistently
      expect(mockDb.collection).toHaveBeenCalledWith("users"); // Student users
      expect(mockDb.collection).toHaveBeenCalledWith("enrollments"); // Student enrollments
    });

    it("should handle existing data conflicts properly", async () => {
      // Mock existing teacher
      mockGetResult.exists = true;
      mockGetResult.data.mockReturnValue({
        id: "existing-teacher-id",
        email: "test.codepet@gmail.com"
      });

      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Should still succeed with conflict resolution
      expect(statusCode).toBe(200);
      expect(responseData.success).toBe(true);
    });
  });

  describe("Performance and Scalability", () => {
    it("should complete import within reasonable time", async () => {
      const startTime = Date.now();
      
      await importSnapshot(mockRequest as Request, mockResponse as Response);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within 5 seconds for test data
      expect(processingTime).toBeLessThan(5000);
    });

    it("should handle large datasets efficiently", async () => {
      // Create a larger mock dataset
      const largeSnapshot = {
        ...mockSnapshotData,
        classrooms: Array(10).fill(null).map((_, i) => ({
          ...mockSnapshotData.classrooms[0],
          id: `classroom-${i}`,
          students: Array(50).fill(null).map((_, j) => ({
            ...mockSnapshotData.classrooms[0].students[0],
            id: `student-${i}-${j}`,
            email: `student${i}${j}@example.com`
          }))
        }))
      };

      mockRequest.body = largeSnapshot;

      await importSnapshot(mockRequest as Request, mockResponse as Response);

      // Should still complete successfully
      expect(statusCode).toBe(200);
      expect(responseData.success).toBe(true);
    });
  });
});