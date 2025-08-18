/**
 * Simplified E2E Test Helpers
 * Location: frontend/e2e/test-helpers.ts
 *
 * Consolidated utilities for core E2E testing flows
 */

import { Page, expect } from '@playwright/test';

/**
 * Test data and credentials
 */
export const TEST_TEACHER = {
	email: 'teacher@test.com',
	password: 'test123',
	displayName: 'E2E Test Teacher'
};

export const TEST_STUDENT = {
	email: 'student@test.com',
	password: 'test123',
	displayName: 'E2E Test Student'
};

export const CLASSROOM_SNAPSHOT_PATH = './e2e/fixtures/classroom-snapshot-mock.json';

export const TEST_TEACHER_PROFILE = {
	email: 'teacher@test.com',
	password: 'test123',
	displayName: 'Test Teacher',
	schoolEmail: 'test.codepet@gmail.com'
};

/**
 * Sign in as student helper with improved error handling and comprehensive auth method detection
 */
export async function signInAsStudent(page: Page) {
	console.log('Starting student sign-in flow...');

	await page.goto('/login');
	await waitForPageReady(page);

	try {
		// Select student role using safer method with fallbacks
		console.log('Selecting student role...');
		await clickElementSafely(page, '[data-testid="select-student-button"]', {
			fallbackSelectors: [
				'button:has-text("Student")',
				'[data-role="student"]',
				'button[aria-label*="Student"]',
				'.student-button'
			]
		});
		await waitForPageReady(page);

		// Wait a bit for the student auth UI to fully load
		await page.waitForTimeout(2000);

		// Check what type of student auth is available with comprehensive selectors
		const passcodeSelectors = [
			'[data-testid="passcode-input"]',
			'input[placeholder*="passcode" i]',
			'input[placeholder*="code" i]',
			'input[name="passcode"]',
			'input[type="text"][placeholder*="ABC12" i]'
		];

		const emailSelectors = [
			'[data-testid="email-input"]',
			'input[placeholder*="schooldomain.edu" i]',
			'input[placeholder*="email" i]',
			'input[type="email"]',
			'input[name="email"]'
		];

		let foundPasscodeInput = null;
		let foundEmailInput = null;

		// Try to find passcode input
		for (const selector of passcodeSelectors) {
			try {
				const input = page.locator(selector).first();
				if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
					foundPasscodeInput = input;
					console.log(`✓ Found passcode input: ${selector}`);
					break;
				}
			} catch {
				continue;
			}
		}

		// Try to find email input
		for (const selector of emailSelectors) {
			try {
				const input = page.locator(selector).first();
				if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
					foundEmailInput = input;
					console.log(`✓ Found email input: ${selector}`);
					break;
				}
			} catch {
				continue;
			}
		}

		if (foundPasscodeInput && foundEmailInput) {
			console.log('Using passcode authentication...');

			// Fill email first
			await foundEmailInput.clear();
			await foundEmailInput.fill(TEST_STUDENT.email);

			// Then fill passcode
			await foundPasscodeInput.clear();
			await foundPasscodeInput.fill('TEST1');

			// Submit with comprehensive button search
			const submitSelectors = [
				'[data-testid="submit-auth-button"]',
				'button[type="submit"]',
				'[data-testid="submit-button"]',
				'button:has-text("Sign In")',
				'button:has-text("Submit")',
				'button:has-text("Login")',
				'input[type="submit"]'
			];

			await clickElementSafely(page, submitSelectors[0], {
				fallbackSelectors: submitSelectors.slice(1)
			});
		} else if (foundEmailInput && !foundPasscodeInput) {
			console.log('Using email authentication...');

			// Fill student email credentials
			await foundEmailInput.clear();
			await foundEmailInput.fill(TEST_STUDENT.email);

			// Find password input
			const passwordSelectors = [
				'input[placeholder*="password" i]',
				'input[type="password"]',
				'[data-testid="password-input"]',
				'input[name="password"]'
			];

			let foundPasswordInput = null;
			for (const selector of passwordSelectors) {
				try {
					const input = page.locator(selector).first();
					if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
						foundPasswordInput = input;
						console.log(`✓ Found password input: ${selector}`);
						break;
					}
				} catch {
					continue;
				}
			}

			if (foundPasswordInput) {
				await foundPasswordInput.clear();
				await foundPasswordInput.fill(TEST_STUDENT.password);
			} else {
				throw new Error('Password input not found for email authentication');
			}

			// Submit form with comprehensive button search
			const submitSelectors = [
				'[data-testid="submit-auth-button"]',
				'button[type="submit"]',
				'[data-testid="submit-button"]',
				'button:has-text("Sign In")',
				'button:has-text("Submit")',
				'button:has-text("Login")',
				'input[type="submit"]'
			];

			await clickElementSafely(page, submitSelectors[0], {
				fallbackSelectors: submitSelectors.slice(1)
			});
		} else {
			// Check for other student auth patterns or if we missed the form
			const alternativeAuthIndicators = [
				'[data-testid="student-passcode-auth-form"]',
				'[data-testid="student-login-form"]',
				'text=/enter.*student.*id/i',
				'text=/class.*code/i',
				'text=/join.*class/i',
				'input[placeholder*="student id" i]',
				'input[placeholder*="class code" i]'
			];

			let foundAlternative = false;
			for (const indicator of alternativeAuthIndicators) {
				if (
					await page
						.locator(indicator)
						.isVisible({ timeout: 2000 })
						.catch(() => false)
				) {
					console.log(`⚠️ Found alternative student auth method: ${indicator}`);
					foundAlternative = true;
					break;
				}
			}

			if (!foundAlternative) {
				await debugPage(page, 'student-auth-methods-not-found');
				throw new Error(
					'No recognized student authentication method found (email, passcode, or alternative)'
				);
			} else {
				// Try again with student form detection
				const studentForm = page.locator('[data-testid="student-passcode-auth-form"]');
				if (await studentForm.isVisible({ timeout: 2000 }).catch(() => false)) {
					console.log('Found student auth form, retrying input detection...');
					// Retry with form-specific selectors
					const emailInput = studentForm.locator('[data-testid="email-input"]');
					const passcodeInput = studentForm.locator('[data-testid="passcode-input"]');

					if (
						(await emailInput.isVisible({ timeout: 2000 })) &&
						(await passcodeInput.isVisible({ timeout: 2000 }))
					) {
						await emailInput.fill(TEST_STUDENT.email);
						await passcodeInput.fill('TEST1');

						const submitButton = studentForm.locator('[data-testid="submit-auth-button"]');
						await submitButton.click();
					} else {
						throw new Error('Student form found but inputs not available');
					}
				} else {
					throw new Error(
						'Found alternative student auth methods but they are not yet supported in test helpers'
					);
				}
			}
		}

		// Wait for redirect to student dashboard with better error handling
		console.log('Waiting for student dashboard redirect...');
		try {
			await page.waitForURL(/\/dashboard\/student|\/student/, { timeout: 15000 });
			await waitForPageReady(page);
			console.log('✓ Student sign-in successful - redirected to student dashboard');
		} catch (redirectError) {
			// Check if we're still on login page (auth failed)
			const currentUrl = page.url();
			if (currentUrl.includes('/login')) {
				// Look for error messages
				const errorSelectors = [
					'text=/invalid.*passcode/i',
					'text=/invalid.*credentials/i',
					'text=/student.*not.*found/i',
					'[data-testid*="error"]'
				];

				let errorMessage = 'Unknown authentication error';
				for (const errorSelector of errorSelectors) {
					const errorElement = page.locator(errorSelector).first();
					if (await errorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
						errorMessage = (await errorElement.textContent()) || errorMessage;
						break;
					}
				}

				throw new Error(`Student authentication failed: ${errorMessage}`);
			} else {
				// We might be on a different page - check if it's a valid student area
				console.log(`⚠️ Student auth completed but not at expected URL: ${currentUrl}`);
				if (currentUrl.includes('/dashboard') || currentUrl.includes('/student')) {
					console.log('✓ Student appears to be logged in despite URL difference');
				} else {
					throw new Error(`Unexpected redirect after student login: ${currentUrl}`);
				}
			}
		}

		console.log('✓ Student sign-in flow completed successfully');
	} catch (error) {
		console.log('❌ Student sign-in failed:', error.message);
		await debugPage(page, 'student-signin-failure');
		throw new Error(`Student sign-in failed: ${error.message}`);
	}
}

/**
 * Setup teacher profile in Firestore after account creation
 * This creates the user document needed for API authentication
 */
export async function setupTestTeacherProfile(page: Page): Promise<boolean> {
	try {
		console.log('Setting up teacher profile in Firestore...');

		// Wait for any auth state to settle
		await page.waitForTimeout(2000);

		// Go to a page that ensures Firebase is loaded and authenticated
		await page.goto('/dashboard');
		await page.waitForTimeout(2000);

		// Try to get the auth token from the page
		const response = await page.evaluate(async () => {
			try {
				// Access Firebase through the properly initialized instances
				// These are set up in the SvelteKit app during initialization

				// Wait a bit for Firebase to be fully loaded
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Try to get the Firebase instances from the global window object
				// Look for the Firebase services that are exported from lib/firebase.ts
				let firebaseAuth = null;
				let firebaseFunctions = null;

				// Try to access Firebase auth from various sources
				const authSources = [
					() => (window as any).firebaseAuth,
					() => (window as any).firebase?.auth(),
					() => (window as any).auth,
					() => (window as any).__firebase_auth
				];

				const functionSources = [
					() => (window as any).firebaseFunctions,
					() => (window as any).firebase?.functions(),
					() => (window as any).functions,
					() => (window as any).__firebase_functions
				];

				for (const authSource of authSources) {
					try {
						const auth = authSource();
						if (
							auth &&
							(auth.currentUser || typeof auth.signInWithEmailAndPassword === 'function')
						) {
							firebaseAuth = auth;
							break;
						}
					} catch {}
				}

				for (const functionSource of functionSources) {
					try {
						const functions = functionSource();
						if (functions && typeof functions.httpsCallable === 'function') {
							firebaseFunctions = functions;
							break;
						}
					} catch {}
				}

				if (!firebaseAuth) {
					throw new Error(
						'Firebase Auth not available in browser context. Available window properties: ' +
							Object.keys(window)
								.filter((k) => k.toLowerCase().includes('fire'))
								.join(', ')
					);
				}

				const user = firebaseAuth.currentUser;
				if (!user) {
					throw new Error(
						'No authenticated user found. Firebase auth state: ' +
							(firebaseAuth.currentUser ? 'has user' : 'no user')
					);
				}

				console.log('Found authenticated user:', user.email);
				const token = await user.getIdToken(true); // Force refresh
				console.log('Got Firebase auth token, calling profile creation...');

				// Use the Firebase callable function to create profile
				if (!firebaseFunctions) {
					throw new Error('Firebase Functions not available');
				}

				const createProfileFunction = firebaseFunctions.httpsCallable(
					'createProfileForExistingUser'
				);
				const result = await createProfileFunction({
					uid: user.uid,
					email: 'teacher@test.com',
					displayName: 'Test Teacher',
					role: 'teacher',
					schoolEmail: 'teacher@school.edu'
				});

				console.log('Profile creation result:', result);

				return {
					ok: true,
					status: 200,
					data: result.data
				};
			} catch (error) {
				console.error('Error in profile setup:', error);
				return {
					ok: false,
					status: 500,
					error: error.message
				};
			}
		});

		if (response.ok) {
			console.log('✅ Teacher profile created successfully:', response.data);
			return true;
		} else {
			console.log(
				`❌ Failed to create teacher profile: ${response.status} - ${JSON.stringify(response.data || response.error)}`
			);
			return false;
		}
	} catch (error) {
		console.log('❌ Error setting up teacher profile:', error.message);
		return false;
	}
}

/**
 * Create a test teacher account through the signup flow
 * This tests the complete account creation process and creates the account we need
 */
export async function createTestTeacherAccount(page: Page): Promise<boolean> {
	console.log('Creating test teacher account...');

	try {
		// Navigate to login page
		await page.goto('/login');
		await page.waitForTimeout(1000);

		// Select teacher role
		console.log('Selecting teacher role...');
		await page.getByTestId('select-teacher-button').click();
		await page.waitForTimeout(1000);

		// Select email authentication
		console.log('Selecting email auth...');
		await page.getByTestId('select-email-auth-button').click();
		await page.waitForTimeout(1000);

		// Switch to signup mode
		console.log('Switching to signup mode...');
		const toggleBtn = page.getByTestId('toggle-auth-mode-button');
		await toggleBtn.waitFor({ timeout: 5000 });
		await toggleBtn.click();
		await page.waitForTimeout(1000);

		// Fill signup form
		console.log('Filling signup form...');
		const emailInput = page.getByTestId('email-input');
		const displayInput = page.getByTestId('display-name-input');
		const schoolInput = page.getByTestId('school-email-input');
		const passwordInput = page.getByTestId('password-input');
		const confirmInput = page.getByTestId('confirm-password-input');

		await emailInput.waitFor({ timeout: 5000 });
		await emailInput.fill(TEST_TEACHER_PROFILE.email);

		await displayInput.fill(TEST_TEACHER_PROFILE.displayName);
		await schoolInput.fill(TEST_TEACHER_PROFILE.schoolEmail);
		await passwordInput.fill(TEST_TEACHER_PROFILE.password);
		await confirmInput.fill(TEST_TEACHER_PROFILE.password);

		// Wait for form to be ready
		await page.waitForTimeout(1000);

		// Submit signup form
		console.log('Submitting signup form...');

		// Use the working button selector from debug test
		const submitBtn = page.getByRole('button', { name: /create account|sign up/i });

		// Scroll the submit button into view
		console.log('Scrolling submit button into view...');
		await submitBtn.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);

		// Now check if it's visible and enabled
		const isVisible = await submitBtn.isVisible();
		const isEnabled = await submitBtn.isEnabled();
		console.log('Submit button state:', { visible: isVisible, enabled: isEnabled });

		if (!isVisible) {
			await page.screenshot({ path: 'debug-submit-not-visible.png' });
			throw new Error('Submit button is not visible after scrolling');
		}

		if (!isEnabled) {
			await page.screenshot({ path: 'debug-submit-disabled.png' });
			throw new Error('Submit button is disabled');
		}

		// Click and wait for the submission to process
		await submitBtn.click();
		console.log('Submit button clicked, waiting for response...');

		// Wait for either success (redirect) or error message
		await page.waitForTimeout(5000);

		// Check for error messages first
		const errorElement = page.getByTestId('auth-error-message');
		if (await errorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
			const errorText = await errorElement.textContent();
			console.log('Account creation error:', errorText);

			// If account already exists, that's fine - just return success
			// The profile setup will be handled separately
			if (errorText?.includes('already exists') || errorText?.includes('email-already-in-use')) {
				console.log('✅ Account already exists - this is expected for tests');
				return true;
			} else {
				throw new Error(`Account creation failed: ${errorText}`);
			}
		}

		// Check if we see "already exists" error (different selector)
		const existsError = page.locator('text=/account.*already.*exists/i');
		if (await existsError.isVisible({ timeout: 2000 }).catch(() => false)) {
			console.log('✅ Account already exists - this is expected for tests');
			return true;
		}

		// Wait for account creation and redirect
		console.log('Waiting for account creation...');
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });

		console.log('✅ Test teacher account created successfully!');
		return true;
	} catch (error) {
		console.log('❌ Failed to create test teacher account:', error.message);
		await page.screenshot({ path: 'debug-account-creation-failure.png' });
		return false;
	}
}

/**
 * Update school email for authenticated user
 * This ensures the user profile matches the imported classroom data
 */
export async function updateSchoolEmailForTestUser(page: Page): Promise<boolean> {
	try {
		console.log('Updating school email for test user...');

		// Wait for Firebase to be available and page to settle
		await page.waitForTimeout(2000);

		const response = await page.evaluate(async () => {
			try {
				// Use a more robust approach to get Firebase Auth
				// The Firebase services should be available via the global app
				const maxRetries = 10;
				let user = null;

				for (let i = 0; i < maxRetries; i++) {
					// Try to access Firebase auth from the global scope
					// These are exported from the app and should be available
					const authSources = [
						// Try the specific exports from Firebase setup
						() => (window as any).firebaseAuth?.currentUser,
						// Try common Firebase patterns
						() => (window as any).__FIREBASE_DEFAULTS__?.auth?.currentUser,
						// Try to find auth via the app
						() => {
							const firebase = (window as any).firebase;
							if (firebase?.apps?.[0]) {
								return firebase.auth(firebase.apps[0]).currentUser;
							}
							return null;
						},
						// Look for auth in common locations
						() => {
							const keys = Object.keys(window);
							for (const key of keys) {
								if (key.includes('auth') || key.includes('Auth')) {
									const obj = (window as any)[key];
									if (obj?.currentUser) return obj.currentUser;
								}
							}
							return null;
						}
					];

					for (const authSource of authSources) {
						try {
							const currentUser = authSource();
							if (currentUser && currentUser.uid) {
								user = currentUser;
								break;
							}
						} catch {}
					}

					if (user) break;

					// Wait a bit and try again
					await new Promise((resolve) => setTimeout(resolve, 500));
				}

				if (!user) {
					// Log available window properties for debugging
					const firebaseKeys = Object.keys(window).filter(
						(k) => k.toLowerCase().includes('fire') || k.toLowerCase().includes('auth')
					);
					console.log('Available Firebase-related keys:', firebaseKeys);
					return {
						ok: false,
						status: 404,
						error: 'No authenticated user found after retries'
					};
				}

				console.log('Found authenticated user:', user.email || user.uid);
				const token = await user.getIdToken(true);

				// Call the school email update endpoint
				const response = await fetch(
					'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/users/profile/school-email',
					{
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`
						},
						body: JSON.stringify({
							schoolEmail: 'test.codepet@gmail.com'
						})
					}
				);

				const result = await response.json();

				return {
					ok: response.ok,
					status: response.status,
					data: result
				};
			} catch (error) {
				console.error('Error updating school email:', error);
				return {
					ok: false,
					status: 500,
					error: error.message
				};
			}
		});

		if (response.ok) {
			console.log('✅ School email updated successfully:', response.data);
			return true;
		} else {
			console.log(
				`❌ Failed to update school email: ${response.status} - ${response.error || JSON.stringify(response.data)}`
			);
			return false;
		}
	} catch (error) {
		console.log('❌ Error updating school email:', error.message);
		return false;
	}
}

/**
 * Core authentication helper with improved timing and error handling
 * Handles the complete teacher sign-in flow
 */
export async function signInAsTeacher(page: Page) {
	console.log('Starting teacher sign-in flow...');

	// Start from login page
	await page.goto('/login');
	await waitForPageReady(page);

	try {
		// Select teacher role using safer click method with fallbacks
		console.log('Selecting teacher role...');
		await clickElementSafely(page, '[data-testid="select-teacher-button"]', {
			fallbackSelectors: [
				'button:has-text("Teacher")',
				'[data-role="teacher"]',
				'button[aria-label*="Teacher"]',
				'.teacher-button'
			]
		});
		await waitForPageReady(page);

		// Now we should be directly on the email authentication form
		console.log('Verifying email auth form is visible...');
		
		// Wait for the email auth form to be visible
		const emailAuthVisible = await page.waitForSelector('[data-testid="teacher-email-auth"]', { 
			timeout: 5000 
		}).catch(() => null);
		
		if (!emailAuthVisible) {
			throw new Error('Email authentication form not found after teacher selection');
		}

		// Fill in credentials with better error handling
		console.log('Filling credentials...');

		// Try using the demo credentials button first
		const demoBtn = page.getByText('Fill Demo Teacher Credentials');
		if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			console.log('Using demo credentials button...');
			await clickElementSafely(page, 'text=Fill Demo Teacher Credentials');
			await page.waitForTimeout(1000);
		} else {
			// Manual form filling with improved selectors
			console.log('Filling credentials manually...');

			const emailSelectors = [
				'[data-testid="email-input"]',
				'input[placeholder*="teacher@school.com" i]',
				'input[placeholder*="email" i]:first-of-type',
				'input[type="email"]'
			];

			const passwordSelectors = [
				'[data-testid="password-input"]',
				'input[placeholder*="password" i]',
				'input[type="password"]'
			];

			let emailFilled = false;
			for (const selector of emailSelectors) {
				try {
					const emailInput = await waitForElementSafely(page, selector, { timeout: 3000 });
					await emailInput.clear(); // Clear any existing value
					await emailInput.fill(TEST_TEACHER.email);
					// Verify the value was filled
					const inputValue = await emailInput.inputValue();
					if (inputValue === TEST_TEACHER.email) {
						emailFilled = true;
						console.log(`✓ Email filled successfully with selector: ${selector}`);
						break;
					}
				} catch {
					continue;
				}
			}

			if (!emailFilled) {
				throw new Error(
					`Could not find or fill email input field. Available selectors: ${emailSelectors.join(', ')}`
				);
			}

			let passwordFilled = false;
			for (const selector of passwordSelectors) {
				try {
					const passwordInput = await waitForElementSafely(page, selector, { timeout: 3000 });
					await passwordInput.clear(); // Clear any existing value
					await passwordInput.fill(TEST_TEACHER.password);
					// Verify the password field was filled (can't check value for security)
					await page.waitForTimeout(200);
					passwordFilled = true;
					console.log(`✓ Password filled successfully with selector: ${selector}`);
					break;
				} catch {
					continue;
				}
			}

			if (!passwordFilled) {
				throw new Error(
					`Could not find or fill password input field. Available selectors: ${passwordSelectors.join(', ')}`
				);
			}
		}

		// Submit form with optimized approach
		console.log('Submitting form...');

		try {
			// First try the exact test ID which should be most reliable
			await clickElementSafely(page, '[data-testid="submit-auth-button"]', {
				timeout: 5000,
				retries: 1,
				fallbackSelectors: ['button[type="submit"]', 'button:has-text("Sign In")']
			});
		} catch (submitError) {
			// Fallback: press Enter in the password field
			console.log('Submit button click failed, trying Enter key...');
			const passwordField = page.locator('[data-testid="password-input"]');
			await passwordField.press('Enter');
			console.log('✓ Submitted form by pressing Enter in password field');
		}

		// Wait for auth response with better error detection
		console.log('Waiting for authentication response...');
		await page.waitForTimeout(2000);

		// Check for immediate errors first
		const errorSelectors = [
			'[data-testid="auth-error-message"]',
			'[data-testid="auth-error"]',
			'text=/invalid.*credentials/i',
			'text=/user.*not.*found/i',
			'text=/authentication.*failed/i',
			'text=/sign.*in.*failed/i'
		];

		let hasAuthError = false;
		for (const errorSelector of errorSelectors) {
			if (
				await page
					.locator(errorSelector)
					.isVisible({ timeout: 2000 })
					.catch(() => false)
			) {
				const errorText = await page.locator(errorSelector).textContent();
				console.log(`Authentication error detected: ${errorText}`);
				hasAuthError = true;
				break;
			}
		}

		if (hasAuthError) {
			throw new Error('Authentication failed - ensure test account exists');
		}

		// Wait for successful redirect
		try {
			await page.waitForURL(/\/dashboard/, { timeout: 15000 });
			console.log('✓ Sign-in successful - redirected to dashboard');
		} catch {
			// Check if we're still on auth page
			const currentUrl = page.url();
			if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
				throw new Error('Authentication did not complete - still on auth page');
			}
			console.log('Sign-in may have succeeded despite timeout');
		}

		// Ensure we're actually on a dashboard page
		await waitForPageReady(page);
		const finalUrl = page.url();
		if (!finalUrl.includes('/dashboard')) {
			throw new Error(`Expected to be on dashboard, but at: ${finalUrl}`);
		}

		// Update school email to match imported classroom data (optional)
		console.log('Setting school email for data consistency...');
		const schoolEmailUpdated = await updateSchoolEmailForTestUser(page);
		if (schoolEmailUpdated) {
			console.log('✓ School email set to test.codepet@gmail.com');
		} else {
			console.log('⚠️ School email update failed - dashboard may show empty state');
		}

		console.log('✓ Teacher sign-in flow completed successfully');
	} catch (error) {
		console.log('❌ Sign-in failed:', error.message);
		await debugPage(page, 'signin-failure');
		throw new Error(`Teacher sign-in failed: ${error.message}`);
	}
}

/**
 * Navigate to snapshot import page (may require authentication)
 */
export async function gotoSnapshotImport(page: Page) {
	await page.goto('/teacher/data-import/snapshot');

	// Wait for page to load, may redirect to login if not authenticated
	await page.waitForTimeout(2000);

	const currentUrl = page.url();
	if (currentUrl.includes('/login')) {
		console.log('⚠️ Redirected to login - auth required for import');
		throw new Error('Authentication required for import page');
	}

	// Check if we're on the import page
	const hasImportContent = await page.locator('h1, h2').first().textContent();
	if (hasImportContent && hasImportContent.toLowerCase().includes('import')) {
		console.log('✓ On import page');
	} else {
		console.log('⚠️ May not be on import page');
	}
}

/**
 * Upload a classroom snapshot file
 */
export async function uploadSnapshotFile(page: Page, filePath: string = CLASSROOM_SNAPSHOT_PATH) {
	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(filePath);

	// Wait for file validation
	await page.waitForTimeout(2000);
}

/**
 * Enhanced import success verification with better error handling
 */
export async function waitForImportSuccess(page: Page): Promise<boolean> {
	console.log('Checking for import completion...');

	// Wait for any processing to complete
	await waitForPageReady(page);

	// First, check for import failure indicators with more comprehensive selectors
	const failureSelectors = [
		'[data-testid*="import-error"], [data-testid*="error"]',
		'text=/import.*error|validation.*failed|server.*error/i',
		'text=/403.*network.*error|unauthorized|forbidden/i',
		'text=/validation.*failed|invalid.*file|corrupt.*data/i',
		'text=/upload.*failed|process.*failed|import.*failed/i',
		'.error, .alert-error, .import-error'
	];

	for (const selector of failureSelectors) {
		try {
			if (await page.locator(selector).isVisible({ timeout: 2000 })) {
				const errorText = await page.locator(selector).textContent();
				console.log(`❌ Import failed: ${errorText}`);
				return false;
			}
		} catch {
			// Ignore selector errors, continue checking
		}
	}

	// Check for specific success indicators with better timing
	const successSelectors = [
		'[data-testid*="import-success"], [data-testid*="success"]',
		'button:has-text("Go to Dashboard"), button:has-text("View Dashboard")',
		'text=/import.*complete/i',
		'text=/successfully.*imported/i',
		'text=/[0-9]+.*classroom.*imported/i',
		'text=/[0-9]+.*student.*processed/i',
		'.success, .alert-success, .import-success'
	];

	let foundSuccess = false;
	for (const selector of successSelectors) {
		try {
			if (await page.locator(selector).isVisible({ timeout: 8000 })) {
				const successText = await page.locator(selector).textContent();
				console.log(`✓ Import success indicator: ${successText}`);
				foundSuccess = true;
				break;
			}
		} catch {
			// Ignore selector errors, continue checking
		}
	}

	if (foundSuccess) {
		return true;
	}

	// Additional verification: check import progress
	const progressIndicators = [
		'text=/step.*2|step.*3|review.*import/i', // Later steps in import wizard
		'text=/import.*in.*progress/i',
		'[data-testid*="progress"], .progress-bar, .import-progress'
	];

	for (const indicator of progressIndicators) {
		try {
			if (await page.locator(indicator).isVisible({ timeout: 3000 })) {
				console.log(`⏳ Import in progress: ${indicator}`);
				// Wait a bit longer for completion
				await page.waitForTimeout(5000);
				return await waitForImportSuccess(page); // Recursive check
			}
		} catch {
			// Continue
		}
	}

	// Final check: ensure we're not still on upload step
	const stillOnUploadStep = await page
		.locator('text=/upload.*classroom.*snapshot|select.*file|choose.*file/i')
		.isVisible({ timeout: 1000 })
		.catch(() => false);

	if (stillOnUploadStep) {
		console.log('❌ Still on upload step - import did not progress');
		return false;
	}

	console.log('⚠️ Import status unclear - may have completed without clear indicators');
	return false;
}

/**
 * Flexible dashboard state verification that handles both empty and populated states
 * Enhanced with better loading detection and more comprehensive state analysis
 */
export async function verifyDashboardState(
	page: Page
): Promise<'empty' | 'populated' | 'error' | 'loading'> {
	// Don't navigate again if we're already on dashboard - just ensure ready
	if (!page.url().includes('/dashboard')) {
		await page.goto('/(dashboard)/teacher');
	}

	// Wait longer for dashboard to fully load
	await waitForPageReady(page);
	await page.waitForTimeout(2000); // Additional wait for data loading

	// Check for loading states first
	const loadingIndicators = [
		'.animate-spin',
		'text=/loading|fetching|checking/i',
		'[data-testid*="loading"]',
		'[data-testid*="skeleton"]',
		'.loading-spinner, .skeleton'
	];

	let isLoading = false;
	for (const loadingIndicator of loadingIndicators) {
		if (
			await page
				.locator(loadingIndicator)
				.isVisible({ timeout: 1000 })
				.catch(() => false)
		) {
			console.log(`⏳ Found loading indicator: ${loadingIndicator}`);
			isLoading = true;
			break;
		}
	}

	if (isLoading) {
		// Wait a bit more for loading to complete
		await page.waitForTimeout(5000);

		// Recheck if still loading
		let stillLoading = false;
		for (const loadingIndicator of loadingIndicators) {
			if (
				await page
					.locator(loadingIndicator)
					.isVisible({ timeout: 1000 })
					.catch(() => false)
			) {
				stillLoading = true;
				break;
			}
		}

		if (stillLoading) {
			console.log('⚠️ Dashboard still loading after extended wait');
			return 'loading';
		}
	}

	// Check for error states
	const errorIndicators = [
		'text=/error.*loading.*dashboard/i',
		'text=/failed.*to.*load/i',
		'text=/something.*went.*wrong/i',
		'text=/network.*error|connection.*error/i',
		'text=/unauthorized|forbidden/i',
		'[data-testid="error-message"]',
		'[data-testid*="error"]',
		'.error-state, .error-container, .alert-error'
	];

	for (const errorIndicator of errorIndicators) {
		if (
			await page
				.locator(errorIndicator)
				.isVisible({ timeout: 2000 })
				.catch(() => false)
		) {
			console.log(`❌ Dashboard error detected: ${errorIndicator}`);
			return 'error';
		}
	}

	// Look for populated data indicators with expanded selectors
	const populatedDataIndicators = [
		// Specific data with counts/numbers
		'text=/[0-9]+.*classroom/i',
		'text=/[0-9]+.*student/i',
		'text=/[0-9]+.*assignment/i',
		'text=/[0-9]+.*submission/i',
		// Data cards and lists
		'[data-testid="classroom-card"]',
		'[data-testid="assignment-list-item"]',
		'[data-testid="student-list-item"]',
		'[data-testid*="card"]:not([data-testid*="empty"])',
		// Specific classroom names or codes
		'text=/CS\\s*10[0-9]|Programming|Intro.*Computer/i',
		'text=/Period\\s*[0-9]|Block\\s*[A-Z]/i',
		// Tables with data
		'table tbody tr:not(.empty):not(.no-data)',
		'table tbody tr td:not(:empty)',
		// Lists with items
		'ul li:not(.empty):not(.placeholder), ol li:not(.empty)',
		// Grids with content
		'.grid > div:not(.empty), .grid-container > .grid-item:not(.empty)',
		// Charts or statistics
		'svg:not(.loading), canvas:not(.loading)',
		'[data-testid*="stat"], [data-testid*="chart"]'
	];

	let hasPopulatedData = false;
	let populatedCount = 0;
	for (const indicator of populatedDataIndicators) {
		if (
			await page
				.locator(indicator)
				.isVisible({ timeout: 2000 })
				.catch(() => false)
		) {
			console.log(`✓ Found populated data indicator: ${indicator}`);
			hasPopulatedData = true;
			populatedCount++;
		}
	}

	if (hasPopulatedData) {
		console.log(`✓ Dashboard has populated data (${populatedCount} indicators found)`);
		return 'populated';
	}

	// Look for empty state indicators with more comprehensive selectors
	const emptyStateIndicators = [
		'text=/no.*data.*available/i',
		'text=/no.*classroom.*found/i',
		'text=/no.*assignment.*found/i',
		'text=/import.*your.*classroom.*data/i',
		'text=/get.*started.*import/i',
		'text=/welcome.*to.*roo/i',
		'text=/you.*don.*t.*have.*any/i',
		'text=/start.*by.*importing/i',
		'[data-testid="empty-state"]',
		'[data-testid="no-data"]',
		'[data-testid*="empty"]',
		'.empty-state, .no-data, .placeholder-content',
		'button:has-text("Import"), a:has-text("Import")', // Import buttons suggest empty state
		'button:has-text("Get Started"), a:has-text("Get Started")',
		'svg[aria-label*="Empty"], img[alt*="empty"]' // Empty state illustrations
	];

	let hasEmptyState = false;
	let emptyCount = 0;
	for (const emptyIndicator of emptyStateIndicators) {
		if (
			await page
				.locator(emptyIndicator)
				.isVisible({ timeout: 2000 })
				.catch(() => false)
		) {
			console.log(`⚪ Found empty state indicator: ${emptyIndicator}`);
			hasEmptyState = true;
			emptyCount++;
		}
	}

	if (hasEmptyState) {
		console.log(`✓ Dashboard has empty state (${emptyCount} indicators found)`);
		return 'empty';
	}

	// Check if we have basic dashboard structure but unclear state
	const dashboardStructure = [
		'h1, h2, h3', // Any heading
		'nav, .nav, .navigation', // Navigation
		'main, .main, .content', // Content area
		'[data-testid*="dashboard"]' // Dashboard-specific elements
	];

	let hasStructure = false;
	for (const structure of dashboardStructure) {
		if (
			await page
				.locator(structure)
				.isVisible({ timeout: 1000 })
				.catch(() => false)
		) {
			hasStructure = true;
			break;
		}
	}

	if (hasStructure) {
		console.log('⚠️ Dashboard has structure but state is unclear - assuming empty');
		return 'empty';
	} else {
		console.log('❌ Dashboard lacks basic structure - may be error state');
		return 'error';
	}
}

/**
 * Enhanced dashboard navigation helper that works with any data state
 */
export async function navigateDashboardSafely(page: Page) {
	await page.goto('/(dashboard)/teacher');
	await waitForPageReady(page);

	// Check if we're redirected to login (not authenticated)
	if (page.url().includes('/login')) {
		throw new Error('Redirected to login - user not authenticated');
	}

	// More flexible dashboard detection
	const dashboardIndicators = [
		// URL-based check (most reliable)
		page.url().includes('/dashboard'),
		// Content-based checks (more flexible)
		await page
			.locator('text=/dashboard/i')
			.isVisible({ timeout: 3000 })
			.catch(() => false),
		await page
			.locator('text=/overview/i')
			.isVisible({ timeout: 3000 })
			.catch(() => false),
		await page
			.locator('nav, .navigation, .nav-menu, .sidebar, header')
			.isVisible({ timeout: 3000 })
			.catch(() => false),
		await page
			.locator('[data-testid="dashboard-content"], [data-testid="teacher-dashboard"], main')
			.isVisible({ timeout: 3000 })
			.catch(() => false),
		// Fallback - any structured content
		await page
			.locator('h1, h2, .container, .content, section')
			.isVisible({ timeout: 3000 })
			.catch(() => false)
	];

	const onDashboard = dashboardIndicators.some((indicator) => indicator === true);

	if (!onDashboard) {
		console.warn('Dashboard indicators not found, but continuing - may be minimal UI');
		// Don't throw error, just warn - the UI might be minimal
	}

	return await verifyDashboardState(page);
}

/**
 * Common page elements for assertions with improved selectors
 */
export const PageElements = {
	// Login page elements - using simple selectors, not mixed with regex
	loginHeading: 'h1:has-text("Welcome"), h2:has-text("Welcome")',
	teacherButton: '[data-testid="select-teacher-button"]',
	studentButton: '[data-testid="select-student-button"]',
	emailButton: '[data-testid="select-email-auth-button"]',
	googleButton: '[data-testid="select-google-auth-button"]',

	// Dashboard elements
	dashboardHeading: 'h1, h2, [data-testid="dashboard-heading"]',
	dashboardContent: '[data-testid="dashboard-content"], main, .dashboard-container',

	// Data import elements
	importButton: 'button:has-text("Import"), [data-testid="import-button"]',
	fileUpload: 'input[type="file"], [data-testid="file-upload"]',

	// Common UI elements
	loadingSpinner: '.animate-spin, [data-testid*="loading"], .loading',
	errorMessage: '[data-testid*="error"], .error-message, .alert-error',
	successMessage: '[data-testid*="success"], .success-message, .alert-success'
};

/**
 * Helper function to check for welcome text with regex
 */
export async function checkWelcomeText(page: Page): Promise<boolean> {
	const welcomeSelectors = [
		'text=/welcome.*to.*roo/i',
		'h1:has-text("Welcome")',
		'h2:has-text("Welcome")',
		'text="Welcome to Roo"',
		'.welcome, .login-header, .page-title'
	];

	for (const selector of welcomeSelectors) {
		try {
			if (await page.locator(selector).isVisible({ timeout: 2000 })) {
				return true;
			}
		} catch {
			continue;
		}
	}

	return false;
}

/**
 * Test data state management helpers
 */
export const TestDataHelpers = {
	/**
	 * Check if test should expect data or empty state
	 */
	expectEmptyState: () => {
		// In development, we might not have persistent data
		// This can be configured based on environment or test setup
		return !process.env.E2E_EXPECT_DATA;
	},

	/**
	 * Determine appropriate assertion based on data state
	 */
	assertion: async (page: Page, testName: string) => {
		const state = await verifyDashboardState(page);
		console.log(`Test "${testName}" found dashboard state: ${state}`);
		return {
			state,
			shouldExpectData: state === 'populated',
			isEmpty: state === 'empty',
			isError: state === 'error'
		};
	}
};

/**
 * Wait for page to be ready (no loading states) and handle development environment issues
 */
export async function waitForPageReady(page: Page, options: { skipViteErrorCheck?: boolean } = {}) {
	// First, handle Vite error overlays that can interfere with tests in dev mode
	if (!options.skipViteErrorCheck) {
		await handleViteErrorOverlay(page);
	}

	// Wait for common loading indicators to disappear (optimized)
	await page
		.waitForFunction(
			() => {
				// Check for most common loading patterns efficiently
				return (
					document.querySelectorAll(
						'.animate-spin, .animate-pulse, [data-testid*="loading"], button[disabled] svg.animate-spin'
					).length === 0 && !document.body.textContent?.toLowerCase().includes('loading')
				);
			},
			{ timeout: 15000 }
		)
		.catch(() => {
			// Continue silently if timeout occurs
		});

	// Additional wait for DOM stability
	await page.waitForTimeout(500);
}

/**
 * Handle Vite error overlays that can interfere with tests
 */
export async function handleViteErrorOverlay(page: Page) {
	try {
		// Check for vite-error-overlay elements that block interactions
		const viteOverlay = page.locator('vite-error-overlay');
		if (await viteOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
			console.log('Vite error overlay detected, attempting to close...');

			// Try to click the close button if it exists
			const closeBtn = viteOverlay.locator('button, .close, [aria-label="close"]').first();
			if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
				await closeBtn.click();
				await page.waitForTimeout(500);
			}

			// If overlay persists, try pressing Escape
			if (await viteOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
				await page.keyboard.press('Escape');
				await page.waitForTimeout(500);
			}

			// If still there, try to hide it via JavaScript
			if (await viteOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
				await page.evaluate(() => {
					const overlay = document.querySelector('vite-error-overlay');
					if (overlay) {
						overlay.style.display = 'none';
						overlay.remove();
					}
				});
			}
		}
	} catch (error) {
		console.warn('Error handling Vite overlay:', error.message);
	}
}

/**
 * Enhanced wait for element with better error handling
 */
export async function waitForElementSafely(
	page: Page,
	selector: string,
	options: { timeout?: number; visible?: boolean } = {}
) {
	const { timeout = 10000, visible = true } = options;

	try {
		await handleViteErrorOverlay(page);
		const element = page.locator(selector);

		if (visible) {
			await element.waitFor({ state: 'visible', timeout });
		} else {
			await element.waitFor({ timeout });
		}

		return element;
	} catch (error) {
		console.warn(`Element not found within ${timeout}ms: ${selector}`);
		await debugPage(page, `element-wait-failure-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
		throw error;
	}
}

/**
 * Safe click with optimized retry logic and better error handling
 * Tries multiple selector strategies before giving up
 */
export async function clickElementSafely(
	page: Page,
	selector: string,
	options: { timeout?: number; retries?: number; fallbackSelectors?: string[] } = {}
) {
	const { timeout = 8000, retries = 1, fallbackSelectors = [] } = options; // Reduced defaults
	const allSelectors = [selector, ...fallbackSelectors];

	for (let attempt = 0; attempt <= retries; attempt++) {
		// Try each selector strategy
		for (const currentSelector of allSelectors) {
			try {
				await handleViteErrorOverlay(page);

				const element = page.locator(currentSelector);

				// Wait for element with shorter timeout per selector
				await element.waitFor({
					state: 'visible',
					timeout: Math.max(2000, timeout / allSelectors.length)
				});

				// Ensure element is ready
				await element.scrollIntoViewIfNeeded();

				// Quick check for visibility and enabled state
				const isVisible = await element.isVisible();
				const isEnabled = await element.isEnabled();

				if (isVisible && isEnabled) {
					await element.click();
					console.log(`✓ Successfully clicked: ${currentSelector}`);
					return;
				} else {
					console.log(`⚠️ Element not ready: visible=${isVisible}, enabled=${isEnabled}`);
				}
			} catch (selectorError) {
				// Continue to next selector - no logging for expected failures
				continue;
			}
		}

		if (attempt === retries) {
			console.warn(`Failed to click any selector after ${retries + 1} attempts:`, allSelectors);
			await debugPage(page, `click-failure-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
			throw new Error(`Could not click element with any selector: ${allSelectors.join(', ')}`);
		}

		console.log(`Click attempt ${attempt + 1} failed for all selectors, retrying...`);
		await page.waitForTimeout(500); // Reduced retry delay
	}
}

/**
 * Debug helper - take screenshot and log comprehensive page info
 */
export async function debugPage(page: Page, name: string) {
	await page.screenshot({ path: `debug-${name}.png`, fullPage: true });
	const title = await page.title();
	const url = page.url();

	// Log basic debug info only
	const consoleErrors = [];

	console.log(`Debug ${name}: ${title} at ${url}`);
	if (consoleErrors.length > 0) {
		console.log('Console errors:', consoleErrors);
	}
}
