/**
 * API Mocking Utilities for E2E Tests
 * Location: frontend/e2e/fixtures/mock-api.ts
 * 
 * Provides utilities to intercept and mock API calls during E2E testing
 */

import { Page, Route } from '@playwright/test';
import { createMockClassroomSnapshot, createMockTeacher } from './test-data';
import type { TeacherDashboard } from '@shared/schemas/core';

export interface MockApiOptions {
  page: Page;
  baseUrl?: string;
}

export class MockApiHandler {
  private page: Page;
  private baseUrl: string;

  constructor(options: MockApiOptions) {
    this.page = options.page;
    this.baseUrl = options.baseUrl || 'http://localhost:5001';
  }

  /**
   * Mock successful teacher dashboard API response
   */
  async mockTeacherDashboard(customData?: Partial<TeacherDashboard>) {
    const mockDashboard: TeacherDashboard = {
      teacher: {
        id: 'teacher-123',
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher',
        classroomIds: ['classroom-1', 'classroom-2'],
        totalStudents: 50,
        totalClassrooms: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      classrooms: [
        {
          id: 'classroom-1',
          name: 'CS 101: Introduction to Programming',
          section: 'Fall 2024',
          description: 'Learn programming fundamentals',
          descriptionHeading: 'Course Overview',
          room: 'Computer Lab A',
          enrollmentCode: 'abc123',
          courseState: 'ACTIVE',
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/123',
          teacherGroupEmail: 'teachers-cs101@school.edu',
          courseGroupEmail: 'cs101-fall2024@school.edu',
          studentCount: 25,
          assignmentCount: 5,
          activeSubmissions: 45,
          ungradedSubmissions: 8,
          calendarId: 'calendar-123',
          ownerId: 'teacher-123',
          guardianNotificationSettings: { enabled: true },
          assignments: [
            {
              id: 'assignment-1',
              classroomId: 'classroom-1',
              title: 'Karel Basic Movement',
              description: 'Learn to move Karel forward and turn',
              type: 'assignment',
              status: 'published',
              maxScore: 100,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              creationTime: new Date().toISOString(),
              updateTime: new Date().toISOString(),
              workType: 'ASSIGNMENT',
              alternateLink: 'https://classroom.google.com/assignment/1',
              submissionCount: 20,
              gradedCount: 12,
              pendingCount: 8,
              courseId: 'classroom-1'
            }
          ]
        }
      ],
      recentActivity: [
        {
          type: 'submission',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          details: {
            studentName: 'Alice Johnson',
            classroomName: 'CS 101: Introduction to Programming',
            assignmentId: 'assignment-1'
          }
        },
        {
          type: 'grade',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          details: {
            classroomName: 'CS 101: Introduction to Programming',
            studentId: 'student-2',
            score: 85,
            maxScore: 100
          }
        }
      ],
      stats: {
        totalStudents: 50,
        totalAssignments: 10,
        ungradedSubmissions: 15,
        averageGrade: 82.5
      },
      ...customData
    };

    await this.page.route(`${this.baseUrl}/api/teacher/dashboard`, (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockDashboard
        })
      });
    });
  }

  /**
   * Mock successful snapshot validation
   */
  async mockSnapshotValidation(isValid = true, validationData?: any) {
    await this.page.route(`${this.baseUrl}/api/snapshots/validate`, (route: Route) => {
      if (isValid) {
        const snapshot = createMockClassroomSnapshot();
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              isValid: true,
              stats: snapshot.globalStats,
              metadata: snapshot.snapshotMetadata,
              preview: {
                classrooms: snapshot.classrooms.map(c => ({
                  id: c.id,
                  name: c.name,
                  studentCount: c.studentCount,
                  assignmentCount: c.assignmentCount,
                  ungradedSubmissions: c.ungradedSubmissions
                }))
              },
              ...validationData
            }
          })
        });
      } else {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid snapshot format',
            details: ['Schema validation failed: missing required field "teacher"']
          })
        });
      }
    });
  }

  /**
   * Mock successful snapshot import
   */
  async mockSnapshotImport(importData?: any) {
    const defaultImportResult = {
      snapshotId: `import_${Date.now()}`,
      stats: {
        classroomsCreated: 2,
        classroomsUpdated: 0,
        assignmentsCreated: 8,
        assignmentsUpdated: 0,
        submissionsCreated: 45,
        submissionsVersioned: 0,
        gradesPreserved: 0,
        gradesCreated: 12,
        enrollmentsCreated: 50,
        enrollmentsUpdated: 0,
        enrollmentsArchived: 0
      },
      processingTime: 2.5,
      summary: 'Successfully imported 2 classrooms with 8 assignments and 45 submissions'
    };

    await this.page.route(`${this.baseUrl}/api/snapshots/import`, (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...defaultImportResult, ...importData }
        })
      });
    });
  }

  /**
   * Mock snapshot diff generation
   */
  async mockSnapshotDiff(hasExistingData = false) {
    const diffData = hasExistingData ? {
      hasExistingData: true,
      isFirstImport: false,
      existing: { classroomCount: 2 },
      new: {
        classroomCount: 3,
        totalAssignments: 12,
        totalSubmissions: 60
      },
      changes: { newClassrooms: 1 }
    } : {
      hasExistingData: false,
      isFirstImport: true,
      new: {
        classroomCount: 2,
        totalAssignments: 8,
        totalSubmissions: 45
      }
    };

    await this.page.route(`${this.baseUrl}/api/snapshots/diff`, (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: diffData
        })
      });
    });
  }

  /**
   * Mock import history
   */
  async mockImportHistory() {
    const historyData = [
      {
        id: `import_${Date.now() - 86400000}`, // 1 day ago
        timestamp: new Date(Date.now() - 86400000),
        status: 'success',
        stats: {
          classroomsCreated: 2,
          assignmentsCreated: 8,
          submissionsCreated: 45
        }
      },
      {
        id: `import_${Date.now() - 2 * 86400000}`, // 2 days ago
        timestamp: new Date(Date.now() - 2 * 86400000),
        status: 'success',
        stats: {
          classroomsCreated: 1,
          assignmentsCreated: 4,
          submissionsCreated: 20
        }
      }
    ];

    await this.page.route(`${this.baseUrl}/api/snapshots/history`, (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: historyData
        })
      });
    });
  }

  /**
   * Mock authentication status
   */
  async mockAuthStatus(isAuthenticated = true, role = 'teacher') {
    // This would typically mock Firebase Auth, but for E2E we'll mock API responses
    if (isAuthenticated) {
      await this.page.addInitScript(`
        window.__mockAuth = {
          user: {
            uid: 'teacher-123',
            email: 'teacher@test.com',
            displayName: 'Test Teacher'
          },
          role: '${role}'
        };
      `);
    }
  }

  /**
   * Mock API error responses
   */
  async mockApiError(endpoint: string, status = 500, errorMessage = 'Server error') {
    await this.page.route(`${this.baseUrl}/api/${endpoint}`, (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: errorMessage,
          message: errorMessage
        })
      });
    });
  }

  /**
   * Mock network timeout/failure
   */
  async mockNetworkFailure(endpoint: string) {
    await this.page.route(`${this.baseUrl}/api/${endpoint}`, (route: Route) => {
      route.abort('failed');
    });
  }

  /**
   * Clear all route mocks
   */
  async clearAllMocks() {
    await this.page.unrouteAll();
  }

  /**
   * Mock classroom stats for a specific classroom
   */
  async mockClassroomStats(classroomId: string) {
    await this.page.route(`${this.baseUrl}/api/classrooms/${classroomId}/stats`, (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            classroom: {
              id: classroomId,
              name: 'CS 101: Introduction to Programming',
              section: 'Fall 2024',
              studentCount: 25,
              assignmentCount: 5,
              activeSubmissions: 45,
              ungradedSubmissions: 8
            },
            students: [
              {
                id: 'student-1',
                email: 'student1@test.com',
                name: 'Alice Johnson',
                classroomId
              }
            ],
            recentActivity: [],
            statistics: {
              studentCount: 25,
              assignmentCount: 5,
              activeSubmissions: 45,
              ungradedSubmissions: 8,
              averageGrade: 85.2,
              submissionRate: 90
            }
          }
        })
      });
    });
  }
}