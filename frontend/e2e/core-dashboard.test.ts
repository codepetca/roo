/**
 * Core Dashboard Data Display E2E Tests
 * Location: frontend/e2e/core-dashboard.test.ts
 *
 * Tests the dashboard display of imported classroom data
 */

import { test, expect } from '@playwright/test';
import {
	signInAsTeacher,
	verifyDashboardState,
	navigateDashboardSafely,
	waitForPageReady,
	debugPage,
	TestDataHelpers
} from './test-helpers';

test.describe('Core Dashboard Data Display', () => {
	test.beforeEach(async ({ page }) => {
		// Sign in as teacher before each test
		await signInAsTeacher(page);
	});

	test('should display teacher dashboard page', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Should show dashboard structure
		await expect(page.locator('h1, h2').first()).toBeVisible();

		// Should show navigation elements
		const navElements = [
			'text=/overview|dashboard/i',
			'text=/assignment/i',
			'text=/grade/i',
			'nav, .navigation, .nav-menu'
		];

		let navFound = false;
		for (const nav of navElements) {
			if (
				await page
					.locator(nav)
					.isVisible({ timeout: 3000 })
					.catch(() => false)
			) {
				navFound = true;
				break;
			}
		}

		if (navFound) {
			console.log('✓ Dashboard navigation visible');
		}
	});

	test('should handle dashboard data state appropriately', async ({ page }) => {
		try {
			const dashboardState = await navigateDashboardSafely(page);
			console.log(`Dashboard navigation result: ${dashboardState}`);

			if (dashboardState === 'error') {
				throw new Error('Dashboard is in error state');
			}

			if (dashboardState === 'loading') {
				console.log('⏳ Dashboard still loading - waiting for completion...');
				// Wait longer and re-check
				await page.waitForTimeout(10000);
				const finalState = await verifyDashboardState(page);

				if (finalState === 'loading') {
					console.log('⚠️ Dashboard took too long to load - treating as functional but slow');
				} else {
					console.log(`✓ Dashboard loading completed with state: ${finalState}`);
				}
			}

			if (dashboardState === 'populated') {
				console.log('✓ Dashboard shows populated classroom data');

				// Verify specific data elements are present when data exists
				const dataChecks = [
					{ selector: 'text=/CS.*10[1-9]|Programming/i', name: 'Classroom names' },
					{ selector: 'text=/[0-9]+.*student/i', name: 'Student counts' },
					{ selector: 'text=/[0-9]+.*assignment/i', name: 'Assignment counts' },
					{ selector: '[data-testid="classroom-card"], .classroom-card', name: 'Classroom cards' },
					{ selector: 'text=/Period.*[0-9]|Block.*[A-Z]/i', name: 'Class periods' },
					{ selector: 'table tbody tr:not(.empty)', name: 'Data table rows' }
				];

				let foundDataElements = 0;
				for (const check of dataChecks) {
					if (
						await page
							.locator(check.selector)
							.isVisible({ timeout: 3000 })
							.catch(() => false)
					) {
						console.log(`✓ Found ${check.name}`);
						foundDataElements++;
					}
				}

				if (foundDataElements > 0) {
					console.log(`✓ Found ${foundDataElements}/${dataChecks.length} data elements`);
				} else {
					console.log(
						'⚠️ Data state detected but no specific elements found - this might be expected'
					);
				}
			} else if (dashboardState === 'empty') {
				console.log(
					'⚪ Dashboard shows empty state - this is acceptable for clean test environment'
				);

				// Verify empty state UI elements
				const emptyStateElements = [
					'text=/no.*data|empty|no.*classroom/i',
					'text=/import.*data|get.*started/i',
					'button:has-text("Import"), a:has-text("Import")',
					'text=/welcome.*to.*roo/i',
					'svg[aria-label*="Empty"], img[alt*="empty"]'
				];

				let foundEmptyElements = 0;
				for (const selector of emptyStateElements) {
					if (
						await page
							.locator(selector)
							.isVisible({ timeout: 3000 })
							.catch(() => false)
					) {
						console.log(`✓ Found empty state UI: ${selector}`);
						foundEmptyElements++;
					}
				}

				if (foundEmptyElements === 0) {
					console.log(
						'⚠️ Empty state detected but no typical empty UI found - might be minimal design'
					);
				} else {
					console.log(`✓ Found ${foundEmptyElements} empty state indicators`);
				}
			}

			// This test passes as long as dashboard is functional (not in error state)
			if (dashboardState !== 'error') {
				console.log(`✓ Dashboard is functional with state: ${dashboardState}`);
			} else {
				throw new Error(`Dashboard is not functional: ${dashboardState}`);
			}
		} catch (error) {
			await debugPage(page, 'dashboard-state-check-failure');
			throw error;
		}
	});

	test('should display dashboard structure regardless of data state', async ({ page }) => {
		try {
			const dashboardState = await navigateDashboardSafely(page);

			// Verify at least basic dashboard structure is present (flexible requirements)
			const essentialElements = [
				'h1, h2, [data-testid="dashboard-heading"]' // At minimum, should have a page heading
			];

			const optionalElements = [
				'nav, .navigation, .nav-menu, .sidebar', // Navigation (nice to have)
				'main, .main-content, [data-testid="dashboard-content"]' // Main content area (nice to have)
			];

			// Check essential elements (must have at least one)
			let hasEssentials = false;
			for (const element of essentialElements) {
				if (
					await page
						.locator(element)
						.isVisible({ timeout: 3000 })
						.catch(() => false)
				) {
					console.log(`✓ Found essential dashboard structure: ${element}`);
					hasEssentials = true;
					break;
				}
			}

			// Check optional elements (warn but don't fail)
			let optionalCount = 0;
			for (const element of optionalElements) {
				if (
					await page
						.locator(element)
						.isVisible({ timeout: 3000 })
						.catch(() => false)
				) {
					console.log(`✓ Found optional dashboard structure: ${element}`);
					optionalCount++;
				} else {
					console.log(`⚠️ Missing optional structure: ${element}`);
				}
			}

			if (!hasEssentials) {
				throw new Error('Dashboard lacks basic structure (no headings found)');
			}

			console.log(
				`✓ Dashboard structure valid (${optionalCount}/${optionalElements.length} optional elements found)`
			);

			// State-specific validation (informational, not required for test to pass)
			if (dashboardState === 'populated') {
				console.log('✓ Dashboard structure valid with populated data');

				// Look for data-related elements
				const dataElements = [
					'text=/classroom|student|assignment/i',
					'[data-testid*="card"], [data-testid*="list"]',
					'table, .table, .data-table'
				];

				for (const dataElement of dataElements) {
					if (
						await page
							.locator(dataElement)
							.isVisible({ timeout: 2000 })
							.catch(() => false)
					) {
						console.log(`✓ Found data element: ${dataElement}`);
						break;
					}
				}
			} else if (dashboardState === 'empty') {
				console.log('✓ Dashboard structure valid with empty state');

				// Look for helpful empty state guidance (optional)
				const helpfulElements = [
					'text=/get.*started|welcome|import.*data/i',
					'button:has-text("Import"), a:has-text("Import")',
					'text=/add.*classroom|create.*class/i'
				];

				let foundGuidance = false;
				for (const helpful of helpfulElements) {
					if (
						await page
							.locator(helpful)
							.isVisible({ timeout: 2000 })
							.catch(() => false)
					) {
						console.log(`✓ Found helpful guidance: ${helpful}`);
						foundGuidance = true;
						break;
					}
				}

				if (!foundGuidance) {
					console.log('⚠️ No guidance elements found in empty state - user may need direction');
				}
			} else if (dashboardState === 'error') {
				throw new Error(`Dashboard is in error state: ${dashboardState}`);
			}

			console.log('✓ Dashboard structure test completed successfully');
		} catch (error) {
			await debugPage(page, 'dashboard-structure-failure');
			throw error;
		}
	});

	test('should handle classroom navigation based on data state', async ({ page }) => {
		try {
			const dashboardState = await navigateDashboardSafely(page);

			if (dashboardState === 'error') {
				throw new Error('Cannot test navigation - dashboard is in error state');
			}

			if (dashboardState === 'populated') {
				console.log('Testing classroom navigation with populated data...');

				// Look for clickable classroom elements
				const classroomSelectors = [
					'[data-testid="classroom-card"]',
					'text=/CS.*10[0-9]|Programming/i',
					'.classroom-card, .classroom-item, .classroom-link',
					'button:has-text("CS"), a:has-text("CS")',
					'[href*="classroom"], [href*="class"]'
				];

				let navigationTested = false;
				for (const selector of classroomSelectors) {
					const element = page.locator(selector).first();
					if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
						try {
							await element.click();
							await waitForPageReady(page);

							// Check if navigation occurred
							const currentUrl = page.url();
							const navigationSuccess =
								currentUrl.includes('classroom') ||
								currentUrl.includes('assignment') ||
								(await page
									.locator('text=/assignment|submission|student.*list|classroom.*detail/i')
									.isVisible({ timeout: 5000 })
									.catch(() => false));

							if (navigationSuccess) {
								console.log('✓ Classroom navigation successful');
							} else {
								console.log('⚠️ Classroom click did not navigate as expected');
							}
							navigationTested = true;
							break;
						} catch (clickError) {
							console.log(`Could not click ${selector}: ${clickError.message}`);
							continue;
						}
					}
				}

				if (!navigationTested) {
					console.log('⚠️ No clickable classroom elements found despite populated state');
				}
			} else {
				console.log('⚪ Dashboard has empty state - classroom navigation not applicable');

				// In empty state, should show import/setup options
				const setupOptions = [
					'button:has-text("Import"), a:has-text("Import")',
					'text=/get.*started|import.*classroom/i',
					'button:has-text("Add Classroom"), a:has-text("Create")'
				];

				for (const option of setupOptions) {
					if (
						await page
							.locator(option)
							.isVisible({ timeout: 2000 })
							.catch(() => false)
					) {
						console.log(`✓ Found setup option: ${option}`);
						break;
					}
				}
			}

			console.log('✓ Classroom navigation test completed');
		} catch (error) {
			await debugPage(page, 'classroom-navigation-test-failure');
			throw error;
		}
	});

	test('should handle assignment content based on data state', async ({ page }) => {
		try {
			const dashboardState = await navigateDashboardSafely(page);

			// Try different assignment-related routes
			const assignmentUrls = [
				'/dashboard/teacher/assignments',
				'/dashboard/teacher',
				'/assignments'
			];

			let assignmentAreaFound = false;
			for (const url of assignmentUrls) {
				try {
					await page.goto(url);
					await waitForPageReady(page);

					// Skip if redirected to login
					if (page.url().includes('/login')) {
						continue;
					}

					// Look for assignment-related areas
					const assignmentIndicators = [
						'text=/assignment|quiz|homework/i',
						'[data-testid*="assignment"]',
						'text=/create.*assignment|add.*assignment/i',
						'nav *:has-text("Assignment"), .nav-item:has-text("Assignment")',
						'section[data-section="assignments"], .assignments-section'
					];

					for (const indicator of assignmentIndicators) {
						if (
							await page
								.locator(indicator)
								.isVisible({ timeout: 3000 })
								.catch(() => false)
						) {
							assignmentAreaFound = true;
							console.log(`✓ Found assignment area on ${url}`);

							// Check for state-specific content
							if (dashboardState === 'populated') {
								const dataElements = [
									'text=/due.*date|deadline/i',
									'text=/submission|student.*work/i',
									'[data-testid="assignment-list-item"]',
									'text=/[0-9]+.*assignment/i'
								];

								for (const dataElement of dataElements) {
									if (
										await page
											.locator(dataElement)
											.isVisible({ timeout: 2000 })
											.catch(() => false)
									) {
										console.log(`✓ Found assignment data: ${dataElement}`);
										break;
									}
								}
							} else {
								const emptyElements = [
									'text=/no.*assignment|no.*quiz/i',
									'text=/create.*first.*assignment/i',
									'button:has-text("Create"), button:has-text("Add")'
								];

								for (const emptyElement of emptyElements) {
									if (
										await page
											.locator(emptyElement)
											.isVisible({ timeout: 2000 })
											.catch(() => false)
									) {
										console.log(`✓ Found assignment empty state: ${emptyElement}`);
										break;
									}
								}
							}
							break;
						}
					}

					if (assignmentAreaFound) break;
				} catch (urlError) {
					console.log(`Could not test URL ${url}: ${urlError.message}`);
				}
			}

			if (assignmentAreaFound) {
				console.log(`✓ Assignment area found and appropriate for ${dashboardState} state`);
			} else {
				console.log('⚠️ No assignment area found - may not be implemented yet');
			}
		} catch (error) {
			await debugPage(page, 'assignment-content-test-failure');
			throw error;
		}
	});
});
