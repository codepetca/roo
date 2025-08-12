/**
 * Core Authentication E2E Tests
 * Location: frontend/e2e/core-auth.test.ts
 *
 * Tests the complete sign-in flow from start to dashboard access
 */

import { test, expect } from '@playwright/test';
import { signInAsTeacher, PageElements, waitForPageReady, debugPage } from './test-helpers';

test.describe('Core Authentication Flow', () => {
	test('should redirect unauthenticated users to login', async ({ page }) => {
		// Try to access protected dashboard
		await page.goto('/dashboard');

		// Should redirect to login with return URL
		await page.waitForURL(/\/login/, { timeout: 10000 });
		await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);

		// Should show login page
		await expect(page.locator(PageElements.loginHeading)).toBeVisible();
		await expect(page.getByText('AI-powered auto-grading system')).toBeVisible();
	});

	test('should display role selection on login page', async ({ page }) => {
		await page.goto('/login');

		// Check main elements
		await expect(page.locator(PageElements.loginHeading)).toBeVisible();
		await expect(page.getByText('How would you like to sign in?')).toBeVisible();

		// Check role buttons
		await expect(page.locator(PageElements.teacherButton)).toBeVisible();
		await expect(page.getByRole('button', { name: /student/i })).toBeVisible();
	});

	test('should navigate through teacher authentication flow', async ({ page }) => {
		await page.goto('/login');

		// Step 1: Select teacher role
		await page.locator(PageElements.teacherButton).click();

		// Should show authentication methods
		await expect(page.getByText(/google.*account|email.*password/i)).toBeVisible();

		// Step 2: Select email authentication
		await page.locator(PageElements.emailButton).click();

		// Should show email form
		await expect(page.getByPlaceholder(/email/i)).toBeVisible();
		await expect(page.getByPlaceholder(/password/i)).toBeVisible();
	});

	test('should complete full teacher sign-in flow', async ({ page }) => {
		try {
			// Perform complete sign-in
			await signInAsTeacher(page);

			// Verify we're on dashboard
			const currentUrl = page.url();
			expect(currentUrl).toContain('/dashboard');

			// Verify page is loaded
			await waitForPageReady(page);

			// Should see dashboard elements
			const dashboardHeading = page.locator(PageElements.dashboardHeading);
			await expect(dashboardHeading.first()).toBeVisible();
		} catch (error) {
			// Debug on failure
			await debugPage(page, 'sign-in-failure');
			throw error;
		}
	});

	test('should handle invalid credentials gracefully', async ({ page }) => {
		await page.goto('/login');

		// Navigate to email form
		await page.locator(PageElements.teacherButton).click();
		await page.locator(PageElements.emailButton).click();

		// Try invalid credentials
		await page.getByPlaceholder(/email/i).fill('invalid@test.com');
		await page.getByPlaceholder(/password/i).fill('wrongpassword');
		await page.getByRole('button', { name: /sign in/i }).click();

		// Should show error or stay on login
		await page.waitForTimeout(3000);
		const currentUrl = page.url();
		expect(currentUrl).toContain('/login');
	});
});
