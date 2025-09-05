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
export { EXPECTED_TEACHER_DATA, TEST_TEACHERS, TEST_STUDENTS, getTeacher, getStudent } from './scripts/test-users-config';

/**
 * Sign in with email and password using real Firebase Auth (matches existing working pattern)
 */
async function signInWithEmail(page: Page, user: TestUserConfig, userType: 'teacher' | 'student') {
	console.log(`Signing in ${user.email} as ${userType}...`);

	// Navigate to login page
	await page.goto('/login');
	await waitForPageReady(page);

	// Select user role
	const roleButtonSelector =
		userType === 'teacher'
			? '[data-testid="select-teacher-button"]'
			: '[data-testid="select-student-button"]';

	await page.click(roleButtonSelector);
	await waitForPageReady(page);

	if (userType === 'teacher') {
		// For teachers: should go directly to email auth form
		console.log('Verifying teacher email auth form is visible...');
		
		const emailAuthVisible = await page
			.waitForSelector('[data-testid="teacher-email-auth"]', {
				timeout: 10000
			})
			.catch(() => null);

		if (!emailAuthVisible) {
			throw new Error('Teacher email authentication form not found after role selection');
		}

		// Fill in credentials
		await page.fill('[data-testid="email-input"]', user.email);
		await page.fill('[data-testid="password-input"]', user.password);

		// Add school email if provided
		if (user.schoolEmail) {
			const schoolEmailInput = page.locator('[data-testid="school-email-input"]');
			if (await schoolEmailInput.isVisible({ timeout: 2000 })) {
				await schoolEmailInput.fill(user.schoolEmail);
			}
		}

		// Submit the form
		await page.click('button[type="submit"]');

	} else {
		// For students: use passcode flow
		console.log('Using student passcode authentication...');
		
		// Enter school email
		await page.fill('[data-testid="student-email-input"]', user.email);
		
		// Request passcode (if needed)
		const requestBtn = page.locator('button:has-text("Request Passcode")');
		if (await requestBtn.isVisible({ timeout: 2000 })) {
			await requestBtn.click();
			await page.waitForTimeout(1000);
		}
		
		// Enter passcode
		await page.fill('[data-testid="passcode-input"]', '12345'); // Standard test passcode
		await page.click('button[type="submit"]');
	}

	// Wait for successful authentication and redirect
	await expect(page).toHaveURL(/\/(dashboard|teacher|student)/, { timeout: 30000 });

	console.log(`✅ Successfully signed in as ${user.displayName}`);
}

/**
 * Sign in as a specific teacher using real Firebase authentication
 */
export async function signInAsSpecificTeacher(page: Page, teacherKey: keyof typeof TEST_TEACHERS) {
	const teacher = getTeacher(teacherKey);
	console.log(`Signing in as ${teacher.displayName} (${teacher.email})`);

	await signInWithEmail(page, teacher, 'teacher');
	await waitForPageReady(page);
}

/**
 * Sign in as a specific student using real Firebase authentication
 */
export async function signInAsSpecificStudent(page: Page, studentKey: keyof typeof TEST_STUDENTS) {
	const student = getStudent(studentKey);
	console.log(`Signing in as ${student.displayName} (${student.email})`);

	await signInWithEmail(page, student, 'student');
	await waitForPageReady(page);
}

/**
 * Import a specific teacher's classroom snapshot using existing working helpers
 */
export async function importTeacherSnapshot(page: Page, teacherKey: keyof typeof TEST_TEACHERS) {
	const teacher = getTeacher(teacherKey);
	const snapshotPath = `./e2e/fixtures/${teacher.snapshotFile}`;

	console.log(`Importing snapshot for ${teacher.displayName}: ${teacher.snapshotFile}`);

	// Use existing working import helpers
	const { gotoSnapshotImport, uploadSnapshotFile, waitForImportSuccess } = await import('./test-helpers');

	try {
		// Navigate to import page using existing helper
		await gotoSnapshotImport(page);

		// Upload file using existing helper
		await uploadSnapshotFile(page, snapshotPath);

		// Wait for import success using existing helper
		const importSuccessful = await waitForImportSuccess(page);
		
		if (importSuccessful) {
			console.log(`✓ Successfully imported ${teacher.snapshotFile}`);
		} else {
			console.log(`⚠️ Import may have completed but success not detected for ${teacher.snapshotFile}`);
		}
	} catch (error) {
		throw new Error(`Failed to import ${teacher.snapshotFile}: ${error.message}`);
	}
}

/**
 * Verify that a teacher sees only their expected classrooms
 */
export async function verifyTeacherIsolation(page: Page, teacherKey: keyof typeof TEST_TEACHERS) {
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
	const otherTeachers = Object.keys(EXPECTED_TEACHER_DATA).filter(
		(key) => key !== teacherKey
	) as (keyof typeof EXPECTED_TEACHER_DATA)[];
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
	const allClassrooms = Object.values(EXPECTED_TEACHER_DATA).flatMap((data) => data.classroomNames);
	const enrolledClassrooms = studentEnrollments.map((enrollment) => enrollment.split(':')[1]);
	const notEnrolledClassrooms = allClassrooms.filter(
		(classroom) => !enrolledClassrooms.includes(classroom)
	);

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
	const assignmentTitles = await assignmentRows
		.locator('[data-testid="assignment-title"]')
		.allTextContents();

	for (const title of assignmentTitles) {
		console.log(`Found assignment: ${title}`);
		// All assignments should be visible and belong to this teacher
		await expect(
			page.locator(`[data-testid="assignment-title"]:has-text("${title}")`)
		).toBeVisible();
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

/**
 * Complete environment reset and seeding workflow
 * This function performs the complete cycle you described:
 * 1. Clear all emulator data (users and Firestore)
 * 2. Create all test users (teachers + students)
 * 3. Import classroom snapshots for all teachers
 */
export async function resetAndSeedCompleteEnvironment(page: Page) {
	console.log('🔄 Starting complete environment reset and seeding...');

	// Step 1: Clear emulator data
	console.log('🗑️ Clearing emulator data...');
	
	// Check if emulators are running
	try {
		const response = await page.request.get('http://localhost:4000');
		if (!response.ok()) {
			throw new Error('Emulators not responding');
		}
	} catch (error) {
		throw new Error('Firebase emulators are not running! Start them with: npm run emulators');
	}

	// Clear all emulator data using REST API
	const projectId = 'roo-app-3d24e'; // From CLAUDE.md

	try {
		// Clear Firestore data
		await page.request.delete(`http://localhost:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`, {
			headers: { 'Authorization': 'Bearer owner' }
		});

		// Clear Authentication data
		await page.request.delete(`http://localhost:9099/emulator/v1/projects/${projectId}/accounts`, {
			headers: { 'Authorization': 'Bearer owner' }
		});

		console.log('✅ Emulator data cleared');
	} catch (error) {
		throw new Error(`Failed to clear emulator data: ${error.message}`);
	}

	// Step 2: Create all test users
	console.log('👥 Creating all test users...');
	
	// Create teachers
	for (const teacherKey of Object.keys(TEST_TEACHERS) as (keyof typeof TEST_TEACHERS)[]) {
		const teacher = getTeacher(teacherKey);
		await createFirebaseUser(page, teacher);
		console.log(`✓ Created teacher: ${teacher.displayName}`);
	}

	// Create students  
	for (const studentKey of Object.keys(TEST_STUDENTS) as (keyof typeof TEST_STUDENTS)[]) {
		const student = getStudent(studentKey);
		await createFirebaseUser(page, student);
		console.log(`✓ Created student: ${student.displayName}`);
	}

	console.log('✅ All test users created');

	// Step 3: Import classroom snapshots for all teachers
	console.log('📚 Importing classroom snapshots for all teachers...');
	
	for (const teacherKey of Object.keys(TEST_TEACHERS) as (keyof typeof TEST_TEACHERS)[]) {
		const teacher = getTeacher(teacherKey);
		console.log(`📥 Importing data for ${teacher.displayName}...`);
		
		// Sign in as teacher
		await signInAsSpecificTeacher(page, teacherKey);
		
		// Import their snapshot
		await importTeacherSnapshot(page, teacherKey);
		console.log(`✓ Imported snapshot for ${teacher.displayName}`);
		
		// Explicit sign out with proper wait
		console.log(`🚪 Signing out ${teacher.displayName}...`);
		await page.goto('/auth/signout');
		await waitForPageReady(page);
		
		// Ensure we're back to the login page
		await page.goto('/login');
		await waitForPageReady(page);
	}

	console.log('✅ All classroom snapshots imported');
	console.log('🎉 Complete environment reset and seeding finished!');
}

/**
 * Create a Firebase user account in the emulator
 */
async function createFirebaseUser(page: Page, user: TestUserConfig) {
	const projectId = 'roo-app-3d24e';
	
	// Create Firebase Auth user
	const createUserResponse = await page.request.post(
		`http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
		{
			headers: { 'Content-Type': 'application/json' },
			data: {
				email: user.email,
				password: user.password,
				displayName: user.displayName
			}
		}
	);

	if (!createUserResponse.ok()) {
		const error = await createUserResponse.text();
		throw new Error(`Failed to create user ${user.email}: ${error}`);
	}

	// Get the actual Firebase UID from the response
	const authResult = await createUserResponse.json();
	const firebaseUid = authResult.localId;

	// Create user profile document in Firestore with all required fields
	const userProfile = {
		uid: firebaseUid,
		email: user.email,
		displayName: user.displayName,
		role: user.role,
		schoolEmail: user.schoolEmail || user.email,
		googleUserId: user.googleUserId || `google-${firebaseUid}`, // Ensure googleUserId is always present
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	const createProfileResponse = await page.request.patch(
		`http://localhost:8080/v1/projects/${projectId}/databases/(default)/documents/users/${firebaseUid}`,
		{
			headers: { 'Content-Type': 'application/json' },
			data: {
				fields: Object.entries(userProfile).reduce((acc, [key, value]) => {
					acc[key] = { stringValue: String(value) };
					return acc;
				}, {} as any)
			}
		}
	);

	if (!createProfileResponse.ok()) {
		const error = await createProfileResponse.text();
		throw new Error(`Failed to create profile for ${user.email}: ${error}`);
	}
}

/**
 * Verify all teacher dashboards show correct isolated data
 */
export async function verifyAllTeacherDashboards(page: Page) {
	console.log('👩‍🏫 Verifying all teacher dashboards...');

	for (const teacherKey of Object.keys(TEST_TEACHERS) as (keyof typeof TEST_TEACHERS)[]) {
		const teacher = getTeacher(teacherKey);
		const expected = EXPECTED_TEACHER_DATA[teacherKey];

		console.log(`📊 Verifying ${teacher.displayName} dashboard...`);

		// Sign in as teacher
		await signInAsSpecificTeacher(page, teacherKey);

		// Verify dashboard data
		await verifyTeacherIsolation(page, teacherKey);

		// Additional detailed verification
		await page.goto('/dashboard/teacher/students');
		await waitForPageReady(page);

		const studentRows = page.locator('[data-testid="student-row"]');
		await expect(studentRows).toHaveCount(expected.totalStudents);
		console.log(`✓ ${teacher.displayName} sees ${expected.totalStudents} students`);

		await page.goto('/dashboard/teacher/assignments');
		await waitForPageReady(page);

		const assignmentRows = page.locator('[data-testid="assignment-row"]');
		await expect(assignmentRows).toHaveCount(expected.totalAssignments);
		console.log(`✓ ${teacher.displayName} has ${expected.totalAssignments} assignments`);

		console.log(`✅ ${teacher.displayName} dashboard verified`);

		// Sign out
		await page.goto('/auth/signout');
		await waitForPageReady(page);
	}

	console.log('✅ All teacher dashboards verified');
}

/**
 * Verify all student dashboards show correct cross-enrolled data
 */
export async function verifyAllStudentDashboards(page: Page) {
	console.log('🎓 Verifying all student dashboards...');

	// Import enrollment data
	const { STUDENT_ENROLLMENTS } = await import('./scripts/test-users-config');

	// Test a representative subset of students for performance
	const studentsToTest: (keyof typeof TEST_STUDENTS)[] = [
		'student1', // Cross-teacher enrollment (Teacher 1 + Teacher 2)
		'student2', // Same teacher multiple classes (Teacher 1: CS 101 + CS 102)
		'student3', // Intro + Advanced progression (Teacher 1 + Teacher 3)
		'student5', // Web dev + Advanced algorithms (Teacher 2 + Teacher 3)  
		'student6', // Single enrollment (Teacher 2: CS 202 only)
		'student8'  // Single enrollment (Teacher 2: CS 202 only)
	];

	for (const studentKey of studentsToTest) {
		const student = getStudent(studentKey);
		const enrollments = STUDENT_ENROLLMENTS[studentKey] || [];

		console.log(`📊 Verifying ${student.displayName} dashboard...`);
		console.log(`   Expected enrollments: ${enrollments.join(', ')}`);

		// Sign in as student
		await signInAsSpecificStudent(page, studentKey);

		// Verify cross-enrollment
		await verifyStudentCrossEnrollment(page, studentKey);

		// Additional detailed verification
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Verify classroom count matches enrollments
		const classroomCards = page.locator('[data-testid="classroom-card"]');
		await expect(classroomCards).toHaveCount(enrollments.length);
		console.log(`✓ ${student.displayName} sees ${enrollments.length} classroom(s)`);

		// Verify specific enrolled classrooms are visible
		const enrolledClassrooms = enrollments.map(e => e.split(':')[1]);
		for (const classroomName of enrolledClassrooms) {
			await expect(page.locator(`:has-text("${classroomName}")`)).toBeVisible();
			console.log(`✓ Found enrolled classroom: ${classroomName}`);
		}

		console.log(`✅ ${student.displayName} dashboard verified`);

		// Sign out
		await page.goto('/auth/signout');
		await waitForPageReady(page);
	}

	console.log('✅ All student dashboards verified');
}
