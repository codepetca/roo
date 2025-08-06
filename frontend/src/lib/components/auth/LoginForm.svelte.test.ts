/**
 * Component tests for LoginForm with Svelte 5 runes and auth integration
 * Location: frontend/src/lib/components/auth/LoginForm.svelte.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest/browser/context';
import LoginForm from './LoginForm.svelte';

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

describe('LoginForm Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset auth store state
		mockAuth.user = null;
		mockAuth.loading = false;
		mockAuth.error = null;
		mockAuth.signIn.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render login form with all elements', async () => {
			render(LoginForm);

			expect(screen.getByRole('heading', { name: /sign in to roo/i })).toBeInTheDocument();
			expect(screen.getByText('Access your educational dashboard')).toBeInTheDocument();
			expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
			expect(screen.getByText('Demo Credentials:')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /teacher demo/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /student demo/i })).toBeInTheDocument();
		});

		it('should show password toggle button', async () => {
			render(LoginForm);

			const passwordToggle = screen.getByRole('button', { name: '' }); // SVG icon button
			expect(passwordToggle).toBeInTheDocument();
		});

		it('should have proper form attributes', async () => {
			render(LoginForm);

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByLabelText(/password/i);

			expect(emailInput).toHaveAttribute('type', 'email');
			expect(emailInput).toHaveAttribute('required');
			expect(passwordInput).toHaveAttribute('type', 'password');
			expect(passwordInput).toHaveAttribute('required');
		});
	});

	describe('Form Interaction', () => {
		it('should update input values when typing', async () => {
			render(LoginForm);

			const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
			const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			await fireEvent.input(passwordInput, { target: { value: 'password123' } });

			expect(emailInput.value).toBe('test@example.com');
			expect(passwordInput.value).toBe('password123');
		});

		it('should toggle password visibility', async () => {
			render(LoginForm);

			const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
			const passwordToggle = screen.getByRole('button', { name: '' }); // SVG icon button

			expect(passwordInput.type).toBe('password');

			await fireEvent.click(passwordToggle);
			expect(passwordInput.type).toBe('text');

			await fireEvent.click(passwordToggle);
			expect(passwordInput.type).toBe('password');
		});

		it('should disable submit button when form is invalid', async () => {
			render(LoginForm);

			const submitButton = screen.getByRole('button', { name: /sign in/i });
			expect(submitButton).toBeDisabled();

			const emailInput = screen.getByLabelText(/email address/i);
			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			expect(submitButton).toBeDisabled(); // Still disabled without password

			const passwordInput = screen.getByLabelText(/password/i);
			await fireEvent.input(passwordInput, { target: { value: 'password123' } });
			expect(submitButton).toBeEnabled(); // Now enabled
		});

		it('should disable inputs and submit button when loading', async () => {
			mockAuth.loading = true;

			render(LoginForm);

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /signing in/i });

			expect(emailInput).toBeDisabled();
			expect(passwordInput).toBeDisabled();
			expect(submitButton).toBeDisabled();
			expect(submitButton).toHaveTextContent('Signing In...');
		});
	});

	describe('Form Submission', () => {
		it('should call auth.signIn with correct credentials on form submit', async () => {
			render(LoginForm);

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			await fireEvent.input(passwordInput, { target: { value: 'password123' } });
			await fireEvent.click(submitButton);

			expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
		});

		it('should call auth.signIn on Enter key press', async () => {
			render(LoginForm);

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByLabelText(/password/i);

			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			await fireEvent.input(passwordInput, { target: { value: 'password123' } });
			await fireEvent.keyDown(passwordInput, { key: 'Enter' });

			expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
		});

		it('should not submit with empty fields', async () => {
			render(LoginForm);

			const submitButton = screen.getByRole('button', { name: /sign in/i });
			await fireEvent.click(submitButton);

			expect(mockAuth.signIn).not.toHaveBeenCalled();
		});

		it('should not submit with whitespace-only fields', async () => {
			render(LoginForm);

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			await fireEvent.input(emailInput, { target: { value: '   ' } });
			await fireEvent.input(passwordInput, { target: { value: '   ' } });
			await fireEvent.click(submitButton);

			expect(mockAuth.signIn).not.toHaveBeenCalled();
		});

		it('should handle sign in errors gracefully', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockAuth.signIn.mockRejectedValue(new Error('Invalid credentials'));

			render(LoginForm);

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			await fireEvent.input(passwordInput, { target: { value: 'wrongpass' } });
			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error));
			});

			consoleErrorSpy.mockRestore();
		});
	});

	describe('Error Handling', () => {
		it('should display error message when auth.error is set', async () => {
			mockAuth.error = 'Invalid email or password';

			render(LoginForm);

			expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
			expect(screen.getByText('Invalid email or password')).toHaveClass('text-red-700');
		});

		it('should not display error message when auth.error is null', async () => {
			mockAuth.error = null;

			render(LoginForm);

			expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
		});
	});

	describe('Demo Credentials', () => {
		it('should fill teacher demo credentials', async () => {
			render(LoginForm);

			const teacherDemoButton = screen.getByRole('button', { name: /teacher demo/i });
			const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
			const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

			await fireEvent.click(teacherDemoButton);

			expect(emailInput.value).toBe('teacher@test.com');
			expect(passwordInput.value).toBe('test123');
		});

		it('should fill student demo credentials', async () => {
			render(LoginForm);

			const studentDemoButton = screen.getByRole('button', { name: /student demo/i });
			const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
			const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

			await fireEvent.click(studentDemoButton);

			expect(emailInput.value).toBe('student1@test.com');
			expect(passwordInput.value).toBe('test123');
		});

		it('should enable submit button after filling demo credentials', async () => {
			render(LoginForm);

			const teacherDemoButton = screen.getByRole('button', { name: /teacher demo/i });
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			expect(submitButton).toBeDisabled();

			await fireEvent.click(teacherDemoButton);

			expect(submitButton).toBeEnabled();
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA labels and structure', async () => {
			render(LoginForm);

			const form = screen.getByRole('form');
			expect(form).toBeInTheDocument();

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByLabelText(/password/i);

			expect(emailInput).toHaveAttribute('id', 'email');
			expect(passwordInput).toHaveAttribute('id', 'password');
		});

		it('should have proper button titles and descriptions', async () => {
			render(LoginForm);

			const passwordToggle = screen.getByRole('button', { name: '' }); // SVG icon button
			expect(passwordToggle).toHaveAttribute('type', 'button');

			const submitButton = screen.getByRole('button', { name: /sign in/i });
			expect(submitButton).toHaveAttribute('type', 'submit');
		});

		it('should support keyboard navigation', async () => {
			render(LoginForm);

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			emailInput.focus();
			expect(document.activeElement).toBe(emailInput);

			// Tab to password field
			await fireEvent.keyDown(emailInput, { key: 'Tab' });
			expect(document.activeElement).toBe(passwordInput);

			// Tab to submit button
			await fireEvent.keyDown(passwordInput, { key: 'Tab' });
			expect(document.activeElement).toBe(submitButton);
		});
	});
});
