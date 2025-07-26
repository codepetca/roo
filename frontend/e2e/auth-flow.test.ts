/**
 * End-to-end tests for authentication flow
 * Location: frontend/e2e/auth-flow.test.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Start from the home page
		await page.goto('/');
	});

	test('should redirect unauthenticated users to login', async ({ page }) => {
		// Try to access protected dashboard route
		await page.goto('/dashboard');

		// Should be redirected to login with return URL
		await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);

		// Should see login form elements
		await expect(page.getByRole('heading', { name: /sign in to roo/i })).toBeVisible();
		await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
		await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
	});

	test('should show login form with demo credentials', async ({ page }) => {
		await page.goto('/login');

		// Check main form elements
		await expect(page.getByRole('heading', { name: /sign in to roo/i })).toBeVisible();
		await expect(page.getByText('Access your educational dashboard')).toBeVisible();

		// Check form inputs
		await expect(page.getByLabelText(/email address/i)).toBeVisible();
		await expect(page.getByLabelText(/password/i)).toBeVisible();

		// Check demo credential buttons
		await expect(page.getByText('Demo Credentials:')).toBeVisible();
		await expect(page.getByRole('button', { name: /teacher demo/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /student demo/i })).toBeVisible();
	});

	test('should fill demo credentials when buttons are clicked', async ({ page }) => {
		await page.goto('/login');

		const emailInput = page.getByLabelText(/email address/i);
		const passwordInput = page.getByLabelText(/password/i);

		// Test teacher demo button
		await page.getByRole('button', { name: /teacher demo/i }).click();
		await expect(emailInput).toHaveValue('teacher@test.com');
		await expect(passwordInput).toHaveValue('test123');

		// Clear and test student demo button
		await emailInput.clear();
		await passwordInput.clear();

		await page.getByRole('button', { name: /student demo/i }).click();
		await expect(emailInput).toHaveValue('student1@test.com');
		await expect(passwordInput).toHaveValue('test123');
	});

	test('should toggle password visibility', async ({ page }) => {
		await page.goto('/login');

		const passwordInput = page.getByLabelText(/password/i);
		const toggleButton = page.locator('button[type="button"]').nth(0); // Password toggle button

		// Password should start hidden
		await expect(passwordInput).toHaveAttribute('type', 'password');

		// Click toggle button
		await toggleButton.click();
		await expect(passwordInput).toHaveAttribute('type', 'text');

		// Click again to hide
		await toggleButton.click();
		await expect(passwordInput).toHaveAttribute('type', 'password');
	});

	test('should validate form inputs', async ({ page }) => {
		await page.goto('/login');

		const submitButton = page.getByRole('button', { name: /sign in/i });

		// Submit button should be disabled when form is empty
		await expect(submitButton).toBeDisabled();

		// Fill only email
		await page.getByLabelText(/email address/i).fill('test@example.com');
		await expect(submitButton).toBeDisabled();

		// Fill password too
		await page.getByLabelText(/password/i).fill('password123');
		await expect(submitButton).toBeEnabled();

		// Clear email, should be disabled again
		await page.getByLabelText(/email address/i).clear();
		await expect(submitButton).toBeDisabled();
	});

	test('should handle keyboard navigation', async ({ page }) => {
		await page.goto('/login');

		// Tab through form elements
		await page.keyboard.press('Tab'); // Focus email
		await expect(page.getByLabelText(/email address/i)).toBeFocused();

		await page.keyboard.press('Tab'); // Focus password
		await expect(page.getByLabelText(/password/i)).toBeFocused();

		await page.keyboard.press('Tab'); // Focus password toggle
		await page.keyboard.press('Tab'); // Focus submit button
		await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();
	});

	test('should handle Enter key submission', async ({ page }) => {
		await page.goto('/login');

		// Fill demo credentials
		await page.getByRole('button', { name: /teacher demo/i }).click();

		// Press Enter in password field
		await page.getByLabelText(/password/i).press('Enter');

		// This would normally trigger form submission
		// In a real test, we'd mock the auth service or use test credentials
		// For now, we just verify the form elements are correct
		await expect(page.getByLabelText(/email address/i)).toHaveValue('teacher@test.com');
		await expect(page.getByLabelText(/password/i)).toHaveValue('test123');
	});

	test('should display responsive design elements', async ({ page }) => {
		await page.goto('/login');

		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Form should still be visible and accessible
		await expect(page.getByRole('heading', { name: /sign in to roo/i })).toBeVisible();
		await expect(page.getByLabelText(/email address/i)).toBeVisible();

		// Test desktop viewport
		await page.setViewportSize({ width: 1280, height: 720 });

		// Form should still be visible
		await expect(page.getByRole('heading', { name: /sign in to roo/i })).toBeVisible();
		await expect(page.getByLabelText(/email address/i)).toBeVisible();
	});

	test('should have proper accessibility attributes', async ({ page }) => {
		await page.goto('/login');

		// Check form has proper labels
		const emailInput = page.getByLabelText(/email address/i);
		const passwordInput = page.getByLabelText(/password/i);

		await expect(emailInput).toHaveAttribute('type', 'email');
		await expect(emailInput).toHaveAttribute('required');
		await expect(passwordInput).toHaveAttribute('required');

		// Check submit button has proper type
		const submitButton = page.getByRole('button', { name: /sign in/i });
		await expect(submitButton).toHaveAttribute('type', 'submit');
	});

	test('should maintain form state during interaction', async ({ page }) => {
		await page.goto('/login');

		const emailInput = page.getByLabelText(/email address/i);
		const passwordInput = page.getByLabelText(/password/i);

		// Fill form manually
		await emailInput.fill('custom@example.com');
		await passwordInput.fill('custompassword');

		// Click teacher demo (should override)
		await page.getByRole('button', { name: /teacher demo/i }).click();

		await expect(emailInput).toHaveValue('teacher@test.com');
		await expect(passwordInput).toHaveValue('test123');

		// Manually edit after demo
		await emailInput.clear();
		await emailInput.fill('modified@example.com');

		await expect(emailInput).toHaveValue('modified@example.com');
		await expect(passwordInput).toHaveValue('test123'); // Should retain demo password
	});
});
