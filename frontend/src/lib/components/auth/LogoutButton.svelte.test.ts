/**
 * Component tests for LogoutButton with different variants and sizes
 * Location: frontend/src/lib/components/auth/LogoutButton.svelte.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest/browser/context';
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

	describe('Rendering - Default Props', () => {
		it('should render with default button variant and medium size', async () => {
			render(LogoutButton);

			const button = screen.getByRole('button', { name: /sign out/i });
			expect(button).toBeInTheDocument();
			expect(button).toHaveAttribute('type', 'button');
			expect(button).toHaveAttribute('title', 'Sign out of your account');
			expect(button).toHaveTextContent('Sign Out');
		});

		it('should have correct default CSS classes', async () => {
			render(LogoutButton);

			const button = screen.getByRole('button');
			expect(button).toHaveClass(
				'inline-flex',
				'items-center',
				'justify-center',
				'font-medium',
				'transition-colors',
				'bg-red-600',
				'text-white',
				'hover:bg-red-700',
				'rounded-md',
				'px-4',
				'py-2',
				'text-sm'
			);
		});

		it('should display logout icon', async () => {
			render(LogoutButton);

			const icon = screen.getByRole('button').querySelector('svg');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveClass('mr-2', 'h-4', 'w-4');
		});
	});

	describe('Rendering - Button Variant', () => {
		it('should render button variant with correct classes', async () => {
			render(LogoutButton, { props: { variant: 'button', size: 'lg' } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass(
				'bg-red-600',
				'text-white',
				'hover:bg-red-700',
				'focus:ring-red-500',
				'rounded-md',
				'px-6',
				'py-3',
				'text-base'
			);
		});
	});

	describe('Rendering - Link Variant', () => {
		it('should render link variant with correct classes', async () => {
			render(LogoutButton, { props: { variant: 'link', size: 'sm' } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass(
				'text-red-600',
				'hover:text-red-700',
				'underline',
				'focus:ring-red-500',
				'px-3',
				'py-1.5',
				'text-sm'
			);
			expect(button).not.toHaveClass('bg-red-600', 'rounded-md');
		});
	});

	describe('Rendering - Different Sizes', () => {
		it('should render small size correctly', async () => {
			render(LogoutButton, { props: { size: 'sm' } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
		});

		it('should render medium size correctly', async () => {
			render(LogoutButton, { props: { size: 'md' } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
		});

		it('should render large size correctly', async () => {
			render(LogoutButton, { props: { size: 'lg' } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('px-6', 'py-3', 'text-base');
		});
	});

	describe('Loading State', () => {
		it('should show loading state when auth.loading is true', async () => {
			mockAuth.loading = true;

			render(LogoutButton);

			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
			expect(button).toHaveTextContent('Signing out...');

			const loadingIcon = button.querySelector('svg.animate-spin');
			expect(loadingIcon).toBeInTheDocument();
			expect(loadingIcon).toHaveClass('mr-2', '-ml-1', 'h-4', 'w-4', 'animate-spin');
		});

		it('should hide logout icon when loading', async () => {
			mockAuth.loading = true;

			render(LogoutButton);

			const button = screen.getByRole('button');
			const logoutIcon = button.querySelector('svg:not(.animate-spin)');
			expect(logoutIcon).not.toBeInTheDocument();
		});

		it('should not be disabled when not loading', async () => {
			mockAuth.loading = false;

			render(LogoutButton);

			const button = screen.getByRole('button');
			expect(button).not.toBeDisabled();
			expect(button).toHaveTextContent('Sign Out');
		});
	});

	describe('Click Handler', () => {
		it('should call auth.logOut on button click', async () => {
			render(LogoutButton);

			const button = screen.getByRole('button');
			await fireEvent.click(button);

			expect(mockAuth.logOut).toHaveBeenCalledTimes(1);
		});

		it('should not call auth.logOut when button is disabled (loading)', async () => {
			mockAuth.loading = true;

			render(LogoutButton);

			const button = screen.getByRole('button');
			await fireEvent.click(button);

			expect(mockAuth.logOut).not.toHaveBeenCalled();
		});

		it('should handle logout errors gracefully', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockAuth.logOut.mockRejectedValue(new Error('Logout failed'));

			render(LogoutButton);

			const button = screen.getByRole('button');
			await fireEvent.click(button);

			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
			});

			consoleErrorSpy.mockRestore();
		});
	});

	describe('Variant and Size Combinations', () => {
		it('should combine button variant with small size', async () => {
			render(LogoutButton, { props: { variant: 'button', size: 'sm' } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass(
				'bg-red-600',
				'text-white',
				'rounded-md',
				'px-3',
				'py-1.5',
				'text-sm'
			);
		});

		it('should combine link variant with large size', async () => {
			render(LogoutButton, { props: { variant: 'link', size: 'lg' } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('text-red-600', 'underline', 'px-6', 'py-3', 'text-base');
			expect(button).not.toHaveClass('bg-red-600', 'rounded-md');
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA attributes', async () => {
			render(LogoutButton);

			const button = screen.getByRole('button');
			expect(button).toHaveAttribute('type', 'button');
			expect(button).toHaveAttribute('title', 'Sign out of your account');
		});

		it('should be focusable when not disabled', async () => {
			render(LogoutButton);

			const button = screen.getByRole('button');
			button.focus();
			expect(document.activeElement).toBe(button);
		});

		it('should not be focusable when disabled (loading)', async () => {
			mockAuth.loading = true;

			render(LogoutButton);

			const button = screen.getByRole('button');
			expect(button).toHaveAttribute('disabled');
		});

		it('should have focus ring classes', async () => {
			render(LogoutButton);

			const button = screen.getByRole('button');
			expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
		});
	});

	describe('Props Type Safety', () => {
		it('should accept valid variant props', async () => {
			// Test button variant
			const { unmount: unmountButton } = render(LogoutButton, { props: { variant: 'button' } });
			expect(screen.getByRole('button')).toHaveClass('bg-red-600');
			unmountButton();

			// Test link variant
			render(LogoutButton, { props: { variant: 'link' } });
			expect(screen.getByRole('button')).toHaveClass('text-red-600', 'underline');
		});

		it('should accept valid size props', async () => {
			// Test small size
			const { unmount: unmountSm } = render(LogoutButton, { props: { size: 'sm' } });
			expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5');
			unmountSm();

			// Test medium size
			const { unmount: unmountMd } = render(LogoutButton, { props: { size: 'md' } });
			expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2');
			unmountMd();

			// Test large size
			render(LogoutButton, { props: { size: 'lg' } });
			expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3');
		});
	});

	describe('Derived State', () => {
		it('should correctly compute button classes using $derived', async () => {
			render(LogoutButton, { props: { variant: 'link', size: 'sm' } });

			const button = screen.getByRole('button');
			const computedClasses = button.className.split(' ');

			// Check base classes
			expect(computedClasses).toContain('inline-flex');
			expect(computedClasses).toContain('items-center');
			expect(computedClasses).toContain('justify-center');

			// Check variant classes
			expect(computedClasses).toContain('text-red-600');
			expect(computedClasses).toContain('underline');

			// Check size classes
			expect(computedClasses).toContain('px-3');
			expect(computedClasses).toContain('py-1.5');
		});
	});
});
