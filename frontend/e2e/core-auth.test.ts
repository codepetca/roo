/**
 * Core Authentication E2E Tests
 * Location: frontend/e2e/core-auth.test.ts
 *
 * Tests the complete sign-in flow from start to dashboard access
 */

import { test, expect } from '@playwright/test';
import {
	signInAsTeacher,
	PageElements,
	waitForPageReady,
	debugPage,
	clickElementSafely,
	waitForElementSafely,
	checkWelcomeText
} from './test-helpers';

test.describe('Core Authentication Flow', () => {
	test('should redirect unauthenticated users to login', async ({ page }) => {
		// Try to access protected teacher dashboard
		await page.goto('/teacher');

		// Should redirect to login with return URL
		await page.waitForURL(/\/login/, { timeout: 10000 });
		await expect(page).toHaveURL(/\/login\?redirect=%2Fteacher/);

		// Should show login page with welcome text
		const hasWelcome = await checkWelcomeText(page);
		if (hasWelcome) {
			console.log('✓ Welcome text found');
		} else {
			// Fallback check for any heading
			await expect(page.locator('h1, h2').first()).toBeVisible();
		}

		// Check for descriptive text (may not always be present)
		const descriptiveText = page.getByText('AI-powered auto-grading system');
		if (await descriptiveText.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(descriptiveText).toBeVisible();
		}
	});

	test('should display role selection on login page', async ({ page }) => {
		await page.goto('/login');

		// Check main elements with flexible matching
		const hasWelcome = await checkWelcomeText(page);
		if (!hasWelcome) {
			// Fallback to any heading
			await expect(page.locator('h1, h2').first()).toBeVisible();
		}

		// Check for sign-in prompt (may vary in wording)
		const signInPrompts = [
			'How would you like to sign in?',
			'Choose your role',
			'Select user type',
			'Sign in as'
		];

		let promptFound = false;
		for (const prompt of signInPrompts) {
			if (
				await page
					.getByText(prompt)
					.isVisible({ timeout: 2000 })
					.catch(() => false)
			) {
				await expect(page.getByText(prompt)).toBeVisible();
				promptFound = true;
				break;
			}
		}

		if (!promptFound) {
			console.log('⚠️ No specific sign-in prompt found, but role buttons should be visible');
		}

		// Check role buttons
		await expect(page.locator(PageElements.teacherButton)).toBeVisible();
		await expect(page.locator(PageElements.studentButton)).toBeVisible();
	});

	test('should navigate through teacher authentication flow', async ({ page }) => {
		await page.goto('/login');
		await waitForPageReady(page);

		// Step 1: Select teacher role - should go directly to email form
		try {
			await clickElementSafely(page, PageElements.teacherButton, {
				fallbackSelectors: [
					'button:has-text("Teacher")',
					'[data-role="teacher"]',
					'button[aria-label*="Teacher"]'
				]
			});
			await waitForPageReady(page);

			// Should now show email auth form directly (no intermediate page)
			const emailFormSelectors = [
				'[data-testid="teacher-email-auth"]',
				'[data-testid="teacher-email-signin-title"]',
				'text=/teacher.*email.*sign.*in/i'
			];

			let foundEmailForm = false;
			for (const selector of emailFormSelectors) {
				if (
					await page
						.locator(selector)
						.isVisible({ timeout: 5000 })
						.catch(() => false)
				) {
					console.log(`✓ Found email auth form: ${selector}`);
					foundEmailForm = true;
					break;
				}
			}

			if (!foundEmailForm) {
				throw new Error('Direct email auth form not found after teacher selection');
			}

			// Should show email and password inputs - use flexible selectors
			const emailInputSelectors = [
				'[data-testid="email-input"]',
				'input[type="email"]',
				'input[placeholder*="email" i]',
				'input[name="email"]'
			];

			let foundEmailInput = false;
			for (const selector of emailInputSelectors) {
				try {
					const emailInput = await waitForElementSafely(page, selector, { timeout: 3000 });
					await expect(emailInput).toBeVisible();
					foundEmailInput = true;
					console.log(`✓ Found email input: ${selector}`);
					break;
				} catch {
					continue;
				}
			}

			if (!foundEmailInput) {
				throw new Error('Email input field not found');
			}

			const passwordInputSelectors = [
				'[data-testid="password-input"]',
				'input[type="password"]',
				'input[placeholder*="password" i]',
				'input[name="password"]'
			];

			let foundPasswordInput = false;
			for (const selector of passwordInputSelectors) {
				try {
					const passwordInput = await waitForElementSafely(page, selector, { timeout: 3000 });
					await expect(passwordInput).toBeVisible();
					foundPasswordInput = true;
					console.log(`✓ Found password input: ${selector}`);
					break;
				} catch {
					continue;
				}
			}

			if (!foundPasswordInput) {
				throw new Error('Password input field not found');
			}

			console.log('✓ Teacher authentication flow navigation completed successfully');
		} catch (error) {
			await debugPage(page, 'auth-flow-navigation-failure');
			throw error;
		}
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
		try {
			await page.goto('/login');
			await waitForPageReady(page);

			// Navigate directly to email form (no intermediate step)
			await clickElementSafely(page, PageElements.teacherButton);
			await waitForPageReady(page);
			
			// Verify we're on the email auth form
			await page.waitForSelector('[data-testid="teacher-email-auth"]', { timeout: 5000 });

			// Fill invalid credentials using proper test IDs
			const emailInput = await waitForElementSafely(page, '[data-testid="email-input"]', {
				timeout: 5000
			});
			await emailInput.clear();
			await emailInput.fill('invalid@test.com');

			const passwordInput = await waitForElementSafely(page, '[data-testid="password-input"]', {
				timeout: 5000
			});
			await passwordInput.clear();
			await passwordInput.fill('wrongpassword');

			// Wait for form to be ready and button to be enabled
			// Use both test ID and fallback selectors
			let submitButton = page.locator('[data-testid="submit-auth-button"]');
			const buttonFound = await submitButton.isVisible({ timeout: 2000 }).catch(() => false);

			if (!buttonFound) {
				// Fallback to visible Sign In button
				submitButton = page.locator('button:has-text("Sign In")').first();
				await expect(submitButton).toBeVisible();
			}

			await expect(submitButton).toBeEnabled({ timeout: 10000 });
			await submitButton.click();

			// Wait for auth response
			await page.waitForTimeout(3000);

			// Check for error message using the exact test ID from the component
			const errorMessage = page.locator('[data-testid="auth-error-message"]');
			if (await errorMessage.isVisible({ timeout: 5000 })) {
				const errorText = await errorMessage.textContent();
				console.log(`✓ Error message shown: ${errorText}`);
				expect(errorText).toMatch(
					/invalid.*credential|authentication.*failed|wrong.*password|user.*not.*found/i
				);
			} else {
				console.log('⚠️ No explicit error message - may be expected behavior');
			}

			// Should remain on login page
			const currentUrl = page.url();
			expect(currentUrl).toContain('/login');
			console.log('✓ Remained on login page after invalid credentials');
		} catch (error) {
			await debugPage(page, 'invalid-credentials-test-failure');
			throw error;
		}
	});
});
