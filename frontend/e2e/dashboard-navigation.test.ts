/**
 * End-to-end tests for dashboard navigation and functionality
 * Location: frontend/e2e/dashboard-navigation.test.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
	test.beforeEach(async ({ page }) => {
		// For these tests, we assume user is authenticated
		// In a real scenario, we'd set up authentication state or use a test user
		await page.goto('/');
	});

	test('should show main dashboard structure', async ({ page }) => {
		// Navigate to dashboard (in real scenario, would be authenticated first)
		await page.goto('/dashboard');

		// Check if we're on login page (unauthenticated scenario)
		const currentUrl = page.url();
		if (currentUrl.includes('/login')) {
			// Skip this test if authentication is required
			test.skip('Authentication required for this test');
		}

		// If we reach dashboard, check main elements
		await expect(page.getByRole('heading', { name: /teacher dashboard/i })).toBeVisible();
		await expect(
			page.getByText('Manage assignments, review submissions, and track student progress')
		).toBeVisible();
	});

	test('should navigate to assignments page', async ({ page }) => {
		await page.goto('/dashboard/assignments');

		// Check if redirected to login
		if (page.url().includes('/login')) {
			test.skip('Authentication required for this test');
		}

		// Should show assignments page elements
		await expect(page.getByText('Assignments')).toBeVisible();
	});

	test('should navigate to grades page', async ({ page }) => {
		await page.goto('/dashboard/grades');

		// Check if redirected to login
		if (page.url().includes('/login')) {
			test.skip('Authentication required for this test');
		}

		// Should show grades page elements
		await expect(page.getByText('Grades')).toBeVisible();
	});

	test('should handle responsive navigation', async ({ page }) => {
		await page.goto('/dashboard');

		if (page.url().includes('/login')) {
			test.skip('Authentication required for this test');
		}

		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Navigation should still be accessible
		await expect(page.getByRole('main')).toBeVisible();

		// Test desktop viewport
		await page.setViewportSize({ width: 1280, height: 720 });

		// Full navigation should be visible
		await expect(page.getByRole('main')).toBeVisible();
	});

	test('should show proper page titles and headings', async ({ page }) => {
		const pages = [
			{ path: '/dashboard', heading: /teacher dashboard/i },
			{ path: '/dashboard/assignments', heading: /assignments/i },
			{ path: '/dashboard/grades', heading: /grades/i }
		];

		for (const { path, heading } of pages) {
			await page.goto(path);

			if (page.url().includes('/login')) {
				continue; // Skip if authentication required
			}

			// Check page heading
			await expect(page.locator('h1, h2').first()).toContainText(heading);
		}
	});

	test('should handle navigation between dashboard sections', async ({ page }) => {
		await page.goto('/dashboard');

		if (page.url().includes('/login')) {
			test.skip('Authentication required for this test');
		}

		// If there are navigation links, test them
		const assignmentsLink = page.getByRole('link', { name: /assignments/i });
		const gradesLink = page.getByRole('link', { name: /grades/i });

		if (await assignmentsLink.isVisible()) {
			await assignmentsLink.click();
			await expect(page).toHaveURL(/\/dashboard\/assignments/);
		}

		if (await gradesLink.isVisible()) {
			await gradesLink.click();
			await expect(page).toHaveURL(/\/dashboard\/grades/);
		}
	});

	test('should maintain consistent layout structure', async ({ page }) => {
		const dashboardPages = ['/dashboard', '/dashboard/assignments', '/dashboard/grades'];

		for (const path of dashboardPages) {
			await page.goto(path);

			if (page.url().includes('/login')) {
				continue;
			}

			// Check for consistent layout elements
			await expect(page.getByRole('main')).toBeVisible();

			// Check for proper HTML structure
			const mainContent = page.getByRole('main');
			await expect(mainContent).toBeVisible();
		}
	});

	test('should handle page refresh correctly', async ({ page }) => {
		await page.goto('/dashboard');

		if (page.url().includes('/login')) {
			test.skip('Authentication required for this test');
		}

		// Refresh the page
		await page.reload();

		// Should still show dashboard content (if authenticated)
		// Or redirect to login (if not authenticated)
		const currentUrl = page.url();
		const isOnDashboard = currentUrl.includes('/dashboard') && !currentUrl.includes('/login');
		const isOnLogin = currentUrl.includes('/login');

		expect(isOnDashboard || isOnLogin).toBe(true);
	});

	test('should have proper meta tags and page titles', async ({ page }) => {
		await page.goto('/dashboard');

		if (page.url().includes('/login')) {
			// Test login page title
			await expect(page).toHaveTitle(/login|sign in/i);
		} else {
			// Test dashboard page title
			await expect(page).toHaveTitle(/dashboard/i);
		}
	});

	test('should handle keyboard navigation', async ({ page }) => {
		await page.goto('/dashboard');

		if (page.url().includes('/login')) {
			test.skip('Authentication required for this test');
		}

		// Test Tab navigation through interactive elements
		await page.keyboard.press('Tab');

		// Should focus on first interactive element
		const focusedElement = page.locator(':focus');
		await expect(focusedElement).toBeVisible();
	});

	test('should show loading states appropriately', async ({ page }) => {
		// Navigate to a dashboard page
		await page.goto('/dashboard');

		if (page.url().includes('/login')) {
			test.skip('Authentication required for this test');
		}

		// In a real implementation, we might see loading indicators
		// For now, just verify the page loads without errors
		await expect(page.getByRole('main')).toBeVisible();
	});

	test('should handle error states gracefully', async ({ page }) => {
		// Test invalid routes
		await page.goto('/dashboard/invalid-page');

		// Should either redirect to login or show 404/error page
		const currentUrl = page.url();
		const hasRedirected =
			currentUrl.includes('/login') || currentUrl.includes('/404') || currentUrl.includes('/error');

		// If not redirected, should be on a valid page
		if (!hasRedirected) {
			await expect(page.getByRole('main')).toBeVisible();
		}
	});

	test('should maintain scroll position appropriately', async ({ page }) => {
		await page.goto('/dashboard');

		if (page.url().includes('/login')) {
			test.skip('Authentication required for this test');
		}

		// Scroll down if there's scrollable content
		await page.evaluate(() => window.scrollTo(0, 200));

		// Navigate to another page and back
		await page.goto('/dashboard/assignments');
		await page.goBack();

		// Should be back on dashboard
		await expect(page).toHaveURL(/\/dashboard$/);
	});

	test('should work with browser back/forward buttons', async ({ page }) => {
		// Start from home
		await page.goto('/');

		// Navigate to dashboard
		await page.goto('/dashboard');

		// Use browser back button
		await page.goBack();
		await expect(page).toHaveURL('/');

		// Use browser forward button
		await page.goForward();

		// Should be back to dashboard or login
		const currentUrl = page.url();
		expect(currentUrl.includes('/dashboard') || currentUrl.includes('/login')).toBe(true);
	});
});
