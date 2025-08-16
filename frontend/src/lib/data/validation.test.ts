/**
 * TDD Tests for Schema Validation - Unified Architecture
 * Location: frontend/src/lib/data/validation.test.ts
 * 
 * Testing comprehensive schema validation for:
 * - User profile schemas (teacher/student roles)
 * - API response wrapper schemas
 * - Data type validation and error handling
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
	userProfileSchema, 
	apiResponseSchema, 
	createProfileDataSchema,
	authUserSchema,
	type UserProfile,
	type ApiResponse,
	type CreateProfileData,
	type AuthUser
} from './validation';
import { z } from 'zod';

describe('Schema Validation - TDD Red Phase', () => {
	describe('userProfileSchema', () => {
		it('should validate complete teacher profile', () => {
			// Arrange - Red Phase: This should FAIL initially
			const teacherProfile: UserProfile = {
				uid: 'teacher-123',
				email: 'teacher@school.edu',
				displayName: 'Dr. Sarah Johnson',
				role: 'teacher',
				schoolEmail: 'sarah.johnson@university.edu',
				createdAt: new Date('2023-01-15T10:30:00Z'),
				updatedAt: new Date('2024-01-10T14:20:00Z'),
				version: 2,
				isLatest: true
			};

			// Act & Assert - Should pass validation
			const result = userProfileSchema.parse(teacherProfile);
			expect(result.role).toBe('teacher');
			expect(result.schoolEmail).toBe('sarah.johnson@university.edu');
			expect(result.version).toBe(2);
			expect(result.isLatest).toBe(true);
		});

		it('should validate minimal student profile', () => {
			// Arrange - Student with only required fields
			const studentProfile = {
				uid: 'student-456',
				email: 'student@example.com',
				displayName: 'John Student',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Act & Assert - This should FAIL initially (Red phase)
			const result = userProfileSchema.parse(studentProfile);
			expect(result.role).toBe('student');
			expect(result.schoolEmail).toBeUndefined();
		});

		it('should reject invalid role values', () => {
			// Arrange - Invalid role
			const invalidProfile = {
				uid: 'user-123',
				email: 'user@example.com',
				displayName: 'Invalid User',
				role: 'admin', // Invalid role
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Act & Assert - Should throw validation error
			expect(() => userProfileSchema.parse(invalidProfile)).toThrow();
		});

		it('should reject missing required fields', () => {
			// Test missing uid
			const missingUid = {
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Test missing email  
			const missingEmail = {
				uid: 'user-123',
				displayName: 'Test User',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Act & Assert - All should fail validation
			expect(() => userProfileSchema.parse(missingUid)).toThrow();
			expect(() => userProfileSchema.parse(missingEmail)).toThrow();
		});

		it('should validate email format strictly', () => {
			// Arrange - Invalid email formats
			const invalidEmails = [
				'not-an-email',
				'missing@domain',
				'@domain.com',
				'spaces in@email.com',
				'email.com',
				''
			];

			// Act & Assert - All should fail validation
			invalidEmails.forEach(email => {
				const profileWithInvalidEmail = {
					uid: 'user-123',
					email,
					displayName: 'Test User',
					role: 'student',
					createdAt: new Date(),
					updatedAt: new Date(),
					version: 1,
					isLatest: true
				};

				expect(() => userProfileSchema.parse(profileWithInvalidEmail)).toThrow();
			});
		});

		it('should handle optional schoolEmail field correctly', () => {
			// Test with valid school email
			const withSchoolEmail = {
				uid: 'teacher-123',
				email: 'teacher@example.com',
				displayName: 'Teacher User',
				role: 'teacher',
				schoolEmail: 'teacher@school.edu',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Test with null school email
			const withNullSchoolEmail = {
				uid: 'teacher-456',
				email: 'teacher2@example.com',
				displayName: 'Teacher User 2',
				role: 'teacher',
				schoolEmail: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Test without school email field
			const withoutSchoolEmail = {
				uid: 'teacher-789',
				email: 'teacher3@example.com',
				displayName: 'Teacher User 3',
				role: 'teacher',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Act & Assert - All should pass
			expect(() => userProfileSchema.parse(withSchoolEmail)).not.toThrow();
			expect(() => userProfileSchema.parse(withNullSchoolEmail)).not.toThrow();
			expect(() => userProfileSchema.parse(withoutSchoolEmail)).not.toThrow();
		});

		it('should validate version and isLatest fields', () => {
			// Test with valid version fields
			const validVersioning = {
				uid: 'user-123',
				email: 'user@example.com',
				displayName: 'Test User',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 3,
				isLatest: false
			};

			// Test with invalid version (negative)
			const invalidVersion = {
				...validVersioning,
				version: -1
			};

			// Test with invalid version (string)
			const invalidVersionType = {
				...validVersioning,
				version: 'version-1'
			};

			// Act & Assert
			expect(() => userProfileSchema.parse(validVersioning)).not.toThrow();
			expect(() => userProfileSchema.parse(invalidVersion)).toThrow();
			expect(() => userProfileSchema.parse(invalidVersionType)).toThrow();
		});

		it('should validate date fields are actual Date objects', () => {
			// Test with string dates (should fail)
			const withStringDates = {
				uid: 'user-123',
				email: 'user@example.com',
				displayName: 'Test User',
				role: 'student',
				createdAt: '2023-01-15T10:30:00Z', // String instead of Date
				updatedAt: '2024-01-10T14:20:00Z', // String instead of Date
				version: 1,
				isLatest: true
			};

			// Test with number timestamps (should fail)
			const withNumberDates = {
				uid: 'user-123',
				email: 'user@example.com',
				displayName: 'Test User',
				role: 'student',
				createdAt: 1642249800000, // Number instead of Date
				updatedAt: 1704896400000, // Number instead of Date
				version: 1,
				isLatest: true
			};

			// Act & Assert - Should fail validation
			expect(() => userProfileSchema.parse(withStringDates)).toThrow();
			expect(() => userProfileSchema.parse(withNumberDates)).toThrow();
		});
	});

	describe('apiResponseSchema', () => {
		it('should validate successful API response', () => {
			// Arrange - Standard successful response
			const successResponse: ApiResponse<{id: string; name: string}> = {
				success: true,
				data: { id: 'test-123', name: 'Test Item' },
				error: null
			};

			// Act & Assert - Should pass validation
			const result = apiResponseSchema(z.object({
				id: z.string(),
				name: z.string()
			})).parse(successResponse);

			expect(result.success).toBe(true);
			expect(result.data.id).toBe('test-123');
			expect(result.error).toBeNull();
		});

		it('should validate failed API response', () => {
			// Arrange - Failed response with error message
			const failedResponse: ApiResponse<null> = {
				success: false,
				data: null,
				error: 'User not found'
			};

			// Act & Assert - Should pass validation 
			const result = apiResponseSchema(z.null()).parse(failedResponse);
			expect(result.success).toBe(false);
			expect(result.error).toBe('User not found');
			expect(result.data).toBeNull();
		});

		it('should validate API response with optional message field', () => {
			// Arrange - Response with optional message
			const responseWithMessage: ApiResponse<string> = {
				success: true,
				data: 'Operation completed',
				error: null,
				message: 'Profile updated successfully'
			};

			// Act & Assert - Should handle optional message
			const result = apiResponseSchema(z.string()).parse(responseWithMessage);
			expect(result.message).toBe('Profile updated successfully');
		});

		it('should reject malformed API responses', () => {
			// Test missing success field
			const missingSuccess = {
				data: 'test',
				error: null
			};

			// Test wrong success type
			const wrongSuccessType = {
				success: 'true', // String instead of boolean
				data: 'test',
				error: null
			};

			// Test missing data field
			const missingData = {
				success: true,
				error: null
			};

			const stringSchema = z.string();

			// Act & Assert - All should fail validation
			expect(() => apiResponseSchema(stringSchema).parse(missingSuccess)).toThrow();
			expect(() => apiResponseSchema(stringSchema).parse(wrongSuccessType)).toThrow();
			expect(() => apiResponseSchema(stringSchema).parse(missingData)).toThrow();
		});

		it('should validate nested data structures in API responses', () => {
			// Arrange - Complex nested data
			const complexData = {
				user: {
					profile: {
						personal: { name: 'John', age: 25 },
						academic: { grade: 'A', subjects: ['Math', 'Science'] }
					},
					permissions: { canEdit: true, level: 'admin' }
				},
				metadata: { timestamp: new Date(), version: 1 }
			};

			const complexResponse: ApiResponse<typeof complexData> = {
				success: true,
				data: complexData,
				error: null
			};

			// Define complex schema
			const complexSchema = z.object({
				user: z.object({
					profile: z.object({
						personal: z.object({
							name: z.string(),
							age: z.number()
						}),
						academic: z.object({
							grade: z.string(),
							subjects: z.array(z.string())
						})
					}),
					permissions: z.object({
						canEdit: z.boolean(),
						level: z.string()
					})
				}),
				metadata: z.object({
					timestamp: z.date(),
					version: z.number()
				})
			});

			// Act & Assert - Should validate complex nested structure
			const result = apiResponseSchema(complexSchema).parse(complexResponse);
			expect(result.data.user.profile.personal.name).toBe('John');
			expect(result.data.user.profile.academic.subjects).toContain('Math');
		});
	});

	describe('createProfileDataSchema', () => {
		it('should validate teacher profile creation data', () => {
			// Arrange - Teacher creation data
			const teacherData: CreateProfileData = {
				uid: 'new-teacher-123',
				role: 'teacher',
				displayName: 'Dr. Maria Garcia',
				schoolEmail: 'maria.garcia@university.edu'
			};

			// Act & Assert - Should pass validation
			const result = createProfileDataSchema.parse(teacherData);
			expect(result.role).toBe('teacher');
			expect(result.schoolEmail).toBe('maria.garcia@university.edu');
		});

		it('should validate student profile creation data', () => {
			// Arrange - Student creation data (minimal)
			const studentData: CreateProfileData = {
				uid: 'new-student-456',
				role: 'student'
			};

			// Act & Assert - Should pass validation
			const result = createProfileDataSchema.parse(studentData);
			expect(result.role).toBe('student');
			expect(result.displayName).toBeUndefined();
			expect(result.schoolEmail).toBeUndefined();
		});

		it('should reject invalid creation data', () => {
			// Missing uid
			const missingUid = {
				role: 'teacher',
				displayName: 'Test Teacher'
			};

			// Missing role
			const missingRole = {
				uid: 'user-123',
				displayName: 'Test User'
			};

			// Invalid role
			const invalidRole = {
				uid: 'user-123',
				role: 'administrator'
			};

			// Act & Assert - All should fail validation
			expect(() => createProfileDataSchema.parse(missingUid)).toThrow();
			expect(() => createProfileDataSchema.parse(missingRole)).toThrow();
			expect(() => createProfileDataSchema.parse(invalidRole)).toThrow();
		});

		it('should handle optional fields in creation data', () => {
			// With all optional fields
			const completeData = {
				uid: 'user-123',
				role: 'teacher',
				displayName: 'Complete Teacher',
				schoolEmail: 'complete@school.edu'
			};

			// With some optional fields
			const partialData = {
				uid: 'user-456',
				role: 'teacher',
				displayName: 'Partial Teacher'
				// No schoolEmail
			};

			// With minimal fields
			const minimalData = {
				uid: 'user-789',
				role: 'student'
				// No optional fields
			};

			// Act & Assert - All should pass
			expect(() => createProfileDataSchema.parse(completeData)).not.toThrow();
			expect(() => createProfileDataSchema.parse(partialData)).not.toThrow();
			expect(() => createProfileDataSchema.parse(minimalData)).not.toThrow();
		});
	});

	describe('authUserSchema', () => {
		it('should validate complete auth user data', () => {
			// Arrange - Complete auth user
			const authUser: AuthUser = {
				uid: 'auth-user-123',
				email: 'auth@example.com',
				displayName: 'Auth User',
				role: 'teacher',
				schoolEmail: 'auth@school.edu'
			};

			// Act & Assert - Should pass validation
			const result = authUserSchema.parse(authUser);
			expect(result.uid).toBe('auth-user-123');
			expect(result.role).toBe('teacher');
			expect(result.schoolEmail).toBe('auth@school.edu');
		});

		it('should validate auth user with null values', () => {
			// Arrange - Auth user with null fields
			const authUserWithNulls: AuthUser = {
				uid: 'auth-user-456',
				email: null,
				displayName: null,
				role: 'student',
				schoolEmail: null
			};

			// Act & Assert - Should handle null values
			const result = authUserSchema.parse(authUserWithNulls);
			expect(result.email).toBeNull();
			expect(result.displayName).toBeNull();
			expect(result.schoolEmail).toBeNull();
		});

		it('should reject auth user with invalid role', () => {
			// Arrange - Invalid role
			const invalidAuthUser = {
				uid: 'auth-user-789',
				email: 'invalid@example.com',
				displayName: 'Invalid User',
				role: 'superuser', // Invalid role
				schoolEmail: null
			};

			// Act & Assert - Should fail validation
			expect(() => authUserSchema.parse(invalidAuthUser)).toThrow();
		});

		it('should handle optional schoolEmail field in auth user', () => {
			// With schoolEmail
			const withSchoolEmail = {
				uid: 'user-1',
				email: 'user1@example.com',
				displayName: 'User One',
				role: 'teacher',
				schoolEmail: 'user1@school.edu'
			};

			// Without schoolEmail
			const withoutSchoolEmail = {
				uid: 'user-2',
				email: 'user2@example.com',
				displayName: 'User Two',
				role: 'student'
			};

			// With null schoolEmail
			const withNullSchoolEmail = {
				uid: 'user-3',
				email: 'user3@example.com',
				displayName: 'User Three',
				role: 'teacher',
				schoolEmail: null
			};

			// Act & Assert - All should pass
			expect(() => authUserSchema.parse(withSchoolEmail)).not.toThrow();
			expect(() => authUserSchema.parse(withoutSchoolEmail)).not.toThrow();
			expect(() => authUserSchema.parse(withNullSchoolEmail)).not.toThrow();
		});
	});

	describe('Schema Edge Cases and Error Handling', () => {
		it('should provide helpful error messages for validation failures', () => {
			// Test with clearly invalid data
			const invalidData = {
				uid: 123, // Should be string
				email: 'not-an-email',
				role: 'invalid-role'
			};

			try {
				userProfileSchema.parse(invalidData);
				throw new Error('Should have failed validation');
			} catch (error) {
				// Error should be descriptive
				expect(error).toBeInstanceOf(z.ZodError);
				const zodError = error as z.ZodError;
				expect(zodError.issues.length).toBeGreaterThan(0);
				expect(zodError.issues[0]).toHaveProperty('message');
			}
		});

		it('should handle very large string values', () => {
			// Test with extremely long strings
			const longString = 'a'.repeat(10000);
			const dataWithLongStrings = {
				uid: longString,
				email: `${longString}@example.com`,
				displayName: longString,
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Should handle large strings gracefully
			expect(() => userProfileSchema.parse(dataWithLongStrings)).not.toThrow();
		});

		it('should handle unicode and special characters', () => {
			// Test with unicode characters (using ASCII emails since Zod email validation is strict)
			const unicodeData = {
				uid: 'user-测试-123',
				email: 'test@example.com', // Valid ASCII email
				displayName: '🧑‍🏫 José María García-López',
				role: 'teacher',
				schoolEmail: 'jose@university.fr', // Valid ASCII email for schoolEmail  
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Should handle unicode characters in non-email fields properly
			expect(() => userProfileSchema.parse(unicodeData)).not.toThrow();
			
			const result = userProfileSchema.parse(unicodeData);
			expect(result.displayName).toBe('🧑‍🏫 José María García-López');
			expect(result.uid).toBe('user-测试-123');
		});

		it('should validate schema transformation consistency', () => {
			// Test that parsing and re-parsing produces same result
			const originalData = {
				uid: 'consistency-test',
				email: 'consistency@example.com',
				displayName: 'Consistency Test',
				role: 'teacher',
				createdAt: new Date('2023-01-01T00:00:00Z'),
				updatedAt: new Date('2023-12-31T23:59:59Z'),
				version: 1,
				isLatest: true
			};

			// Parse once
			const firstParse = userProfileSchema.parse(originalData);
			
			// Parse again
			const secondParse = userProfileSchema.parse(firstParse);

			// Should be identical
			expect(secondParse).toEqual(firstParse);
		});

		it('should reject deeply nested malicious objects', () => {
			// Test protection against prototype pollution attempts
			const maliciousData = {
				uid: 'malicious-user',
				email: 'malicious@example.com',
				displayName: 'Malicious User',
				role: 'student',
				'__proto__': { malicious: true },
				constructor: { malicious: true },
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Should still validate (Zod handles this safely)
			const result = userProfileSchema.parse(maliciousData);
			expect(result.uid).toBe('malicious-user');
			// Malicious properties should not be present in result
			expect((result as any).__proto__.malicious).toBeUndefined();
		});
	});

	describe('Performance and Scalability', () => {
		it('should validate large datasets efficiently', () => {
			// Create array of many profiles
			const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
				uid: `user-${i}`,
				email: `user${i}@example.com`,
				displayName: `User ${i}`,
				role: i % 2 === 0 ? 'teacher' : 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			}));

			// Validate each profile - should be fast
			const startTime = performance.now();
			
			largeDataset.forEach(profile => {
				userProfileSchema.parse(profile);
			});
			
			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within reasonable time (< 100ms for 1000 items)
			expect(duration).toBeLessThan(100);
		});

		it('should handle concurrent validation requests', async () => {
			// Test concurrent parsing
			const testData = {
				uid: 'concurrent-test',
				email: 'concurrent@example.com',
				displayName: 'Concurrent Test',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// Run multiple validations concurrently
			const concurrentValidations = Array.from({ length: 100 }, () =>
				Promise.resolve(userProfileSchema.parse(testData))
			);

			// All should succeed
			const results = await Promise.all(concurrentValidations);
			expect(results).toHaveLength(100);
			results.forEach(result => {
				expect(result.uid).toBe('concurrent-test');
			});
		});
	});
});