/**
 * Firebase Authentication Helpers for E2E Tests
 * Uses real Firebase Auth for testing
 */

import { expect, type Page } from '@playwright/test';

// Base API URL for the backend (production Firebase)
const API_BASE_URL = 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api';

interface TestUser {
	email: string;
	password: string;
	role: 'teacher' | 'student';
	displayName?: string;
	uid?: string;
	firebaseToken?: string;
}

interface AuthResponse {
	uid: string;
	email: string;
	role: string;
	firebaseToken: string;
	isNewUser: boolean;
}

/**
 * Create a test user via the backend API
 */
export async function createTestUser(user: TestUser): Promise<AuthResponse> {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/signup`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				email: user.email,
				password: user.password,
				role: user.role,
				displayName: user.displayName || user.email.split('@')[0]
			})
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('Failed to create test user:', error);
			throw new Error(`Failed to create user: ${error.message || response.statusText}`);
		}

		const data = await response.json();
		console.log(`✓ Created test ${user.role}: ${user.email}`);
		return data;
	} catch (error) {
		console.error('Error creating test user:', error);
		throw error;
	}
}

/**
 * Delete a test user via Firebase Admin API
 */
export async function deleteTestUser(uid: string): Promise<void> {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/user/${uid}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: response.statusText }));
			console.error('Failed to delete test user:', error);
			// Don't throw - cleanup failures shouldn't break tests
			return;
		}

		const data = await response.json();
		console.log(`✓ Deleted test user: ${uid}`);
	} catch (error) {
		console.error('Error deleting test user:', error);
		// Don't throw - cleanup failures shouldn't break tests
	}
}

/**
 * Sign in to the application using the UI
 */
export async function signInViaUI(page: Page, user: TestUser): Promise<void> {
	// Navigate to login page
	await page.goto('/login');

	// Select role
	if (user.role === 'teacher') {
		await page.click('button:has-text("Teacher")');
	} else {
		await page.click('button:has-text("Student")');
	}

	await page.waitForTimeout(500);

	// For students, we have a different auth flow
	if (user.role === 'student') {
		// Enter email
		const emailInput = page.locator('input[type="email"]');
		await emailInput.fill(user.email);

		// Click continue/next
		const continueButton = page
			.locator('button[type="submit"]')
			.or(page.locator('button:has-text("Continue")'));
		await continueButton.click();

		// Wait for passcode or password input
		await page.waitForTimeout(1000);

		// If password field exists, fill it
		const passwordInput = page.locator('input[type="password"]');
		if (await passwordInput.isVisible({ timeout: 2000 })) {
			await passwordInput.fill(user.password);
			const submitButton = page
				.locator('button[type="submit"]')
				.or(page.locator('button:has-text("Sign In")'));
			await submitButton.click();
		}
	} else {
		// Teacher login - currently only Google OAuth is available
		// We'll need to handle this differently or add email/password support
		console.log('Teacher login currently requires Google OAuth');
		// For testing, we might need to mock the OAuth flow or add a test mode
	}

	// Wait for navigation to dashboard
	await page.waitForTimeout(2000);
}

/**
 * Get authentication token from localStorage or sessionStorage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
	return await page.evaluate(() => {
		// Check both storage locations
		return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
	});
}

/**
 * Set authentication token in browser storage
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
	await page.evaluate((authToken) => {
		localStorage.setItem('auth_token', authToken);
		sessionStorage.setItem('auth_token', authToken);
	}, token);
}

/**
 * Sign in programmatically by setting auth token
 */
export async function signInProgrammatically(
	page: Page,
	authResponse: AuthResponse
): Promise<void> {
	// Set the Firebase token in storage
	await page.evaluate((token) => {
		// Store the token where the app expects it
		localStorage.setItem('firebase_token', token);
		// Also store user info
		localStorage.setItem('user_role', 'teacher');
		localStorage.setItem('user_email', 'test@example.com');
	}, authResponse.firebaseToken);

	// Navigate to dashboard
	await page.goto('/dashboard/teacher');

	// Wait for dashboard to load
	await page.waitForTimeout(2000);
}

/**
 * Clean up all test data for a user
 */
export async function cleanupTestUser(uid: string): Promise<void> {
	try {
		// Delete user account
		await deleteTestUser(uid);

		// TODO: Clean up associated data (classrooms, assignments, etc.)
		console.log(`Cleaned up test user: ${uid}`);
	} catch (error) {
		console.error('Error cleaning up test user:', error);
	}
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(7);
	return `${prefix}.${timestamp}.${random}@test.roo.app`;
}

/**
 * Generate a secure test password
 */
export function generateTestPassword(): string {
	return `Test${Date.now()}!@#`;
}

/**
 * Wait for Firebase Auth to be ready
 */
export async function waitForAuth(page: Page): Promise<void> {
	await page.waitForFunction(
		() => {
			// Check if Firebase is loaded
			return (
				typeof window !== 'undefined' &&
				window.localStorage &&
				(window.localStorage.getItem('firebase_token') || window.localStorage.getItem('auth_token'))
			);
		},
		{ timeout: 10000 }
	);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
	const token = await getAuthToken(page);
	return token !== null;
}
