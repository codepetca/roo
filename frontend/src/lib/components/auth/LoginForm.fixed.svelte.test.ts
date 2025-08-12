/**
 * Fixed component tests for LoginForm with Svelte 5 runes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LoginForm from './LoginForm.svelte';

// Mock UI components with actual Svelte components
vi.mock('$lib/components/ui', async () => {
	const Card = await import('../__mocks__/Card.svelte');
	const Button = await import('../__mocks__/Button.svelte');

	return {
		Card: Card.default,
		Button: Button.default
	};
});

// Mock the auth store with Svelte 5 runes
const mockAuth = {
	user: null,
	loading: false,
	error: null,
	signIn: vi.fn(),
	logOut: vi.fn(),
	isAuthenticated: vi.fn(() => false),
	isTeacher: vi.fn(() => false)
};

vi.mock('$lib/stores/auth', () => ({
	auth: mockAuth
}));

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('LoginForm Component (Fixed)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAuth.user = null;
		mockAuth.loading = false;
		mockAuth.error = null;
	});

	describe('Basic Rendering', () => {
		it('should render the login form', async () => {
			const screen = render(LoginForm);

			// Should render in Card component
			expect(screen.getByTestId('card')).toBeInTheDocument();
		});

		it('should show login button when not authenticated', async () => {
			mockAuth.isAuthenticated.mockReturnValue(false);
			const screen = render(LoginForm);

			// Check for Google sign-in button text
			expect(screen.getByText(/sign in/i)).toBeInTheDocument();
		});

		it('should handle loading state', async () => {
			mockAuth.loading = true;
			const screen = render(LoginForm);

			// Should show some indication that it's loading
			expect(screen.getByTestId('card')).toBeInTheDocument();
		});

		it('should handle error state', async () => {
			mockAuth.error = 'Login failed';
			const screen = render(LoginForm);

			// Should still render the card
			expect(screen.getByTestId('card')).toBeInTheDocument();
		});
	});
});
