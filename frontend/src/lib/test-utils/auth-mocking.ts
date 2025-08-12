/**
 * Reusable Firebase authentication mocking utilities for tests
 * Location: frontend/src/lib/test-utils/auth-mocking.ts
 *
 * This utility provides patterns for mocking Firebase authentication in tests.
 * It solves the "No authenticated user found for API request" warnings that
 * occur when API tests try to call getAuthToken() but firebaseAuth.currentUser is null.
 */

import { vi } from 'vitest';

/**
 * Default mock user for testing
 */
export const DEFAULT_MOCK_USER = {
	uid: 'test-user-123',
	email: 'test.teacher@gmail.com',
	displayName: 'Test Teacher',
	getIdToken: vi.fn().mockResolvedValue('mock-id-token-12345')
};

/**
 * Default mock auth token
 */
export const DEFAULT_MOCK_TOKEN = 'mock-id-token-12345';

/**
 * Create a mock Firebase auth object with authenticated user
 * @param user - Custom user object (optional, uses default if not provided)
 * @param token - Custom token (optional, uses default if not provided)
 */
export function createMockFirebaseAuth(
	user: any = DEFAULT_MOCK_USER,
	token: string = DEFAULT_MOCK_TOKEN
) {
	// Ensure the user has a working getIdToken method
	const mockUser = {
		...user,
		getIdToken: vi.fn().mockResolvedValue(token)
	};

	return {
		firebaseAuth: {
			currentUser: mockUser
		},
		firebaseFunctions: {},
		googleProvider: {},
		signInWithGoogle: vi.fn(),
		signOut: vi.fn(),
		onAuthStateChange: vi.fn(),
		getCurrentUserToken: vi.fn().mockResolvedValue(token)
	};
}

/**
 * Create a mock Firebase auth object with no authenticated user (unauthenticated state)
 */
export function createMockFirebaseAuthUnauthenticated() {
	return {
		firebaseAuth: {
			currentUser: null
		},
		firebaseFunctions: {},
		googleProvider: {},
		signInWithGoogle: vi.fn(),
		signOut: vi.fn(),
		onAuthStateChange: vi.fn(),
		getCurrentUserToken: vi.fn().mockResolvedValue(null)
	};
}

/**
 * WORKING PATTERN: Direct inline mocking (RECOMMENDED)
 *
 * Use this pattern in your test files for reliable auth mocking:
 *
 * ```typescript
 * // At the top of your test file, after imports
 * const mockUser = {
 *   uid: 'test-user-123',
 *   email: 'test.teacher@gmail.com',
 *   displayName: 'Test Teacher',
 *   getIdToken: vi.fn().mockResolvedValue('mock-id-token-12345')
 * };
 *
 * vi.mock('./firebase', () => ({
 *   firebaseAuth: {
 *     currentUser: mockUser
 *   },
 *   firebaseFunctions: {},
 *   googleProvider: {},
 *   signInWithGoogle: vi.fn(),
 *   signOut: vi.fn(),
 *   onAuthStateChange: vi.fn(),
 *   getCurrentUserToken: vi.fn().mockResolvedValue('mock-id-token-12345')
 * }));
 * ```
 */

/**
 * Reset mock user's getIdToken method with new token
 * Useful for testing token refresh scenarios
 * @param newToken - New token to return
 */
export function updateMockUserToken(newToken: string) {
	DEFAULT_MOCK_USER.getIdToken.mockResolvedValue(newToken);
}

/**
 * Create mock user objects for different test scenarios
 */
export const createMockUser = {
	teacher: (overrides: Partial<any> = {}) => ({
		uid: 'teacher-123',
		email: 'teacher@school.edu',
		displayName: 'Test Teacher',
		getIdToken: vi.fn().mockResolvedValue('teacher-token-123'),
		...overrides
	}),

	student: (overrides: Partial<any> = {}) => ({
		uid: 'student-456',
		email: 'student@school.edu',
		displayName: 'Test Student',
		getIdToken: vi.fn().mockResolvedValue('student-token-456'),
		...overrides
	}),

	admin: (overrides: Partial<any> = {}) => ({
		uid: 'admin-789',
		email: 'admin@school.edu',
		displayName: 'Test Admin',
		getIdToken: vi.fn().mockResolvedValue('admin-token-789'),
		...overrides
	})
};
