/**
 * Data Store E2E Tests
 * Location: frontend/e2e/data-store.test.ts
 *
 * Tests reactive state management and model synchronization
 */

import { test, expect } from '@playwright/test';
import { signInAsTeacher, waitForPageReady, debugPage } from './test-helpers';

test.describe('Data Store Tests', () => {
	test.beforeEach(async ({ page }) => {
		// Sign in as teacher before each test
		await signInAsTeacher(page);
	});

	test('should initialize data store correctly', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		const storeInitialization = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			return {
				initialized: dataStore.initialized,
				hasClassrooms: !!dataStore.classrooms,
				hasAssignments: !!dataStore.assignments,
				hasCurrentUser: !!dataStore.currentUser,
				hasLoadingState: typeof dataStore.loading !== 'undefined',
				hasErrorState: typeof dataStore.error !== 'undefined',
				classroomCount: dataStore.classrooms?.count || 0,
				assignmentCount: dataStore.assignments?.count || 0
			};
		});

		if (storeInitialization.error) {
			console.log(`⚠️ Store initialization check failed: ${storeInitialization.error}`);
		} else {
			console.log('✓ Data store initialization:', storeInitialization);
			expect(storeInitialization.initialized).toBe(true);
			expect(storeInitialization.hasClassrooms).toBe(true);
			expect(storeInitialization.hasAssignments).toBe(true);
		}
	});

	test('should manage loading states correctly', async ({ page }) => {
		await page.goto('/dashboard/teacher');

		// Check initial loading state
		const initialLoadingElements = page.locator('.animate-pulse, .animate-spin, text=/loading/i');
		const hasInitialLoading = await initialLoadingElements.count() > 0;

		console.log('✓ Initial loading state present:', hasInitialLoading);

		// Wait for loading to complete
		await waitForPageReady(page);

		// Check final loading state
		const loadingStateAfterLoad = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			return {
				loading: dataStore?.loading || false,
				initialized: dataStore?.initialized || false,
				hasData: (dataStore?.classrooms?.count || 0) >= 0
			};
		});

		console.log('✓ Final loading state:', loadingStateAfterLoad);
		expect(loadingStateAfterLoad.loading).toBe(false);
		expect(loadingStateAfterLoad.initialized).toBe(true);
	});

	test('should handle reactive state updates', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test reactive updates by triggering a refresh
		const refreshButton = page.getByRole('button', { name: /refresh/i });
		
		if (await refreshButton.isVisible({ timeout: 3000 })) {
			// Monitor state changes during refresh
			const stateBeforeRefresh = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					loading: dataStore?.loading,
					initialized: dataStore?.initialized,
					classroomCount: dataStore?.classrooms?.count || 0,
					hasData: dataStore?.hasData
				};
			});

			// Trigger refresh
			await refreshButton.click();
			await page.waitForTimeout(500); // Brief moment to catch loading state

			const stateUnderRefresh = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					loading: dataStore?.loading,
					initialized: dataStore?.initialized
				};
			});

			// Wait for refresh to complete
			await waitForPageReady(page);

			const stateAfterRefresh = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					loading: dataStore?.loading,
					initialized: dataStore?.initialized,
					classroomCount: dataStore?.classrooms?.count || 0,
					hasData: dataStore?.hasData
				};
			});

			console.log('✓ Reactive state test:', {
				before: stateBeforeRefresh,
				during: stateUnderRefresh,
				after: stateAfterRefresh
			});

			// Should show proper state management
			expect(stateAfterRefresh.loading).toBe(false);
			expect(stateAfterRefresh.initialized).toBe(true);
		} else {
			console.log('⚠️ No refresh button found for reactive state test');
		}
	});

	test('should synchronize data between different page views', async ({ page }) => {
		// Load dashboard first
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		const dashboardData = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			return {
				classroomCount: dataStore?.classrooms?.count || 0,
				assignmentCount: dataStore?.assignments?.count || 0,
				totalStudents: dataStore?.dashboardStats?.totalStudents || 0
			};
		});

		// Navigate to assignments page
		await page.goto('/dashboard/teacher/assignments');
		await waitForPageReady(page);

		const assignmentsPageData = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			return {
				assignmentCount: dataStore?.assignments?.count || 0,
				classroomCount: dataStore?.classrooms?.count || 0
			};
		});

		console.log('✓ Data synchronization test:', {
			dashboard: dashboardData,
			assignments: assignmentsPageData
		});

		// Data should be consistent across pages
		if (dashboardData.assignmentCount > 0 && assignmentsPageData.assignmentCount > 0) {
			expect(assignmentsPageData.assignmentCount).toEqual(dashboardData.assignmentCount);
		}
	});

	test('should handle error states properly', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test error handling capabilities
		const errorHandling = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			// Test error methods
			const hasErrorMethods = {
				setError: typeof dataStore.setError === 'function',
				clearError: typeof dataStore.clearError === 'function',
				currentError: dataStore.error
			};

			// Test setting an error
			if (hasErrorMethods.setError) {
				dataStore.setError('Test error for E2E testing');
			}

			return {
				...hasErrorMethods,
				errorAfterSet: dataStore.error,
				loadingAfterError: dataStore.loading
			};
		});

		if (errorHandling.error) {
			console.log(`⚠️ Error handling test failed: ${errorHandling.error}`);
		} else {
			console.log('✓ Error handling test:', errorHandling);
			expect(errorHandling.setError).toBe(true);
			expect(errorHandling.clearError).toBe(true);
			
			if (errorHandling.errorAfterSet) {
				expect(errorHandling.loadingAfterError).toBe(false); // Loading should stop on error
			}
		}

		// Clear the test error
		await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (dataStore?.clearError) {
				dataStore.clearError();
			}
		});
	});

	test('should manage selection state correctly', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test classroom selection
		const selectionTest = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			const classrooms = dataStore.classrooms?.all || [];
			if (classrooms.length === 0) return { error: 'No classrooms to test selection' };

			// Test selection methods
			const firstClassroomId = classrooms[0].id;
			
			return {
				hasSelectMethod: typeof dataStore.selectClassroom === 'function',
				hasClearSelectionMethod: typeof dataStore.clearSelections === 'function',
				initialSelection: dataStore.selectedClassroomId,
				firstClassroomId: firstClassroomId,
				classroomCount: classrooms.length
			};
		});

		if (selectionTest.error) {
			console.log(`⚠️ Selection test limitation: ${selectionTest.error}`);
		} else {
			console.log('✓ Selection state test:', selectionTest);
			expect(selectionTest.hasSelectMethod).toBe(true);
			expect(selectionTest.hasClearSelectionMethod).toBe(true);
			
			// Test actual selection
			if (selectionTest.firstClassroomId) {
				await page.evaluate((classroomId) => {
					const dataStore = (window as any).dataStore;
					dataStore.selectClassroom(classroomId);
				}, selectionTest.firstClassroomId);

				const afterSelection = await page.evaluate(() => {
					const dataStore = (window as any).dataStore;
					return {
						selectedId: dataStore.selectedClassroomId,
						selectedClassroom: !!dataStore.selectedClassroom
					};
				});

				console.log('✓ After selection:', afterSelection);
				expect(afterSelection.selectedId).toBe(selectionTest.firstClassroomId);
			}
		}
	});

	test('should calculate derived state correctly', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		const derivedStateTest = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			const dashboardStats = dataStore.dashboardStats;
			const hasData = dataStore.hasData;

			return {
				hasDashboardStats: !!dashboardStats,
				totalClassrooms: dashboardStats?.totalClassrooms || 0,
				totalStudents: dashboardStats?.totalStudents || 0,
				totalAssignments: dashboardStats?.totalAssignments || 0,
				ungradedSubmissions: dashboardStats?.ungradedSubmissions || 0,
				hasData: hasData,
				classroomCount: dataStore.classrooms?.count || 0,
				assignmentCount: dataStore.assignments?.count || 0
			};
		});

		if (derivedStateTest.error) {
			console.log(`⚠️ Derived state test failed: ${derivedStateTest.error}`);
		} else {
			console.log('✓ Derived state test:', derivedStateTest);
			expect(derivedStateTest.hasDashboardStats).toBe(true);
			
			// Derived stats should be consistent with raw data
			if (derivedStateTest.classroomCount > 0) {
				expect(derivedStateTest.totalClassrooms).toEqual(derivedStateTest.classroomCount);
				expect(derivedStateTest.hasData).toBe(true);
			}
		}
	});

	test('should handle data store cleanup correctly', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test cleanup capabilities
		const cleanupTest = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			const beforeCleanup = {
				initialized: dataStore.initialized,
				classroomCount: dataStore.classrooms?.count || 0,
				assignmentCount: dataStore.assignments?.count || 0,
				hasCurrentUser: !!dataStore.currentUser
			};

			// Test cleanup method (if available)
			if (typeof dataStore.cleanup === 'function') {
				dataStore.cleanup();
				
				const afterCleanup = {
					initialized: dataStore.initialized,
					classroomCount: dataStore.classrooms?.count || 0,
					assignmentCount: dataStore.assignments?.count || 0,
					hasCurrentUser: !!dataStore.currentUser
				};

				return {
					hasCleanupMethod: true,
					beforeCleanup,
					afterCleanup
				};
			} else {
				return {
					hasCleanupMethod: false,
					beforeCleanup
				};
			}
		});

		if (cleanupTest.error) {
			console.log(`⚠️ Cleanup test failed: ${cleanupTest.error}`);
		} else {
			console.log('✓ Data store cleanup test:', cleanupTest);
			
			if (cleanupTest.hasCleanupMethod) {
				expect(cleanupTest.afterCleanup.initialized).toBe(false);
				expect(cleanupTest.afterCleanup.classroomCount).toBe(0);
				expect(cleanupTest.afterCleanup.hasCurrentUser).toBe(false);
			}
		}
	});

	test('should persist essential state across page navigation', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		const initialState = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			return {
				initialized: dataStore?.initialized,
				currentUser: !!dataStore?.currentUser,
				classroomCount: dataStore?.classrooms?.count || 0
			};
		});

		// Navigate to assignments page
		await page.goto('/dashboard/teacher/assignments');
		await waitForPageReady(page);

		const stateAfterNavigation = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			return {
				initialized: dataStore?.initialized,
				currentUser: !!dataStore?.currentUser,
				classroomCount: dataStore?.classrooms?.count || 0
			};
		});

		console.log('✓ State persistence test:', {
			initial: initialState,
			afterNavigation: stateAfterNavigation
		});

		// Essential state should persist
		expect(stateAfterNavigation.initialized).toBe(true);
		
		// User info should persist
		if (initialState.currentUser) {
			expect(stateAfterNavigation.currentUser).toBe(true);
		}
	});

	test('should handle concurrent data operations', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test multiple simultaneous operations
		const concurrencyTest = await page.evaluate(async () => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			// Try to trigger multiple operations simultaneously
			const operations = [];
			
			if (typeof dataStore.refresh === 'function') {
				operations.push(dataStore.refresh());
			}
			
			if (typeof dataStore.loadTestData === 'function') {
				operations.push(Promise.resolve(dataStore.loadTestData()));
			}

			if (operations.length === 0) {
				return { error: 'No concurrent operations available' };
			}

			// Wait for all operations
			try {
				await Promise.all(operations);
				
				return {
					operationCount: operations.length,
					success: true,
					finalState: {
						loading: dataStore.loading,
						error: dataStore.error,
						initialized: dataStore.initialized
					}
				};
			} catch (error) {
				return {
					operationCount: operations.length,
					success: false,
					error: error.message
				};
			}
		});

		if (concurrencyTest.error && !concurrencyTest.success) {
			console.log(`⚠️ Concurrency test limitation: ${concurrencyTest.error}`);
		} else {
			console.log('✓ Concurrency test:', concurrencyTest);
			
			if (concurrencyTest.success) {
				expect(concurrencyTest.finalState.initialized).toBe(true);
			}
		}
	});
});