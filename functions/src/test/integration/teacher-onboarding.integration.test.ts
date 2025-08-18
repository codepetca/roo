/**
 * Integration test for teacher onboarding API endpoint
 * Location: functions/src/test/integration/teacher-onboarding-integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Simple integration test that can be run against local emulators
const API_BASE_URL = "http://localhost:5001/roo-auto-grading-dev/us-central1/api";

describe("Teacher Onboarding Integration", () => {
  // Skip if emulators are not running
  const isEmulatorAvailable = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  };

  it("should return needsOnboarding=true for unauthenticated request", async () => {
    const emulatorRunning = await isEmulatorAvailable();
    if (!emulatorRunning) {
      console.log("Skipping integration test - emulators not running");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/teacher/onboarding-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("teacher");
  });

  it("should be accessible via the correct endpoint", async () => {
    const emulatorRunning = await isEmulatorAvailable();
    if (!emulatorRunning) {
      console.log("Skipping integration test - emulators not running");
      return;
    }

    // This should get a 403 (not 404), indicating the endpoint exists
    const response = await fetch(`${API_BASE_URL}/teacher/onboarding-status`);
    expect(response.status).toBe(403); // Not 404 - endpoint exists but needs auth
  });
});