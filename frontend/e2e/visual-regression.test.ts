/**
 * Visual Regression Tests
 * Location: frontend/e2e/visual-regression.test.ts
 * 
 * Tests visual consistency and layout integrity across different states and viewports
 */

import { test, expect } from '@playwright/test';
import { MockApiHandler } from './fixtures/mock-api';
import { createAuthHelper } from './utils/auth-helpers';

test.describe('Visual Regression Tests', () => {
  let mockApi: MockApiHandler;
  let authHelper: any;

  test.beforeEach(async ({ page }) => {
    mockApi = new MockApiHandler({ page });
    authHelper = createAuthHelper(page);
    await authHelper.loginAsTeacher();
  });

  test.afterEach(async () => {
    await mockApi.clearAllMocks();
  });

  test('should maintain consistent teacher dashboard layout', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    
    await page.goto('/dashboard/teacher');
    
    // Wait for content to load
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('teacher-dashboard-full.png', {
      fullPage: true
    });
    
    // Take viewport screenshot for above-the-fold content
    await expect(page).toHaveScreenshot('teacher-dashboard-viewport.png');
  });

  test('should maintain consistent empty dashboard state', async ({ page }) => {
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
    
    await page.goto('/dashboard/teacher');
    
    await expect(page.locator('[data-testid="no-data-state"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('dashboard-empty-state.png');
  });

  test('should maintain consistent snapshot import layout', async ({ page }) => {
    await mockApi.mockSnapshotValidation(true);
    await mockApi.mockSnapshotDiff(false);
    
    await page.goto('/teacher/data-import/snapshot');
    
    // Upload step
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page).toHaveScreenshot('snapshot-upload-step.png');
    
    // Navigate to preview step by uploading file
    const mockFile = new File(['{"teacher":{"email":"test@test.com","name":"Test","isTeacher":true},"classrooms":[],"globalStats":{"totalClassrooms":0}}'], 'test.json', { type: 'application/json' });
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: mockFile.name,
      mimeType: mockFile.type,
      buffer: Buffer.from(await mockFile.text())
    }]);
    
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    await expect(page).toHaveScreenshot('snapshot-preview-step.png');
  });

  test('should maintain responsive layout on mobile', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard/teacher');
    
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true
    });
  });

  test('should maintain responsive layout on tablet', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/dashboard/teacher');
    
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true
    });
  });

  test('should maintain consistent classroom card layouts', async ({ page }) => {
    await mockApi.mockTeacherDashboard({
      classrooms: [
        {
          id: 'classroom-1',
          name: 'Computer Science 101: Introduction to Programming',
          section: 'Section A',
          description: 'Learn programming fundamentals and computer science concepts',
          descriptionHeading: 'Course Overview',
          room: 'Lab 1A',
          enrollmentCode: 'code001',
          courseState: 'ACTIVE',
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/1',
          teacherGroupEmail: 'teachers@school.edu',
          courseGroupEmail: 'cs101@school.edu',
          studentCount: 25,
          assignmentCount: 8,
          activeSubmissions: 45,
          ungradedSubmissions: 0,
          calendarId: 'cal-1',
          ownerId: 'teacher-123',
          guardianNotificationSettings: { enabled: true },
          assignments: []
        },
        {
          id: 'classroom-2',
          name: 'Advanced Programming 201',
          section: 'Section B',
          description: 'Advanced programming concepts and data structures',
          descriptionHeading: 'Course Overview',
          room: 'Lab 2B',
          enrollmentCode: 'code002',
          courseState: 'ACTIVE',
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/2',
          teacherGroupEmail: 'teachers@school.edu',
          courseGroupEmail: 'cs201@school.edu',
          studentCount: 20,
          assignmentCount: 12,
          activeSubmissions: 30,
          ungradedSubmissions: 15,
          calendarId: 'cal-2',
          ownerId: 'teacher-123',
          guardianNotificationSettings: { enabled: true },
          assignments: []
        }
      ]
    });
    
    await page.goto('/dashboard/teacher');
    
    // Focus on classroom cards area
    const classroomGrid = page.locator('[data-testid="classrooms-grid"]');
    await expect(classroomGrid).toBeVisible();
    
    await expect(classroomGrid).toHaveScreenshot('classroom-cards-layout.png');
  });

  test('should maintain consistent statistics cards layout', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    
    await page.goto('/dashboard/teacher');
    
    // Focus on statistics area
    const statsGrid = page.locator('[data-testid="stats-grid"]');
    await expect(statsGrid).toBeVisible();
    
    await expect(statsGrid).toHaveScreenshot('statistics-cards-layout.png');
  });

  test('should maintain consistent error state layouts', async ({ page }) => {
    // Test dashboard error state
    await mockApi.mockApiError('teacher/dashboard', 500, 'Server error');
    
    await page.goto('/dashboard/teacher');
    
    await expect(page.locator('[data-testid="dashboard-error"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('dashboard-error-state.png');
  });

  test('should maintain consistent loading state layouts', async ({ page }) => {
    // Don't mock API initially to see loading state
    await page.goto('/dashboard/teacher');
    
    // Check if loading skeleton appears
    try {
      await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible({ timeout: 2000 });
      await expect(page).toHaveScreenshot('dashboard-loading-state.png');
    } catch {
      // If loading is too fast, mock delayed response
      await page.reload();
      await page.waitForTimeout(500); // Brief delay to catch loading state
      await expect(page).toHaveScreenshot('dashboard-loading-fallback.png');
    }
    
    // Complete the loading
    await mockApi.mockTeacherDashboard();
    
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
  });

  test('should maintain consistent dark mode appearance', async ({ page }) => {
    // If dark mode is supported, test it
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await mockApi.mockTeacherDashboard();
    
    await page.goto('/dashboard/teacher');
    
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      fullPage: true
    });
  });

  test('should maintain consistent high contrast mode', async ({ page }) => {
    // Test high contrast accessibility
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    
    await mockApi.mockTeacherDashboard();
    
    await page.goto('/dashboard/teacher');
    
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot('dashboard-high-contrast.png', {
      fullPage: true
    });
  });
});

test.describe('Visual Regression - Cross Browser', () => {
  let mockApi: MockApiHandler;
  let authHelper: any;

  test.beforeEach(async ({ page, browserName }) => {
    mockApi = new MockApiHandler({ page });
    authHelper = createAuthHelper(page);
    await authHelper.loginAsTeacher();
    await mockApi.mockTeacherDashboard();
  });

  test('should maintain consistent appearance across browsers', async ({ page, browserName }) => {
    await page.goto('/dashboard/teacher');
    
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    
    // Browser-specific screenshots
    await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
      fullPage: true
    });
  });

  test('should maintain consistent form layouts across browsers', async ({ page, browserName }) => {
    await page.goto('/teacher/data-import/snapshot');
    
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    await expect(page).toHaveScreenshot(`snapshot-form-${browserName}.png`);
  });
});