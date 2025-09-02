/**
 * Multi-User Access E2E Tests
 * Location: frontend/e2e/multi-user-access.test.ts
 *
 * Comprehensive tests for multi-tenant scenarios with different teachers and students
 * Tests teacher isolation, student cross-enrollment, and data access patterns
 */

import { test, expect } from '@playwright/test';
import {
  EXPECTED_TEACHER_DATA,
  signInAsSpecificTeacher,
  signInAsSpecificStudent,
  importTeacherSnapshot,
  verifyTeacherIsolation,
  verifyStudentCrossEnrollment,
  verifyTeacherAssignmentCounts,
  setupMultiUserTestData,
  cleanupMultiUserTestData
} from './test-helpers-multi-user';
import { waitForPageReady } from './test-helpers';

test.describe('Multi-User Access Control', () => {
  
  test.beforeAll('Setup multi-user test data', async ({ browser }) => {
    const page = await browser.newPage();
    await setupMultiUserTestData(page);
    await page.close();
  });

  test.afterAll('Cleanup multi-user test data', async ({ browser }) => {
    const page = await browser.newPage();
    await cleanupMultiUserTestData(page);
    await page.close();
  });

  test.describe('Teacher Data Isolation', () => {
    
    test('Teacher 1 sees only their classrooms and students', async ({ page }) => {
      await signInAsSpecificTeacher(page, 'teacher1');
      await verifyTeacherIsolation(page, 'teacher1');
      
      // Navigate to students page and verify student count
      await page.goto('/dashboard/teacher/students');
      await waitForPageReady(page);
      
      const studentRows = page.locator('[data-testid="student-row"]');
      // Should see 4 unique students across both classrooms
      await expect(studentRows).toHaveCount(EXPECTED_TEACHER_DATA.teacher1.totalStudents);
      
      // Verify specific students are visible
      await expect(page.locator(':has-text("Alex Smith")')).toBeVisible();
      await expect(page.locator(':has-text("Blake Johnson")')).toBeVisible();
      await expect(page.locator(':has-text("Casey Williams")')).toBeVisible();
      await expect(page.locator(':has-text("Dana Davis")')).toBeVisible();
      
      // Verify other teachers' exclusive students are NOT visible
      await expect(page.locator(':has-text("Finley Foster")')).not.toBeVisible();
      await expect(page.locator(':has-text("Harper Harris")')).not.toBeVisible();
    });

    test('Teacher 2 sees only their classrooms and students', async ({ page }) => {
      await signInAsSpecificTeacher(page, 'teacher2');
      await verifyTeacherIsolation(page, 'teacher2');
      
      // Navigate to assignments and verify assignment isolation
      await verifyTeacherAssignmentCounts(page, 'teacher2');
      
      // Verify specific Teacher 2 assignments are visible
      await expect(page.locator(':has-text("Responsive Web Portfolio")')).toBeVisible();
      await expect(page.locator(':has-text("SQL Fundamentals Quiz")')).toBeVisible();
      await expect(page.locator(':has-text("Database Design Project")')).toBeVisible();
      
      // Verify Teacher 1 assignments are NOT visible
      await expect(page.locator(':has-text("Karel Maze Navigation")')).not.toBeVisible();
      await expect(page.locator(':has-text("Programming Fundamentals Quiz")')).not.toBeVisible();
      
      // Verify Teacher 3 assignments are NOT visible
      await expect(page.locator(':has-text("Sorting Algorithms Quiz")')).not.toBeVisible();
      await expect(page.locator(':has-text("ML Algorithm Research Project")')).not.toBeVisible();
    });

    test('Teacher 3 sees only their advanced algorithm course', async ({ page }) => {
      await signInAsSpecificTeacher(page, 'teacher3');
      await verifyTeacherIsolation(page, 'teacher3');
      
      // Verify only the advanced algorithms classroom
      await page.goto('/dashboard/teacher');
      await waitForPageReady(page);
      
      await expect(page.locator(':has-text("CS 301: Advanced Algorithms")')).toBeVisible();
      await expect(page.locator('[data-testid="classroom-card"]')).toHaveCount(1);
      
      // Navigate to specific classroom
      await page.click(':has-text("CS 301: Advanced Algorithms")');
      await waitForPageReady(page);
      
      // Verify advanced assignments are present
      await expect(page.locator(':has-text("Sorting Algorithms Quiz")')).toBeVisible();
      await expect(page.locator(':has-text("Graph Algorithms Implementation")')).toBeVisible();
      await expect(page.locator(':has-text("Dynamic Programming Quiz")')).toBeVisible();
      await expect(page.locator(':has-text("ML Algorithm Research Project")')).toBeVisible();
    });
  });

  test.describe('Student Cross-Enrollment Access', () => {
    
    test('Student 1 sees classes from multiple teachers', async ({ page }) => {
      await signInAsSpecificStudent(page, 'student1');
      await verifyStudentCrossEnrollment(page, 'student1');
      
      // Navigate to assignments and verify cross-teacher access
      await page.goto('/dashboard/student/assignments');
      await waitForPageReady(page);
      
      // Should see assignments from both Teacher 1 (CS 101) and Teacher 2 (CS 201)
      await expect(page.locator(':has-text("Karel Maze Navigation")')).toBeVisible(); // Teacher 1
      await expect(page.locator(':has-text("Programming Fundamentals Quiz")')).toBeVisible(); // Teacher 1
      await expect(page.locator(':has-text("Responsive Web Portfolio")')).toBeVisible(); // Teacher 2
      
      // Should NOT see assignments from courses not enrolled in
      await expect(page.locator(':has-text("Data Structures Implementation")')).not.toBeVisible(); // Teacher 1, CS 102
      await expect(page.locator(':has-text("SQL Fundamentals Quiz")')).not.toBeVisible(); // Teacher 2, CS 202
      await expect(page.locator(':has-text("Sorting Algorithms Quiz")')).not.toBeVisible(); // Teacher 3
    });

    test('Student 2 sees multiple classes from same teacher', async ({ page }) => {
      await signInAsSpecificStudent(page, 'student2');
      await verifyStudentCrossEnrollment(page, 'student2');
      
      // Should see both CS 101 and CS 102 from Teacher 1
      await expect(page.locator(':has-text("CS 101: Introduction to Programming")')).toBeVisible();
      await expect(page.locator(':has-text("CS 102: Data Structures")')).toBeVisible();
      
      // Navigate to assignments
      await page.goto('/dashboard/student/assignments');
      await waitForPageReady(page);
      
      // Should see assignments from both Teacher 1 courses
      await expect(page.locator(':has-text("Karel Maze Navigation")')).toBeVisible(); // CS 101
      await expect(page.locator(':has-text("Array Processing Assignment")')).toBeVisible(); // CS 101
      await expect(page.locator(':has-text("Data Structures Implementation")')).toBeVisible(); // CS 102
      await expect(page.locator(':has-text("Algorithm Complexity Quiz")')).toBeVisible(); // CS 102
    });

    test('Student 5 sees classes from Teacher 2 and Teacher 3', async ({ page }) => {
      await signInAsSpecificStudent(page, 'student5');
      await verifyStudentCrossEnrollment(page, 'student5');
      
      // Should see CS 201 (Teacher 2) and CS 301 (Teacher 3)
      await expect(page.locator(':has-text("CS 201: Web Development")')).toBeVisible();
      await expect(page.locator(':has-text("CS 301: Advanced Algorithms")')).toBeVisible();
      
      // Navigate to grades and verify cross-teacher grading
      await page.goto('/dashboard/student/grades');
      await waitForPageReady(page);
      
      // Should see grades from both teachers
      const gradeEntries = page.locator('[data-testid="grade-entry"]');
      const gradeTexts = await gradeEntries.allTextContents();
      
      // Verify grades from Teacher 2 assignments
      const hasWebDevGrades = gradeTexts.some(text => 
        text.includes('Web Development') || text.includes('Responsive Web Portfolio')
      );
      expect(hasWebDevGrades).toBeTruthy();
      
      // Verify grades from Teacher 3 assignments
      const hasAlgorithmGrades = gradeTexts.some(text => 
        text.includes('Advanced Algorithms') || text.includes('Sorting') || text.includes('Graph')
      );
      expect(hasAlgorithmGrades).toBeTruthy();
    });

    test('Student 6 sees only single enrollment (Database Systems)', async ({ page }) => {
      await signInAsSpecificStudent(page, 'student6');
      await verifyStudentCrossEnrollment(page, 'student6');
      
      // Should only see CS 202 from Teacher 2
      await expect(page.locator(':has-text("CS 202: Database Systems")')).toBeVisible();
      await expect(page.locator('[data-testid="classroom-card"]')).toHaveCount(1);
      
      // Navigate to assignments
      await page.goto('/dashboard/student/assignments');
      await waitForPageReady(page);
      
      // Should only see database-related assignments
      await expect(page.locator(':has-text("SQL Fundamentals Quiz")')).toBeVisible();
      await expect(page.locator(':has-text("Advanced SQL Concepts Quiz")')).toBeVisible();
      await expect(page.locator(':has-text("Database Design Project")')).toBeVisible();
      
      // Should not see any other assignments
      await expect(page.locator(':has-text("Karel")')).not.toBeVisible();
      await expect(page.locator(':has-text("Web Portfolio")')).not.toBeVisible();
      await expect(page.locator(':has-text("Sorting")')).not.toBeVisible();
    });
  });

  test.describe('Assignment and Grading Isolation', () => {
    
    test('Teachers can only grade their own students submissions', async ({ page }) => {
      // Test Teacher 1 grading access
      await signInAsSpecificTeacher(page, 'teacher1');
      
      await page.goto('/dashboard/teacher/assignments');
      await waitForPageReady(page);
      
      // Click on a Teacher 1 assignment
      await page.click(':has-text("Karel Maze Navigation")');
      await waitForPageReady(page);
      
      // Navigate to submissions for grading
      await page.click('text=View Submissions');
      await waitForPageReady(page);
      
      // Should see submissions from students enrolled in Teacher 1's classes
      await expect(page.locator(':has-text("Alex Smith")')).toBeVisible();
      await expect(page.locator(':has-text("Blake Johnson")')).toBeVisible();
      await expect(page.locator(':has-text("Casey Williams")')).toBeVisible();
      
      // Should NOT see students from other teachers' exclusive classes
      await expect(page.locator(':has-text("Finley Foster")')).not.toBeVisible();
      await expect(page.locator(':has-text("Harper Harris")')).not.toBeVisible();
    });

    test('Students see grades only from their enrolled courses', async ({ page }) => {
      // Test Student 3 who is cross-enrolled in Teacher 1 and Teacher 3
      await signInAsSpecificStudent(page, 'student3');
      
      await page.goto('/dashboard/student/grades');
      await waitForPageReady(page);
      
      // Should see grades from CS 101 (Teacher 1) and CS 301 (Teacher 3)
      const gradeRows = page.locator('[data-testid="grade-row"]');
      const gradeTexts = await gradeRows.allTextContents();
      
      // Check for Teacher 1 course content
      const hasCS101Content = gradeTexts.some(text => 
        text.includes('CS 101') || text.includes('Karel') || text.includes('Programming Fundamentals')
      );
      expect(hasCS101Content).toBeTruthy();
      
      // Check for Teacher 3 course content
      const hasCS301Content = gradeTexts.some(text => 
        text.includes('CS 301') || text.includes('Sorting') || text.includes('Advanced Algorithms')
      );
      expect(hasCS301Content).toBeTruthy();
      
      // Should NOT see content from courses not enrolled in
      const hasUnauthorizedContent = gradeTexts.some(text => 
        text.includes('Web Development') || text.includes('Database') || text.includes('SQL')
      );
      expect(hasUnauthorizedContent).toBeFalsy();
    });
  });

  test.describe('Data Import and Processing', () => {
    
    test('Multiple teacher imports do not interfere with each other', async ({ page }) => {
      // Re-import Teacher 1 data
      await signInAsSpecificTeacher(page, 'teacher1');
      await importTeacherSnapshot(page, 'teacher1');
      
      // Verify Teacher 1 data is correct
      await verifyTeacherIsolation(page, 'teacher1');
      
      // Sign out and check Teacher 2 data is unaffected
      await page.goto('/auth/signout');
      await waitForPageReady(page);
      
      await signInAsSpecificTeacher(page, 'teacher2');
      await verifyTeacherIsolation(page, 'teacher2');
      
      // Verify Teacher 2 still has correct assignment counts
      await verifyTeacherAssignmentCounts(page, 'teacher2');
      
      // Verify specific Teacher 2 data is still intact
      await page.goto('/dashboard/teacher/students');
      await waitForPageReady(page);
      
      await expect(page.locator(':has-text("Elliott Evans")')).toBeVisible();
      await expect(page.locator(':has-text("Finley Foster")')).toBeVisible();
      await expect(page.locator(':has-text("Gray Garcia")')).toBeVisible();
      await expect(page.locator(':has-text("Harper Harris")')).toBeVisible();
    });

    test('Student access remains consistent after teacher data updates', async ({ page }) => {
      // Update Teacher 3 data
      await signInAsSpecificTeacher(page, 'teacher3');
      await importTeacherSnapshot(page, 'teacher3');
      
      // Sign out and verify Student 5 still has correct cross-enrollment
      await page.goto('/auth/signout');
      await waitForPageReady(page);
      
      await signInAsSpecificStudent(page, 'student5');
      await verifyStudentCrossEnrollment(page, 'student5');
      
      // Verify both Teacher 2 and Teacher 3 courses are still accessible
      await page.goto('/dashboard/student/assignments');
      await waitForPageReady(page);
      
      // Teacher 2 assignment (should be unaffected)
      await expect(page.locator(':has-text("Responsive Web Portfolio")')).toBeVisible();
      
      // Teacher 3 assignment (should be updated/refreshed)
      await expect(page.locator(':has-text("Sorting Algorithms Quiz")')).toBeVisible();
      await expect(page.locator(':has-text("Graph Algorithms Implementation")')).toBeVisible();
    });
  });

  test.describe('Navigation and UI Consistency', () => {
    
    test('Teacher navigation shows appropriate options for multi-classroom scenarios', async ({ page }) => {
      await signInAsSpecificTeacher(page, 'teacher1');
      
      // Verify teacher navigation includes expected items
      await expect(page.locator('nav a[href*="/dashboard/teacher"]')).toBeVisible();
      await expect(page.locator('nav a[href*="/assignments"]')).toBeVisible();
      await expect(page.locator('nav a[href*="/students"]')).toBeVisible();
      await expect(page.locator('nav a[href*="/grades"]')).toBeVisible();
      
      // Verify classroom selector shows both classrooms
      const classroomSelector = page.locator('[data-testid="classroom-selector"]');
      if (await classroomSelector.isVisible({ timeout: 5000 })) {
        await classroomSelector.click();
        await expect(page.locator(':has-text("CS 101")')).toBeVisible();
        await expect(page.locator(':has-text("CS 102")')).toBeVisible();
      }
    });

    test('Student navigation adapts to cross-enrollment scenarios', async ({ page }) => {
      await signInAsSpecificStudent(page, 'student1');
      
      // Verify student navigation
      await expect(page.locator('nav a[href*="/dashboard/student"]')).toBeVisible();
      await expect(page.locator('nav a[href*="/assignments"]')).toBeVisible();
      await expect(page.locator('nav a[href*="/grades"]')).toBeVisible();
      
      // Navigate to dashboard and verify course switching
      await page.goto('/dashboard/student');
      await waitForPageReady(page);
      
      // Should see both enrolled courses
      await expect(page.locator(':has-text("CS 101: Introduction to Programming")')).toBeVisible();
      await expect(page.locator(':has-text("CS 201: Web Development")')).toBeVisible();
      
      // Click on each course to verify navigation
      await page.click(':has-text("CS 101: Introduction to Programming")');
      await waitForPageReady(page);
      await expect(page.locator(':has-text("Karel")')).toBeVisible();
      
      await page.goBack();
      await waitForPageReady(page);
      
      await page.click(':has-text("CS 201: Web Development")');
      await waitForPageReady(page);
      await expect(page.locator(':has-text("Web")')).toBeVisible();
    });
  });

  test.describe('Performance and Data Integrity', () => {
    
    test('Large multi-user dataset loads efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      await signInAsSpecificTeacher(page, 'teacher1');
      await page.goto('/dashboard/teacher/assignments');
      await waitForPageReady(page);
      
      // Verify all assignments load within reasonable time
      await expect(page.locator('[data-testid="assignment-row"]')).toHaveCount(EXPECTED_TEACHER_DATA.teacher1.totalAssignments, { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard loaded in ${loadTime}ms`);
      
      // Should load in under 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('Concurrent user access maintains data consistency', async ({ browser }) => {
      // Create multiple browser contexts for concurrent access
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const context3 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      const page3 = await context3.newPage();
      
      try {
        // Sign in different teachers concurrently
        await Promise.all([
          signInAsSpecificTeacher(page1, 'teacher1'),
          signInAsSpecificTeacher(page2, 'teacher2'),
          signInAsSpecificTeacher(page3, 'teacher3')
        ]);
        
        // Navigate to dashboards concurrently
        await Promise.all([
          page1.goto('/dashboard/teacher'),
          page2.goto('/dashboard/teacher'),
          page3.goto('/dashboard/teacher')
        ]);
        
        // Wait for pages to load
        await Promise.all([
          waitForPageReady(page1),
          waitForPageReady(page2),
          waitForPageReady(page3)
        ]);
        
        // Verify each teacher sees only their data
        await Promise.all([
          verifyTeacherIsolation(page1, 'teacher1'),
          verifyTeacherIsolation(page2, 'teacher2'),
          verifyTeacherIsolation(page3, 'teacher3')
        ]);
        
        console.log('✓ Concurrent access test passed');
        
      } finally {
        await context1.close();
        await context2.close();
        await context3.close();
      }
    });
  });
});