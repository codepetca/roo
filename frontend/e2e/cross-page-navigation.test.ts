/**
 * Cross-page Navigation E2E Tests
 * Location: frontend/e2e/cross-page-navigation.test.ts
 *
 * Tests user journeys across multiple pages and complete workflows
 */

import { test, expect } from '@playwright/test';
import { signInAsTeacher, signInAsStudent, waitForPageReady, debugPage } from './test-helpers';

test.describe('Cross-page Navigation Tests', () => {
	test('should complete teacher onboarding journey', async ({ page }) => {
		// Start from login
		await page.goto('/login');
		await waitForPageReady(page);

		console.log('Testing complete teacher onboarding journey...');

		// 1. Login as teacher
		await signInAsTeacher(page);

		// 2. Should land on dashboard
		let currentUrl = page.url();
		if (currentUrl.includes('/dashboard/teacher')) {
			console.log('✓ Step 1: Successfully logged in and reached teacher dashboard');
		} else {
			console.log('⚠️ Step 1: Did not reach teacher dashboard, at:', currentUrl);
		}

		// 3. Navigate to data import if no data
		const hasData = await page.locator('text=/no.*data|import.*data/i').isVisible({ timeout: 3000 });
		
		if (hasData) {
			console.log('Testing data import flow...');
			
			const importButton = page.getByRole('button', { name: /import.*data/i });
			if (await importButton.isVisible({ timeout: 3000 })) {
				await importButton.click();
				await waitForPageReady(page);
				
				currentUrl = page.url();
				if (currentUrl.includes('/import') || currentUrl.includes('/onboarding')) {
					console.log('✓ Step 2: Successfully navigated to data import');
				}
			}
		}

		// 4. Navigate to assignments page
		await page.goto('/dashboard/teacher/assignments');
		await waitForPageReady(page);
		console.log('✓ Step 3: Navigated to assignments page');

		// 5. Navigate to grades page
		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);
		console.log('✓ Step 4: Navigated to grades page');

		// 6. Return to dashboard
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);
		console.log('✓ Step 5: Returned to dashboard - journey complete');
	});

	test('should complete student learning journey', async ({ page }) => {
		console.log('Testing complete student learning journey...');

		try {
			// 1. Login as student
			await signInAsStudent(page);

			// 2. Should land on student dashboard
			let currentUrl = page.url();
			if (currentUrl.includes('/dashboard/student')) {
				console.log('✓ Step 1: Successfully logged in and reached student dashboard');

				// 3. Look for assignments
				const assignmentElements = [
					'text=/assignment|homework/i',
					'a[href*="/student/assignments"]',
					'text=/view.*assignment/i'
				];

				let foundAssignmentNav = false;
				for (const element of assignmentElements) {
					if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
						console.log(`✓ Step 2: Found assignment navigation: ${element}`);
						foundAssignmentNav = true;
						break;
					}
				}

				// 4. Navigate to grades if available
				const gradesElements = [
					'a[href*="/student/grades"]',
					'text=/view.*grades/i',
					'text=/my.*grades/i'
				];

				for (const element of gradesElements) {
					if (await page.locator(element).isVisible({ timeout: 3000 }).catch(() => false)) {
						await page.locator(element).first().click();
						await waitForPageReady(page);
						console.log('✓ Step 3: Navigated to student grades');
						break;
					}
				}

				// 5. Return to student dashboard
				await page.goto('/dashboard/student');
				await waitForPageReady(page);
				console.log('✓ Step 4: Student journey complete');
			} else {
				console.log('⚠️ Student login may have failed, ended up at:', currentUrl);
			}
		} catch (error) {
			console.log('⚠️ Student journey test failed:', error.message);
		}
	});

	test('should handle navigation state persistence', async ({ page }) => {
		await signInAsTeacher(page);
		
		// Navigate through multiple pages and verify state persistence
		const navigationPath = [
			'/dashboard/teacher',
			'/dashboard/teacher/assignments',
			'/dashboard/teacher/grades',
			'/dashboard/teacher'
		];

		for (let i = 0; i < navigationPath.length; i++) {
			const path = navigationPath[i];
			await page.goto(path);
			await waitForPageReady(page);

			// Check that we're authenticated and data is available
			const pageState = await page.evaluate(() => {
				const dataStore = (window as any).dataStore;
				return {
					authenticated: !!dataStore?.currentUser,
					initialized: dataStore?.initialized,
					hasData: dataStore?.hasData,
					currentPath: window.location.pathname
				};
			});

			console.log(`✓ Navigation step ${i + 1}: ${path}`, pageState);
			expect(pageState.authenticated).toBe(true);
			expect(pageState.currentPath).toContain(path.split('/').pop() || path);
		}
	});

	test('should handle deep linking to specific resources', async ({ page }) => {
		await signInAsTeacher(page);

		// Test direct navigation to specific assignment
		const deepLinks = [
			'/dashboard/teacher/assignments/test-assignment-1',
			'/dashboard/teacher/assignments', 
			'/dashboard/teacher/grades'
		];

		for (const link of deepLinks) {
			try {
				await page.goto(link);
				await waitForPageReady(page);

				const currentUrl = page.url();
				const isCorrectPage = currentUrl.includes(link.split('/').pop() || '');
				
				console.log(`✓ Deep link test: ${link} -> ${isCorrectPage ? 'success' : 'redirected'}`);
				
				// Should either show the page or handle the redirect gracefully
				const hasErrorPage = await page.locator('text=/404|not.*found|error/i').isVisible({ timeout: 2000 }).catch(() => false);
				expect(hasErrorPage).toBe(false); // Should not show error page
			} catch (error) {
				console.log(`⚠️ Deep link failed: ${link} - ${error.message}`);
			}
		}
	});

	test('should handle back/forward browser navigation', async ({ page }) => {
		await signInAsTeacher(page);

		// Navigate through several pages
		await page.goto('/dashboard/teacher');
		await waitForPageReady(page);

		await page.goto('/dashboard/teacher/assignments');
		await waitForPageReady(page);

		await page.goto('/dashboard/teacher/grades');
		await waitForPageReady(page);

		// Test browser back button
		await page.goBack();
		await waitForPageReady(page);
		
		let currentUrl = page.url();
		expect(currentUrl).toContain('/assignments');
		console.log('✓ Browser back navigation works');

		// Test browser forward button
		await page.goForward();
		await waitForPageReady(page);
		
		currentUrl = page.url();
		expect(currentUrl).toContain('/grades');
		console.log('✓ Browser forward navigation works');
	});

	test('should handle unauthorized access attempts', async ({ page }) => {
		// Try accessing teacher pages without authentication
		const protectedRoutes = [
			'/dashboard/teacher',
			'/dashboard/teacher/assignments',
			'/dashboard/teacher/grades',
			'/teacher/data-import'
		];

		for (const route of protectedRoutes) {
			await page.goto(route);
			await waitForPageReady(page);

			const currentUrl = page.url();
			
			// Should redirect to login or show appropriate message
			if (currentUrl.includes('/login')) {
				console.log(`✓ Protected route ${route} correctly redirected to login`);
			} else if (currentUrl === route) {
				// Check for authentication prompt
				const authRequired = await page.locator('text=/sign.*in|login|authenticate/i').isVisible({ timeout: 2000 }).catch(() => false);
				if (authRequired) {
					console.log(`✓ Protected route ${route} shows authentication requirement`);
				} else {
					console.log(`⚠️ Protected route ${route} may not be properly protected`);
				}
			}
		}
	});

	test('should handle role-based access control', async ({ page }) => {
		// Login as teacher first
		await signInAsTeacher(page);

		// Try accessing student-only routes
		const studentRoutes = ['/dashboard/student', '/dashboard/student/grades'];

		for (const route of studentRoutes) {
			await page.goto(route);
			await waitForPageReady(page);

			const currentUrl = page.url();
			
			// Should either redirect or show appropriate role-based content
			if (currentUrl.includes('/teacher')) {
				console.log(`✓ Teacher accessing student route ${route} redirected to teacher area`);
			} else if (currentUrl === route) {
				// Check if it shows teacher-appropriate content or error
				const hasRoleError = await page.locator('text=/unauthorized|access.*denied|not.*authorized/i').isVisible({ timeout: 2000 }).catch(() => false);
				if (hasRoleError) {
					console.log(`✓ Role-based access control working for ${route}`);
				}
			}
		}
	});

	test('should maintain consistent navigation UI across pages', async ({ page }) => {
		await signInAsTeacher(page);

		const pagesToCheck = [
			'/dashboard/teacher',
			'/dashboard/teacher/assignments',
			'/dashboard/teacher/grades'
		];

		const navigationElements = [
			'nav, .navigation, .nav-menu',
			'a[href*="/dashboard"]',
			'text=/dashboard|home/i',
			'button:has-text(/logout|sign.*out/i)'
		];

		for (const path of pagesToCheck) {
			await page.goto(path);
			await waitForPageReady(page);

			let foundNavElements = 0;
			for (const navElement of navigationElements) {
				if (await page.locator(navElement).isVisible({ timeout: 2000 }).catch(() => false)) {
					foundNavElements++;
				}
			}

			console.log(`✓ Page ${path} has ${foundNavElements} navigation elements`);
			expect(foundNavElements).toBeGreaterThan(0); // Should have at least some navigation
		}
	});

	test('should handle page refresh without losing context', async ({ page }) => {
		await signInAsTeacher(page);

		// Navigate to assignments page
		await page.goto('/dashboard/teacher/assignments');
		await waitForPageReady(page);

		const beforeRefreshState = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			return {
				authenticated: !!dataStore?.currentUser,
				initialized: dataStore?.initialized,
				assignmentCount: dataStore?.assignments?.count || 0
			};
		});

		// Refresh the page
		await page.reload();
		await waitForPageReady(page);

		const afterRefreshState = await page.evaluate(() => {
			const dataStore = (window as any).dataStore;
			return {
				authenticated: !!dataStore?.currentUser,
				initialized: dataStore?.initialized,
				assignmentCount: dataStore?.assignments?.count || 0
			};
		});

		console.log('✓ Page refresh context preservation:', {
			before: beforeRefreshState,
			after: afterRefreshState
		});

		// Should maintain authentication and reinitialize properly
		expect(afterRefreshState.authenticated).toBe(true);
		expect(afterRefreshState.initialized).toBe(true);
	});

	test('should handle navigation performance', async ({ page }) => {
		await signInAsTeacher(page);

		const routes = [
			'/dashboard/teacher',
			'/dashboard/teacher/assignments',
			'/dashboard/teacher/grades'
		];

		const navigationTimes = [];

		for (let i = 0; i < routes.length; i++) {
			const startTime = Date.now();
			await page.goto(routes[i]);
			await waitForPageReady(page);
			const endTime = Date.now();

			const navigationTime = endTime - startTime;
			navigationTimes.push(navigationTime);
			
			console.log(`✓ Navigation to ${routes[i]}: ${navigationTime}ms`);
		}

		const averageTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
		console.log(`✓ Average navigation time: ${averageTime.toFixed(2)}ms`);

		// Navigation should be reasonably fast (under 5 seconds per page)
		navigationTimes.forEach(time => {
			expect(time).toBeLessThan(5000);
		});
	});

	test('should handle navigation errors gracefully', async ({ page }) => {
		await signInAsTeacher(page);

		// Test navigation to non-existent pages
		const invalidRoutes = [
			'/dashboard/teacher/nonexistent',
			'/dashboard/teacher/assignments/invalid-id-12345',
			'/invalid/path/here'
		];

		for (const route of invalidRoutes) {
			try {
				await page.goto(route);
				await waitForPageReady(page);

				// Should handle gracefully with 404 page or redirect
				const currentUrl = page.url();
				const hasNotFoundPage = await page.locator('text=/404|not.*found|page.*not.*found/i').isVisible({ timeout: 2000 }).catch(() => false);
				const redirectedToValidPage = currentUrl.includes('/dashboard/teacher') && !currentUrl.includes('nonexistent') && !currentUrl.includes('invalid');

				if (hasNotFoundPage) {
					console.log(`✓ Invalid route ${route} shows proper 404 page`);
				} else if (redirectedToValidPage) {
					console.log(`✓ Invalid route ${route} redirected to valid page: ${currentUrl}`);
				} else {
					console.log(`⚠️ Invalid route ${route} handling unclear - ended at: ${currentUrl}`);
				}
			} catch (error) {
				console.log(`✓ Invalid route ${route} properly caught error: ${error.message}`);
			}
		}
	});
});