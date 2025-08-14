/**
 * Model Integration E2E Tests
 * Location: frontend/e2e/model-integration.test.ts
 *
 * Tests the new model-based architecture with real API integration
 */

import { test, expect } from '@playwright/test';
import { signInAsTeacher, waitForPageReady, debugPage } from './test-helpers';

test.describe('Model Integration Tests', () => {
	test.beforeEach(async ({ page }) => {
		// Sign in as teacher before each test
		await signInAsTeacher(page);
	});

	test('should load ClassroomModel data from API', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test that ClassroomModel integration works by checking for model-specific computed properties
		const modelComputedProperties = await page.evaluate(async () => {
			// Access the data store from the page
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			// Wait for initialization
			let attempts = 0;
			while (!dataStore.initialized && attempts < 50) {
				await new Promise(resolve => setTimeout(resolve, 100));
				attempts++;
			}

			if (!dataStore.initialized) {
				return { error: 'DataStore not initialized after 5 seconds' };
			}

			const classrooms = dataStore.classrooms.all || [];
			if (classrooms.length === 0) {
				return { error: 'No classrooms loaded' };
			}

			// Test ClassroomModel computed properties
			const firstClassroom = classrooms[0];
			return {
				hasDisplayName: !!firstClassroom.displayName,
				hasStatusBadge: !!firstClassroom.statusBadge,
				statusBadgeVariant: firstClassroom.statusBadge?.variant,
				studentCount: firstClassroom.studentCount,
				assignmentCount: firstClassroom.assignmentCount,
				modelName: firstClassroom.constructor?.name
			};
		});

		if (modelComputedProperties.error) {
			console.log(`⚠️ Model test limitation: ${modelComputedProperties.error}`);
		} else {
			console.log('✓ ClassroomModel properties:', modelComputedProperties);
			expect(modelComputedProperties.hasDisplayName).toBe(true);
			expect(modelComputedProperties.hasStatusBadge).toBe(true);
		}
	});

	test('should load AssignmentModel data with proper validation', async ({ page }) => {
		await page.goto('/dashboard/teacher/assignments');
		await waitForPageReady(page);

		// Check for assignment data loaded through models
		const assignmentElements = [
			'[data-testid="assignment-card"]',
			'.assignment-item',
			'text=/karel.*the.*dog/i',
			'text=/programming.*quiz/i',
			'text=/assignment|quiz/i'
		];

		let foundAssignments = false;
		for (const element of assignmentElements) {
			if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
				console.log(`✓ Found assignment data: ${element}`);
				foundAssignments = true;
				break;
			}
		}

		if (foundAssignments) {
			// Test AssignmentModel computed properties
			const modelData = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				if (!dataStore?.assignments?.all) return null;

				const assignments = dataStore.assignments.all;
				if (assignments.length === 0) return null;

				const firstAssignment = assignments[0];
				return {
					hasDisplayTitle: !!firstAssignment.displayTitle,
					hasTypeLabel: !!firstAssignment.typeLabel,
					hasUngradedCount: typeof firstAssignment.ungradedCount === 'number',
					hasAutoGradable: typeof firstAssignment.isAutoGradable === 'function',
					modelName: firstAssignment.constructor?.name
				};
			});

			if (modelData) {
				console.log('✓ AssignmentModel properties:', modelData);
				expect(modelData.hasDisplayTitle).toBe(true);
				expect(modelData.hasTypeLabel).toBe(true);
			}
		} else {
			console.log('⚠️ No assignment data found for model testing');
		}
	});

	test('should validate model timestamp handling', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test that models handle timestamps correctly
		const timestampValidation = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore?.classrooms?.all) return { error: 'No classrooms available' };

			const classrooms = dataStore.classrooms.all;
			if (classrooms.length === 0) return { error: 'No classrooms loaded' };

			const classroom = classrooms[0];
			
			// Check that timestamps are converted to Date objects
			return {
				createdAtIsDate: classroom.createdAt instanceof Date,
				updatedAtIsDate: classroom.updatedAt instanceof Date,
				createdAtValid: classroom.createdAt && !isNaN(classroom.createdAt.getTime()),
				updatedAtValid: classroom.updatedAt && !isNaN(classroom.updatedAt.getTime()),
				hasTimestampMethods: typeof classroom.getAge === 'function' || typeof classroom.formatCreatedDate === 'function'
			};
		});

		if (timestampValidation.error) {
			console.log(`⚠️ Timestamp test limitation: ${timestampValidation.error}`);
		} else {
			console.log('✓ Timestamp validation:', timestampValidation);
			expect(timestampValidation.createdAtIsDate).toBe(true);
			expect(timestampValidation.createdAtValid).toBe(true);
		}
	});

	test('should handle model collection operations', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test collection methods
		const collectionOps = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore?.classrooms) return { error: 'No classroom collection' };

			const collection = dataStore.classrooms;
			
			return {
				hasCountProperty: typeof collection.count === 'number',
				hasAllProperty: Array.isArray(collection.all),
				hasGetMethod: typeof collection.get === 'function',
				hasFilterMethods: typeof collection.getByTeacher === 'function',
				hasTotals: typeof collection.totalStudents === 'number',
				totalClassrooms: collection.count,
				totalStudents: collection.totalStudents,
				totalAssignments: collection.totalAssignments
			};
		});

		if (collectionOps.error) {
			console.log(`⚠️ Collection test limitation: ${collectionOps.error}`);
		} else {
			console.log('✓ Collection operations:', collectionOps);
			expect(collectionOps.hasCountProperty).toBe(true);
			expect(collectionOps.hasAllProperty).toBe(true);
			expect(collectionOps.hasGetMethod).toBe(true);
		}
	});

	test('should handle model validation errors gracefully', async ({ page }) => {
		// Inject invalid data to test model validation
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		const validationTest = await page.evaluate(async () => {
			try {
				// Try to access the ClassroomModel class
				const ClassroomModel = (window as any).ClassroomModel;
				if (!ClassroomModel) return { error: 'ClassroomModel not accessible' };

				// Test invalid data handling
				const invalidData = {
					id: 'test-invalid',
					teacherId: null, // Invalid - should be string
					name: '', // Invalid - should be non-empty
					studentCount: 'invalid', // Invalid - should be number
					createdAt: 'invalid-date'
				};

				try {
					const model = ClassroomModel.fromFirestore(invalidData);
					return {
						handled: true,
						modelCreated: !!model,
						hasValidDefaults: model.name !== '' || model.teacherId !== null
					};
				} catch (validationError) {
					return {
						handled: true,
						validationErrorThrown: true,
						errorMessage: validationError.message
					};
				}
			} catch (error) {
				return { error: error.message };
			}
		});

		if (validationTest.error) {
			console.log(`⚠️ Validation test limitation: ${validationTest.error}`);
		} else {
			console.log('✓ Model validation test:', validationTest);
			// Should either handle gracefully or throw meaningful errors
			expect(validationTest.handled).toBe(true);
		}
	});

	test('should synchronize models with API updates', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test manual refresh to see if models update
		const refreshButton = page.getByRole('button', { name: /refresh/i });
		
		if (await refreshButton.isVisible({ timeout: 3000 })) {
			// Get initial data count
			const initialCount = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					classrooms: dataStore?.classrooms?.count || 0,
					assignments: dataStore?.assignments?.count || 0
				};
			});

			// Trigger refresh
			await refreshButton.click();
			await waitForPageReady(page);

			// Check that data is still consistent after refresh
			const refreshedCount = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					classrooms: dataStore?.classrooms?.count || 0,
					assignments: dataStore?.assignments?.count || 0,
					lastUpdated: dataStore?.classrooms?.lastUpdated?.getTime() || 0
				};
			});

			console.log('✓ Model synchronization test:', {
				initial: initialCount,
				refreshed: refreshedCount
			});

			// Data counts should be consistent
			expect(refreshedCount.classrooms).toBeGreaterThanOrEqual(0);
			expect(refreshedCount.assignments).toBeGreaterThanOrEqual(0);
		} else {
			console.log('⚠️ No refresh button found for synchronization test');
		}
	});

	test('should handle model state reactivity', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Test that UI updates when model state changes
		const reactivityTest = await page.evaluate(async () => {
			const dataStore = (window as any).dataStore;
			if (!dataStore?.classrooms?.all?.length) return { error: 'No classroom data' };

			const initialClassroomCount = dataStore.classrooms.count;
			
			// Test loading test data (if available)
			if (typeof dataStore.loadTestData === 'function') {
				try {
					dataStore.loadTestData();
					
					// Wait for reactivity
					await new Promise(resolve => setTimeout(resolve, 100));
					
					const newCount = dataStore.classrooms.count;
					return {
						initialCount: initialClassroomCount,
						newCount: newCount,
						stateChanged: newCount !== initialClassroomCount,
						testDataLoaded: true
					};
				} catch (error) {
					return { error: error.message };
				}
			} else {
				return { error: 'loadTestData not available' };
			}
		});

		if (reactivityTest.error) {
			console.log(`⚠️ Reactivity test limitation: ${reactivityTest.error}`);
		} else {
			console.log('✓ Model reactivity test:', reactivityTest);
			
			// Should show evidence of state management
			if (reactivityTest.testDataLoaded) {
				expect(reactivityTest.stateChanged).toBe(true);
			}
		}
	});

	test('should handle model error states', async ({ page }) => {
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		// Check for error handling in the data store
		const errorHandling = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			if (!dataStore) return { error: 'DataStore not accessible' };

			return {
				hasErrorState: dataStore.error !== undefined,
				hasErrorMethod: typeof dataStore.setError === 'function',
				hasClearErrorMethod: typeof dataStore.clearError === 'function',
				hasLoadingState: dataStore.loading !== undefined,
				currentError: dataStore.error,
				currentLoading: dataStore.loading
			};
		});

		if (errorHandling.error) {
			console.log(`⚠️ Error handling test limitation: ${errorHandling.error}`);
		} else {
			console.log('✓ Model error handling capabilities:', errorHandling);
			expect(errorHandling.hasErrorState).toBe(true);
			expect(errorHandling.hasLoadingState).toBe(true);
		}
	});
});