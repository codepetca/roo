/**
 * Unit tests for schema validation functions
 * Tests the safeValidateApiResponse and other validation helpers
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { safeValidateApiResponse, validateApiResponse } from './schemas';
import { verifyPasscodeResponseSchema } from '@shared/schemas/auth-responses';

describe('Schema Validation Functions', () => {
	describe('safeValidateApiResponse', () => {
		const testSchema = z.object({
			id: z.string(),
			name: z.string(),
			email: z.string().email()
		});

		it('should return success for valid data', () => {
			const validData = {
				id: '123',
				name: 'Test User',
				email: 'test@example.com'
			};

			const result = safeValidateApiResponse(testSchema, validData);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validData);
			}
		});

		it('should return error for invalid data with detailed message', () => {
			const invalidData = {
				id: 123, // Should be string
				name: 'Test User'
				// Missing email
			};

			const result = safeValidateApiResponse(testSchema, invalidData);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Field "id": Expected string, received number');
				expect(result.error).toContain('Field "email": Required');
			}
		});

		it('should handle null/undefined data', () => {
			const result1 = safeValidateApiResponse(testSchema, null);
			const result2 = safeValidateApiResponse(testSchema, undefined);

			expect(result1.success).toBe(false);
			expect(result2.success).toBe(false);
		});

		it('should handle nested object validation', () => {
			const nestedSchema = z.object({
				user: z.object({
					id: z.string(),
					profile: z.object({
						name: z.string(),
						email: z.string().email()
					})
				})
			});

			const validNestedData = {
				user: {
					id: '123',
					profile: {
						name: 'Test User',
						email: 'test@example.com'
					}
				}
			};

			const result = safeValidateApiResponse(nestedSchema, validNestedData);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validNestedData);
			}
		});

		it('should handle optional fields correctly', () => {
			const optionalSchema = z.object({
				id: z.string(),
				name: z.string(),
				email: z.string().email().optional(),
				phone: z.string().optional()
			});

			const dataWithoutOptionals = {
				id: '123',
				name: 'Test User'
			};

			const result = safeValidateApiResponse(optionalSchema, dataWithoutOptionals);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBeUndefined();
				expect(result.data.phone).toBeUndefined();
			}
		});
	});

	describe('validateApiResponse (throwing version)', () => {
		const testSchema = z.object({
			id: z.string(),
			name: z.string()
		});

		it('should return validated data for valid input', () => {
			const validData = { id: '123', name: 'Test' };
			const result = validateApiResponse(testSchema, validData);
			expect(result).toEqual(validData);
		});

		it('should throw ZodError for invalid input', () => {
			const invalidData = { id: 123, name: 'Test' };
			expect(() => validateApiResponse(testSchema, invalidData)).toThrow();
		});
	});

	describe('Auth Response Schema Validation', () => {
		it('should validate successful passcode verification response', () => {
			const successResponse = {
				email: 'student@example.com',
				valid: true,
				firebaseToken: 'custom-token-123',
				isNewUser: false,
				userProfile: {
					uid: 'test-uid-123',
					email: 'student@example.com',
					displayName: 'Test Student',
					role: 'student'
				}
			};

			const result = safeValidateApiResponse(verifyPasscodeResponseSchema, successResponse);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.valid).toBe(true);
				expect(result.data.firebaseToken).toBe('custom-token-123');
			}
		});

		it('should validate passcode verification with requiresClientAuth fallback', () => {
			const fallbackResponse = {
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

			const result = safeValidateApiResponse(verifyPasscodeResponseSchema, fallbackResponse);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.valid).toBe(true);
				expect(result.data.requiresClientAuth).toBe(true);
				expect(result.data.firebaseToken).toBeUndefined();
			}
		});

		it('should fail validation for missing required fields', () => {
			const incompleteResponse = {
				email: 'student@example.com',
				valid: true
				// Missing isNewUser and userProfile
			};

			const result = safeValidateApiResponse(verifyPasscodeResponseSchema, incompleteResponse);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Field "isNewUser": Required');
				expect(result.error).toContain('Field "userProfile": Required');
			}
		});

		it('should validate userProfile structure', () => {
			const responseWithBadProfile = {
				email: 'student@example.com',
				valid: true,
				isNewUser: false,
				userProfile: {
					uid: 'test-uid-123',
					email: 'not-an-email', // Invalid email
					displayName: 'Test Student',
					role: 'student'
				}
			};

			const result = safeValidateApiResponse(verifyPasscodeResponseSchema, responseWithBadProfile);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('userProfile.email');
			}
		});
	});

	describe('Real-world Response Format Testing', () => {
		it('should handle the exact format from our backend wrapper', () => {
			// This is the actual format our backend returns
			const backendWrapperResponse = {
				success: true,
				data: {
					email: 'student@example.com',
					valid: true,
					requiresClientAuth: true,
					isNewUser: false,
					userProfile: {
						uid: 'test-uid-123',
						email: 'student@example.com',
						displayName: 'Test Student',
						role: 'student'
					}
				}
			};

			// We should validate just the data part
			const result = safeValidateApiResponse(
				verifyPasscodeResponseSchema,
				backendWrapperResponse.data
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.requiresClientAuth).toBe(true);
			}
		});

		it('should fail when trying to validate wrapper format directly', () => {
			// This simulates the bug we just fixed
			const backendWrapperResponse = {
				success: true,
				data: {
					email: 'student@example.com',
					valid: true,
					requiresClientAuth: true,
					isNewUser: false,
					userProfile: {
						uid: 'test-uid-123',
						email: 'student@example.com',
						displayName: 'Test Student',
						role: 'student'
					}
				}
			};

			// Trying to validate the whole wrapper should fail
			const result = safeValidateApiResponse(verifyPasscodeResponseSchema, backendWrapperResponse);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Field "email": Required');
				expect(result.error).toContain('Field "valid": Required');
			}
		});
	});
});
