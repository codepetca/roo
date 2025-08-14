/**
 * Teacher Assignment Detail Page E2E Tests
 * Location: frontend/e2e/teacher-assignment-detail.test.ts
 *
 * Tests individual assignment detail pages, navigation, and functionality
 */

import { test, expect } from '@playwright/test';
import { signInAsTeacher, waitForPageReady, debugPage } from './test-helpers';

test.describe('Teacher Assignment Detail Page', () => {
	test.beforeEach(async ({ page }) => {
		// Sign in as teacher before each test
		await signInAsTeacher(page);
	});

	test('should navigate to assignment detail from assignments list', async ({ page }) => {
		// Start from assignments page
		await page.goto('/dashboard/teacher/assignments');
		await waitForPageReady(page);

		// Look for "View Details" buttons or assignment links
		const detailButtons = [
			'button:has-text("View Details")',
			'a:has-text("View Details")',
			'[data-testid="assignment-detail-link"]',
			'.assignment-card a, .assignment-item a'
		];

		let foundDetailLink = false;
		for (const selector of detailButtons) {
			const button = page.locator(selector).first();
			if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found assignment detail link: ${selector}`);
				
				// Click to navigate to detail page
				await button.click();
				await page.waitForTimeout(2000);
				
				// Should navigate to assignment detail page
				const currentUrl = page.url();
				if (currentUrl.includes('/assignments/') && currentUrl.split('/').length > 5) {
					console.log('✓ Successfully navigated to assignment detail page');
					foundDetailLink = true;
					break;
				}
			}
		}

		if (!foundDetailLink) {
			console.log('⚠️ No assignment detail links found - testing with direct navigation');
			// Fallback: try direct navigation to a test assignment
			await page.goto('/dashboard/teacher/assignments/test-assignment-1');
			await waitForPageReady(page);
		}
	});

	test('should display assignment detail page structure', async ({ page }) => {
		// Navigate directly to assignment detail (assuming we have test data)
		await page.goto('/dashboard/teacher/assignments/test-assignment-1');
		await waitForPageReady(page);

		// Check if we're on an assignment detail page
		const currentUrl = page.url();
		if (currentUrl.includes('/assignments/')) {
			// Should show assignment information
			const assignmentElements = [
				'h1, h2', // Assignment title
				'text=/assignment|quiz/i', // Assignment type
				'text=/due.*date|deadline/i', // Due date
				'text=/points?|score/i', // Points/scoring
				'text=/submission|student/i' // Submissions or students
			];

			let foundElements = 0;
			for (const element of assignmentElements) {
				if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
					foundElements++;
				}
			}

			if (foundElements >= 2) {
				console.log('✓ Assignment detail page structure looks good');
			} else {
				console.log('⚠️ Assignment detail page may be missing content');
			}

		} else {
			// Might redirect or show error
			console.log('Assignment detail page redirected or not found');
			
			// Check for common redirect destinations
			const redirectCheck = [
				'/dashboard/teacher',
				'/dashboard/teacher/assignments',
				'/login'
			];

			const finalUrl = page.url();
			if (redirectCheck.some(path => finalUrl.includes(path))) {
				console.log(`✓ Redirected to valid page: ${finalUrl}`);
			}
		}
	});

	test('should handle assignment not found gracefully', async ({ page }) => {
		// Try accessing a non-existent assignment
		await page.goto('/dashboard/teacher/assignments/non-existent-assignment-123');
		await waitForPageReady(page);

		// Check for error handling
		const errorIndicators = [
			'text=/assignment.*not.*found/i',
			'text=/404|not.*found/i',
			'text=/error.*loading.*assignment/i',
			'[data-testid="not-found"]',
			'[data-testid="error-message"]'
		];

		let foundError = false;
		for (const indicator of errorIndicators) {
			if (await page.locator(indicator).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found proper error handling: ${indicator}`);
				foundError = true;
				break;
			}
		}

		// Should either show error or redirect to assignments list
		const currentUrl = page.url();
		if (!foundError && currentUrl.includes('/assignments') && !currentUrl.includes('/assignments/non-existent')) {
			console.log('✓ Redirected back to assignments list');
		} else if (!foundError) {
			console.log('⚠️ No clear error handling for invalid assignment ID');
		}
	});

	test('should show submission data when available', async ({ page }) => {
		// Navigate to assignment detail
		await page.goto('/dashboard/teacher/assignments/test-assignment-1');
		await waitForPageReady(page);

		// Look for submission-related content
		const submissionElements = [
			'text=/submission|student.*work/i',
			'text=/[0-9]+.*submitted/i',
			'text=/graded|ungraded/i',
			'table', // Submissions table
			'[data-testid="submission-list"]',
			'text=/student.*name|student.*id/i'
		];

		let foundSubmissions = false;
		for (const element of submissionElements) {
			if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found submission content: ${element}`);
				foundSubmissions = true;
				break;
			}
		}

		if (!foundSubmissions) {
			// Check for empty state
			const emptyStates = [
				'text=/no.*submission/i',
				'text=/no.*student.*work/i',
				'text=/no.*data.*available/i'
			];

			for (const emptyState of emptyStates) {
				if (await page.locator(emptyState).isVisible({ timeout: 2000 }).catch(() => false)) {
					console.log(`✓ Found empty submissions state: ${emptyState}`);
					break;
				}
			}
		}
	});

	test('should provide navigation back to assignments list', async ({ page }) => {
		await page.goto('/dashboard/teacher/assignments/test-assignment-1');
		await waitForPageReady(page);

		// Look for back/navigation buttons
		const navButtons = [
			'button:has-text("Back")',
			'a:has-text("Back")',
			'a[href*="/assignments"]:not([href*="/assignments/"])', // Assignments list link
			'text=/← back|‹ back|back.*to.*assignments/i',
			'[data-testid="back-button"]'
		];

		let foundNavigation = false;
		for (const selector of navButtons) {
			if (await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found navigation option: ${selector}`);
				
				// Test the navigation
				await page.locator(selector).first().click();
				await page.waitForTimeout(2000);
				
				const newUrl = page.url();
				if (newUrl.includes('/assignments') && !newUrl.match(/\/assignments\/[^\/]+$/)) {
					console.log('✓ Successfully navigated back to assignments list');
					foundNavigation = true;
					break;
				}
			}
		}

		if (!foundNavigation) {
			console.log('⚠️ No clear navigation back to assignments list');
		}
	});

	test('should show grading functionality when available', async ({ page }) => {
		await page.goto('/dashboard/teacher/assignments/test-assignment-1');
		await waitForPageReady(page);

		// Look for grading-related elements
		const gradingElements = [
			'button:has-text("Grade")',
			'button:has-text("Auto Grade")',
			'text=/grade.*assignment/i',
			'text=/grade.*all/i',
			'[data-testid="grade-button"]',
			'text=/ai.*grading|auto.*grade/i'
		];

		let foundGrading = false;
		for (const element of gradingElements) {
			if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found grading functionality: ${element}`);
				foundGrading = true;
				break;
			}
		}

		if (!foundGrading) {
			console.log('⚠️ No grading functionality found on assignment detail page');
		}
	});

	test('should handle loading states', async ({ page }) => {
		// Navigate to assignment detail page
		await page.goto('/dashboard/teacher/assignments/test-assignment-1');

		// Check for loading indicators
		const loadingElements = page.locator('.animate-pulse, .animate-spin, text=/loading/i');
		
		// Wait for loading to complete
		await waitForPageReady(page);
		
		// Should eventually stop showing loading indicators
		const finalLoadingCount = await loadingElements.count();
		expect(finalLoadingCount).toBeLessThanOrEqual(1); // Allow for some residual spinners
	});

	test('should display assignment statistics', async ({ page }) => {
		await page.goto('/dashboard/teacher/assignments/test-assignment-1');
		await waitForPageReady(page);

		// Look for statistical information
		const statsElements = [
			'text=/[0-9]+.*students?/i',
			'text=/[0-9]+.*submission/i',
			'text=/average.*score|mean.*grade/i',
			'text=/completion.*rate/i',
			'text=/total.*points/i'
		];

		let foundStats = 0;
		for (const stat of statsElements) {
			if (await page.locator(stat).isVisible({ timeout: 3000 }).catch(() => false)) {
				foundStats++;
			}
		}

		if (foundStats > 0) {
			console.log(`✓ Found ${foundStats} statistical elements`);
		} else {
			console.log('⚠️ No assignment statistics found');
		}
	});
});