/**
 * Test setup and infrastructure for Firebase Functions testing
 * Location: functions/src/test/setup.ts
 */

import { beforeAll, afterAll, vi } from "vitest";
import * as admin from "firebase-admin";

// Test environment configuration
export const TEST_CONFIG = {
  projectId: "test-project",
  databaseURL: "https://test-project.firebaseio.com",
  storageBucket: "test-project.appspot.com"
};

// Global test setup
beforeAll(async () => {
  // Initialize Firebase Admin for testing
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: TEST_CONFIG.projectId,
      databaseURL: TEST_CONFIG.databaseURL,
      storageBucket: TEST_CONFIG.storageBucket
    });
  }

  // Set environment variables for testing
  process.env.FUNCTIONS_EMULATOR = "true";
  process.env.NODE_ENV = "test";
  process.env.FIREBASE_PROJECT_ID = TEST_CONFIG.projectId;
});

// Global test teardown
afterAll(async () => {
  // Clean up Firebase Admin apps
  await Promise.all(admin.apps.map(app => app?.delete()));
  
  // Clear environment variables
  delete process.env.FUNCTIONS_EMULATOR;
  delete process.env.NODE_ENV;
  delete process.env.FIREBASE_PROJECT_ID;
});

// Mock Firebase Firestore
export const mockFirestore = () => {
  const mockDoc = {
    id: "mock-doc-id",
    data: vi.fn(),
    exists: true,
    ref: {
      id: "mock-doc-id",
      path: "mock/path"
    }
  };

  const mockCollection = {
    add: vi.fn().mockResolvedValue({ id: "mock-doc-id" }),
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue(mockDoc),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      docs: [mockDoc],
      empty: false,
      size: 1
    })
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
    doc: vi.fn().mockReturnValue(mockCollection.doc()),
    batch: vi.fn().mockReturnValue({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined)
    })
  };

  return { mockDb, mockCollection, mockDoc };
};

// Mock Google Sheets API
export const mockSheetsApi = () => {
  const mockSheetsResponse = {
    data: {
      values: [
        ["assignment-1", "course-101", "Test Assignment", "Description", "2024-01-01", "100", "mixed", "2024-01-01"]
      ]
    }
  };

  const mockSheets = {
    spreadsheets: {
      get: vi.fn().mockResolvedValue({
        data: {
          properties: { title: "Test Spreadsheet" },
          sheets: [{ properties: { title: "Sheet1" } }]
        }
      }),
      values: {
        get: vi.fn().mockResolvedValue(mockSheetsResponse),
        update: vi.fn().mockResolvedValue({ data: {} })
      }
    }
  };

  return mockSheets;
};

// Mock Gemini AI Service
export const mockGeminiService = () => {
  const mockGeminiResponse = {
    score: 85,
    feedback: "Good work! The code demonstrates understanding of the concepts.",
    criteriaScores: [
      { name: "Logic", score: 90, maxScore: 100, feedback: "Excellent logical flow" },
      { name: "Implementation", score: 80, maxScore: 100, feedback: "Good implementation" }
    ]
  };

  return {
    gradeSubmission: vi.fn().mockResolvedValue(mockGeminiResponse),
    gradeQuiz: vi.fn().mockResolvedValue({
      totalScore: 80,
      totalPossible: 100,
      questionGrades: [
        {
          questionNumber: 1,
          isCorrect: true,
          studentAnswer: "correct answer",
          correctAnswer: "correct answer",
          points: 10
        }
      ]
    })
  };
};

// Test utilities
export const testUtils = {
  /**
   * Create a mock Express request object
   */
  createMockRequest: (body: Record<string, unknown> = {}, params: Record<string, unknown> = {}, query: Record<string, unknown> = {}) => ({
    body,
    params,
    query,
    headers: {},
    app: {
      locals: {
        geminiApiKey: "test-api-key"
      }
    }
  }),

  /**
   * Create a mock Express response object
   */
  createMockResponse: () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: {}
    };
    return res;
  },

  /**
   * Create a test timestamp
   */
  createTestTimestamp: (date = new Date()) => ({
    _seconds: Math.floor(date.getTime() / 1000),
    _nanoseconds: (date.getTime() % 1000) * 1000000
  }),

  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Export mock factories (remove duplicate exports)
// mockFirestore, mockSheetsApi, mockGeminiService, and testUtils are already exported above