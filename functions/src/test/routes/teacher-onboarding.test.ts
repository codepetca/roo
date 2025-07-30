/**
 * Teacher onboarding route tests
 * Location: functions/src/test/routes/teacher-onboarding.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response } from "express";
import { checkTeacherOnboardingStatus } from "../../routes/teacher-onboarding";

// Mock Firebase Admin
vi.mock("../../config/firebase", () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn()
      })),
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock teacher config
vi.mock("../../config/teachers", () => ({
  getTeacherSheetsConfig: vi.fn(),
  verifyTeacherSheetAccess: vi.fn()
}));

// Mock sheet template service
vi.mock("../../services/sheet-template", () => ({
  createOAuthSheetTemplateService: vi.fn()
}));

// Mock validation middleware
vi.mock("../../middleware/validation", () => ({
  getUserFromRequest: vi.fn(),
  sendApiResponse: vi.fn(),
  handleRouteError: vi.fn()
}));

describe("Teacher Onboarding Status", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockGetUserFromRequest: any;
  let mockSendApiResponse: any;
  let mockDb: any;
  let mockGetTeacherSheetsConfig: any;

  beforeEach(async () => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    // Import mocked modules
    const validation = await import("../../middleware/validation");
    const firebase = await import("../../config/firebase");
    const teachers = await import("../../config/teachers");
    
    mockGetUserFromRequest = validation.getUserFromRequest;
    mockSendApiResponse = validation.sendApiResponse;
    mockDb = firebase.db;
    mockGetTeacherSheetsConfig = teachers.getTeacherSheetsConfig;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("New Teacher (No Sheet Configured)", () => {
    it("should return needsOnboarding=true for brand new teacher", async () => {
      // RED: This test should FAIL initially
      
      // Mock user authentication - new teacher
      mockGetUserFromRequest.mockResolvedValue({
        uid: "new-teacher-123",
        email: "teacher@test.com",
        role: "teacher"
      });

      // Mock empty user document (new teacher)
      const mockUserDoc = {
        data: () => ({
          // No teacherData field at all for new teacher
        })
      };
      mockDb.collection.mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockUserDoc)
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ empty: true }) // No classrooms
          }))
        }))
      });

      // Mock empty teacher config
      mockGetTeacherSheetsConfig.mockResolvedValue({});

      // Call the function
      await checkTeacherOnboardingStatus(mockReq as Request, mockRes as Response);

      // Verify response
      expect(mockSendApiResponse).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          hasClassrooms: false,
          hasSheetConfigured: false,
          sheetAccessible: false,
          needsOnboarding: true,
          boardAccountEmail: undefined,
          sheetVerification: undefined
        }),
        true,
        "Onboarding status retrieved"
      );
    });

    it("should return needsOnboarding=true for teacher with empty teacherData", async () => {
      // Mock user authentication
      mockGetUserFromRequest.mockResolvedValue({
        uid: "teacher-456",
        email: "teacher2@test.com",
        role: "teacher"
      });

      // Mock user document with empty teacherData
      const mockUserDoc = {
        data: () => ({
          teacherData: {} // Empty teacherData object
        })
      };
      mockDb.collection.mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockUserDoc)
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ empty: true })
          }))
        }))
      });

      mockGetTeacherSheetsConfig.mockResolvedValue({});

      await checkTeacherOnboardingStatus(mockReq as Request, mockRes as Response);

      expect(mockSendApiResponse).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          needsOnboarding: true,
          hasSheetConfigured: false
        }),
        true,
        "Onboarding status retrieved"
      );
    });
  });

  describe("Configured Teacher", () => {
    it("should return needsOnboarding=false for fully configured teacher", async () => {
      // Mock configured teacher
      mockGetUserFromRequest.mockResolvedValue({
        uid: "configured-teacher-789",
        email: "configured@test.com",
        role: "teacher"
      });

      // Mock configured user document
      const mockUserDoc = {
        data: () => ({
          teacherData: {
            configuredSheets: true,
            sheetId: "sheet-123",
            boardAccountEmail: "board@school.edu",
            googleAccessToken: "token-123"
          }
        })
      };

      // Mock has classrooms
      const mockClassroomsSnapshot = {
        empty: false
      };

      mockDb.collection.mockImplementation((collection: string) => {
        if (collection === "users") {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue(mockUserDoc)
            }))
          };
        } else if (collection === "classrooms") {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: vi.fn().mockResolvedValue(mockClassroomsSnapshot)
              }))
            }))
          };
        }
        return {};
      });

      // Mock sheet config exists
      mockGetTeacherSheetsConfig.mockResolvedValue({
        "board@school.edu": "sheet-123"
      });

      // Mock sheet verification
      const teachers = await import("../../config/teachers");
      teachers.verifyTeacherSheetAccess.mockResolvedValue({
        exists: true,
        accessible: true
      });

      // Mock OAuth service
      const sheetTemplate = await import("../../services/sheet-template");
      const mockOAuthService = {
        getRooDataSheetId: vi.fn().mockResolvedValue("sheet-123")
      };
      sheetTemplate.createOAuthSheetTemplateService.mockReturnValue(mockOAuthService);

      await checkTeacherOnboardingStatus(mockReq as Request, mockRes as Response);

      expect(mockSendApiResponse).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          hasClassrooms: true,
          hasSheetConfigured: true,
          sheetAccessible: true,
          needsOnboarding: false,
          boardAccountEmail: "board@school.edu"
        }),
        true,
        "Onboarding status retrieved"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle non-teacher users", async () => {
      mockGetUserFromRequest.mockResolvedValue({
        uid: "student-123",
        email: "student@test.com",
        role: "student"
      });

      await checkTeacherOnboardingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Only teachers can check onboarding status"
        })
      );
    });

    it("should handle unauthenticated users", async () => {
      mockGetUserFromRequest.mockResolvedValue(null);

      await checkTeacherOnboardingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});