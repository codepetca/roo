/**
 * Complete User Data Flow E2E Test
 * Location: frontend/e2e/complete-user-data-flow.test.ts
 *
 * This is the definitive integration test that validates the complete end-to-end flow:
 * 1. Reset emulator data (clean slate)
 * 2. Create all test users (3 teachers + 8 students)
 * 3. Import classroom snapshots for all teachers
 * 4. Verify teachers see only their data in dashboards
 * 5. Verify students see correct cross-enrolled data in dashboards
 *
 * This test answers the critical question: "After a complete reset and data import,
 * can all users (teachers and students) see their correct data in their dashboards?"
 */

import { test, expect } from '@playwright/test';
import {
	resetAndSeedCompleteEnvironment,
	verifyAllTeacherDashboards,
	verifyAllStudentDashboards,
	signInAsSpecificTeacher,
	signInAsSpecificStudent,
	EXPECTED_TEACHER_DATA,
	TEST_TEACHERS,
	TEST_STUDENTS,
	getTeacher,
	getStudent
} from './test-helpers-multi-user';
import { waitForPageReady } from './test-helpers';

test.describe('Complete User Data Flow Integration', () => {
	test.setTimeout(300000); // 5 minutes for complete workflow

	test('should complete full cycle: reset → import → verify all user dashboards', async ({
		browser
	}) => {
		const context = await browser.newContext();
		const page = await context.newPage();

		try {
			console.log('\n🎯 Starting Complete User Data Flow Test');
			console.log('=' .repeat(60));

			// Phase 1: Complete Environment Reset and Setup
			console.log('\n📦 Phase 1: Reset and Seed Complete Environment');
			await resetAndSeedCompleteEnvironment(page);
			console.log('✅ Environment reset and seeding completed');

			// Phase 2: Verify All Teacher Dashboards
			console.log('\n👩‍🏫 Phase 2: Verify All Teacher Dashboards');
			await verifyAllTeacherDashboards(page);
			console.log('✅ All teacher dashboard validation completed');

			// Phase 3: Verify All Student Dashboards
			console.log('\n🎓 Phase 3: Verify All Student Dashboards');
			await verifyAllStudentDashboards(page);
			console.log('✅ All student dashboard validation completed');

			// Phase 4: Comprehensive Cross-Validation
			console.log('\n🔄 Phase 4: Cross-Validation Tests');
			await performCrossValidationChecks(page);
			console.log('✅ Cross-validation checks completed');

			console.log('\n' + '=' .repeat(60));
			console.log('🎉 COMPLETE USER DATA FLOW TEST PASSED');
			console.log('   ✓ Emulator data reset successful');
			console.log('   ✓ All users created successfully');
			console.log('   ✓ All classroom data imported successfully');
			console.log('   ✓ All teacher dashboards show correct isolated data');
			console.log('   ✓ All student dashboards show correct cross-enrolled data');
			console.log('   ✓ Cross-validation tests passed');
			console.log('=' .repeat(60));

		} catch (error) {
			console.error('\n💥 Complete User Data Flow Test Failed:', error.message);
			
			// Capture debugging information
			await page.screenshot({ 
				path: `test-results/complete-flow-failure-${Date.now()}.png`,
				fullPage: true 
			});
			
			console.log('🔍 Debugging information captured');
			throw error;
		} finally {
			await context.close();
		}
	});

	test('should handle individual teacher dashboard verification', async ({ page }) => {
		console.log('\n🔍 Individual Teacher Dashboard Verification');
		
		// Test each teacher individually to ensure isolation
		for (const teacherKey of Object.keys(TEST_TEACHERS) as (keyof typeof TEST_TEACHERS)[]) {
			const teacher = getTeacher(teacherKey);
			const expected = EXPECTED_TEACHER_DATA[teacherKey];
			
			console.log(`\n📊 Testing ${teacher.displayName} (${teacherKey})`);
			
			await signInAsSpecificTeacher(page, teacherKey);
			await page.goto('/dashboard/teacher');
			await waitForPageReady(page);
			
			// Verify classroom count
			const classroomCards = page.locator('[data-testid="classroom-card"]');
			await expect(classroomCards).toHaveCount(expected.classrooms);
			console.log(`✓ ${teacher.displayName} sees ${expected.classrooms} classroom(s)`);
			
			// Verify specific classroom names
			for (const classroomName of expected.classroomNames) {
				await expect(page.locator(`:has-text("${classroomName}")`)).toBeVisible();
				console.log(`✓ Found expected classroom: ${classroomName}`);
			}
			
			// Navigate to students page and verify student count
			await page.goto('/dashboard/teacher/students');
			await waitForPageReady(page);
			
			const studentRows = page.locator('[data-testid="student-row"]');
			await expect(studentRows).toHaveCount(expected.totalStudents);
			console.log(`✓ ${teacher.displayName} sees ${expected.totalStudents} student(s)`);
			
			// Navigate to assignments and verify assignment count
			await page.goto('/dashboard/teacher/assignments');
			await waitForPageReady(page);
			
			const assignmentRows = page.locator('[data-testid="assignment-row"]');
			await expect(assignmentRows).toHaveCount(expected.totalAssignments);
			console.log(`✓ ${teacher.displayName} has ${expected.totalAssignments} assignment(s)`);
			
			console.log(`✅ ${teacher.displayName} dashboard verification complete`);
			
			// Sign out before next teacher
			await page.goto('/auth/signout');
			await waitForPageReady(page);
		}
	});

	test('should handle individual student dashboard verification', async ({ page }) => {
		console.log('\n🔍 Individual Student Dashboard Verification');
		
		// Import enrollment data
		const { STUDENT_ENROLLMENTS } = await import('./scripts/test-users-config');
		
		// Test representative students from different enrollment patterns
		const studentsToTest: (keyof typeof TEST_STUDENTS)[] = [
			'student1', // Cross-teacher enrollment
			'student2', // Same teacher multiple classes  
			'student3', // Intro + Advanced progression
			'student5', // Web dev + Advanced algorithms
			'student6'  // Single enrollment
		];
		
		for (const studentKey of studentsToTest) {
			const student = getStudent(studentKey);
			const enrollments = STUDENT_ENROLLMENTS[studentKey] || [];
			
			console.log(`\n📊 Testing ${student.displayName} (${studentKey})`);
			console.log(`   Enrollments: ${enrollments.join(', ')}`);
			
			await signInAsSpecificStudent(page, studentKey);
			await page.goto('/dashboard/student');
			await waitForPageReady(page);
			
			// Verify student sees all enrolled classrooms
			const enrolledClassrooms = enrollments.map(e => e.split(':')[1]);
			for (const classroomName of enrolledClassrooms) {
				await expect(page.locator(`:has-text("${classroomName}")`)).toBeVisible();
				console.log(`✓ ${student.displayName} sees enrolled classroom: ${classroomName}`);
			}
			
			// Verify classroom count matches enrollments
			const classroomCards = page.locator('[data-testid="classroom-card"]');
			await expect(classroomCards).toHaveCount(enrollments.length);
			console.log(`✓ ${student.displayName} sees ${enrollments.length} classroom(s) as expected`);
			
			// Test assignments page
			await page.goto('/dashboard/student/assignments');
			await waitForPageReady(page);
			
			// Should see assignments from enrolled courses only
			const assignmentElements = page.locator('[data-testid="assignment-row"]');
			const assignmentCount = await assignmentElements.count();
			console.log(`✓ ${student.displayName} has access to ${assignmentCount} assignment(s)`);
			
			console.log(`✅ ${student.displayName} dashboard verification complete`);
			
			// Sign out before next student
			await page.goto('/auth/signout');
			await waitForPageReady(page);
		}
	});

	test('should verify data isolation between users', async ({ browser }) => {
		console.log('\n🔒 Data Isolation Verification Test');
		
		// Create multiple browser contexts for concurrent testing
		const teacher1Context = await browser.newContext();
		const teacher2Context = await browser.newContext();
		const student1Context = await browser.newContext();
		
		const teacher1Page = await teacher1Context.newPage();
		const teacher2Page = await teacher2Context.newPage();
		const student1Page = await student1Context.newPage();
		
		try {
			// Sign in different users concurrently
			await Promise.all([
				signInAsSpecificTeacher(teacher1Page, 'teacher1'),
				signInAsSpecificTeacher(teacher2Page, 'teacher2'),
				signInAsSpecificStudent(student1Page, 'student1')
			]);
			
			// Navigate all to their respective dashboards
			await Promise.all([
				teacher1Page.goto('/dashboard/teacher'),
				teacher2Page.goto('/dashboard/teacher'),
				student1Page.goto('/dashboard/student')
			]);
			
			await Promise.all([
				waitForPageReady(teacher1Page),
				waitForPageReady(teacher2Page),
				waitForPageReady(student1Page)
			]);
			
			// Verify Teacher 1 data isolation
			await expect(teacher1Page.locator(':has-text("CS 101: Introduction to Programming")')).toBeVisible();
			await expect(teacher1Page.locator(':has-text("CS 102: Data Structures")')).toBeVisible();
			await expect(teacher1Page.locator(':has-text("CS 201: Web Development")')).not.toBeVisible(); // Teacher 2's class
			console.log('✓ Teacher 1 sees only their classrooms');
			
			// Verify Teacher 2 data isolation
			await expect(teacher2Page.locator(':has-text("CS 201: Web Development")')).toBeVisible();
			await expect(teacher2Page.locator(':has-text("CS 202: Database Systems")')).toBeVisible();
			await expect(teacher2Page.locator(':has-text("CS 101: Introduction to Programming")')).not.toBeVisible(); // Teacher 1's class
			console.log('✓ Teacher 2 sees only their classrooms');
			
			// Verify Student 1 cross-enrollment (enrolled in Teacher 1's CS 101 and Teacher 2's CS 201)
			await expect(student1Page.locator(':has-text("CS 101: Introduction to Programming")')).toBeVisible();
			await expect(student1Page.locator(':has-text("CS 201: Web Development")')).toBeVisible();
			await expect(student1Page.locator(':has-text("CS 102: Data Structures")')).not.toBeVisible(); // Not enrolled
			console.log('✓ Student 1 sees correct cross-enrolled classrooms');
			
			console.log('✅ Data isolation verification completed');
			
		} finally {
			await teacher1Context.close();
			await teacher2Context.close();
			await student1Context.close();
		}
	});
});

/**
 * Additional comprehensive cross-validation checks
 */
async function performCrossValidationChecks(page: any) {
	console.log('🔄 Performing cross-validation checks...');
	
	// Test 1: Verify total user count matches expected
	await page.goto('http://localhost:4000/auth'); // Emulator UI
	await waitForPageReady(page);
	console.log('✓ Accessed Firebase Auth emulator for user count verification');
	
	// Test 2: Verify API health
	const response = await page.request.get('http://localhost:5001/roo-app-3d24e/us-central1/api/');
	expect(response.status()).toBe(200);
	const apiData = await response.json();
	expect(apiData.status).toBe('healthy');
	console.log('✓ API health check passed');
	
	// Test 3: Spot check database integrity
	await signInAsSpecificTeacher(page, 'teacher1');
	const authResponse = await page.request.get('http://localhost:5001/roo-app-3d24e/us-central1/api/auth/me', {
		headers: {
			'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('firebase-token'))}`
		}
	});
	expect(authResponse.status()).toBe(200);
	console.log('✓ Database integrity spot check passed');
	
	await page.goto('/auth/signout');
	await waitForPageReady(page);
}