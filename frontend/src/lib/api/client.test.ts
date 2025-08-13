/**
 * Unit tests for API client functions
 * Tests schema validation, response handling, and error cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { typedApiRequest } from './client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Firebase auth
vi.mock('../firebase', () => ({
	firebaseAuth: {
		currentUser: {
			uid: 'test-user-123',
			getIdToken: vi.fn().mockResolvedValue('test-token-123')
		}
	}
}));

describe('API Client - Schema Validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('typedApiRequest', () => {
		const testSchema = z.object({
			id: z.string(),
			name: z.string(),
			email: z.string().email()
		});

		it('should validate direct response data successfully', async () => {
			const responseData = {
				id: '123',
				name: 'Test User',
				email: 'test@example.com'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(responseData)
			});

			const result = await typedApiRequest('/test', { method: 'GET' }, testSchema);

			expect(result).toEqual(responseData);
		});

		it('should extract data from API wrapper format successfully', async () => {
			const responseData = {
				id: '123',
				name: 'Test User',
				email: 'test@example.com'
			};

			const wrappedResponse = {
				success: true,
				data: responseData
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(wrappedResponse)
			});

			const result = await typedApiRequest('/test', { method: 'GET' }, testSchema);

			expect(result).toEqual(responseData);
		});

		it('should handle API wrapper with success:false', async () => {
			const wrappedResponse = {
				success: false,
				error: 'Test error message',
				data: null
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(wrappedResponse)
			});

			// This should fail validation since data is null
			await expect(typedApiRequest('/test', { method: 'GET' }, testSchema)).rejects.toThrow(
				'API response validation failed'
			);
		});

		it('should validate auth response schema with optional fields', async () => {
			const authSchema = z.object({
				email: z.string().email(),
				valid: z.boolean(),
				firebaseToken: z.string().optional(),
				requiresClientAuth: z.boolean().optional(),
				isNewUser: z.boolean(),
				userProfile: z.object({
					uid: z.string(),
					email: z.string().email(),
					displayName: z.string(),
					role: z.string()
				})
			});

			const responseData = {
				email: 'student@example.com',
				valid: true,
				requiresClientAuth: true, // No firebaseToken when this is true
				isNewUser: false,
				userProfile: {
					uid: 'test-uid-123',
					email: 'student@example.com',
					displayName: 'Test Student',
					role: 'student'
				}
			};

			const wrappedResponse = {
				success: true,
				data: responseData
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(wrappedResponse)
			});

			const result = await typedApiRequest('/auth/verify-passcode', { method: 'POST' }, authSchema);

			expect(result).toEqual(responseData);
			expect(result.requiresClientAuth).toBe(true);
			expect(result.firebaseToken).toBeUndefined();
		});

		it('should fail validation with helpful error message', async () => {
			const invalidResponseData = {
				id: 123, // Should be string
				name: 'Test User'
				// Missing email field
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(invalidResponseData)
			});

			await expect(typedApiRequest('/test', { method: 'GET' }, testSchema)).rejects.toThrow(
				/API response validation failed/
			);
		});

		it('should handle network errors gracefully', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(typedApiRequest('/test', { method: 'GET' }, testSchema)).rejects.toThrow(
				'Network error'
			);
		});

		it('should handle non-JSON responses', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
			});

			await expect(typedApiRequest('/test', { method: 'GET' }, testSchema)).rejects.toThrow(
				'Invalid JSON'
			);
		});

		it('should handle HTTP error responses with JSON body', async () => {
			const errorResponse = {
				success: false,
				error: 'Validation failed',
				details: 'Email is required'
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: vi.fn().mockResolvedValue(errorResponse)
			});

			await expect(typedApiRequest('/test', { method: 'POST' }, testSchema)).rejects.toThrow(
				'400 Validation failed'
			);
		});

		it('should preserve authentication token in requests', async () => {
			const responseData = {
				id: '123',
				name: 'Test User',
				email: 'test@example.com'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(responseData)
			});

			await typedApiRequest('/test', { method: 'GET' }, testSchema);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/test'),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token-123',
						'Content-Type': 'application/json'
					})
				})
			);
		});
	});
});
