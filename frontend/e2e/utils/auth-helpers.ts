/**
 * Authentication Helpers for E2E Tests
 * Location: frontend/e2e/utils/auth-helpers.ts
 *
 * Utilities to handle authentication setup and mocking in E2E tests
 */

import { Page, expect } from '@playwright/test';

export interface MockUser {
	uid: string;
	email: string;
	displayName: string;
	role: 'teacher' | 'student';
}

/**
 * Default test users
 */
export const TEST_USERS = {
	teacher: {
		uid: 'teacher-e2e-123',
		email: 'e2e.teacher@test.com',
		displayName: 'E2E Test Teacher',
		role: 'teacher' as const
	},
	codepetTeacher: {
		uid: 'codepet-teacher-123',
		email: 'test.codepet@gmail.com',
		displayName: 'CodePet Test Teacher',
		role: 'teacher' as const
	},
	// Email auth teacher with matching classroom data
	emailTeacher: {
		uid: 'email-teacher-123',
		email: 'teacher@test.com',
		displayName: 'Test Teacher',
		role: 'teacher' as const,
		schoolEmail: 'test.codepet@gmail.com' // Matches classroom snapshot data
	},
	student: {
		uid: 'student-e2e-123',
		email: 'e2e.student@test.com',
		displayName: 'E2E Test Student',
		role: 'student' as const
	}
};

/**
 * Demo credentials for email authentication testing
 */
export const DEMO_CREDENTIALS = {
	teacher: {
		email: 'teacher@test.com',
		password: 'test123',
		schoolEmail: 'test.codepet@gmail.com',
		displayName: 'Test Teacher'
	},
	student: {
		email: 'student1@test.com',
		password: 'test123',
		displayName: 'Test Student'
	}
};

/**
 * Mock Firebase Auth for E2E testing
 */
export class AuthHelper {
	private page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	/**
	 * Setup authentication mocks before page navigation
	 */
	async setupAuthMocks(user: MockUser = TEST_USERS.teacher) {
		// Mock Firebase Auth initialization and user state
		await this.page.addInitScript((mockUser: MockUser) => {
			// Mock Firebase modules
			window.__mockAuth = {
				currentUser: mockUser,
				user: mockUser,
				isAuthenticated: true
			};

			// Mock Firebase Auth methods that might be called
			const mockAuth = {
				currentUser: mockUser,
				onAuthStateChanged: (callback: (user: any) => void) => {
					setTimeout(() => callback(mockUser), 100);
					return () => {}; // Unsubscribe function
				},
				signOut: async () => {
					window.__mockAuth.currentUser = null;
					window.__mockAuth.isAuthenticated = false;
				}
			};

			// Make it available globally
			(window as any).firebase = {
				auth: () => mockAuth
			};

			// Mock getAuth from Firebase v9 modular SDK
			(window as any).__getAuth = () => mockAuth;
		}, user);
	}

	/**
	 * Login as teacher with mock authentication
	 * @param customEmail - Optional custom email (defaults to e2e.teacher@test.com)
	 */
	async loginAsTeacher(customEmail?: string) {
		const teacher =
			customEmail === 'test.codepet@gmail.com'
				? TEST_USERS.codepetTeacher
				: customEmail
					? { ...TEST_USERS.teacher, email: customEmail, displayName: customEmail.split('@')[0] }
					: TEST_USERS.teacher;

		await this.setupAuthMocks(teacher);

		// Add localStorage items that the app might expect
		await this.page.addInitScript((teacherData) => {
			localStorage.setItem('auth_user', JSON.stringify(teacherData));
			localStorage.setItem('auth_token', 'mock-firebase-token');
			// Add Google access token for import functionality
			sessionStorage.setItem('google_access_token', 'mock-google-access-token');
		}, teacher);
	}

	/**
	 * Login as student with mock authentication
	 */
	async loginAsStudent() {
		await this.setupAuthMocks(TEST_USERS.student);

		await this.page.addInitScript(() => {
			localStorage.setItem(
				'auth_user',
				JSON.stringify({
					uid: 'student-e2e-123',
					email: 'e2e.student@test.com',
					displayName: 'E2E Test Student',
					role: 'student'
				})
			);
			localStorage.setItem('auth_token', 'mock-firebase-token');
		});
	}

	/**
	 * Logout (clear authentication)
	 */
	async logout() {
		await this.page.addInitScript(() => {
			window.__mockAuth = {
				currentUser: null,
				user: null,
				isAuthenticated: false
			};
			localStorage.removeItem('auth_user');
			localStorage.removeItem('auth_token');
		});
	}

	/**
	 * Check if user is authenticated (in test context)
	 */
	async isAuthenticated(): Promise<boolean> {
		return await this.page.evaluate(() => {
			return window.__mockAuth?.isAuthenticated || false;
		});
	}

	/**
	 * Get current user (in test context)
	 */
	async getCurrentUser(): Promise<MockUser | null> {
		return await this.page.evaluate(() => {
			return window.__mockAuth?.currentUser || null;
		});
	}

	/**
	 * Navigate to login page and perform login flow
	 */
	async navigateAndLogin(role: 'teacher' | 'student' = 'teacher') {
		if (role === 'teacher') {
			await this.loginAsTeacher();
		} else {
			await this.loginAsStudent();
		}

		// Navigate to the app - authentication should be automatically handled
		await this.page.goto('/');

		// Wait for authentication to be processed
		await this.page.waitForFunction(() => {
			return window.__mockAuth?.isAuthenticated === true;
		});
	}

	/**
	 * Bypass authentication and go directly to authenticated pages
	 */
	async bypassAuthAndGoto(url: string, role: 'teacher' | 'student' = 'teacher') {
		await this.setupAuthMocks(role === 'teacher' ? TEST_USERS.teacher : TEST_USERS.student);
		await this.page.goto(url);
	}

	/**
	 * Mock authentication loading state
	 */
	async mockAuthLoading(delayMs: number = 2000) {
		await this.page.addInitScript((delay: number) => {
			window.__mockAuth = {
				currentUser: null,
				user: null,
				isAuthenticated: false,
				isLoading: true
			};

			// Simulate loading delay
			setTimeout(() => {
				window.__mockAuth = {
					currentUser: {
						uid: 'teacher-e2e-123',
						email: 'e2e.teacher@test.com',
						displayName: 'E2E Test Teacher',
						role: 'teacher'
					},
					user: {
						uid: 'teacher-e2e-123',
						email: 'e2e.teacher@test.com',
						displayName: 'E2E Test Teacher',
						role: 'teacher'
					},
					isAuthenticated: true,
					isLoading: false
				};
			}, delay);
		}, delayMs);
	}

	/**
	 * Mock authentication error
	 */
	async mockAuthError(errorMessage: string = 'Authentication failed') {
		await this.page.addInitScript((error: string) => {
			window.__mockAuth = {
				currentUser: null,
				user: null,
				isAuthenticated: false,
				error
			};
		}, errorMessage);
	}

	/**
	 * Wait for authentication to complete
	 */
	async waitForAuth(timeout: number = 5000) {
		await this.page.waitForFunction(
			() => {
				return (
					window.__mockAuth &&
					(window.__mockAuth.isAuthenticated === true || window.__mockAuth.error)
				);
			},
			{ timeout }
		);
	}

	/**
	 * Assert user is authenticated as teacher
	 */
	async assertAuthenticatedAsTeacher() {
		const user = await this.getCurrentUser();
		const isAuth = await this.isAuthenticated();

		if (!isAuth || !user || user.role !== 'teacher') {
			throw new Error(`Expected to be authenticated as teacher, but got: ${JSON.stringify(user)}`);
		}
	}

	/**
	 * Assert user is authenticated as student
	 */
	async assertAuthenticatedAsStudent() {
		const user = await this.getCurrentUser();
		const isAuth = await this.isAuthenticated();

		if (!isAuth || !user || user.role !== 'student') {
			throw new Error(`Expected to be authenticated as student, but got: ${JSON.stringify(user)}`);
		}
	}

	/**
	 * Assert user is not authenticated
	 */
	async assertNotAuthenticated() {
		const isAuth = await this.isAuthenticated();

		if (isAuth) {
			throw new Error('Expected user to not be authenticated');
		}
	}

	/**
	 * Wait for page to be fully loaded and stable
	 */
	async waitForPageStability() {
		// Wait for network activity to settle
		await this.page.waitForLoadState('networkidle');

		// Wait for any hydration to complete
		await this.page.waitForTimeout(1000);

		// Wait for main content to be visible
		await this.page.waitForSelector('main, [data-testid="login-container"], h1, h2', {
			state: 'visible',
			timeout: 10000
		});
	}

	/**
	 * Click element with stability checks
	 */
	async stableClick(selector: string, options: { timeout?: number; waitAfter?: number } = {}) {
		const { timeout = 30000, waitAfter = 500 } = options;

		// Wait for element to be available
		const element = this.page.locator(selector);
		await element.waitFor({ state: 'visible', timeout });

		// Wait for element to be stable (not moving/changing)
		await element.waitFor({ state: 'attached', timeout: 5000 });

		// Ensure element is enabled and stable before clicking
		await expect(element).toBeVisible();
		await expect(element).toBeEnabled();

		// Perform the click
		await element.click({ timeout });

		// Wait for any resulting changes
		await this.page.waitForTimeout(waitAfter);
	}

	/**
	 * Perform real email authentication using the new UI flow
	 * Navigates through: login → teacher → email method → authentication
	 */
	async loginViaEmailPassword(credentials = DEMO_CREDENTIALS.teacher) {
		console.log('🔑 Starting email authentication...');

		// Start at login page and wait for stability
		await this.page.goto('/login');
		await this.waitForPageStability();

		// Step 1: Select Teacher role with stability check
		console.log('👨‍🏫 Selecting Teacher role...');
		await this.stableClick('[data-testid="select-teacher-button"]', { waitAfter: 1000 });

		// Wait for teacher selection page to load
		await this.page.waitForSelector('[data-testid="auth-method-prompt"]', {
			state: 'visible',
			timeout: 10000
		});

		// Step 2: Select Email & Password authentication method
		console.log('📧 Selecting Email & Password method...');
		await this.page.waitForSelector('[data-testid="select-email-auth-button"]', {
			state: 'visible',
			timeout: 10000
		});
		await this.stableClick('[data-testid="select-email-auth-button"]', { waitAfter: 1000 });

		// Wait for login form to appear
		await this.page.waitForSelector('[data-testid="email-input"]', {
			state: 'visible',
			timeout: 10000
		});

		// Step 3: Fill in login credentials
		console.log('✏️ Filling credentials...');
		await this.page.fill('[data-testid="email-input"]', credentials.email);
		await this.page.fill('[data-testid="password-input"]', credentials.password);

		// Step 4: Submit login form
		console.log('🚀 Submitting login form...');
		const signInButton = this.page.locator('[data-testid="submit-auth-button"]');

		await signInButton.waitFor({ state: 'visible', timeout: 5000 });
		await expect(signInButton).toBeEnabled();
		await signInButton.click();

		// Wait for authentication to complete and redirect
		console.log('⏳ Waiting for authentication...');
		try {
			await this.page.waitForURL('**/dashboard**', { timeout: 15000 });
			console.log('✅ Successfully logged in via email/password');
		} catch (error) {
			// Check if we're still on login page with error
			const currentUrl = this.page.url();
			console.log(`❌ Login may have failed. Current URL: ${currentUrl}`);

			// Look for error messages
			const errorMessage = this.page
				.locator('[data-testid="auth-error-message"], .error, [role="alert"]')
				.first();
			if (await errorMessage.isVisible({ timeout: 2000 })) {
				const errorText = await errorMessage.textContent();
				console.log(`Error message: ${errorText}`);
			}

			throw error;
		}
	}

	/**
	 * Create a new teacher account using email authentication
	 * Tests the complete signup flow with school email validation
	 */
	async createTeacherAccountViaEmail(credentials = DEMO_CREDENTIALS.teacher) {
		console.log('🆕 Creating new teacher account...');

		// Start at login page and wait for stability
		await this.page.goto('/login');
		await this.waitForPageStability();

		// Step 1: Select Teacher role
		console.log('👨‍🏫 Selecting Teacher role...');
		await this.stableClick('button:has-text("Teacher")', { waitAfter: 1000 });

		// Wait for teacher selection page
		await this.page.waitForSelector('text="Choose your preferred sign-in method"', {
			state: 'visible',
			timeout: 10000
		});

		// Step 2: Select Email & Password authentication method
		console.log('📧 Selecting Email & Password method...');
		await this.stableClick('button:has-text("Email & Password")', { waitAfter: 1000 });

		// Wait for login form to appear
		await this.page.waitForSelector('input[type="email"]', {
			state: 'visible',
			timeout: 10000
		});

		// Step 3: Switch to signup mode
		console.log('📝 Switching to signup mode...');
		const signupToggle = this.page
			.locator('button:has-text("Create one")')
			.or(this.page.locator('text=/create.*account/i'));
		await signupToggle.waitFor({ state: 'visible', timeout: 5000 });
		await this.stableClick('button:has-text("Create one")', { waitAfter: 1000 });

		// Wait for signup form to appear
		await this.page.waitForSelector('input[placeholder*="name"]', {
			state: 'visible',
			timeout: 10000
		});

		// Step 4: Fill signup form
		console.log('✏️ Filling signup form...');
		await this.page.fill('input[type="email"]', credentials.email);
		await this.page.fill('input[placeholder*="name"]', credentials.displayName);

		// Fill school email (critical for data matching)
		const schoolEmailInput = this.page
			.locator('input[placeholder*="school"]')
			.or(this.page.locator('input:below(:text("School Email"))'));
		await schoolEmailInput.waitFor({ state: 'visible', timeout: 5000 });
		await schoolEmailInput.fill(credentials.schoolEmail);
		console.log(`📧 School email set to: ${credentials.schoolEmail}`);

		// Fill passwords
		const passwordInputs = this.page.locator('input[type="password"]');
		await passwordInputs.first().fill(credentials.password);
		await passwordInputs.last().fill(credentials.password); // Confirm password

		// Step 5: Submit signup form
		console.log('🚀 Submitting signup form...');
		const createButton = this.page
			.locator('button:has-text("Create Account")')
			.or(this.page.locator('button[type="submit"]'));

		await createButton.waitFor({ state: 'visible', timeout: 5000 });
		await expect(createButton).toBeEnabled();
		await createButton.click();

		// Wait for account creation and redirect
		console.log('⏳ Waiting for account creation...');
		try {
			await this.page.waitForURL('**/dashboard**', { timeout: 20000 });
			console.log('✅ Successfully created teacher account via email');
		} catch (error) {
			// Check for error messages or current state
			const currentUrl = this.page.url();
			console.log(`❌ Account creation may have failed. Current URL: ${currentUrl}`);

			// Look for validation errors
			const errorMessage = this.page
				.locator('[data-testid="error-message"], .error, [role="alert"]')
				.first();
			if (await errorMessage.isVisible({ timeout: 2000 })) {
				const errorText = await errorMessage.textContent();
				console.log(`Error message: ${errorText}`);
			}

			throw error;
		}
	}

	/**
	 * Use demo credentials button in the UI
	 * Tests the built-in demo functionality
	 */
	async useDemoCredentials() {
		// Look for demo credentials button using data-testid
		const demoButton = this.page.locator('[data-testid="fill-demo-credentials-button"]');

		if (await demoButton.isVisible({ timeout: 2000 })) {
			await demoButton.click();
			console.log('✓ Used demo credentials button');

			// Verify fields were filled
			const emailInput = this.page.locator('[data-testid="email-input"]');
			const emailValue = await emailInput.inputValue();

			if (emailValue === DEMO_CREDENTIALS.teacher.email) {
				console.log('✓ Demo credentials filled correctly');
			} else {
				console.warn('⚠ Demo credentials may not have filled correctly');
			}
		} else {
			console.warn('⚠ Demo credentials button not found');
		}
	}

	/**
	 * Test the complete authentication flow with navigation
	 * Useful for comprehensive E2E testing
	 */
	async testCompleteAuthFlow() {
		console.log('🧪 Starting complete email auth flow test...');

		// Test login UI navigation
		await this.page.goto('/login');
		await this.waitForPageStability();

		// Verify role selection appears using data-testids
		const teacherButton = this.page.locator('[data-testid="select-teacher-button"]');
		const studentButton = this.page.locator('[data-testid="select-student-button"]');

		await expect(teacherButton).toBeVisible();
		await expect(studentButton).toBeVisible();
		console.log('✓ Role selection UI verified');

		// Select teacher and verify method selection using stable click
		await this.stableClick('[data-testid="select-teacher-button"]', { waitAfter: 1000 });

		// Wait for teacher auth selection page
		await this.page.waitForSelector('[data-testid="auth-method-prompt"]', {
			state: 'visible',
			timeout: 10000
		});

		const googleOption = this.page.locator('[data-testid="select-google-auth-button"]');
		const emailOption = this.page.locator('[data-testid="select-email-auth-button"]');

		await expect(googleOption).toBeVisible();
		await expect(emailOption).toBeVisible();
		console.log('✓ Authentication method selection verified');

		// Select email method and verify TeacherEmailAuth component
		await this.stableClick('[data-testid="select-email-auth-button"]', { waitAfter: 1000 });

		// Wait for email form to load
		await this.page.waitForSelector('[data-testid="email-input"]', {
			state: 'visible',
			timeout: 10000
		});

		const loginForm = this.page.locator('[data-testid="email-input"]');
		await expect(loginForm).toBeVisible();
		console.log('✓ Email authentication form loaded');

		// Test demo credentials
		await this.useDemoCredentials();

		// Complete login
		await this.page.fill('[data-testid="password-input"]', DEMO_CREDENTIALS.teacher.password);

		const signInButton = this.page.locator('[data-testid="submit-auth-button"]');
		await signInButton.waitFor({ state: 'visible', timeout: 5000 });
		await expect(signInButton).toBeEnabled();
		await signInButton.click();

		// Verify dashboard redirect
		await this.page.waitForURL('**/dashboard**', { timeout: 15000 });
		console.log('✓ Complete auth flow successful - redirected to dashboard');
	}
}

/**
 * Quick helper function to create AuthHelper
 */
export function createAuthHelper(page: Page): AuthHelper {
	return new AuthHelper(page);
}

/**
 * Type declarations for mock auth window object
 */
declare global {
	interface Window {
		__mockAuth?: {
			currentUser: MockUser | null;
			user: MockUser | null;
			isAuthenticated: boolean;
			isLoading?: boolean;
			error?: string;
		};
	}
}
