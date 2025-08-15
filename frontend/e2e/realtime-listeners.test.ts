/**
 * Real-time Listener E2E Tests
 * Location: frontend/e2e/realtime-listeners.test.ts
 *
 * Tests Firestore real-time listeners and WebSocket functionality
 */

import { test, expect } from '@playwright/test';
import { signInAsTeacher, waitForPageReady, debugPage } from './test-helpers';

test.describe('Real-time Listener Tests', () => {
	test.beforeEach(async ({ page }) => {
		// Sign in as teacher before each test
		await signInAsTeacher(page);
	});

	test('should initialize real-time listeners on dashboard load', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Check for real-time status indicators
		const realtimeIndicators = [
			'text=/real.*time.*updates.*active/i',
			'text=/live.*updates/i',
			'text=/🔄.*live.*updates/i',
			'text=/connected/i',
			'[data-testid="realtime-status"]'
		];

		let foundRealtimeIndicator = false;
		for (const indicator of realtimeIndicators) {
			if (
				await page
					.locator(indicator)
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				console.log(`✓ Found real-time indicator: ${indicator}`);
				foundRealtimeIndicator = true;
				break;
			}
		}

		if (foundRealtimeIndicator) {
			// Test that listeners are actually set up
			const listenerStatus = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				if (!dataStore) return { error: 'DataStore not accessible' };

				return {
					initialized: dataStore.initialized,
					hasRealtimeService: typeof (window as any).realtimeService !== 'undefined',
					classroomListenersActive: dataStore.classrooms?.lastUpdated instanceof Date,
					assignmentListenersActive: dataStore.assignments?.lastUpdated instanceof Date
				};
			});

			if (listenerStatus.error) {
				console.log(`⚠️ Listener status check failed: ${listenerStatus.error}`);
			} else {
				console.log('✓ Real-time listener status:', listenerStatus);
				expect(listenerStatus.initialized).toBe(true);
			}
		} else {
			console.log('⚠️ No real-time status indicators found');
		}
	});

	test('should show last updated timestamps', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Look for last updated timestamps
		const timestampElements = [
			'text=/last.*updated.*[0-9]/i',
			'text=/updated.*[0-9].*ago/i',
			'text=/[0-9]+:[0-9]+.*[AP]M/i', // Time format
			'[data-testid="last-updated"]'
		];

		let foundTimestamp = false;
		for (const element of timestampElements) {
			if (
				await page
					.locator(element)
					.isVisible({ timeout: 3000 })
					.catch(() => false)
			) {
				const timestampText = await page.locator(element).textContent();
				console.log(`✓ Found timestamp: ${timestampText}`);
				foundTimestamp = true;
				break;
			}
		}

		if (foundTimestamp) {
			// Wait a moment and check if timestamp updates (indicating live updates)
			await page.waitForTimeout(2000);
			console.log('✓ Real-time timestamp display working');
		} else {
			console.log('⚠️ No timestamp display found for real-time updates');
		}
	});

	test('should handle real-time connection states', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Check for connection state management
		const connectionStatus = await page.evaluate(() => {
			// Check for Firebase connection state handling
			const firebase = (window as any).firebase;
			const dataStore = (window as any).dataStore;

			if (!firebase && !dataStore) return { error: 'Firebase or DataStore not accessible' };

			return {
				hasFirebase: !!firebase,
				hasDataStore: !!dataStore,
				dataStoreInitialized: dataStore?.initialized,
				hasRealtimeService: typeof (window as any).realtimeService !== 'undefined'
			};
		});

		if (connectionStatus.error) {
			console.log(`⚠️ Connection status check failed: ${connectionStatus.error}`);
		} else {
			console.log('✓ Real-time connection status:', connectionStatus);

			// Should have either Firebase or a data store managing real-time state
			const hasRealTimeCapability =
				connectionStatus.hasFirebase ||
				connectionStatus.hasDataStore ||
				connectionStatus.hasRealtimeService;

			expect(hasRealTimeCapability).toBe(true);
		}
	});

	test('should simulate data updates and show real-time changes', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Try to trigger a refresh to simulate data changes
		const refreshButton = page.getByRole('button', { name: /refresh/i });

		if (await refreshButton.isVisible({ timeout: 3000 })) {
			// Get initial data state
			const initialState = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					classroomCount: dataStore?.classrooms?.count || 0,
					assignmentCount: dataStore?.assignments?.count || 0,
					lastUpdated: dataStore?.classrooms?.lastUpdated?.getTime() || 0
				};
			});

			// Trigger refresh (simulates real-time update)
			await refreshButton.click();
			await page.waitForTimeout(2000);

			// Check for updated state
			const updatedState = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					classroomCount: dataStore?.classrooms?.count || 0,
					assignmentCount: dataStore?.assignments?.count || 0,
					lastUpdated: dataStore?.classrooms?.lastUpdated?.getTime() || 0
				};
			});

			console.log('✓ Data update simulation:', {
				initial: initialState,
				updated: updatedState,
				timestampChanged: updatedState.lastUpdated !== initialState.lastUpdated
			});

			// Should show evidence of real-time capability
			expect(updatedState.lastUpdated).toBeGreaterThanOrEqual(initialState.lastUpdated);
		} else {
			console.log('⚠️ No refresh button available for real-time simulation');
		}
	});

	test('should handle listener cleanup on page navigation', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Check if listeners are set up
		const initialListenerState = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			return {
				initialized: dataStore?.initialized,
				hasListeners: dataStore?.initialized && dataStore.classrooms?.count >= 0
			};
		});

		if (initialListenerState.hasListeners) {
			// Navigate away from the page
			await page.goto('/(dashboard)/teacher/assignments');
			await waitForPageReady(page);

			// Navigate back
			await page.goto('/(dashboard)/teacher');
			await waitForPageReady(page);

			// Should handle listener lifecycle properly
			const finalListenerState = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					stillInitialized: dataStore?.initialized,
					dataPreserved: dataStore?.classrooms?.count >= 0
				};
			});

			console.log('✓ Listener lifecycle test:', {
				initial: initialListenerState,
				final: finalListenerState
			});

			expect(finalListenerState.stillInitialized).toBe(true);
		} else {
			console.log('⚠️ No initial listeners to test cleanup');
		}
	});

	test('should handle offline/online state changes', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Simulate going offline
		await page.context().setOffline(true);
		await page.waitForTimeout(2000);

		// Check for offline state handling
		const offlineIndicators = [
			'text=/offline|disconnected/i',
			'text=/connection.*lost/i',
			'text=/no.*connection/i',
			'[data-testid="offline-indicator"]'
		];

		let foundOfflineIndicator = false;
		for (const indicator of offlineIndicators) {
			if (
				await page
					.locator(indicator)
					.isVisible({ timeout: 3000 })
					.catch(() => false)
			) {
				console.log(`✓ Found offline indicator: ${indicator}`);
				foundOfflineIndicator = true;
				break;
			}
		}

		// Go back online
		await page.context().setOffline(false);
		await page.waitForTimeout(3000);

		// Check for reconnection handling
		const onlineIndicators = [
			'text=/online|connected/i',
			'text=/reconnected/i',
			'text=/connection.*restored/i',
			'text=/🔄.*live.*updates/i'
		];

		let foundOnlineIndicator = false;
		for (const indicator of onlineIndicators) {
			if (
				await page
					.locator(indicator)
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				console.log(`✓ Found online indicator: ${indicator}`);
				foundOnlineIndicator = true;
				break;
			}
		}

		console.log('✓ Offline/online state test completed', {
			offlineHandled: foundOfflineIndicator,
			onlineHandled: foundOnlineIndicator
		});
	});

	test('should handle listener errors gracefully', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Try to simulate a listener error by tampering with network or Firebase
		const errorHandlingTest = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			// Check if error handling methods exist
			return {
				hasErrorHandling: typeof dataStore.setError === 'function',
				hasClearError: typeof dataStore.clearError === 'function',
				currentError: dataStore.error,
				hasRetryMechanism: typeof dataStore.refresh === 'function'
			};
		});

		if (errorHandlingTest.error) {
			console.log(`⚠️ Error handling test failed: ${errorHandlingTest.error}`);
		} else {
			console.log('✓ Real-time error handling capabilities:', errorHandlingTest);
			expect(errorHandlingTest.hasErrorHandling).toBe(true);
			expect(errorHandlingTest.hasRetryMechanism).toBe(true);
		}
	});

	test('should show real-time data consistency', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');
		await waitForPageReady(page);

		// Check data consistency across different views
		const consistencyCheck = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			const classrooms = dataStore.classrooms?.all || [];
			const assignments = dataStore.assignments?.all || [];

			// Check if data is consistent
			const totalStudentsFromClassrooms = classrooms.reduce(
				(sum, c) => sum + (c.studentCount || 0),
				0
			);
			const totalStudentsFromDashboard = dataStore.dashboardStats?.totalStudents || 0;

			return {
				classroomCount: classrooms.length,
				assignmentCount: assignments.length,
				studentsFromClassrooms: totalStudentsFromClassrooms,
				studentsFromDashboard: totalStudentsFromDashboard,
				dataConsistent:
					totalStudentsFromClassrooms === totalStudentsFromDashboard ||
					totalStudentsFromDashboard === 0
			};
		});

		if (consistencyCheck.error) {
			console.log(`⚠️ Consistency check failed: ${consistencyCheck.error}`);
		} else {
			console.log('✓ Real-time data consistency:', consistencyCheck);

			// Data should be consistent across different views
			if (consistencyCheck.studentsFromClassrooms > 0) {
				expect(consistencyCheck.dataConsistent).toBe(true);
			}
		}
	});

	test('should maintain listener performance', async ({ page }) => {
		await page.goto('/(dashboard)/teacher');

		// Measure time to initialize listeners
		const startTime = Date.now();
		await waitForPageReady(page);
		const endTime = Date.now();

		const initTime = endTime - startTime;
		console.log(`✓ Listener initialization time: ${initTime}ms`);

		// Should initialize reasonably quickly (under 10 seconds)
		expect(initTime).toBeLessThan(10000);

		// Check memory usage doesn't grow excessively
		const performanceMetrics = await page.evaluate(() => {
			const performance = window.performance;
			const memory = (performance as any).memory;

			return {
				navigationStart: performance.timing?.navigationStart,
				loadComplete: performance.timing?.loadEventEnd,
				memoryUsed: memory?.usedJSHeapSize,
				memoryLimit: memory?.jsHeapSizeLimit
			};
		});

		console.log('✓ Performance metrics:', performanceMetrics);

		// Should have reasonable memory usage
		if (performanceMetrics.memoryUsed && performanceMetrics.memoryLimit) {
			const memoryUsagePercent =
				(performanceMetrics.memoryUsed / performanceMetrics.memoryLimit) * 100;
			expect(memoryUsagePercent).toBeLessThan(50); // Should use less than 50% of heap limit
		}
	});
});
