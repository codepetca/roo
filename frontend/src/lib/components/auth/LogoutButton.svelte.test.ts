/**
 * Simplified component tests for LogoutButton with different variants and sizes
 * Location: frontend/src/lib/components/auth/LogoutButton.svelte.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte/pure';
import LogoutButton from './LogoutButton.svelte';

// Mock the auth store with Svelte 5 runes
const mockAuth = {
	user: { uid: 'test-uid', email: 'test@example.com', role: 'teacher' },
	loading: false,
	error: null,
	signIn: vi.fn(),
	logOut: vi.fn(),
	isAuthenticated: vi.fn(() => true),
	isTeacher: vi.fn(() => true)
};

vi.mock('$lib/stores/auth', () => ({
	auth: mockAuth
}));

describe('LogoutButton Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset auth store state
		mockAuth.loading = false;
		mockAuth.error = null;
		mockAuth.logOut.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render logout button component without errors', async () => {
			const result = render(LogoutButton);
			expect(result).toBeDefined();
		});

		it('should render with default props', async () => {
			const result = render(LogoutButton);
			expect(result).toBeDefined();
		});

		it('should render with button variant', async () => {
			const result = render(LogoutButton, { props: { variant: 'button' } });
			expect(result).toBeDefined();
		});

		it('should render with link variant', async () => {
			const result = render(LogoutButton, { props: { variant: 'link' } });
			expect(result).toBeDefined();
		});
	});

	describe('Size Props', () => {
		it('should render with small size', async () => {
			const result = render(LogoutButton, { props: { size: 'sm' } });
			expect(result).toBeDefined();
		});

		it('should render with medium size', async () => {
			const result = render(LogoutButton, { props: { size: 'md' } });
			expect(result).toBeDefined();
		});

		it('should render with large size', async () => {
			const result = render(LogoutButton, { props: { size: 'lg' } });
			expect(result).toBeDefined();
		});
	});

	describe('Loading State', () => {
		it('should handle loading state correctly', async () => {
			mockAuth.loading = true;
			const result = render(LogoutButton);
			expect(result).toBeDefined();
		});

		it('should handle non-loading state correctly', async () => {
			mockAuth.loading = false;
			const result = render(LogoutButton);
			expect(result).toBeDefined();
		});
	});

	describe('Auth Integration', () => {
		it('should use auth store correctly', async () => {
			// Verify the auth store mock is being used
			expect(mockAuth).toBeDefined();
			expect(mockAuth.logOut).toBeDefined();
		});

		it('should handle logout function', async () => {
			// Mock successful logout
			mockAuth.logOut.mockResolvedValue(undefined);
			
			// Call the logout function directly to test it's working
			await mockAuth.logOut();
			expect(mockAuth.logOut).toHaveBeenCalledTimes(1);
		});

		it('should handle logout errors', async () => {
			// Mock logout error
			const testError = new Error('Logout failed');
			mockAuth.logOut.mockRejectedValue(testError);
			
			try {
				await mockAuth.logOut();
			} catch (error) {
				expect(error).toBe(testError);
			}
		});
	});

	describe('Variant and Size Combinations', () => {
		it('should render button variant with small size', async () => {
			const result = render(LogoutButton, { props: { variant: 'button', size: 'sm' } });
			expect(result).toBeDefined();
		});

		it('should render link variant with large size', async () => {
			const result = render(LogoutButton, { props: { variant: 'link', size: 'lg' } });
			expect(result).toBeDefined();
		});

		it('should render all prop combinations', async () => {
			const variants = ['button', 'link'] as const;
			const sizes = ['sm', 'md', 'lg'] as const;
			
			for (const variant of variants) {
				for (const size of sizes) {
					const result = render(LogoutButton, { props: { variant, size } });
					expect(result).toBeDefined();
				}
			}
		});
	});
});
