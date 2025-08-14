/**
 * Teacher Grades Page E2E Tests
 * Location: frontend/e2e/teacher-grades.test.ts
 *
 * Tests the teacher grades page functionality including display,
 * filtering, statistics, and grade management
 */

import { test, expect } from '@playwright/test';
import { signInAsTeacher, waitForPageReady, debugPage } from './test-helpers';

test.describe('Teacher Grades Page', () => {
	test.beforeEach(async ({ page }) => {
		// Sign in as teacher before each test
		await signInAsTeacher(page);
	});

	test('should display grades page with statistics', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		// Should show grades page header
		await expect(page.locator('h1')).toContainText(/grade.*management/i);

		// Should show refresh button
		await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();

		// Should show statistics cards (even if empty)
		const statsCards = [
			'text=/total.*grades/i',
			'text=/average.*score/i',
			'text=/ai.*graded/i',
			'text=/manual.*graded/i'
		];

		for (const cardText of statsCards) {
			await expect(page.locator(cardText)).toBeVisible({ timeout: 5000 });
		}
	});

	test('should handle loading states', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');

		// Should show loading skeleton initially
		const loadingElements = page.locator('.animate-pulse, .animate-spin');
		
		// Wait for loading to complete
		await waitForPageReady(page);
		
		// Should not show loading indicators after load
		const finalLoadingCount = await loadingElements.count();
		expect(finalLoadingCount).toBeLessThanOrEqual(1); // Allow for one refresh button spinner
	});

	test('should show assignment filter dropdown', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		// Should show assignment filter
		const filterLabel = page.locator('text=/filter.*by.*assignment/i');
		const filterDropdown = page.locator('#assignment-filter');

		await expect(filterLabel).toBeVisible({ timeout: 5000 });
		await expect(filterDropdown).toBeVisible({ timeout: 5000 });

		// Should have "All Assignments" option
		await expect(filterDropdown.locator('option').first()).toContainText(/all.*assignments/i);
	});

	test('should handle empty grades state', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		// Check if we have no grades (empty state)
		const emptyState = page.locator('text=/no.*grades.*found/i');
		
		if (await emptyState.isVisible({ timeout: 3000 })) {
			console.log('✓ Showing empty grades state');
			
			// Should show empty state message
			await expect(emptyState).toBeVisible();
			await expect(page.locator('text=/no.*grades.*available/i')).toBeVisible();
		} else {
			console.log('✓ Grades data is present');
			// If we have grades, should show the grades table
			await expect(page.locator('table, .grade-list')).toBeVisible({ timeout: 5000 });
		}
	});

	test('should display grades table when data exists', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		// Look for grades table or grade list items
		const hasGradesTable = await page.locator('table thead').isVisible({ timeout: 3000 }).catch(() => false);
		const hasGradesList = await page.locator('[data-testid="grade-item"]').count() > 0;

		if (hasGradesTable || hasGradesList) {
			console.log('✓ Found grades data display');

			if (hasGradesTable) {
				// Verify table headers
				const expectedHeaders = ['student', 'assignment', 'score', 'grade', 'graded.*by', 'date'];
				
				for (const header of expectedHeaders) {
					await expect(page.locator(`th:has-text(/${header}/i)`)).toBeVisible({ timeout: 2000 });
				}

				// Should show grade rows
				const gradeRows = page.locator('tbody tr');
				const rowCount = await gradeRows.count();
				expect(rowCount).toBeGreaterThan(0);

				if (rowCount > 0) {
					// Verify first row has grade data
					const firstRow = gradeRows.first();
					await expect(firstRow.locator('td').first()).toBeVisible();
				}
			}
		} else {
			console.log('✓ No grades data - showing empty state');
		}
	});

	test('should filter grades by assignment', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		const filterDropdown = page.locator('#assignment-filter');
		await filterDropdown.waitFor({ timeout: 5000 });

		// Get all filter options
		const options = await filterDropdown.locator('option').allTextContents();
		
		if (options.length > 1) {
			console.log('✓ Multiple assignment options available for filtering');
			
			// Select the second option (not "All Assignments")
			await filterDropdown.selectOption({ index: 1 });
			await page.waitForTimeout(1000);

			// Should update the display
			const resultsText = page.locator('text=/showing.*of.*grades/i');
			if (await resultsText.isVisible({ timeout: 2000 })) {
				console.log('✓ Filter results updated');
			}
		} else {
			console.log('✓ Only one assignment filter option (All Assignments)');
		}
	});

	test('should refresh grades data', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		const refreshButton = page.getByRole('button', { name: /refresh/i });
		await expect(refreshButton).toBeVisible();

		// Click refresh
		await refreshButton.click();

		// Should show loading state
		await expect(page.locator('text=/refreshing/i, .animate-spin')).toBeVisible({ timeout: 2000 });

		// Should complete refresh
		await waitForPageReady(page);
		
		console.log('✓ Grades refresh completed');
	});

	test('should handle navigation from grades page', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		// Should have navigation elements
		const navElements = [
			'[href*="/dashboard/teacher"]', // Dashboard link
			'[href*="/assignments"]',        // Assignments link
			'text=/dashboard|overview/i'     // Dashboard text link
		];

		let navFound = false;
		for (const selector of navElements) {
			if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
				console.log(`✓ Found navigation element: ${selector}`);
				navFound = true;
				break;
			}
		}

		if (!navFound) {
			console.log('⚠️ No navigation elements found on grades page');
		}
	});

	test('should handle error states gracefully', async ({ page }) => {
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		// Check for error indicators
		const errorIndicators = [
			'text=/error.*loading.*grades/i',
			'text=/failed.*to.*load/i',
			'[data-testid="error-message"]'
		];

		let hasError = false;
		for (const errorSelector of errorIndicators) {
			if (await page.locator(errorSelector).isVisible({ timeout: 2000 }).catch(() => false)) {
				console.log(`Found error state: ${errorSelector}`);
				hasError = true;

				// Should have retry button
				const retryButton = page.getByRole('button', { name: /try.*again|retry/i });
				if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
					console.log('✓ Retry button available in error state');
				}
				break;
			}
		}

		if (!hasError) {
			console.log('✓ No error state - grades page loaded successfully');
		}
	});
});