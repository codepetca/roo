/**
 * Unit tests for StudentPasscodeAuth component
 * Tests passcode verification and response handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import StudentPasscodeAuth from './StudentPasscodeAuth.svelte';

// Mock the API
vi.mock('../../api/endpoints', () => ({
  api: {
    verifyPasscode: vi.fn(),
    studentRequestPasscode: vi.fn()
  }
}));

// Mock Firebase Auth
vi.mock('../../firebase', () => ({
  firebaseAuth: {},
  signInWithCustomToken: vi.fn()
}));

const mockApi = await import('../../api/endpoints');
const mockFirebase = await import('../../firebase');

describe('StudentPasscodeAuth Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle successful verification with custom token', async () => {
    const mockResponse = {
      email: 'student@example.com',
      valid: true,
      firebaseToken: 'custom-token-123',
      isNewUser: false,
      userProfile: {
        uid: 'user-123',
        email: 'student@example.com',
        displayName: 'Test Student',
        role: 'student'
      }
    };

    const mockUser = {
      uid: 'user-123',
      email: 'student@example.com',
      displayName: 'Test Student'
    };

    mockApi.api.verifyPasscode.mockResolvedValue(mockResponse);
    mockFirebase.signInWithCustomToken.mockResolvedValue({ user: mockUser });

    const { getByRole, component } = render(StudentPasscodeAuth);
    
    let successEvent = null;
    component.$on('success', (event) => {
      successEvent = event.detail;
    });

    // Simulate form submission
    const emailInput = getByRole('textbox', { name: /email/i });
    const passcodeInput = getByRole('textbox', { name: /passcode/i });
    const submitButton = getByRole('button', { name: /verify/i });

    await fireEvent.input(emailInput, { target: { value: 'student@example.com' } });
    await fireEvent.input(passcodeInput, { target: { value: 'ABC12' } });
    await fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.api.verifyPasscode).toHaveBeenCalledWith({
        email: 'student@example.com',
        passcode: 'ABC12'
      });
    });

    expect(mockFirebase.signInWithCustomToken).toHaveBeenCalledWith({}, 'custom-token-123');
    expect(successEvent).toEqual({
      user: mockUser,
      isNewUser: false,
      profile: mockResponse.userProfile
    });
  });

  it('should handle successful verification with requiresClientAuth fallback', async () => {
    const mockResponse = {
      email: 'student@example.com',
      valid: true,
      requiresClientAuth: true, // No firebaseToken due to IAM permissions
      isNewUser: false,
      userProfile: {
        uid: 'user-123',
        email: 'student@example.com',
        displayName: 'Test Student',
        role: 'student'
      }
    };

    mockApi.api.verifyPasscode.mockResolvedValue(mockResponse);

    const { getByRole, component } = render(StudentPasscodeAuth);
    
    let successEvent = null;
    component.$on('success', (event) => {
      successEvent = event.detail;
    });

    // Simulate form submission
    const emailInput = getByRole('textbox', { name: /email/i });
    const passcodeInput = getByRole('textbox', { name: /passcode/i });
    const submitButton = getByRole('button', { name: /verify/i });

    await fireEvent.input(emailInput, { target: { value: 'student@example.com' } });
    await fireEvent.input(passcodeInput, { target: { value: 'ABC12' } });
    await fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.api.verifyPasscode).toHaveBeenCalledWith({
        email: 'student@example.com',
        passcode: 'ABC12'
      });
    });

    // Should NOT call signInWithCustomToken for fallback case
    expect(mockFirebase.signInWithCustomToken).not.toHaveBeenCalled();
    
    // Should dispatch success with requiresClientAuth flag
    expect(successEvent).toEqual({
      user: {
        uid: 'user-123',
        email: 'student@example.com',
        displayName: 'Test Student'
      },
      isNewUser: false,
      profile: mockResponse.userProfile,
      requiresClientAuth: true
    });
  });

  it('should handle invalid passcode error', async () => {
    const mockError = new Error('API response validation failed: Invalid passcode');
    mockApi.api.verifyPasscode.mockRejectedValue(mockError);

    const { getByRole, getByText } = render(StudentPasscodeAuth);

    // Simulate form submission
    const emailInput = getByRole('textbox', { name: /email/i });
    const passcodeInput = getByRole('textbox', { name: /passcode/i });
    const submitButton = getByRole('button', { name: /verify/i });

    await fireEvent.input(emailInput, { target: { value: 'student@example.com' } });
    await fireEvent.input(passcodeInput, { target: { value: 'WRONG' } });
    await fireEvent.click(submitButton);

    await waitFor(() => {
      expect(getByText(/invalid passcode/i)).toBeInTheDocument();
    });
  });

  it('should throw error for invalid response format', async () => {
    const mockResponse = {
      valid: true
      // Missing both firebaseToken and requiresClientAuth
    };

    mockApi.api.verifyPasscode.mockResolvedValue(mockResponse);

    const { getByRole } = render(StudentPasscodeAuth);

    const emailInput = getByRole('textbox', { name: /email/i });
    const passcodeInput = getByRole('textbox', { name: /passcode/i });
    const submitButton = getByRole('button', { name: /verify/i });

    await fireEvent.input(emailInput, { target: { value: 'student@example.com' } });
    await fireEvent.input(passcodeInput, { target: { value: 'ABC12' } });
    await fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.api.verifyPasscode).toHaveBeenCalled();
    });

    // Should display error for invalid response
    await waitFor(() => {
      expect(getByText(/invalid passcode verification response/i)).toBeInTheDocument();
    });
  });
});