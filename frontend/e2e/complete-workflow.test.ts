/**
 * E2E Integration Workflow Tests
 * Location: frontend/e2e/complete-workflow.test.ts
 * 
 * Tests the complete end-to-end user journey:
 * Login → Import Data → View Dashboard → Navigate Classrooms → Manage Data
 */

import { test, expect } from '@playwright/test';
import { MockApiHandler } from './fixtures/mock-api';
import { createAuthHelper } from './utils/auth-helpers';
import { createMockFile, createMockClassroomSnapshot } from './fixtures/test-data';

test.describe('Complete Teacher Workflow', () => {
  let mockApi: MockApiHandler;
  let authHelper: any;

  test.beforeEach(async ({ page }) => {
    mockApi = new MockApiHandler({ page });
    authHelper = createAuthHelper(page);
  });

  test.afterEach(async () => {
    await mockApi.clearAllMocks();
  });

  test('should complete full teacher journey: login → import → dashboard', async ({ page }) => {
    // Step 1: Setup authentication
    await authHelper.loginAsTeacher();
    
    // Step 2: Start with empty dashboard to show import flow
    await mockApi.mockTeacherDashboard({
      classrooms: [],
      stats: {
        totalStudents: 0,
        totalAssignments: 0,
        ungradedSubmissions: 0,
        averageGrade: undefined
      },
      recentActivity: []
    });
    
    // Navigate to dashboard - should show empty state
    await page.goto('/dashboard/teacher');
    
    await expect(page.locator('[data-testid="no-data-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-classroom-data-btn"]')).toBeVisible();
    
    // Step 3: Navigate to import flow
    await page.locator('[data-testid="import-classroom-data-btn"]').click();
    await expect(page).toHaveURL('/teacher/data-import');
    
    // Navigate to snapshot import
    await page.locator('[data-testid="snapshot-import-option"]').click();
    await expect(page).toHaveURL('/teacher/data-import/snapshot');
    
    // Step 4: Complete import workflow
    await mockApi.mockSnapshotValidation(true);
    await mockApi.mockSnapshotImport();
    await mockApi.mockSnapshotDiff(false); // First import
    
    // Upload file
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    // Wait for preview
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Confirm import
    await page.locator('[data-testid="confirm-import-btn"]').click();
    
    // Wait for completion
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('complete');
    
    // Step 5: Navigate to dashboard with data
    await mockApi.clearAllMocks();
    await mockApi.mockTeacherDashboard(); // Now with data
    
    await page.locator('[data-testid="go-to-dashboard-btn"]').click();
    await expect(page).toHaveURL('/dashboard/teacher');
    
    // Step 6: Verify dashboard shows imported data
    await expect(page.locator('[data-testid="no-data-state"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="classroom-card"]')).toHaveCount(1);
    
    // Check statistics are populated
    await expect(page.locator('[data-testid="stat-students"]')).not.toContainText('0');
    await expect(page.locator('[data-testid="stat-assignments"]')).not.toContainText('0');
    
    // Step 7: Interact with classroom
    await mockApi.mockClassroomStats('classroom-1');
    await page.locator('[data-testid="classroom-card"]').first().click();
    
    // Should show classroom selection or navigation
    await expect(page.locator('[data-testid="selected-classroom"]')).toBeVisible();
  });

  test('should handle data persistence across page refreshes', async ({ page }) => {
    await authHelper.loginAsTeacher();
    await mockApi.mockTeacherDashboard();
    
    // Load dashboard with data
    await page.goto('/dashboard/teacher');
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    
    // Check initial data
    const initialStudentCount = await page.locator('[data-testid="stat-students"]').textContent();
    
    // Refresh page
    await page.reload();
    
    // Data should persist (mocked API will return same data)
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-students"]')).toContainText(initialStudentCount!);
  });

  test('should handle multiple classroom imports and updates', async ({ page }) => {
    await authHelper.loginAsTeacher();
    
    // Start with some existing data
    await mockApi.mockTeacherDashboard({
      classrooms: [
        {
          id: 'existing-classroom',
          name: 'Existing CS 101',
          section: 'Section A',
          description: 'Existing course',
          descriptionHeading: 'Course Overview',
          room: 'Lab A',
          enrollmentCode: 'old123',
          courseState: 'ACTIVE',
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/old',
          teacherGroupEmail: 'teachers@school.edu',
          courseGroupEmail: 'old@school.edu',
          studentCount: 20,
          assignmentCount: 3,
          activeSubmissions: 25,
          ungradedSubmissions: 5,
          calendarId: 'cal-old',
          ownerId: 'teacher-123',
          guardianNotificationSettings: { enabled: true },
          assignments: []
        }
      ],
      stats: {
        totalStudents: 20,
        totalAssignments: 3,
        ungradedSubmissions: 5,
        averageGrade: 78.5
      }
    });
    
    await page.goto('/dashboard/teacher');
    
    // Verify existing data
    await expect(page.locator('[data-testid="stat-students"]')).toContainText('20');
    await expect(page.locator('[data-testid="classroom-card"]')).toHaveCount(1);
    
    // Import additional data
    await page.locator('[data-testid="import-data-btn"]').click();
    await expect(page).toHaveURL('/teacher/data-import');
    
    await page.locator('[data-testid="snapshot-import-option"]').click();
    
    // Mock import with existing data detection
    await mockApi.mockSnapshotValidation(true);
    await mockApi.mockSnapshotImport({
      stats: {
        classroomsCreated: 1, // One new classroom
        classroomsUpdated: 1, // One updated classroom
        assignmentsCreated: 5,
        submissionsCreated: 30
      }
    });
    await mockApi.mockSnapshotDiff(true); // Has existing data
    
    // Upload new snapshot
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Should show existing data warning
    await expect(page.locator('[data-testid="existing-data-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="change-summary"]')).toContainText('1 new classroom');
    
    // Confirm import
    await page.locator('[data-testid="confirm-import-btn"]').click();
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('complete');
    
    // Return to dashboard with updated data
    await mockApi.clearAllMocks();
    await mockApi.mockTeacherDashboard({
      classrooms: [
        // Existing classroom (updated)
        {
          id: 'existing-classroom',
          name: 'Updated CS 101',
          section: 'Section A',
          description: 'Updated course description',
          descriptionHeading: 'Course Overview',
          room: 'Lab A',
          enrollmentCode: 'old123',
          courseState: 'ACTIVE',
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/old',
          teacherGroupEmail: 'teachers@school.edu',
          courseGroupEmail: 'old@school.edu',
          studentCount: 25, // Updated
          assignmentCount: 6, // Updated
          activeSubmissions: 40, // Updated
          ungradedSubmissions: 8, // Updated
          calendarId: 'cal-old',
          ownerId: 'teacher-123',
          guardianNotificationSettings: { enabled: true },
          assignments: []
        },
        // New classroom
        {
          id: 'new-classroom',
          name: 'New CS 201',
          section: 'Section B',
          description: 'Advanced programming',
          descriptionHeading: 'Course Overview',
          room: 'Lab B',
          enrollmentCode: 'new456',
          courseState: 'ACTIVE',
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/new',
          teacherGroupEmail: 'teachers@school.edu',
          courseGroupEmail: 'new@school.edu',
          studentCount: 30,
          assignmentCount: 4,
          activeSubmissions: 35,
          ungradedSubmissions: 12,
          calendarId: 'cal-new',
          ownerId: 'teacher-123',
          guardianNotificationSettings: { enabled: true },
          assignments: []
        }
      ],
      stats: {
        totalStudents: 55, // Combined
        totalAssignments: 10, // Combined
        ungradedSubmissions: 20, // Combined
        averageGrade: 82.1
      }
    });
    
    await page.locator('[data-testid="go-to-dashboard-btn"]').click();
    
    // Verify updated dashboard
    await expect(page.locator('[data-testid="stat-students"]')).toContainText('55');
    await expect(page.locator('[data-testid="stat-assignments"]')).toContainText('10');
    await expect(page.locator('[data-testid="classroom-card"]')).toHaveCount(2);
    
    // Verify both classrooms are present
    await expect(page.locator('[data-testid="classroom-card"]'))
      .toContainText(['Updated CS 101', 'New CS 201']);
  });

  test('should handle error recovery throughout workflow', async ({ page }) => {
    await authHelper.loginAsTeacher();
    
    // Start with network error on dashboard
    await mockApi.mockApiError('teacher/dashboard', 500, 'Server temporarily unavailable');
    
    await page.goto('/dashboard/teacher');
    
    // Should show error
    await expect(page.locator('[data-testid="dashboard-error"]')).toBeVisible();
    
    // Fix the error and retry
    await mockApi.clearAllMocks();
    await mockApi.mockTeacherDashboard({
      classrooms: [],
      stats: {
        totalStudents: 0,
        totalAssignments: 0,
        ungradedSubmissions: 0
      },
      recentActivity: []
    });
    
    await page.locator('[data-testid="try-again-btn"]').click();
    
    // Should show empty dashboard
    await expect(page.locator('[data-testid="no-data-state"]')).toBeVisible();
    
    // Try to import data but encounter import error
    await page.locator('[data-testid="import-classroom-data-btn"]').click();
    await page.locator('[data-testid="snapshot-import-option"]').click();
    
    await mockApi.mockSnapshotValidation(true);
    await mockApi.mockApiError('snapshots/import', 422, 'Import validation failed');
    
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Try to import - should fail
    await page.locator('[data-testid="confirm-import-btn"]').click();
    
    // Should show error and return to preview
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    await expect(page.locator('[data-testid="import-error"]')).toBeVisible();
    
    // Fix import error and retry
    await mockApi.clearAllMocks();
    await mockApi.mockSnapshotImport();
    
    await page.locator('[data-testid="confirm-import-btn"]').click();
    
    // Should succeed
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('complete');
  });

  test('should handle authentication throughout workflow', async ({ page }) => {
    // Start without authentication
    await page.goto('/dashboard/teacher');
    
    // Should redirect to login or show login prompt
    // (This depends on your actual auth implementation)
    
    // Setup authentication mid-flow
    await authHelper.loginAsTeacher();
    await mockApi.mockTeacherDashboard();
    
    // Navigate to dashboard
    await page.goto('/dashboard/teacher');
    
    // Should now work
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    
    // Simulate auth expiration during import
    await page.locator('[data-testid="import-data-btn"]').click();
    await page.locator('[data-testid="snapshot-import-option"]').click();
    
    // Mock auth error on API call
    await mockApi.mockApiError('snapshots/validate', 401, 'Unauthorized');
    
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    // Should handle auth error gracefully
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
  });

  test('should maintain state during navigation', async ({ page }) => {
    await authHelper.loginAsTeacher();
    await mockApi.mockTeacherDashboard();
    await mockApi.mockClassroomStats('classroom-1');
    
    await page.goto('/dashboard/teacher');
    
    // Select a classroom
    await page.locator('[data-testid="classroom-card"]').first().click();
    
    // Navigate to import page
    await page.locator('[data-testid="import-data-btn"]').click();
    await expect(page).toHaveURL('/teacher/data-import');
    
    // Navigate back to dashboard
    await page.goBack();
    
    // Should maintain previous state (classroom selection, etc.)
    await expect(page.locator('[data-testid="selected-classroom"]')).toBeVisible();
  });

  test('should handle concurrent data changes', async ({ page }) => {
    await authHelper.loginAsTeacher();
    await mockApi.mockTeacherDashboard({
      stats: {
        totalStudents: 50,
        totalAssignments: 10,
        ungradedSubmissions: 15,
        averageGrade: 82.5
      }
    });
    
    await page.goto('/dashboard/teacher');
    
    // Check initial state
    await expect(page.locator('[data-testid="stat-pending"]')).toContainText('15');
    
    // Simulate data changes (e.g., new submissions) while user is on page
    await mockApi.clearAllMocks();
    await mockApi.mockTeacherDashboard({
      stats: {
        totalStudents: 50,
        totalAssignments: 10,
        ungradedSubmissions: 20, // Increased
        averageGrade: 82.5
      }
    });
    
    // Refresh to get updated data
    await page.locator('[data-testid="refresh-btn"]').click();
    
    // Should show updated data
    await expect(page.locator('[data-testid="stat-pending"]')).toContainText('20');
  });
});

test.describe('Cross-Browser Compatibility', () => {
  let mockApi: MockApiHandler;
  let authHelper: any;

  test.beforeEach(async ({ page, browserName }) => {
    mockApi = new MockApiHandler({ page });
    authHelper = createAuthHelper(page);
    await authHelper.loginAsTeacher();
    await mockApi.mockTeacherDashboard();
  });

  test('should work correctly across different browsers', async ({ page, browserName }) => {
    await page.goto('/dashboard/teacher');
    
    // Core functionality should work in all browsers
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-assignments"]')).toBeVisible();
    
    // Test file upload (browser-specific behavior)
    await page.locator('[data-testid="import-data-btn"]').click();
    await page.locator('[data-testid="snapshot-import-option"]').click();
    
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    console.log(`✓ Test passed in ${browserName}`);
  });
});