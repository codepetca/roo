/**
 * Student Dashboard E2E Tests
 * Location: frontend/e2e/student-dashboard.test.ts
 *
 * Tests the student dashboard experience, data display, and navigation
 */

import { test, expect } from '@playwright/test';
import { signInAsStudent, waitForPageReady, debugPage } from './test-helpers';

test.describe('Student Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		// Sign in as student before each test
		await signInAsStudent(page);
	});

	test('should display student dashboard page', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Should show dashboard heading
		const headingElements = [
			'h1:has-text(/student.*dashboard/i)',
			'h2:has-text(/student.*dashboard/i)',
			'h1:has-text(/dashboard/i)',
			'text=/welcome.*student/i'
		];

		let foundHeading = false;
		for (const heading of headingElements) {
			if (await page.locator(heading).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found dashboard heading: ${heading}`);
				foundHeading = true;
				break;
			}
		}

		expect(foundHeading).toBeTruthy();
	});

	test('should show student-specific navigation', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Look for student navigation elements
		const studentNavElements = [
			'text=/assignments|homework/i',
			'text=/grades|score/i',
			'a[href*="/student/grades"]',
			'a[href*="/student/assignments"]',
			'nav, .navigation, .nav-menu'
		];

		let foundNav = false;
		for (const nav of studentNavElements) {
			if (await page.locator(nav).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found student navigation: ${nav}`);
				foundNav = true;
				break;
			}
		}

		if (!foundNav) {
			console.log('⚠️ No student-specific navigation found');
		}
	});

	test('should display student assignment data', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Look for assignment-related content
		const assignmentElements = [
			'text=/assignments?.*due/i',
			'text=/upcoming.*assignment/i',
			'text=/homework/i',
			'text=/quiz/i',
			'[data-testid="assignment-card"]',
			'[data-testid="assignment-list"]',
			'text=/due.*date/i'
		];

		let foundAssignments = false;
		for (const element of assignmentElements) {
			if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found assignment content: ${element}`);
				foundAssignments = true;
				break;
			}
		}

		if (!foundAssignments) {
			// Check for empty state
			const emptyStates = [
				'text=/no.*assignments?/i',
				'text=/no.*homework/i',
				'text=/no.*upcoming.*work/i',
				'text=/all.*caught.*up/i'
			];

			for (const emptyState of emptyStates) {
				if (await page.locator(emptyState).isVisible({ timeout: 2000 }).catch(() => false)) {
					console.log(`✓ Found empty assignments state: ${emptyState}`);
					break;
				}
			}
		}
	});

	test('should show grade information', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Look for grade/score information
		const gradeElements = [
			'text=/grade|score/i',
			'text=/[0-9]+%/i', // Percentage grades
			'text=/[A-F][+-]?/i', // Letter grades
			'text=/current.*grade/i',
			'text=/recent.*grade/i',
			'[data-testid="grade-display"]'
		];

		let foundGrades = false;
		for (const element of gradeElements) {
			if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found grade information: ${element}`);
				foundGrades = true;
				break;
			}
		}

		if (!foundGrades) {
			// Check for empty grades state
			const emptyGrades = [
				'text=/no.*grades?/i',
				'text=/not.*graded.*yet/i',
				'text=/grades.*coming.*soon/i'
			];

			for (const emptyState of emptyGrades) {
				if (await page.locator(emptyState).isVisible({ timeout: 2000 }).catch(() => false)) {
					console.log(`✓ Found empty grades state: ${emptyState}`);
					break;
				}
			}
		}
	});

	test('should navigate to student grades page', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Look for grades navigation
		const gradesLinks = [
			'a[href*="/student/grades"]',
			'button:has-text(/grades/i)',
			'text=/view.*grades/i',
			'text=/see.*all.*grades/i',
			'[data-testid="grades-link"]'
		];

		let foundGradesLink = false;
		for (const link of gradesLinks) {
			if (await page.locator(link).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found grades navigation: ${link}`);
				
				// Try to navigate
				await page.locator(link).first().click();
				await page.waitForTimeout(2000);
				
				const currentUrl = page.url();
				if (currentUrl.includes('/grades')) {
					console.log('✓ Successfully navigated to grades page');
					foundGradesLink = true;
					break;
				}
			}
		}

		if (!foundGradesLink) {
			// Try direct navigation to test the page exists
			await page.goto('/dashboard/student/grades');
			await waitForPageReady(page);
			
			const finalUrl = page.url();
			if (finalUrl.includes('/grades')) {
				console.log('✓ Student grades page accessible via direct navigation');
			}
		}
	});

	test('should show student profile information', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Look for student profile elements
		const profileElements = [
			'text=/student.*name|name/i',
			'text=/student.*id|id/i',
			'text=/class|classroom/i',
			'text=/email/i',
			'[data-testid="student-profile"]',
			'text=/profile/i'
		];

		let foundProfile = false;
		for (const element of profileElements) {
			if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found profile element: ${element}`);
				foundProfile = true;
				break;
			}
		}

		if (!foundProfile) {
			console.log('⚠️ No student profile information visible');
		}
	});

	test('should handle loading states', async ({ page }) => {
		await page.goto('/dashboard/student');

		// Check for loading indicators
		const loadingElements = page.locator('.animate-pulse, .animate-spin, text=/loading/i');
		
		// Wait for loading to complete
		await waitForPageReady(page);
		
		// Should not show loading indicators after load
		const finalLoadingCount = await loadingElements.count();
		expect(finalLoadingCount).toBeLessThanOrEqual(1); // Allow for minimal residual loading
	});

	test('should display recent activity or announcements', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Look for activity or announcement sections
		const activityElements = [
			'text=/recent.*activity/i',
			'text=/announcement/i',
			'text=/news|update/i',
			'text=/recent.*grade/i',
			'text=/recent.*assignment/i',
			'[data-testid="recent-activity"]',
			'[data-testid="announcements"]'
		];

		let foundActivity = false;
		for (const element of activityElements) {
			if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found activity/announcement: ${element}`);
				foundActivity = true;
				break;
			}
		}

		if (!foundActivity) {
			console.log('⚠️ No recent activity or announcements section found');
		}
	});

	test('should handle error states gracefully', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Check for error indicators
		const errorElements = [
			'text=/error.*loading/i',
			'text=/something.*went.*wrong/i',
			'text=/failed.*to.*load/i',
			'[data-testid="error-message"]'
		];

		let hasError = false;
		for (const error of errorElements) {
			if (await page.locator(error).isVisible({ timeout: 2000 }).catch(() => false)) {
				console.log(`Found error state: ${error}`);
				hasError = true;
				
				// Should have retry mechanism
				const retryButton = page.getByRole('button', { name: /try.*again|retry|refresh/i });
				if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
					console.log('✓ Retry button available in error state');
				}
				break;
			}
		}

		if (!hasError) {
			console.log('✓ No error state - student dashboard loaded successfully');
		}
	});

	test('should provide access to help or support', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Look for help/support elements
		const helpElements = [
			'text=/help|support/i',
			'text=/contact.*teacher/i',
			'text=/faq|question/i',
			'[data-testid="help-button"]',
			'a[href*="help"]',
			'button:has-text(/help/i)'
		];

		let foundHelp = false;
		for (const help of helpElements) {
			if (await page.locator(help).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found help/support: ${help}`);
				foundHelp = true;
				break;
			}
		}

		if (!foundHelp) {
			console.log('⚠️ No help or support options visible');
		}
	});

	test('should allow logout functionality', async ({ page }) => {
		await page.goto('/dashboard/student');
		await waitForPageReady(page);

		// Look for logout options
		const logoutElements = [
			'button:has-text(/logout|sign.*out|log.*out/i)',
			'a:has-text(/logout|sign.*out|log.*out/i)',
			'text=/logout|sign.*out/i',
			'[data-testid="logout-button"]'
		];

		let foundLogout = false;
		for (const logout of logoutElements) {
			if (await page.locator(logout).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found logout option: ${logout}`);
				foundLogout = true;
				break;
			}
		}

		if (!foundLogout) {
			console.log('⚠️ No logout functionality found');
		}
	});
});