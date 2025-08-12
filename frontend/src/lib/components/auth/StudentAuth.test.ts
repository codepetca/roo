// @vitest-environment browser
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import StudentAuth from './StudentAuth.svelte';

// Mock Firebase
vi.mock('$lib/firebase', () => ({
	firebaseAuth: {}
}));

// Mock API
vi.mock('$lib/api', () => ({
	api: {
		createProfile: vi.fn().mockResolvedValue({})
	}
}));

// Mock Firebase functions
vi.mock('firebase/auth', () => ({
	signInWithEmailAndPassword: vi.fn(),
	sendPasswordResetEmail: vi.fn(),
	createUserWithEmailAndPassword: vi.fn(),
	updateProfile: vi.fn()
}));

describe('StudentAuth Svelte 5 Reactivity', () => {
	let component: any;
	let container: HTMLElement;

	beforeEach(() => {
		const result = render(StudentAuth);
		component = result.component;
		container = result.container;
	});

	describe('Phase 1: Enhanced Debugging', () => {
		it('should render debug panels correctly', () => {
			// Check environment test panel exists
			const testPanel = container.querySelector('.bg-yellow-50');
			expect(testPanel).toBeTruthy();
			expect(testPanel?.textContent).toContain('Svelte 5 Environment Test');
		});

		it('should show initial state values', () => {
			const testPanel = container.querySelector('.bg-yellow-50');
			expect(testPanel?.textContent).toContain('Test Counter: 0');
			expect(testPanel?.textContent).toContain('Test String: "initial"');
			expect(testPanel?.textContent).toContain('Email: ""');
			expect(testPanel?.textContent).toContain('Password: ""');
		});
	});

	describe('Phase 2: Environment Verification', () => {
		it('should update state when test button is clicked', async () => {
			const testButton = container.querySelector('button[type="button"]');
			expect(testButton?.textContent?.trim()).toBe('Test Manual Update');

			await fireEvent.click(testButton!);

			await waitFor(() => {
				const testPanel = container.querySelector('.bg-yellow-50');
				expect(testPanel?.textContent).toContain('Test Counter: 1');
				expect(testPanel?.textContent).toContain('test-1@example.com');
				expect(testPanel?.textContent).toContain('password-1');
			});
		});

		it('should toggle between input types', async () => {
			const toggleButton = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Toggle Input Type');
			
			expect(toggleButton).toBeTruthy();
			
			await fireEvent.click(toggleButton!);

			await waitFor(() => {
				const testPanel = container.querySelector('.bg-yellow-50');
				expect(testPanel?.textContent).toContain('Input Type: Native HTML');
			});
		});
	});

	describe('Phase 3: Native Input Fallback', () => {
		it('should render custom Input components by default', () => {
			// Switch to signup mode to see the inputs
			const signupLink = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Create account');
			
			fireEvent.click(signupLink!);

			// Should show custom Input components initially
			const customInputs = container.querySelectorAll('input[class*="block w-full rounded-md"]');
			expect(customInputs.length).toBeGreaterThan(0);
		});

		it('should switch to native inputs when toggled', async () => {
			// Go to signup mode first
			const signupLink = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Create account');
			await fireEvent.click(signupLink!);

			// Toggle to native inputs
			const toggleButton = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Toggle Input Type');
			await fireEvent.click(toggleButton!);

			await waitFor(() => {
				// Should show native inputs with inline event handlers
				const nativeInputs = container.querySelectorAll('input[type="email"], input[type="password"]');
				expect(nativeInputs.length).toBeGreaterThan(0);
			});
		});

		it('should sync state between native and custom inputs', async () => {
			// Go to signup mode
			const signupLink = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Create account');
			await fireEvent.click(signupLink!);

			// Enter some text in custom inputs first
			const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
			const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
			
			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			await fireEvent.input(passwordInput, { target: { value: 'testpassword' } });

			// Toggle to native inputs
			const toggleButton = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Toggle Input Type');
			await fireEvent.click(toggleButton!);

			await waitFor(() => {
				// Values should be preserved in debug panel
				const testPanel = container.querySelector('.bg-yellow-50');
				expect(testPanel?.textContent).toContain('test@example.com');
				expect(testPanel?.textContent).toContain('testpassword');
			});
		});
	});

	describe('Phase 4: Form Functionality', () => {
		beforeEach(async () => {
			// Switch to signup mode for testing
			const signupLink = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Create account');
			await fireEvent.click(signupLink!);
		});

		it('should enable create account button when email and password are filled', async () => {
			const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
			const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
			const createButton = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Create Account') as HTMLButtonElement;

			// Initially disabled
			expect(createButton.disabled).toBe(true);

			// Fill in email and password
			await fireEvent.input(emailInput, { target: { value: 'stewart.chan@gapps.yrdsb.ca' } });
			await fireEvent.input(passwordInput, { target: { value: 'testpassword123' } });

			await waitFor(() => {
				expect(createButton.disabled).toBe(false);
			});
		});

		it('should show correct values in debug panel', async () => {
			const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
			const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;

			await fireEvent.input(emailInput, { target: { value: 'stewart.chan@gapps.yrdsb.ca' } });
			await fireEvent.input(passwordInput, { target: { value: 'testpassword123' } });

			await waitFor(() => {
				const debugPanel = container.querySelector('.bg-gray-100');
				expect(debugPanel?.textContent).toContain('stewart.chan@gapps.yrdsb.ca');
				expect(debugPanel?.textContent).toContain('testpassword123');
				expect(debugPanel?.textContent).toContain('Button enabled: true');
			});
		});

		it('should test YRDSB email specifically', async () => {
			const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
			const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;

			// Test with YRDSB email
			await fireEvent.input(emailInput, { target: { value: 'stewart.chan@gapps.yrdsb.ca' } });
			await fireEvent.input(passwordInput, { target: { value: 'secure123' } });

			await waitFor(() => {
				const debugPanel = container.querySelector('.bg-gray-100');
				expect(debugPanel?.textContent).toContain('stewart.chan@gapps.yrdsb.ca');
				expect(debugPanel?.textContent).toContain('length: 27'); // Email length
				expect(debugPanel?.textContent).toContain('Button enabled: true');
			});
		});
	});

	describe('Password Reset Flow', () => {
		it('should switch to reset mode and accept YRDSB email', async () => {
			// Click forgot password link
			const forgotLink = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Forgot your password?');
			await fireEvent.click(forgotLink!);

			await waitFor(() => {
				expect(container.textContent).toContain('Reset Password');
			});

			// Test with YRDSB email
			const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
			await fireEvent.input(emailInput, { target: { value: 'stewart.chan@gapps.yrdsb.ca' } });

			const resetButton = Array.from(container.querySelectorAll('button'))
				.find(btn => btn.textContent?.trim() === 'Send Password Reset Email') as HTMLButtonElement;

			await waitFor(() => {
				expect(resetButton.disabled).toBe(false);
			});
		});
	});
});