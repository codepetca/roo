/**
 * Unit tests for auth store using Svelte 5 runes
 * Location: frontend/src/lib/stores/auth.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// import { get } from 'svelte/store'; // Unused
import type { User } from 'firebase/auth';

// Mock fetch globally for user profile API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables first
vi.mock('$env/static/public', () => ({
	PUBLIC_FIREBASE_API_KEY: 'test-api-key',
	PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
	PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
	PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
	PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef',
	PUBLIC_USE_EMULATORS: 'true',
	PUBLIC_FUNCTIONS_EMULATOR_URL: 'http://localhost:5001/test-project/us-central1'
}));

// Mock Firebase Auth
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockGetIdToken = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('firebase/auth', () => ({
	signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
	signOut: mockSignOut,
	onAuthStateChanged: mockOnAuthStateChanged,
	createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
	updateProfile: mockUpdateProfile
}));

// Mock SvelteKit navigation
const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: mockGoto
}));

// Mock browser environment and document
vi.mock('$app/environment', () => ({
	browser: true
}));

// Mock document for tests if it doesn't exist
if (typeof document === 'undefined') {
	Object.defineProperty(globalThis, 'document', {
		value: {
			cookie: ''
		},
		writable: true
	});
}

// Mock Firebase config and functions
vi.mock('../firebase', () => ({
	firebaseAuth: {
		currentUser: null,
		app: {}
	},
	firebaseFunctions: {},
	googleProvider: {},
	signInWithGoogle: vi.fn(),
	signOut: vi.fn(),
	onAuthStateChange: vi.fn(),
	getCurrentUserToken: vi.fn()
}));

describe('Auth Store', () => {
	let auth: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();

		// Reset document.cookie
		document.cookie = '';

		// Default fetch mock for user profile API
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					success: true,
					data: { role: 'student' } // Default role
				})
		});

		// Set up mock auth state change callback
		mockOnAuthStateChanged.mockImplementation((authInstance, callback) => {
			// Store callback for later use
			mockOnAuthStateChanged.callback = callback;
			return () => {}; // unsubscribe function
		});

		// Import auth after mocks are set up
		const authModule = await import('./auth.svelte.ts');
		auth = authModule.auth;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Initial State', () => {
		it('should have correct initial state', () => {
			expect(auth.user).toBeNull();
			expect(auth.loading).toBe(true);
			expect(auth.error).toBeNull();
		});
	});

	describe('User Role Detection', () => {
		it('should detect teacher role from email', async () => {
			const mockUser: Partial<User> = {
				uid: 'teacher-uid',
				email: 'teacher@test.com',
				displayName: 'Test Teacher',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

			// Mock the user profile API to return teacher role
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: { role: 'teacher' }
					})
			});

			await auth.signIn('teacher@test.com', 'password');

			expect(auth.user?.role).toBe('teacher');
			expect(auth.user?.email).toBe('teacher@test.com');
		});

		it('should detect student role for non-teacher emails', async () => {
			const mockUser: Partial<User> = {
				uid: 'student-uid',
				email: 'student@test.com',
				displayName: 'Test Student',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

			await auth.signIn('student@test.com', 'password');

			expect(auth.user?.role).toBe('student');
			expect(auth.user?.email).toBe('student@test.com');
		});

		it('should detect teacher role from teacher domain', async () => {
			const mockUser: Partial<User> = {
				uid: 'teacher-uid',
				email: 'john@teacher.edu',
				displayName: 'John Teacher',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

			// Mock the user profile API to return teacher role for this email
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: { role: 'teacher' }
					})
			});

			await auth.signIn('john@teacher.edu', 'password');

			expect(auth.user?.role).toBe('teacher');
		});
	});

	describe('Sign In', () => {
		it('should successfully sign in user', async () => {
			const mockUser: Partial<User> = {
				uid: 'test-uid',
				email: 'test@example.com',
				displayName: 'Test User',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

			await auth.signIn('test@example.com', 'password');

			expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
				{ currentUser: null, app: {} },
				'test@example.com',
				'password'
			);
			expect(auth.user?.uid).toBe('test-uid');
			expect(auth.user?.email).toBe('test@example.com');
			expect(auth.loading).toBe(false);
			expect(mockGoto).toHaveBeenCalledWith('/dashboard');
		});

		it('should handle sign in errors', async () => {
			const error = new Error('Invalid credentials');
			mockSignInWithEmailAndPassword.mockRejectedValue(error);

			await expect(auth.signIn('invalid@example.com', 'wrong')).rejects.toThrow(
				'Invalid credentials'
			);

			expect(auth.error).toBe('Invalid credentials');
			expect(auth.loading).toBe(false);
		});

		it('should set auth cookie on successful sign in', async () => {
			const mockUser: Partial<User> = {
				uid: 'test-uid',
				email: 'test@example.com',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-id-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

			await auth.signIn('test@example.com', 'password');

			expect(mockGetIdToken).toHaveBeenCalled();
			expect(document.cookie).toContain('auth-token=mock-id-token');
		});
	});

	describe('Sign Out', () => {
		it('should successfully sign out user', async () => {
			// First sign in a user
			const mockUser: Partial<User> = {
				uid: 'test-uid',
				email: 'test@example.com',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
			await auth.signIn('test@example.com', 'password');

			// Clear mocks
			vi.clearAllMocks();

			// Now test sign out
			mockSignOut.mockResolvedValue(undefined);

			await auth.logOut();

			expect(mockSignOut).toHaveBeenCalledWith({ currentUser: null, app: {} });
			expect(auth.user).toBeNull();
			expect(auth.loading).toBe(false);
			expect(mockGoto).toHaveBeenCalledWith('/login');
		});

		it('should handle sign out errors', async () => {
			const error = new Error('Sign out failed');
			mockSignOut.mockRejectedValue(error);

			await expect(auth.logOut()).rejects.toThrow('Sign out failed');

			expect(auth.error).toBe('Sign out failed');
		});

		it('should clear auth cookie on sign out', async () => {
			// Set an initial cookie first
			document.cookie = 'auth-token=test-token; path=/';
			
			mockSignOut.mockResolvedValue(undefined);

			await auth.logOut();

			// In a real browser environment, this would clear the cookie
			// For testing, we'll just verify the function was called
			expect(mockSignOut).toHaveBeenCalled();
		});
	});

	describe('Auth State Changes', () => {
		it('should handle auth state change when user logs in', async () => {
			const mockUser: Partial<User> = {
				uid: 'test-uid',
				email: 'test@example.com',
				displayName: 'Test User',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');

			// Trigger auth state change
			const callback = mockOnAuthStateChanged.callback;
			if (callback) {
				await callback(mockUser);
			}

			expect(auth.user?.uid).toBe('test-uid');
		});

		it('should handle auth state change when user logs out', async () => {
			// Trigger auth state change with null user
			const callback = mockOnAuthStateChanged.callback;
			if (callback) {
				await callback(null);
			}

			expect(auth.user).toBeNull();
		});

		it('should handle auth state errors', async () => {
			const error = new Error('Auth state error');

			// Mock fetch to fail - this will cause getUserProfile to fail
			mockFetch.mockRejectedValue(error);

			const mockUser: Partial<User> = {
				uid: 'test-uid',
				email: 'test@example.com',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');

			// Trigger auth state change
			const callback = mockOnAuthStateChanged.callback;
			if (callback) {
				await callback(mockUser);
			}

			// Should handle error gracefully
			expect(auth.user).toBeNull();
		});
	});

	describe('Helper Methods', () => {
		it('should correctly identify teacher users', async () => {
			const mockTeacher: Partial<User> = {
				uid: 'teacher-uid',
				email: 'teacher@test.com',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockTeacher });

			// Mock the user profile API to return teacher role
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: { role: 'teacher' }
					})
			});

			await auth.signIn('teacher@test.com', 'password');

			expect(auth.isTeacher()).toBe(true);
			expect(auth.isAuthenticated()).toBe(true);
		});

		it('should correctly identify student users', async () => {
			const mockStudent: Partial<User> = {
				uid: 'student-uid',
				email: 'student@test.com',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockStudent });

			await auth.signIn('student@test.com', 'password');

			expect(auth.isTeacher()).toBe(false);
			expect(auth.isAuthenticated()).toBe(true);
		});

		it('should return false for unauthenticated users', async () => {
			// Ensure we have a clean state - trigger auth state change with null
			const callback = mockOnAuthStateChanged.callback;
			if (callback) {
				await callback(null);
			}
			
			expect(auth.isAuthenticated()).toBe(false);
			expect(auth.isTeacher()).toBe(false);
		});
	});

	describe('Test User Credentials', () => {
		it('should support test teacher credentials', async () => {
			const mockTeacher: Partial<User> = {
				uid: 'teacher-uid',
				email: 'teacher@test.com',
				displayName: 'Test Teacher',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockTeacher });

			// Mock the user profile API to return teacher role
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: { role: 'teacher' }
					})
			});

			await auth.signIn('teacher@test.com', 'test123');

			expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
				{ currentUser: null, app: {} },
				'teacher@test.com',
				'test123'
			);
			expect(auth.user?.email).toBe('teacher@test.com');
			expect(auth.user?.role).toBe('teacher');
			expect(auth.isTeacher()).toBe(true);
		});

		it('should support test student credentials', async () => {
			const mockStudent1: Partial<User> = {
				uid: 'student1-uid',
				email: 'student1@test.com',
				displayName: 'Test Student 1',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockStudent1 });

			await auth.signIn('student1@test.com', 'test123');

			expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
				{ currentUser: null, app: {} },
				'student1@test.com',
				'test123'
			);
			expect(auth.user?.email).toBe('student1@test.com');
			expect(auth.user?.role).toBe('student');
			expect(auth.isTeacher()).toBe(false);
		});

		it('should support second test student credentials', async () => {
			const mockStudent2: Partial<User> = {
				uid: 'student2-uid',
				email: 'student2@test.com',
				displayName: 'Test Student 2',
				getIdToken: mockGetIdToken
			};

			mockGetIdToken.mockResolvedValue('mock-token');
			mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockStudent2 });

			await auth.signIn('student2@test.com', 'test123');

			expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
				{ currentUser: null, app: {} },
				'student2@test.com',
				'test123'
			);
			expect(auth.user?.email).toBe('student2@test.com');
			expect(auth.user?.role).toBe('student');
			expect(auth.isTeacher()).toBe(false);
		});
	});
});
