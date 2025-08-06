/**
 * E2E Tests for Teacher Dashboard
 * Location: frontend/e2e/teacher-dashboard.test.ts
 * 
 * Tests the teacher dashboard functionality with normalized data from new schema system
 */

import { test, expect } from '@playwright/test';
import { MockApiHandler } from './fixtures/mock-api';
import { createAuthHelper } from './utils/auth-helpers';

test.describe('Teacher Dashboard', () => {
  let mockApi: MockApiHandler;
  let authHelper: any;

  test.beforeEach(async ({ page }) => {
    mockApi = new MockApiHandler({ page });
    authHelper = createAuthHelper(page);
    
    // Setup authentication as teacher
    await authHelper.loginAsTeacher();
  });

  test.afterEach(async () => {
    await mockApi.clearAllMocks();
  });

  test('should display dashboard with data', async ({ page }) => {
    // Mock successful dashboard data
    await mockApi.mockTeacherDashboard();
    
    await page.goto('/dashboard/teacher');
    
    // Check page title and description
    await expect(page.locator('h1')).toContainText('Teacher Dashboard');
    await expect(page.locator('[data-testid="page-description"]'))
      .toContainText('Manage assignments, review submissions');
    
    // Check statistics cards
    await expect(page.locator('[data-testid="stat-assignments"]')).toContainText('10');
    await expect(page.locator('[data-testid="stat-students"]')).toContainText('50');
    await expect(page.locator('[data-testid="stat-pending"]')).toContainText('15');
    await expect(page.locator('[data-testid="stat-average"]')).toContainText('82.5%');
    
    // Check classrooms grid
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="classroom-card"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="classroom-card"]').first())
      .toContainText('CS 101: Introduction to Programming');
    
    // Check classroom card details
    const firstClassroom = page.locator('[data-testid="classroom-card"]').first();
    await expect(firstClassroom.locator('[data-testid="student-count"]')).toContainText('25');
    await expect(firstClassroom.locator('[data-testid="assignment-count"]')).toContainText('5');
    await expect(firstClassroom.locator('[data-testid="submission-count"]')).toContainText('45');
    
    // Check pending submissions badge
    await expect(firstClassroom.locator('[data-testid="pending-badge"]'))
      .toContainText('8 pending');
    
    // Check recent activity section
    await expect(page.locator('[data-testid="recent-activity-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-item"]').first()).toBeVisible();
    
    // Check activity items
    const firstActivity = page.locator('[data-testid="activity-item"]').first();
    await expect(firstActivity).toContainText('New submission from Alice Johnson');
    
    // Check action buttons
    await expect(page.locator('[data-testid="import-data-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="refresh-btn"]')).toBeVisible();
  });

  test('should handle empty dashboard state', async ({ page }) => {
    // Mock empty dashboard
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
    
    // Should show empty state
    await expect(page.locator('[data-testid="no-data-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-data-state"]'))
      .toContainText('No Data Available');
    await expect(page.locator('[data-testid="no-data-state"]'))
      .toContainText('Import your classroom data to get started');
    
    // Should show import button
    await expect(page.locator('[data-testid="import-classroom-data-btn"]')).toBeVisible();
    
    // Statistics should show zeros
    await expect(page.locator('[data-testid="stat-assignments"]')).toContainText('0');
    await expect(page.locator('[data-testid="stat-students"]')).toContainText('0');
    await expect(page.locator('[data-testid="stat-pending"]')).toContainText('0');
    await expect(page.locator('[data-testid="stat-average"]')).toContainText('N/A');
  });

  test('should handle dashboard loading state', async ({ page }) => {
    // Don't mock the API yet - let it hang to test loading
    
    await page.goto('/dashboard/teacher');
    
    // Should show loading skeletons
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
    
    // Now mock the API to complete loading
    await mockApi.mockTeacherDashboard();
    
    // Loading should disappear and content should appear
    await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
  });

  test('should handle dashboard errors', async ({ page }) => {
    // Mock API error
    await mockApi.mockApiError('teacher/dashboard', 500, 'Failed to load dashboard data');
    
    await page.goto('/dashboard/teacher');
    
    // Should show error state
    await expect(page.locator('[data-testid="dashboard-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-error"]'))
      .toContainText('Error loading dashboard');
    await expect(page.locator('[data-testid="dashboard-error"]'))
      .toContainText('Failed to load dashboard data');
    
    // Should have try again button
    await expect(page.locator('[data-testid="try-again-btn"]')).toBeVisible();
    
    // Try again button should retry
    await mockApi.clearAllMocks();
    await mockApi.mockTeacherDashboard();
    
    await page.locator('[data-testid="try-again-btn"]').click();
    
    // Should load successfully
    await expect(page.locator('[data-testid="dashboard-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="classrooms-section"]')).toBeVisible();
  });

  test('should navigate to classroom details', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    await mockApi.mockClassroomStats('classroom-1');
    
    await page.goto('/dashboard/teacher');
    
    // Click on first classroom card
    await page.locator('[data-testid="classroom-card"]').first().click();
    
    // Should navigate to classroom detail view (or trigger selection)
    // For now, this might just select the classroom
    await expect(page.locator('[data-testid="selected-classroom"]')).toBeVisible();
  });

  test('should refresh dashboard data', async ({ page }) => {
    await mockApi.mockTeacherDashboard({
      stats: {
        totalStudents: 50,
        totalAssignments: 10,
        ungradedSubmissions: 15,
        averageGrade: 82.5
      }
    });
    
    await page.goto('/dashboard/teacher');
    
    // Check initial data
    await expect(page.locator('[data-testid="stat-students"]')).toContainText('50');
    
    // Setup mock for updated data
    await mockApi.clearAllMocks();
    await mockApi.mockTeacherDashboard({
      stats: {
        totalStudents: 55, // Updated number
        totalAssignments: 12, // Updated number
        ungradedSubmissions: 8, // Updated number
        averageGrade: 85.2
      }
    });
    
    // Click refresh button
    await page.locator('[data-testid="refresh-btn"]').click();
    
    // Should show loading briefly
    await expect(page.locator('[data-testid="refresh-btn"]')).toHaveAttribute('loading', 'true');
    
    // Should update with new data
    await expect(page.locator('[data-testid="stat-students"]')).toContainText('55');
    await expect(page.locator('[data-testid="stat-assignments"]')).toContainText('12');
    await expect(page.locator('[data-testid="stat-pending"]')).toContainText('8');
  });

  test('should navigate to data import', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    
    await page.goto('/dashboard/teacher');
    
    // Click import data button
    await page.locator('[data-testid="import-data-btn"]').click();
    
    // Should navigate to import page
    await expect(page).toHaveURL('/teacher/data-import');
  });

  test('should display classroom status indicators correctly', async ({ page }) => {
    await mockApi.mockTeacherDashboard({
      classrooms: [
        {
          id: 'classroom-1',
          name: 'CS 101',
          section: 'Section A',
          description: 'Programming fundamentals',
          descriptionHeading: 'Course Overview',
          room: 'Lab A',
          enrollmentCode: 'abc123',
          courseState: 'ACTIVE',
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/1',
          teacherGroupEmail: 'teachers@school.edu',
          courseGroupEmail: 'cs101@school.edu',
          studentCount: 25,
          assignmentCount: 5,
          activeSubmissions: 45,
          ungradedSubmissions: 0, // No pending
          calendarId: 'cal-1',
          ownerId: 'teacher-123',
          guardianNotificationSettings: { enabled: true },
          assignments: []
        },
        {
          id: 'classroom-2',
          name: 'CS 201',
          section: 'Section B',
          description: 'Advanced programming',
          descriptionHeading: 'Course Overview',
          room: 'Lab B',
          enrollmentCode: 'def456',
          courseState: 'ARCHIVED', // Archived classroom
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/2',
          teacherGroupEmail: 'teachers@school.edu',
          courseGroupEmail: 'cs201@school.edu',
          studentCount: 20,
          assignmentCount: 8,
          activeSubmissions: 30,
          ungradedSubmissions: 12, // Has pending
          calendarId: 'cal-2',
          ownerId: 'teacher-123',
          guardianNotificationSettings: { enabled: true },
          assignments: []
        }
      ]
    });
    
    await page.goto('/dashboard/teacher');
    
    // First classroom should show "Up to date" badge
    const firstClassroom = page.locator('[data-testid="classroom-card"]').first();
    await expect(firstClassroom.locator('[data-testid="status-badge"]'))
      .toContainText('Up to date');
    await expect(firstClassroom.locator('[data-testid="status-badge"]'))
      .toHaveClass(/bg-green-100/);
    
    // Second classroom should show pending badge
    const secondClassroom = page.locator('[data-testid="classroom-card"]').nth(1);
    await expect(secondClassroom.locator('[data-testid="status-badge"]'))
      .toContainText('12 pending');
    await expect(secondClassroom.locator('[data-testid="status-badge"]'))
      .toHaveClass(/bg-orange-100/);
    
    // Archived classroom should show archived badge
    await expect(secondClassroom.locator('[data-testid="archived-badge"]'))
      .toContainText('Archived');
  });

  test('should handle responsive layout', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/dashboard/teacher');
    
    // Statistics should be in 4-column grid on desktop
    const statsGrid = page.locator('[data-testid="stats-grid"]');
    await expect(statsGrid).toHaveClass(/md:grid-cols-4/);
    
    // Classrooms should be in 3-column grid on desktop
    const classroomGrid = page.locator('[data-testid="classrooms-grid"]');
    await expect(classroomGrid).toHaveClass(/xl:grid-cols-3/);
    
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 600 });
    await page.reload();
    
    // Should still be readable and functional
    await expect(page.locator('[data-testid="stat-assignments"]')).toBeVisible();
    await expect(page.locator('[data-testid="classroom-card"]').first()).toBeVisible();
  });

  test('should display recent activity with different event types', async ({ page }) => {
    await mockApi.mockTeacherDashboard({
      recentActivity: [
        {
          type: 'submission',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          details: {
            studentName: 'Alice Johnson',
            classroomName: 'CS 101',
            assignmentId: 'assignment-1'
          }
        },
        {
          type: 'grade',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          details: {
            classroomName: 'CS 101',
            studentId: 'student-2',
            score: 95,
            maxScore: 100
          }
        },
        {
          type: 'submission',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          details: {
            studentName: 'Bob Smith',
            classroomName: 'CS 201',
            assignmentId: 'assignment-2'
          }
        }
      ]
    });
    
    await page.goto('/dashboard/teacher');
    
    // Should show all activity items
    await expect(page.locator('[data-testid="activity-item"]')).toHaveCount(3);
    
    // First item should be submission with correct icon
    const firstActivity = page.locator('[data-testid="activity-item"]').first();
    await expect(firstActivity.locator('[data-testid="submission-icon"]')).toBeVisible();
    await expect(firstActivity).toContainText('New submission from Alice Johnson');
    await expect(firstActivity).toContainText('CS 101');
    
    // Second item should be grade with correct icon
    const secondActivity = page.locator('[data-testid="activity-item"]').nth(1);
    await expect(secondActivity.locator('[data-testid="grade-icon"]')).toBeVisible();
    await expect(secondActivity).toContainText('Assignment graded: 95/100');
    await expect(secondActivity).toContainText('CS 101');
    
    // Should show timestamps
    await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible();
  });

  test('should handle student management section', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    
    await page.goto('/dashboard/teacher');
    
    // Student management section should be visible
    await expect(page.locator('[data-testid="student-management-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="student-management-section"]'))
      .toContainText('Student Management');
    await expect(page.locator('[data-testid="student-management-section"]'))
      .toContainText('Help students with login issues');
    
    // Should contain student reset manager component
    await expect(page.locator('[data-testid="student-reset-manager"]')).toBeVisible();
  });
});

test.describe('Teacher Dashboard - Statistics Interactions', () => {
  let mockApi: MockApiHandler;
  let authHelper: any;

  test.beforeEach(async ({ page }) => {
    mockApi = new MockApiHandler({ page });
    authHelper = createAuthHelper(page);
    await authHelper.loginAsTeacher();
  });

  test('should handle stat card interactions', async ({ page }) => {
    await mockApi.mockTeacherDashboard();
    
    await page.goto('/dashboard/teacher');
    
    // Statistics cards should be clickable (if implemented)
    const assignmentsCard = page.locator('[data-testid="stat-assignments"]').locator('..');
    
    if (await assignmentsCard.getAttribute('role') === 'button') {
      await assignmentsCard.click();
      // Should trigger some action (filter, navigate, etc.)
    }
    
    // Pending submissions card should be prominent
    const pendingCard = page.locator('[data-testid="stat-pending"]').locator('..');
    await expect(pendingCard).toHaveClass(/text-orange-600/);
  });

  test('should display accurate statistics', async ({ page }) => {
    const mockStats = {
      totalStudents: 75,
      totalAssignments: 18,
      ungradedSubmissions: 23,
      averageGrade: 87.3
    };

    await mockApi.mockTeacherDashboard({
      stats: mockStats
    });
    
    await page.goto('/dashboard/teacher');
    
    // Verify all statistics are displayed correctly
    await expect(page.locator('[data-testid="stat-students"]')).toContainText('75');
    await expect(page.locator('[data-testid="stat-assignments"]')).toContainText('18');
    await expect(page.locator('[data-testid="stat-pending"]')).toContainText('23');
    await expect(page.locator('[data-testid="stat-average"]')).toContainText('87.3%');
  });

  test('should handle missing average grade', async ({ page }) => {
    await mockApi.mockTeacherDashboard({
      stats: {
        totalStudents: 25,
        totalAssignments: 5,
        ungradedSubmissions: 0,
        averageGrade: undefined // No grades yet
      }
    });
    
    await page.goto('/dashboard/teacher');
    
    // Should show N/A for average when no grades exist
    await expect(page.locator('[data-testid="stat-average"]')).toContainText('N/A');
  });
});