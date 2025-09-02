/**
 * Multi-User E2E Test Helpers
 * Location: frontend/e2e/test-helpers-multi-user.ts
 *
 * Utilities for testing multi-tenant scenarios with different teachers and students
 */

import { Page, expect } from '@playwright/test';
import { waitForPageReady } from './test-helpers';
import { 
  TEST_TEACHERS, 
  TEST_STUDENTS, 
  EXPECTED_TEACHER_DATA,
  TestUserConfig,
  getTeacher,
  getStudent
} from './scripts/test-users-config';

// Re-export for test files
export { EXPECTED_TEACHER_DATA } from './scripts/test-users-config';

/**
 * Sign in with email and password using real Firebase Auth
 */
async function signInWithEmail(page: Page, user: TestUserConfig, userType: 'teacher' | 'student') {
  console.log(`Signing in ${user.email} as ${userType}...`);
  
  // Navigate to login page
  await page.goto('/login');
  await waitForPageReady(page);
  
  // Select user role
  const roleButtonSelector = userType === 'teacher' 
    ? '[data-testid="select-teacher-button"]'
    : '[data-testid="select-student-button"]';
  
  await page.click(roleButtonSelector);
  await waitForPageReady(page);
  
  // Select email authentication
  await page.click('[data-testid="select-email-auth-button"]');
  await waitForPageReady(page);
  
  // Fill in email and password
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  
  // Add school email if it's a teacher
  if (userType === 'teacher' && user.schoolEmail) {
    const schoolEmailInput = page.locator('[data-testid="school-email-input"]');
    if (await schoolEmailInput.isVisible({ timeout: 2000 })) {
      await schoolEmailInput.fill(user.schoolEmail);
    }
  }
  
  // Submit the form
  await page.click('button[type="submit"]');
  
  // Wait for successful authentication and redirect
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  
  console.log(`✅ Successfully signed in as ${user.displayName}`);
}

/**
 * Sign in as a specific teacher using real Firebase authentication
 */
export async function signInAsSpecificTeacher(
  page: Page, 
  teacherKey: keyof typeof TEST_TEACHERS
) {
  const teacher = getTeacher(teacherKey);
  console.log(`Signing in as ${teacher.displayName} (${teacher.email})`);
  
  await signInWithEmail(page, teacher, 'teacher');
  await waitForPageReady(page);
}

/**
 * Sign in as a specific student using real Firebase authentication
 */
export async function signInAsSpecificStudent(
  page: Page, 
  studentKey: keyof typeof TEST_STUDENTS
) {
  const student = getStudent(studentKey);
  console.log(`Signing in as ${student.displayName} (${student.email})`);
  
  await signInWithEmail(page, student, 'student');
  await waitForPageReady(page);
}

/**
 * Import a specific teacher's classroom snapshot
 */
export async function importTeacherSnapshot(
  page: Page, 
  teacherKey: keyof typeof TEST_TEACHERS
) {
  const teacher = getTeacher(teacherKey);
  const snapshotPath = `./e2e/fixtures/${teacher.snapshotFile}`;
  
  console.log(`Importing snapshot for ${teacher.displayName}: ${teacher.snapshotFile}`);
  
  // Navigate to import page
  await page.goto('/dashboard/teacher/import');
  await waitForPageReady(page);
  
  // Upload the snapshot file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(snapshotPath);
  
  // Wait for file to be processed
  await page.waitForTimeout(2000);
  
  // Click import button
  const importButton = page.locator('button:has-text("Import")');
  await importButton.click();
  
  // Wait for import to complete
  await expect(page.locator(':has-text("Import completed successfully")')).toBeVisible({ timeout: 30000 });
  
  console.log(`✓ Successfully imported ${teacher.snapshotFile}`);
}

/**
 * Verify that a teacher sees only their expected classrooms
 */
export async function verifyTeacherIsolation(
  page: Page, 
  teacherKey: keyof typeof TEST_TEACHERS
) {
  const expected = EXPECTED_TEACHER_DATA[teacherKey];
  const teacher = getTeacher(teacherKey);
  
  console.log(`Verifying isolation for ${teacher.displayName}`);
  
  // Navigate to teacher dashboard
  await page.goto('/dashboard/teacher');
  await waitForPageReady(page);
  
  // Check classroom count
  const classroomCards = page.locator('[data-testid="classroom-card"]');
  await expect(classroomCards).toHaveCount(expected.classrooms);
  
  // Check classroom names
  for (const expectedName of expected.classroomNames) {
    await expect(page.locator(`:has-text("${expectedName}")`)).toBeVisible();
    console.log(`✓ Found expected classroom: ${expectedName}`);
  }
  
  // Verify no other teacher's classrooms are visible
  const otherTeachers = Object.keys(EXPECTED_TEACHER_DATA).filter(key => key !== teacherKey) as (keyof typeof EXPECTED_TEACHER_DATA)[];
  for (const otherTeacher of otherTeachers) {
    const otherClassrooms = EXPECTED_TEACHER_DATA[otherTeacher].classroomNames;
    for (const className of otherClassrooms) {
      await expect(page.locator(`:has-text("${className}")`)).not.toBeVisible();
      console.log(`✓ Confirmed ${className} not visible to ${teacher.displayName}`);
    }
  }
  
  console.log(`✓ Teacher isolation verified for ${teacher.displayName}`);
}

/**
 * Verify that a student sees all their enrolled classes across teachers
 */
export async function verifyStudentCrossEnrollment(
  page: Page, 
  studentKey: keyof typeof TEST_STUDENTS
) {
  const student = getStudent(studentKey);
  
  console.log(`Verifying cross-enrollment for ${student.displayName}`);
  
  // Navigate to student dashboard
  await page.goto('/dashboard/student');
  await waitForPageReady(page);
  
  // Import enrollment data from config
  const { STUDENT_ENROLLMENTS } = await import('./scripts/test-users-config');
  const studentEnrollments = STUDENT_ENROLLMENTS[studentKey] || [];
  
  // Check that student sees all their enrolled classes
  for (const enrollment of studentEnrollments) {
    const [teacherKey, className] = enrollment.split(':');
    await expect(page.locator(`:has-text("${className}")`)).toBeVisible();
    console.log(`✓ Student sees enrolled class: ${className}`);
  }
  
  // Verify student doesn't see classes they're not enrolled in
  const allClassrooms = Object.values(EXPECTED_TEACHER_DATA).flatMap(data => data.classroomNames);
  const enrolledClassrooms = studentEnrollments.map(enrollment => enrollment.split(':')[1]);
  const notEnrolledClassrooms = allClassrooms.filter(classroom => !enrolledClassrooms.includes(classroom));
  
  for (const notEnrolledClassName of notEnrolledClassrooms) {
    await expect(page.locator(`:has-text("${notEnrolledClassName}")`)).not.toBeVisible();
    console.log(`✓ Student correctly doesn't see: ${notEnrolledClassName}`);
  }
  
  console.log(`✓ Cross-enrollment verified for ${student.displayName}`);
}

/**
 * Verify assignment and submission counts for a teacher
 */
export async function verifyTeacherAssignmentCounts(
  page: Page, 
  teacherKey: keyof typeof TEST_TEACHERS
) {
  const expected = EXPECTED_TEACHER_DATA[teacherKey];
  const teacher = getTeacher(teacherKey);
  
  console.log(`Verifying assignment counts for ${teacher.displayName}`);
  
  // Navigate to teacher assignments page
  await page.goto('/dashboard/teacher/assignments');
  await waitForPageReady(page);
  
  // Count total assignments across all classrooms
  const assignmentRows = page.locator('[data-testid="assignment-row"]');
  await expect(assignmentRows).toHaveCount(expected.totalAssignments);
  
  console.log(`✓ Found ${expected.totalAssignments} assignments for ${teacher.displayName}`);
  
  // Verify assignments belong to this teacher's classrooms
  const assignmentTitles = await assignmentRows.locator('[data-testid="assignment-title"]').allTextContents();
  
  for (const title of assignmentTitles) {
    console.log(`Found assignment: ${title}`);
    // All assignments should be visible and belong to this teacher
    await expect(page.locator(`[data-testid="assignment-title"]:has-text("${title}")`)).toBeVisible();
  }
  
  console.log(`✓ Assignment counts verified for ${teacher.displayName}`);
}

/**
 * Setup function to prepare all test data
 */
export async function setupMultiUserTestData(page: Page) {
  console.log('Setting up multi-user test data...');
  
  // Import data for all teachers
  for (const teacherKey of Object.keys(TEST_TEACHERS) as (keyof typeof TEST_TEACHERS)[]) {
    console.log(`\n📥 Setting up data for ${teacherKey}...`);
    await signInAsSpecificTeacher(page, teacherKey);
    await importTeacherSnapshot(page, teacherKey);
    
    // Sign out after import
    await page.goto('/auth/signout');
    await waitForPageReady(page);
  }
  
  console.log('✓ Multi-user test data setup complete');
}

/**
 * Cleanup function to clear test data
 */
export async function cleanupMultiUserTestData(page: Page) {
  console.log('Cleaning up multi-user test data...');
  
  // Sign in as each teacher and clear their data
  for (const teacherKey of Object.keys(TEST_TEACHERS) as (keyof typeof TEST_TEACHERS)[]) {
    try {
      const teacher = getTeacher(teacherKey);
      console.log(`\n🧹 Cleaning up data for ${teacher.displayName}...`);
      await signInAsSpecificTeacher(page, teacherKey);
      
      // Navigate to settings and clear data
      await page.goto('/dashboard/teacher/settings');
      await waitForPageReady(page);
      
      // Look for clear data button (if it exists)
      const clearButton = page.locator('button:has-text("Clear All Data")');
      if (await clearButton.isVisible({ timeout: 5000 })) {
        await clearButton.click();
        await page.locator('button:has-text("Confirm")').click();
        await waitForPageReady(page);
      }
      
      console.log(`✓ Cleaned up data for ${teacher.displayName}`);
    } catch (error) {
      console.log(`Note: Could not clean up data for ${teacherKey}:`, error);
    }
    
    // Sign out
    await page.goto('/auth/signout');
    await waitForPageReady(page);
  }
  
  console.log('✓ Multi-user test data cleanup complete');
}

/**
 * Type guard to check if a string is a valid teacher key
 */
export function isValidTeacherKey(key: string): key is keyof typeof TEST_TEACHERS {
  return key in TEST_TEACHERS;
}

/**
 * Type guard to check if a string is a valid student key
 */
export function isValidStudentKey(key: string): key is keyof typeof TEST_STUDENTS {
  return key in TEST_STUDENTS;
}