/**
 * UserService Tests - Simplified API-Only Architecture
 * Location: frontend/src/lib/services/user-service.test.ts
 *
 * Testing the simplified service layer that provides:
 * - Direct API consumption without DataAdapter
 * - Firebase Callable functions for profile creation
 * - Schema validation at service boundaries
 * - No real-time listeners or Firestore fallbacks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User as FirebaseUser } from 'firebase/auth';

// Mock modules before importing the service
const mockApiRequest = vi.fn();
const mockCallFunction = vi.fn();
const mockUserProfileValidate = vi.fn();
const mockCreateProfileValidate = vi.fn();

vi.mock('../api/client', () => ({
	apiRequest: mockApiRequest,
	callFunction: mockCallFunction
}));

vi.mock('../data/validation', () => ({
	validateCreateProfileData: mockCreateProfileValidate,
	userProfileSchema: {
		parse: mockUserProfileValidate
	}
}));

// Import after mocks are set up
const { UserService } = await import('./user-service');

type UserProfile = {
	id: string;
	email: string;
	displayName: string;
	role: 'teacher' | 'student' | 'admin';
	schoolEmail?: string | null;
	// Google ID field - required by new schema
	googleUserId: string;
	// Firebase Auth integration
	firebaseUid?: string;
	createdAt: Date;
	updatedAt: Date;
	classroomIds: string[];
	totalStudents: number;
	totalClassrooms: number;
};

type CreateProfileData = {
	id: string;
	role: 'teacher' | 'student';
	displayName?: string;
	schoolEmail?: string;
};

describe('UserService - API-Only Architecture', () => {
	let userService: UserService;
	let mockFirebaseUser: FirebaseUser;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create new service instance for each test
		userService = new UserService();

		// Mock Firebase user
		mockFirebaseUser = {
			uid: 'test-user-123',
			email: 'test@example.com',
			displayName: 'Test User',
			getIdToken: vi.fn().mockResolvedValue('mock-token-123')
		} as unknown as FirebaseUser;
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('getUserProfile - API Success Path', () => {
		it('should fetch user profile via API successfully', async () => {
			// Arrange
			const mockApiResponse = {
				success: true,
				data: {
					id: 'test-user-123',
					email: 'test@example.com',
					displayName: 'Test User',
					role: 'teacher',
					schoolEmail: 'test@school.edu',
					// Google ID field - required by new schema
					googleUserId: 'google-user-teacher-123',
					firebaseUid: 'test-user-123',
					createdAt: new Date('2023-01-01'),
					updatedAt: new Date('2024-01-01'),
					classroomIds: ['classroom-1', 'classroom-2'],
					totalStudents: 45,
					totalClassrooms: 2
				}
			};

			mockApiRequest.mockResolvedValue(mockApiResponse);
			mockUserProfileValidate.mockReturnValue(mockApiResponse.data);

			// Act
			const result = await userService.getUserProfile(mockFirebaseUser);

			// Assert
			expect(result).toEqual(mockApiResponse.data);
			expect(mockApiRequest).toHaveBeenCalledWith('/users/profile', { method: 'GET' });
			expect(mockUserProfileValidate).toHaveBeenCalledWith(mockApiResponse.data);
		});

		it('should handle API error responses', async () => {
			// Arrange
			const mockErrorResponse = {
				success: false,
				error: 'User not found'
			};

			mockApiRequest.mockResolvedValue(mockErrorResponse);

			// Act & Assert
			await expect(userService.getUserProfile(mockFirebaseUser)).rejects.toThrow('User not found');
			expect(mockApiRequest).toHaveBeenCalled();
			expect(mockUserProfileValidate).not.toHaveBeenCalled();
		});

		it('should handle invalid API response format', async () => {
			// Arrange
			const invalidResponse = { invalid: 'response' };
			mockApiRequest.mockResolvedValue(invalidResponse);

			// Act & Assert
			await expect(userService.getUserProfile(mockFirebaseUser)).rejects.toThrow(
				'Invalid API response format'
			);
		});

		it('should handle missing data in API response', async () => {
			// Arrange
			const responseWithoutData = {
				success: true
				// Missing data field
			};
			mockApiRequest.mockResolvedValue(responseWithoutData);

			// Act & Assert
			await expect(userService.getUserProfile(mockFirebaseUser)).rejects.toThrow(
				'API response missing data field'
			);
		});

		it('should handle schema validation errors', async () => {
			// Arrange
			const mockApiResponse = {
				success: true,
				data: {
					id: 'test-user-123',
					// Invalid data that will fail schema validation
					role: 'invalid-role'
				}
			};

			mockApiRequest.mockResolvedValue(mockApiResponse);
			mockUserProfileValidate.mockImplementation(() => {
				throw new Error('Schema validation failed');
			});

			// Act & Assert
			await expect(userService.getUserProfile(mockFirebaseUser)).rejects.toThrow(
				'Schema validation failed'
			);
		});

		it('should handle API network errors', async () => {
			// Arrange
			const networkError = new Error('Network connection failed');
			mockApiRequest.mockRejectedValue(networkError);

			// Act & Assert
			await expect(userService.getUserProfile(mockFirebaseUser)).rejects.toThrow(
				'Network connection failed'
			);
		});
	});

	describe('createProfile - Firebase Callable Function', () => {
		it('should create user profile via Firebase Callable successfully', async () => {
			// Arrange
			const createData: CreateProfileData = {
				id: 'new-user-123',
				role: 'teacher',
				displayName: 'New Teacher',
				schoolEmail: 'new@school.edu'
			};

			const expectedProfile: UserProfile = {
				id: 'new-user-123',
				email: 'new@example.com',
				displayName: 'New Teacher',
				role: 'teacher',
				schoolEmail: 'new@school.edu',
				// Google ID field - required by new schema
				googleUserId: 'google-user-teacher-new-123',
				firebaseUid: 'new-user-123',
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-01'),
				classroomIds: [],
				totalStudents: 0,
				totalClassrooms: 0
			};

			const mockCallableResponse = {
				data: {
					profile: expectedProfile
				}
			};

			mockCreateProfileValidate.mockReturnValue(createData);
			mockCallFunction.mockResolvedValue(mockCallableResponse);
			mockUserProfileValidate.mockReturnValue(expectedProfile);

			// Act
			const result = await userService.createProfile(createData);

			// Assert
			expect(result).toEqual(expectedProfile);
			expect(mockCreateProfileValidate).toHaveBeenCalledWith(createData);
			expect(mockCallFunction).toHaveBeenCalledWith('createProfileForExistingUser', createData);
			expect(mockUserProfileValidate).toHaveBeenCalledWith(expectedProfile);
		});

		it('should handle profile creation validation errors', async () => {
			// Arrange
			const invalidData = {
				id: 'test',
				role: 'invalid-role'
			};

			mockCreateProfileValidate.mockImplementation(() => {
				throw new Error('Invalid profile creation data');
			});

			// Act & Assert
			await expect(userService.createProfile(invalidData as any)).rejects.toThrow(
				'Invalid profile creation data'
			);
		});

		it('should handle invalid callable response format', async () => {
			// Arrange
			const createData: CreateProfileData = {
				id: 'new-user-123',
				role: 'student'
			};

			const invalidCallableResponse = {
				data: {
					// Missing profile field
					success: true
				}
			};

			mockCreateProfileValidate.mockReturnValue(createData);
			mockCallFunction.mockResolvedValue(invalidCallableResponse);

			// Act & Assert
			await expect(userService.createProfile(createData)).rejects.toThrow(
				'Invalid response from profile creation function'
			);
		});

		it('should handle callable function errors', async () => {
			// Arrange
			const createData: CreateProfileData = {
				id: 'new-user-123',
				role: 'teacher'
			};

			const callableError = new Error('Firebase function failed');
			mockCreateProfileValidate.mockReturnValue(createData);
			mockCallFunction.mockRejectedValue(callableError);

			// Act & Assert
			await expect(userService.createProfile(createData)).rejects.toThrow(
				'Firebase function failed'
			);
		});
	});

	describe('updateSchoolEmail - API Update', () => {
		it('should update school email successfully', async () => {
			// Arrange
			const newSchoolEmail = 'updated@school.edu';
			const mockApiResponse = {
				success: true,
				schoolEmail: newSchoolEmail
			};

			mockApiRequest.mockResolvedValue(mockApiResponse);

			// Act
			const result = await userService.updateSchoolEmail(newSchoolEmail);

			// Assert
			expect(result).toEqual({
				success: true,
				schoolEmail: newSchoolEmail
			});
			expect(mockApiRequest).toHaveBeenCalledWith('/users/school-email', {
				method: 'PUT',
				body: JSON.stringify({ schoolEmail: newSchoolEmail }),
				headers: { 'Content-Type': 'application/json' }
			});
		});

		it('should handle update API errors', async () => {
			// Arrange
			const schoolEmail = 'test@school.edu';
			const mockErrorResponse = {
				success: false,
				error: 'Invalid email format'
			};

			mockApiRequest.mockResolvedValue(mockErrorResponse);

			// Act & Assert
			await expect(userService.updateSchoolEmail(schoolEmail)).rejects.toThrow(
				'Invalid email format'
			);
		});

		it('should handle invalid update response format', async () => {
			// Arrange
			const schoolEmail = 'test@school.edu';
			const invalidResponse = { invalid: 'response' };

			mockApiRequest.mockResolvedValue(invalidResponse);

			// Act & Assert
			await expect(userService.updateSchoolEmail(schoolEmail)).rejects.toThrow(
				'Invalid API response format'
			);
		});
	});

	describe('getProfileWithFallback - Simplified Entry Point', () => {
		it('should delegate to getUserProfile (no fallback needed)', async () => {
			// Arrange
			const mockProfile = {
				id: 'test-user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'teacher',
				// Google ID field - required by new schema
				googleUserId: 'google-user-teacher-123',
				firebaseUid: 'test-user-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				classroomIds: [],
				totalStudents: 0,
				totalClassrooms: 0
			};

			const mockApiResponse = {
				success: true,
				data: mockProfile
			};

			mockApiRequest.mockResolvedValue(mockApiResponse);
			mockUserProfileValidate.mockReturnValue(mockProfile);

			// Act
			const result = await userService.getProfileWithFallback(mockFirebaseUser);

			// Assert
			expect(result).toEqual(mockProfile);
			expect(mockApiRequest).toHaveBeenCalledWith('/users/profile', { method: 'GET' });
		});

		it('should propagate errors from getUserProfile', async () => {
			// Arrange
			const apiError = new Error('API service unavailable');
			mockApiRequest.mockRejectedValue(apiError);

			// Act & Assert
			await expect(userService.getProfileWithFallback(mockFirebaseUser)).rejects.toThrow(
				'API service unavailable'
			);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle concurrent profile requests', async () => {
			// Arrange
			const mockProfile = {
				id: 'concurrent-user',
				email: 'concurrent@example.com',
				displayName: 'Concurrent User',
				role: 'student',
				// Google ID field - required by new schema
				googleUserId: 'google-user-student-456',
				firebaseUid: 'concurrent-user',
				createdAt: new Date(),
				updatedAt: new Date(),
				classroomIds: [],
				totalStudents: 0,
				totalClassrooms: 0
			};

			const mockApiResponse = {
				success: true,
				data: mockProfile
			};

			mockApiRequest.mockResolvedValue(mockApiResponse);
			mockUserProfileValidate.mockReturnValue(mockProfile);

			// Act
			const requests = Array.from({ length: 5 }, () =>
				userService.getUserProfile(mockFirebaseUser)
			);

			// Assert
			const results = await Promise.all(requests);
			results.forEach((result) => {
				expect(result).toEqual(mockProfile);
			});
		});

		it('should handle malformed Firebase user objects', async () => {
			// Arrange
			const invalidUser = {
				uid: null,
				email: undefined,
				displayName: ''
			} as unknown as FirebaseUser;

			// Act & Assert
			// The service should pass the user object to API client, which will handle auth
			// This test ensures the service doesn't crash with malformed user objects
			mockApiRequest.mockRejectedValue(new Error('Authentication failed'));
			await expect(userService.getUserProfile(invalidUser)).rejects.toThrow(
				'Authentication failed'
			);
		});

		it('should have reasonable performance characteristics', async () => {
			// Arrange
			const standardProfile = {
				id: 'perf-user',
				email: 'perf@example.com',
				displayName: 'Performance User',
				role: 'student',
				// Google ID field - required by new schema
				googleUserId: 'google-user-student-perf',
				firebaseUid: 'perf-user',
				createdAt: new Date(),
				updatedAt: new Date(),
				classroomIds: [],
				totalStudents: 0,
				totalClassrooms: 0
			};

			const mockApiResponse = {
				success: true,
				data: standardProfile
			};

			mockApiRequest.mockResolvedValue(mockApiResponse);
			mockUserProfileValidate.mockReturnValue(standardProfile);

			// Act
			const startTime = performance.now();
			for (let i = 0; i < 100; i++) {
				await userService.getUserProfile(mockFirebaseUser);
			}
			const endTime = performance.now();

			// Assert
			const avgTime = (endTime - startTime) / 100;
			expect(avgTime).toBeLessThan(1); // Should be fast with mocks
		});
	});
});
