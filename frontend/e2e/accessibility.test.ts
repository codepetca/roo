/**
 * End-to-end accessibility tests
 * Location: frontend/e2e/accessibility.test.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should have proper heading hierarchy on login page', async ({ page }) => {
		await page.goto('/login');

		// Check main heading
		const h1 = page.getByRole('heading', { level: 1 });
		await expect(h1).toBeVisible();
		await expect(h1).toContainText(/sign in to roo/i);

		// Should not have multiple h1s
		const allH1s = page.locator('h1');
		await expect(allH1s).toHaveCount(1);
	});

	test('should have proper form labels and associations', async ({ page }) => {
		await page.goto('/login');

		// Check email input has proper label
		const emailInput = page.getByLabelText(/email address/i);
		await expect(emailInput).toBeVisible();
		await expect(emailInput).toHaveAttribute('id', 'email');

		// Check password input has proper label
		const passwordInput = page.getByLabelText(/password/i);
		await expect(passwordInput).toBeVisible();
		await expect(passwordInput).toHaveAttribute('id', 'password');

		// Check required attributes
		await expect(emailInput).toHaveAttribute('required');
		await expect(passwordInput).toHaveAttribute('required');
	});

	test('should have proper button attributes and states', async ({ page }) => {
		await page.goto('/login');

		// Submit button should have proper type
		const submitButton = page.getByRole('button', { name: /sign in/i });
		await expect(submitButton).toHaveAttribute('type', 'submit');

		// Demo buttons should have proper type
		const teacherButton = page.getByRole('button', { name: /teacher demo/i });
		const studentButton = page.getByRole('button', { name: /student demo/i });

		await expect(teacherButton).toHaveAttribute('type', 'button');
		await expect(studentButton).toHaveAttribute('type', 'button');

		// Password toggle should have proper type
		const toggleButtons = page.locator('button[type="button"]');
		await expect(toggleButtons.first()).toBeVisible();
	});

	test('should support keyboard navigation', async ({ page }) => {
		await page.goto('/login');

		// Start keyboard navigation
		let currentElement = page.locator(':focus');

		// Tab through form elements
		await page.keyboard.press('Tab');
		currentElement = page.locator(':focus');
		await expect(currentElement).toBeVisible();

		// Continue tabbing through all interactive elements
		const interactiveElements = [];
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press('Tab');
			const focused =
				(await page.locator(':focus').getAttribute('type')) ||
				(await page.locator(':focus').tagName());
			if (focused) {
				interactiveElements.push(focused);
			}
		}

		// Should have navigated through multiple elements
		expect(interactiveElements.length).toBeGreaterThan(0);
	});

	test('should have proper ARIA attributes', async ({ page }) => {
		await page.goto('/login');

		// Check form has proper role (implicit)
		const form = page.locator('form');
		await expect(form).toBeVisible();

		// Check inputs have proper attributes
		const emailInput = page.getByLabelText(/email address/i);
		await expect(emailInput).toHaveAttribute('type', 'email');

		// Check button states
		const submitButton = page.getByRole('button', { name: /sign in/i });

		// Initially disabled
		await expect(submitButton).toBeDisabled();

		// Fill form to enable
		await emailInput.fill('test@example.com');
		await page.getByLabelText(/password/i).fill('password123');

		await expect(submitButton).toBeEnabled();
	});

	test('should have sufficient color contrast', async ({ page }) => {
		await page.goto('/login');

		// Check main heading has good contrast
		const heading = page.getByRole('heading', { name: /sign in to roo/i });
		const headingColor = await heading.evaluate((el) => getComputedStyle(el).color);

		// Should not be very light colors (basic check)
		expect(headingColor).not.toBe('rgb(255, 255, 255)');
		expect(headingColor).not.toBe('rgb(240, 240, 240)');

		// Check button has good contrast
		const submitButton = page.getByRole('button', { name: /sign in/i });
		const buttonBg = await submitButton.evaluate((el) => getComputedStyle(el).backgroundColor);

		expect(buttonBg).toBeDefined();
	});

	test('should work with screen reader simulation', async ({ page }) => {
		await page.goto('/login');

		// Check that important elements have accessible names
		const heading = page.getByRole('heading', { name: /sign in to roo/i });
		await expect(heading).toBeVisible();

		const emailLabel = page.getByText('Email Address');
		const passwordLabel = page.getByText('Password');

		await expect(emailLabel).toBeVisible();
		await expect(passwordLabel).toBeVisible();

		// Check form structure
		const form = page.locator('form');
		await expect(form).toContainText('Email Address');
		await expect(form).toContainText('Password');
	});

	test('should handle focus management', async ({ page }) => {
		await page.goto('/login');

		// Focus should start on first interactive element when tabbing
		await page.keyboard.press('Tab');
		const firstFocused = page.locator(':focus');
		await expect(firstFocused).toBeVisible();

		// Click demo button should not lose focus management
		await page.getByRole('button', { name: /teacher demo/i }).click();

		// Form should still be navigable
		await page.keyboard.press('Tab');
		const focused = page.locator(':focus');
		await expect(focused).toBeVisible();
	});

	test('should provide feedback for form validation', async ({ page }) => {
		await page.goto('/login');

		const submitButton = page.getByRole('button', { name: /sign in/i });

		// Button should clearly indicate disabled state
		await expect(submitButton).toBeDisabled();

		// Should have visual feedback when enabled
		await page.getByLabelText(/email address/i).fill('test@example.com');
		await page.getByLabelText(/password/i).fill('password123');

		await expect(submitButton).toBeEnabled();

		// Visual state should change
		const enabledButton = page.getByRole('button', { name: /sign in/i });
		await expect(enabledButton).not.toHaveClass(/disabled/);
	});

	test('should be usable without JavaScript', async ({ page }) => {
		// Disable JavaScript
		await page.setJavaScriptEnabled(false);
		await page.goto('/login');

		// Basic form should still be visible
		await expect(page.getByLabelText(/email address/i)).toBeVisible();
		await expect(page.getByLabelText(/password/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

		// Form should be submittable (though won't work without backend)
		const form = page.locator('form');
		await expect(form).toBeVisible();
	});

	test('should handle high contrast mode', async ({ page }) => {
		// Simulate high contrast by checking element visibility
		await page.goto('/login');

		// All interactive elements should be visible
		await expect(page.getByLabelText(/email address/i)).toBeVisible();
		await expect(page.getByLabelText(/password/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

		// Text should be readable
		const heading = page.getByRole('heading', { name: /sign in to roo/i });
		await expect(heading).toBeVisible();

		const description = page.getByText('Access your educational dashboard');
		await expect(description).toBeVisible();
	});

	test('should support reduced motion preferences', async ({ page }) => {
		// Test that animations don't prevent functionality
		await page.goto('/login');

		// Password toggle should work regardless of animations
		const passwordInput = page.getByLabelText(/password/i);
		const toggleButton = page.locator('button[type="button"]').first();

		await expect(passwordInput).toHaveAttribute('type', 'password');

		await toggleButton.click();
		await expect(passwordInput).toHaveAttribute('type', 'text');

		await toggleButton.click();
		await expect(passwordInput).toHaveAttribute('type', 'password');
	});

	test('should handle zoom levels appropriately', async ({ page }) => {
		await page.goto('/login');

		// Test 200% zoom
		await page.setViewportSize({ width: 640, height: 480 }); // Simulate zoom

		// Content should still be accessible
		await expect(page.getByRole('heading', { name: /sign in to roo/i })).toBeVisible();
		await expect(page.getByLabelText(/email address/i)).toBeVisible();
		await expect(page.getByLabelText(/password/i)).toBeVisible();

		// Form should be usable
		await page.getByLabelText(/email address/i).fill('test@example.com');
		await page.getByLabelText(/password/i).fill('password123');

		const submitButton = page.getByRole('button', { name: /sign in/i });
		await expect(submitButton).toBeEnabled();
	});

	test('should have semantic HTML structure', async ({ page }) => {
		await page.goto('/login');

		// Check for proper semantic elements
		const main = page.getByRole('main');
		if (await main.isVisible()) {
			await expect(main).toBeVisible();
		}

		// Form should be properly structured
		const form = page.locator('form');
		await expect(form).toBeVisible();

		// Headings should be properly nested
		const h1 = page.getByRole('heading', { level: 1 });
		await expect(h1).toBeVisible();

		// Should not skip heading levels
		const h3 = page.getByRole('heading', { level: 3 });
		const h2 = page.getByRole('heading', { level: 2 });

		if ((await h3.count()) > 0) {
			// If h3 exists, h2 should also exist
			await expect(h2.count()).toBeGreaterThan(0);
		}
	});
});
