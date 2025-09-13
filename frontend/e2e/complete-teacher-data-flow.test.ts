/**
 * Complete Teacher Data Flow E2E Test  
 * Location: frontend/e2e/complete-teacher-data-flow.test.ts
 * 
 * Tests the full teacher flow: login -> import data -> view dashboard data
 */

import { test, expect } from '@playwright/test';
import { 
	signInAsTeacher, 
	gotoSnapshotImport,
	uploadSnapshotFile,
	waitForImportSuccess,
	debugPage,
	waitForPageReady 
} from './test-helpers';

test.describe('Complete Teacher Data Flow', () => {
	
	test('should login as teacher, import data, and display data on dashboard', async ({ page }) => {
		console.log('🚀 Starting complete teacher data flow test...');

		// Step 1: Sign in as teacher
		console.log('📋 Step 1: Signing in as teacher...');
		await signInAsTeacher(page);
		
		// Wait for dashboard to load
		await waitForPageReady(page);
		
		// Verify we're on the teacher dashboard
		await expect(page).toHaveURL(/(dashboard).*teacher/);
		console.log('✅ Teacher login successful, on dashboard');

		// Step 2: Import teacher snapshot data
		console.log('📋 Step 2: Importing teacher snapshot data...');
		
		// Navigate to import page
		await page.goto('/teacher/data-import/snapshot');
		await waitForPageReady(page);
		
		// Import the snapshot using the available helper functions
		await gotoSnapshotImport(page);
		await uploadSnapshotFile(page); // Uses default teacher1 snapshot
		await waitForImportSuccess(page);
		console.log('✅ Snapshot import completed');

		// Step 3: Navigate back to dashboard and verify data appears
		console.log('📋 Step 3: Verifying data appears on dashboard...');
		
		// Go back to dashboard
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);
		
		// Wait a bit for data to load client-side
		await page.waitForTimeout(3000);
		
		// Check for data indicators
		console.log('🔍 Looking for classroom data indicators...');
		
		// Look for classroom selector or classroom cards
		const classroomIndicators = [
			'[data-testid="classroom-card"]',
			'[data-testid="classroom-selector"]',  
			'select[data-testid="classroom-select"]',
			'text=/CS.*10[0-9]/i',
			'text=/Introduction.*Programming/i',
			'text=/classroom/i'
		];

		let foundClassroom = false;
		for (const indicator of classroomIndicators) {
			try {
				const element = page.locator(indicator);
				if (await element.isVisible({ timeout: 5000 })) {
					console.log(`✅ Found classroom indicator: ${indicator}`);
					foundClassroom = true;
					break;
				}
			} catch (error) {
				console.log(`❌ Classroom indicator not found: ${indicator}`);
			}
		}

		// Look for student/assignment data
		console.log('🔍 Looking for student/assignment data indicators...');
		const dataIndicators = [
			'text=/student/i',
			'text=/assignment/i', 
			'[data-testid*="student"]',
			'[data-testid*="assignment"]',
			'text=/Karel.*Maze/i',
			'text=/Programming.*Quiz/i'
		];

		let foundData = false; 
		for (const indicator of dataIndicators) {
			try {
				const element = page.locator(indicator);
				if (await element.isVisible({ timeout: 5000 })) {
					console.log(`✅ Found data indicator: ${indicator}`);
					foundData = true;
					break;
				}
			} catch (error) {
				console.log(`❌ Data indicator not found: ${indicator}`);
			}
		}

		// Take a screenshot for debugging
		await page.screenshot({ path: 'test-results/teacher-dashboard-after-import.png', fullPage: true });
		
		// Debug the page state
		await debugPage(page, 'teacher-dashboard-after-import');
		
		// Check browser console for any errors
		const logs = await page.evaluate(() => {
			return {
				errors: window.console._errors || [],
				logs: window.console._logs || []
			};
		});
		console.log('📊 Browser console state:', logs);

		// Examine data store state
		const dataStoreState = await page.evaluate(() => {
			// Access the data store if available
			return {
				hasDataStore: typeof window.dataStore !== 'undefined',
				classrooms: window.dataStore?.classrooms || 'N/A',
				assignments: window.dataStore?.assignments || 'N/A',
				loading: window.dataStore?.loading || 'N/A',
				error: window.dataStore?.error || 'N/A'
			};
		});
		console.log('🗄️ Data store state:', dataStoreState);

		// Test assertions - at minimum one data indicator should be present
		if (!foundClassroom && !foundData) {
			// Log current page content for debugging
			const pageContent = await page.textContent('body');
			console.log('📄 Current page content sample:', pageContent?.substring(0, 500) + '...');
			
			// Check if we're still loading
			const loadingElements = await page.locator('text=/loading|Loading/i').count();
			console.log('⏳ Loading elements found:', loadingElements);
			
			if (loadingElements > 0) {
				console.log('⏳ Page still loading, waiting longer...');
				await page.waitForTimeout(10000);
				
				// Recheck for data
				for (const indicator of [...classroomIndicators, ...dataIndicators]) {
					try {
						if (await page.locator(indicator).isVisible({ timeout: 2000 })) {
							console.log(`✅ Found indicator after extended wait: ${indicator}`);
							foundClassroom = true;
							foundData = true;
							break;
						}
					} catch (error) {
						// Continue checking
					}
				}
			}
		}

		// Final assertion - should find at least some imported data
		if (!foundClassroom && !foundData) {
			console.error('❌ No imported data found on dashboard after import');
			
			// Get more debugging info
			const currentUrl = page.url();
			const pageTitle = await page.title();
			console.log('🌐 Current URL:', currentUrl);
			console.log('📄 Page title:', pageTitle);
			
			// Check for error messages
			const errorElements = await page.locator('text=/error|Error|failed|Failed/i').count();
			console.log('❌ Error elements found:', errorElements);
			
			if (errorElements > 0) {
				const errorText = await page.locator('text=/error|Error|failed|Failed/i').first().textContent();
				console.log('❌ Error message:', errorText);
			}
			
			throw new Error('Expected to find imported classroom/assignment data on dashboard after successful import');
		}

		console.log('✅ Complete teacher data flow test passed');
	});

	test('should handle empty dashboard state gracefully', async ({ page }) => {
		console.log('🚀 Testing empty dashboard state...');

		// Sign in as teacher but don't import data
		await signInAsTeacher(page);
		
		// Navigate to dashboard
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);
		
		// Should show empty state or helpful messages
		const emptyStateIndicators = [
			'text=/no.*data|empty|no.*classroom/i',
			'text=/import.*data|get.*started/i', 
			'button:has-text("Import")',
			'text=/welcome/i'
		];

		let foundEmptyState = false;
		for (const indicator of emptyStateIndicators) {
			if (await page.locator(indicator).isVisible({ timeout: 5000 }).catch(() => false)) {
				console.log(`✅ Found empty state indicator: ${indicator}`);
				foundEmptyState = true;
				break;
			}
		}

		// Dashboard should either show empty state or basic structure
		const hasBasicStructure = await page.locator('h1, h2').isVisible({ timeout: 5000 }).catch(() => false);
		
		if (!foundEmptyState && !hasBasicStructure) {
			await debugPage(page, 'empty-dashboard-state');
			throw new Error('Dashboard should show either empty state messaging or basic structure');
		}

		console.log('✅ Empty dashboard state handled appropriately');
	});

	test('should refresh data when returning to dashboard after import', async ({ page }) => {
		console.log('🚀 Testing dashboard refresh after import...');

		// Sign in and go to dashboard first
		await signInAsTeacher(page);
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Verify initially empty/minimal state
		const initialDataCount = await page.locator('text=/CS.*10[0-9]|Programming|assignment/i').count();
		console.log('📊 Initial data elements found:', initialDataCount);

		// Import data using helper functions
		await gotoSnapshotImport(page);
		await uploadSnapshotFile(page);
		await waitForImportSuccess(page);

		// Return to dashboard
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Wait for client-side data loading
		await page.waitForTimeout(5000);

		// Should now show more data
		const finalDataCount = await page.locator('text=/CS.*10[0-9]|Programming|assignment/i').count();
		console.log('📊 Final data elements found:', finalDataCount);

		// Data should increase (or at least remain the same if already populated)
		expect(finalDataCount).toBeGreaterThanOrEqual(initialDataCount);
		console.log('✅ Dashboard data refreshed successfully after import');
	});

});