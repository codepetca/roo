import { test, expect } from '@playwright/test';
import { signInAsTeacher } from './test-helpers';

test.describe('Dashboard Reactivity Debug', () => {
	test.beforeEach(async ({ page }) => {
		// Capture console logs for debugging
		page.on('console', (msg) => {
			if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warn') {
				console.log(`🌐 Browser ${msg.type()}: ${msg.text()}`);
			}
		});
	});

	test('should debug Map vs derived array reactivity issue', async ({ page }) => {
		console.log('🚀 Starting dashboard reactivity debug test...');

		// Login as teacher using helper
		await signInAsTeacher(page);

		// Wait for redirect to dashboard
		await page.waitForURL('**/dashboard/teacher');
		console.log('✅ Successfully navigated to teacher dashboard');

		// Wait for data loading to complete (look for loading: false)
		await page.waitForFunction(
			() => {
				const loadingElement = document.querySelector('[data-testid="debug-loading"]');
				return loadingElement?.textContent?.includes('Loading: false');
			},
			{ timeout: 10000 }
		);

		console.log('✅ Data loading completed');

		// Extract debug information from UI
		const debugInfo = await page.evaluate(() => {
			const getElementText = (selector: string): string => {
				const element = document.querySelector(selector);
				return element?.textContent?.trim() || 'Not found';
			};

			// Look for debug information in the UI
			const loading = getElementText('*:has-text("Loading:")').replace('Loading:', '').trim();
			const hasData = getElementText('*:has-text("Has Data:")').replace('Has Data:', '').trim();
			const classroomsCount = getElementText('*:has-text("Classrooms Count:")')
				.replace('Classrooms Count:', '')
				.trim();
			const assignmentsCount = getElementText('*:has-text("Assignments Count:")')
				.replace('Assignments Count:', '')
				.trim();
			const classroomsMapSize = getElementText('*:has-text("Classrooms Map Size:")')
				.replace('Classrooms Map Size:', '')
				.trim();
			const assignmentsMapSize = getElementText('*:has-text("Assignments Map Size:")')
				.replace('Assignments Map Size:', '')
				.trim();
			const teacher = getElementText('*:has-text("Teacher:")').replace('Teacher:', '').trim();
			const error = getElementText('*:has-text("Error:")').replace('Error:', '').trim();

			return {
				loading,
				hasData,
				classroomsCount: parseInt(classroomsCount) || 0,
				assignmentsCount: parseInt(assignmentsCount) || 0,
				classroomsMapSize: parseInt(classroomsMapSize) || 0,
				assignmentsMapSize: parseInt(assignmentsMapSize) || 0,
				teacher,
				error
			};
		});

		console.log('📊 Debug Information Extracted:');
		console.log(`  Loading: ${debugInfo.loading}`);
		console.log(`  Has Data: ${debugInfo.hasData}`);
		console.log(`  Classrooms Count (derived): ${debugInfo.classroomsCount}`);
		console.log(`  Assignments Count (derived): ${debugInfo.assignmentsCount}`);
		console.log(`  Classrooms Map Size: ${debugInfo.classroomsMapSize}`);
		console.log(`  Assignments Map Size: ${debugInfo.assignmentsMapSize}`);
		console.log(`  Teacher: ${debugInfo.teacher}`);
		console.log(`  Error: ${debugInfo.error}`);

		// Analyze the reactivity issue
		console.log('\n🔍 REACTIVITY ANALYSIS:');

		if (debugInfo.classroomsMapSize > 0 && debugInfo.classroomsCount === 0) {
			console.log('❌ ISSUE FOUND: Classrooms Map has data but derived array is empty');
			console.log(
				`   Map Size: ${debugInfo.classroomsMapSize}, Derived Array: ${debugInfo.classroomsCount}`
			);
		}

		if (debugInfo.assignmentsMapSize > 0 && debugInfo.assignmentsCount === 0) {
			console.log('❌ ISSUE FOUND: Assignments Map has data but derived array is empty');
			console.log(
				`   Map Size: ${debugInfo.assignmentsMapSize}, Derived Array: ${debugInfo.assignmentsCount}`
			);
		}

		if (
			debugInfo.hasData === 'false' &&
			(debugInfo.classroomsMapSize > 0 || debugInfo.assignmentsMapSize > 0)
		) {
			console.log('❌ ISSUE FOUND: hasData computed property shows false despite Map data');
		}

		// Test manual data loading
		console.log('\n🧪 Testing manual "Load Test Data" button...');

		// Click the Load Test Data button
		const loadTestDataButton = page.locator('button:has-text("Load Test Data")');
		await expect(loadTestDataButton).toBeVisible();
		await loadTestDataButton.click();

		// Wait a moment for any updates
		await page.waitForTimeout(1000);

		// Re-extract debug info after manual loading
		const debugInfoAfterManual = await page.evaluate(() => {
			const getElementText = (selector: string): string => {
				const element = document.querySelector(selector);
				return element?.textContent?.trim() || 'Not found';
			};

			const hasData = getElementText('*:has-text("Has Data:")').replace('Has Data:', '').trim();
			const classroomsCount = getElementText('*:has-text("Classrooms Count:")')
				.replace('Classrooms Count:', '')
				.trim();
			const assignmentsCount = getElementText('*:has-text("Assignments Count:")')
				.replace('Assignments Count:', '')
				.trim();
			const classroomsMapSize = getElementText('*:has-text("Classrooms Map Size:")')
				.replace('Classrooms Map Size:', '')
				.trim();
			const assignmentsMapSize = getElementText('*:has-text("Assignments Map Size:")')
				.replace('Assignments Map Size:', '')
				.trim();

			return {
				hasData,
				classroomsCount: parseInt(classroomsCount) || 0,
				assignmentsCount: parseInt(assignmentsCount) || 0,
				classroomsMapSize: parseInt(classroomsMapSize) || 0,
				assignmentsMapSize: parseInt(assignmentsMapSize) || 0
			};
		});

		console.log('\n📊 After Manual Test Data Load:');
		console.log(`  Has Data: ${debugInfoAfterManual.hasData}`);
		console.log(`  Classrooms Count (derived): ${debugInfoAfterManual.classroomsCount}`);
		console.log(`  Assignments Count (derived): ${debugInfoAfterManual.assignmentsCount}`);
		console.log(`  Classrooms Map Size: ${debugInfoAfterManual.classroomsMapSize}`);
		console.log(`  Assignments Map Size: ${debugInfoAfterManual.assignmentsMapSize}`);

		// Check if manual loading fixed the reactivity
		if (debugInfoAfterManual.classroomsCount > 0 && debugInfoAfterManual.assignmentsCount > 0) {
			console.log('✅ SUCCESS: Manual loading triggered reactivity correctly');
		} else {
			console.log('❌ STILL BROKEN: Manual loading did not fix reactivity');
		}

		// Test if assignments are actually visible in UI
		const assignmentItems = await page
			.locator(
				'[data-testid="assignment-item"], .assignment-item, *:has-text("Assignment"), *:has-text("Karel"), *:has-text("Quiz")'
			)
			.count();
		console.log(`🔍 Visible assignment items in UI: ${assignmentItems}`);

		// Check for any visible classroom/assignment lists
		const visibleLists = await page.evaluate(() => {
			const lists = document.querySelectorAll('ul, ol');
			let visibleItems = 0;
			lists.forEach((list) => {
				if (list.children.length > 0) {
					visibleItems += list.children.length;
				}
			});
			return visibleItems;
		});
		console.log(`🔍 Total visible list items: ${visibleLists}`);

		// Final diagnosis
		console.log('\n🎯 FINAL DIAGNOSIS:');
		if (debugInfo.classroomsMapSize > 0 && debugInfo.assignmentsMapSize > 0) {
			if (debugInfo.classroomsCount === 0 || debugInfo.assignmentsCount === 0) {
				console.log('❌ CONFIRMED ISSUE: Svelte 5 Map → derived array reactivity is broken');
				console.log('   Maps are populated but derived arrays are not updating');
				console.log('   This is likely a $derived() reactivity timing issue');
			} else if (debugInfo.hasData === 'false') {
				console.log('❌ CONFIRMED ISSUE: Derived arrays work but computed hasData is broken');
			} else if (assignmentItems === 0) {
				console.log('❌ CONFIRMED ISSUE: Data is reactive but UI rendering is broken');
			} else {
				console.log('✅ SUCCESS: All reactivity appears to be working correctly');
			}
		} else {
			console.log('❌ DIFFERENT ISSUE: Maps are not being populated (API/data loading issue)');
		}

		// Take a screenshot for visual debugging
		await page.screenshot({ path: 'dashboard-debug-state.png', fullPage: true });
		console.log('📸 Screenshot saved as dashboard-debug-state.png');
	});

	test('should test direct Map access via browser console', async ({ page }) => {
		console.log('🧪 Testing direct Map access via browser console...');

		// Login and navigate to dashboard
		await signInAsTeacher(page);
		await page.waitForURL('**/dashboard/teacher');

		// Wait for initial loading
		await page.waitForTimeout(3000);

		// Test direct access to data store Maps via console
		const directMapTest = await page.evaluate(() => {
			// Access the global data store if available
			try {
				// Try to access the data store from window or global scope
				const dataStore =
					(window as any).dataStore ||
					(window as any).__SVELTE__ ||
					document.querySelector('[data-svelte]');

				console.log('🔍 Attempting direct Map access...');

				// If we can't access directly, try to trigger test data loading
				const loadTestButton = document.querySelector(
					'button:has-text("Load Test Data")'
				) as HTMLButtonElement;
				if (loadTestButton) {
					loadTestButton.click();
					console.log('🧪 Clicked Load Test Data button from console');
				}

				return {
					dataStoreFound: !!dataStore,
					loadButtonFound: !!loadTestButton,
					timestamp: new Date().toISOString()
				};
			} catch (error) {
				return {
					error: error.toString(),
					timestamp: new Date().toISOString()
				};
			}
		});

		console.log('🔍 Direct Map access test result:', directMapTest);

		// Wait for any updates from console button click
		await page.waitForTimeout(2000);

		// Check final state
		const finalDebugInfo = await page.evaluate(() => {
			const getElementText = (selector: string): string => {
				const element = document.querySelector(selector);
				return element?.textContent?.trim() || 'Not found';
			};

			const hasData = getElementText('*:has-text("Has Data:")').replace('Has Data:', '').trim();
			const classroomsCount = getElementText('*:has-text("Classrooms Count:")')
				.replace('Classrooms Count:', '')
				.trim();
			const assignmentsCount = getElementText('*:has-text("Assignments Count:")')
				.replace('Assignments Count:', '')
				.trim();

			return {
				hasData,
				classroomsCount: parseInt(classroomsCount) || 0,
				assignmentsCount: parseInt(assignmentsCount) || 0
			};
		});

		console.log('📊 Final state after console interaction:');
		console.log(`  Has Data: ${finalDebugInfo.hasData}`);
		console.log(`  Classrooms Count: ${finalDebugInfo.classroomsCount}`);
		console.log(`  Assignments Count: ${finalDebugInfo.assignmentsCount}`);
	});
});
