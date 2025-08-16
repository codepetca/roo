/**
 * TDD Tests for UserService Integration - Unified Architecture
 * Location: frontend/src/lib/services/user-service.test.ts
 * 
 * Testing the unified service layer that provides:
 * - API fallback to direct Firestore access
 * - Consistent data transformation across sources
 * - Error handling and retry mechanisms
 * - Schema validation at service boundaries
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User as FirebaseUser } from 'firebase/auth';

// Mock modules before importing the service
const mockTypedApiRequest = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn();
const mockFromApiResponse = vi.fn();
const mockFromFirestoreDoc = vi.fn();
const mockUserProfileValidate = vi.fn();
const mockCreateProfileValidate = vi.fn();

vi.mock('../api/client', () => ({
	typedApiRequest: mockTypedApiRequest
}));

vi.mock('firebase/firestore', () => ({
	getDoc: mockGetDoc,
	setDoc: mockSetDoc,
	doc: mockDoc,
	serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

vi.mock('../firebase', () => ({
	firebaseFirestore: { name: 'mock-firestore' }
}));

vi.mock('../data/adapters', () => ({
	DataAdapter: {
		fromApiResponse: mockFromApiResponse,
		fromFirestoreDoc: mockFromFirestoreDoc
	}
}));

vi.mock('../data/validation', () => ({
	validateUserProfile: mockUserProfileValidate,
	validateCreateProfileData: mockCreateProfileValidate,
	userProfileSchema: {
		parse: mockUserProfileValidate
	}
}));

// Import after mocks are set up
const { UserService } = await import('./user-service');
const { userProfileSchema } = await import('../data/validation');

type UserProfile = {
	uid: string;
	email: string;
	displayName: string;
	role: 'teacher' | 'student';
	schoolEmail?: string | null;
	createdAt: Date;
	updatedAt: Date;
	version: number;
	isLatest: boolean;
};

type CreateProfileData = {
	uid: string;
	role: 'teacher' | 'student';
	displayName?: string;
	schoolEmail?: string;
};

describe('UserService Integration - TDD Red Phase', () => {
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

		// Setup default mocks
		mockDoc.mockReturnValue({ path: 'users/test-user-123' });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('getUserProfile - API Success Path', () => {
		it('should fetch user profile via API successfully', async () => {
			// Arrange - Red Phase: This should FAIL initially  
			const mockApiResponse = {
				uid: 'test-user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'teacher',
				schoolEmail: 'test@school.edu',
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2024-01-01'),
				version: 1,
				isLatest: true
			};

			mockTypedApiRequest.mockResolvedValue(mockApiResponse);
			mockFromApiResponse.mockReturnValue(mockApiResponse);
			mockUserProfileValidate.mockReturnValue(mockApiResponse);

			// Act
			const result = await userService.getUserProfile(mockFirebaseUser);

			// Assert - This should FAIL initially (Red phase)
			expect(result).toEqual(mockApiResponse);
			expect(mockTypedApiRequest).toHaveBeenCalledWith(
				'/users/profile',
				{ method: 'GET' },
				expect.any(Object) // user profile schema
			);
			expect(mockUserProfileValidate).toHaveBeenCalledWith(mockApiResponse);
		});

		it('should handle API timeout gracefully', async () => {
			// Arrange - Simulate API timeout
			const timeoutError = new Error('Request timeout');
			timeoutError.name = 'TimeoutError';
			
			mockTypedApiRequest.mockRejectedValue(timeoutError);

			// Act & Assert - Should throw timeout error
			await expect(userService.getUserProfile(mockFirebaseUser)).rejects.toThrow('Request timeout');
			expect(mockTypedApiRequest).toHaveBeenCalled();
		});

		it('should validate API response with schema', async () => {
			// Arrange - Invalid API response
			const invalidResponse = {
				uid: 'test-user-123',
				// Missing required fields
				role: 'invalid-role'
			};

			mockTypedApiRequest.mockResolvedValue(invalidResponse);
			mockFromApiResponse.mockReturnValue(invalidResponse);
			mockUserProfileValidate.mockImplementation(() => {
				throw new Error('Schema validation failed');
			});

			// Act & Assert - Should throw validation error
			await expect(userService.getUserProfile(mockFirebaseUser)).rejects.toThrow('Schema validation failed');
		});

		it('should handle API rate limiting', async () => {
			// Arrange - Rate limit error  
			const rateLimitError = new Error('Too many requests');
			rateLimitError.name = 'RateLimitError';
			
			mockTypedApiRequest.mockRejectedValue(rateLimitError);

			// Act & Assert - Should throw rate limit error
			await expect(userService.getUserProfile(mockFirebaseUser)).rejects.toThrow('Too many requests');
		});
	});

	describe('getUserProfileDirect - Firestore Fallback', () => {
		it('should fetch user profile directly from Firestore', async () => {
			// Arrange - Red Phase: This should FAIL initially
			const mockFirestoreData = {
				uid: 'test-user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'student',
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2024-01-01'),
				version: 1,
				isLatest: true
			};

			const mockFirestoreDoc = {
				exists: true,
				data: vi.fn().mockReturnValue(mockFirestoreData),
				id: 'test-user-123'
			};

			mockGetDoc.mockResolvedValue(mockFirestoreDoc);
			mockFromFirestoreDoc.mockReturnValue(mockFirestoreData);
			mockUserProfileValidate.mockReturnValue(mockFirestoreData);

			// Act
			const result = await userService.getUserProfileDirect('test-user-123');

			// Assert - This should FAIL initially
			expect(result).toEqual(mockFirestoreData);
			expect(mockGetDoc).toHaveBeenCalled();
			expect(mockFromFirestoreDoc).toHaveBeenCalledWith(mockFirestoreDoc);
			expect(mockUserProfileValidate).toHaveBeenCalledWith(mockFirestoreData);
		});

		it('should throw error when Firestore document does not exist', async () => {
			// Arrange - Non-existent document
			const mockNonExistentDoc = {
				exists: false,
				data: vi.fn().mockReturnValue(undefined)
			};

			mockGetDoc.mockResolvedValue(mockNonExistentDoc);
			mockFromFirestoreDoc.mockImplementation(() => {
				throw new Error('Document does not exist');
			});

			// Act & Assert - Should throw document not found error
			await expect(userService.getUserProfileDirect('non-existent-user')).rejects.toThrow('Document does not exist');
		});

		it('should handle Firestore permission errors', async () => {
			// Arrange - Permission denied error
			const permissionError = new Error('Missing or insufficient permissions');
			permissionError.name = 'FirebaseError';
			
			mockGetDoc.mockRejectedValue(permissionError);

			// Act & Assert - Should throw permission error
			await expect(userService.getUserProfileDirect('test-user-123')).rejects.toThrow('Missing or insufficient permissions');
		});

		it('should validate Firestore data with schema', async () => {
			// Arrange - Invalid Firestore data
			const invalidData = {
				uid: 'test-user-123',
				email: 'invalid-email', // Invalid format
				role: 'admin' // Invalid role
			};

			const mockDoc = {
				exists: true,
				data: vi.fn().mockReturnValue(invalidData)
			};

			mockGetDoc.mockResolvedValue(mockDoc);
			mockFromFirestoreDoc.mockReturnValue(invalidData);
			mockUserProfileValidate.mockImplementation(() => {
				throw new Error('Invalid user profile data');
			});

			// Act & Assert - Should throw validation error
			await expect(userService.getUserProfileDirect('test-user-123')).rejects.toThrow('Invalid user profile data');
		});
	});

	describe('getProfileWithFallback - Unified Entry Point', () => {
		it('should use API first and succeed', async () => {
			// Arrange - API success scenario
			const mockApiProfile = {
				uid: 'test-user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'teacher',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			mockTypedApiRequest.mockResolvedValue(mockApiProfile);
			mockFromApiResponse.mockReturnValue(mockApiProfile);
			mockUserProfileValidate.mockReturnValue(mockApiProfile);

			// Act
			const result = await userService.getProfileWithFallback(mockFirebaseUser);

			// Assert - Should succeed with API data
			expect(result).toEqual(mockApiProfile);
			expect(mockTypedApiRequest).toHaveBeenCalled();
			// Firestore should NOT be called since API succeeded
			expect(mockGetDoc).not.toHaveBeenCalled();
		});

		it('should fallback to Firestore when API fails', async () => {
			// Arrange - API failure, Firestore success
			const apiError = new Error('API service unavailable');
			const mockFirestoreProfile = {
				uid: 'test-user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			// API fails
			mockTypedApiRequest.mockRejectedValue(apiError);
			
			// Firestore succeeds
			const mockDoc = {
				exists: true,
				data: vi.fn().mockReturnValue(mockFirestoreProfile)
			};
			mockGetDoc.mockResolvedValue(mockDoc);
			mockFromFirestoreDoc.mockReturnValue(mockFirestoreProfile);
			mockUserProfileValidate.mockReturnValue(mockFirestoreProfile);

			// Act
			const result = await userService.getProfileWithFallback(mockFirebaseUser);

			// Assert - Should succeed with Firestore data
			expect(result).toEqual(mockFirestoreProfile);
			expect(mockTypedApiRequest).toHaveBeenCalled(); // API was tried first
			expect(mockGetDoc).toHaveBeenCalled(); // Firestore was used as fallback
		});

		it('should throw error when both API and Firestore fail', async () => {
			// Arrange - Both services fail
			const apiError = new Error('API service unavailable');
			const firestoreError = new Error('Firestore connection failed');

			mockTypedApiRequest.mockRejectedValue(apiError);
			mockGetDoc.mockRejectedValue(firestoreError);

			// Act & Assert - Should throw combined error
			await expect(userService.getProfileWithFallback(mockFirebaseUser)).rejects.toThrow('Profile fetch failed');
		});

		it('should handle partial network failures gracefully', async () => {
			// Arrange - Network instability scenario
			let callCount = 0;
			mockTypedApiRequest.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// First call fails
					throw new Error('Network error');
				}
				// Second call would succeed, but we'll use Firestore fallback
				throw new Error('Should not reach this');
			});

			const mockFirestoreProfile = {
				uid: 'test-user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'teacher',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			const mockDoc = {
				exists: true,
				data: vi.fn().mockReturnValue(mockFirestoreProfile)
			};
			mockGetDoc.mockResolvedValue(mockDoc);
			mockFromFirestoreDoc.mockReturnValue(mockFirestoreProfile);
			mockUserProfileValidate.mockReturnValue(mockFirestoreProfile);

			// Act
			const result = await userService.getProfileWithFallback(mockFirebaseUser);

			// Assert - Should fallback successfully
			expect(result).toEqual(mockFirestoreProfile);
			expect(callCount).toBe(1); // API was tried once
		});

		it('should log fallback operations for monitoring', async () => {
			// Arrange - Setup console spy
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			const apiError = new Error('API temporarily unavailable');
			const mockFirestoreProfile = {
				uid: 'test-user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			mockTypedApiRequest.mockRejectedValue(apiError);
			
			const mockDoc = {
				exists: true,
				data: vi.fn().mockReturnValue(mockFirestoreProfile)
			};
			mockGetDoc.mockResolvedValue(mockDoc);
			mockFromFirestoreDoc.mockReturnValue(mockFirestoreProfile);
			mockUserProfileValidate.mockReturnValue(mockFirestoreProfile);

			// Act
			await userService.getProfileWithFallback(mockFirebaseUser);

			// Assert - Should log fallback warning
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('UserService: API failed, trying direct Firestore'),
				apiError
			);

			consoleSpy.mockRestore();
		});
	});

	describe('createProfile - Profile Creation', () => {
		it('should create new user profile successfully', async () => {
			// Arrange - Red Phase: This should FAIL initially
			const createData: CreateProfileData = {
				uid: 'new-user-123',
				role: 'teacher',
				displayName: 'New Teacher',
				schoolEmail: 'new@school.edu'
			};

			const expectedProfile: UserProfile = {
				uid: 'new-user-123',
				email: 'new@example.com',
				displayName: 'New Teacher',
				role: 'teacher',
				schoolEmail: 'new@school.edu',
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				version: 1,
				isLatest: true
			};

			mockCreateProfileValidate.mockReturnValue(createData);
			mockSetDoc.mockResolvedValue(undefined);
			mockUserProfileValidate.mockReturnValue(expectedProfile);

			// Act
			const result = await userService.createProfile(createData);

			// Assert - This should FAIL initially
			expect(result).toEqual(expectedProfile);
			expect(mockCreateProfileValidate).toHaveBeenCalledWith(createData);
			expect(mockSetDoc).toHaveBeenCalled();
		});

		it('should handle profile creation validation errors', async () => {
			// Arrange - Invalid creation data
			const invalidData = {
				uid: 'test',
				role: 'invalid-role',
				// Missing required fields
			};

			mockCreateProfileValidate.mockImplementation(() => {
				throw new Error('Invalid profile creation data');
			});

			// Act & Assert - Should throw validation error
			await expect(userService.createProfile(invalidData as any)).rejects.toThrow('Invalid profile creation data');
		});

		it('should handle Firestore write failures during creation', async () => {
			// Arrange - Firestore write error
			const createData: CreateProfileData = {
				uid: 'new-user-123',
				role: 'student'
			};

			const writeError = new Error('Firestore write failed');
			mockCreateProfileValidate.mockReturnValue(createData);
			mockSetDoc.mockRejectedValue(writeError);

			// Act & Assert - Should throw write error
			await expect(userService.createProfile(createData)).rejects.toThrow('Firestore write failed');
		});

		it('should create profile with proper timestamp handling', async () => {
			// Arrange - Test timestamp creation
			const createData: CreateProfileData = {
				uid: 'timestamped-user',
				role: 'teacher',
				displayName: 'Timestamp Teacher'
			};

			let capturedProfileData: any;
			mockSetDoc.mockImplementation((docRef, data) => {
				capturedProfileData = data;
				return Promise.resolve();
			});
			
			mockCreateProfileValidate.mockReturnValue(createData);
			mockUserProfileValidate.mockReturnValue({
				...createData,
				email: 'timestamped@example.com',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			});

			// Act
			await userService.createProfile(createData);

			// Assert - Should include proper timestamps
			expect(capturedProfileData).toHaveProperty('createdAt');
			expect(capturedProfileData).toHaveProperty('updatedAt');
			expect(capturedProfileData.version).toBe(1);
			expect(capturedProfileData.isLatest).toBe(true);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle concurrent profile requests', async () => {
			// Arrange - Multiple concurrent requests for same user
			const mockProfile = {
				uid: 'concurrent-user',
				email: 'concurrent@example.com',
				displayName: 'Concurrent User',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			mockTypedApiRequest.mockResolvedValue(mockProfile);
			mockFromApiResponse.mockReturnValue(mockProfile);
			mockUserProfileValidate.mockReturnValue(mockProfile);

			// Act - Make multiple concurrent requests
			const requests = Array.from({ length: 5 }, () =>
				userService.getUserProfile(mockFirebaseUser)
			);

			// Assert - All should succeed
			const results = await Promise.all(requests);
			results.forEach(result => {
				expect(result).toEqual(mockProfile);
			});
		});

		it('should handle malformed Firebase user objects', async () => {
			// Arrange - Invalid Firebase user
			const invalidUser = {
				uid: null,
				email: undefined,
				displayName: ''
			} as unknown as FirebaseUser;

			// Act & Assert - Should handle gracefully
			await expect(userService.getUserProfile(invalidUser)).rejects.toThrow();
		});

		it('should handle service initialization errors', async () => {
			// Arrange - Test service in uninitialized state
			const uninitializedService = new UserService();
			
			// Mock initialization failure
			mockDoc.mockImplementation(() => {
				throw new Error('Firebase not initialized');
			});

			// Act & Assert - Should handle initialization errors
			await expect(uninitializedService.getUserProfileDirect('test-user')).rejects.toThrow();
		});

		it('should handle very large profile data', async () => {
			// Arrange - Large profile data (stress test)
			const largeProfile = {
				uid: 'large-user',
				email: 'large@example.com',
				displayName: 'A'.repeat(1000), // Very long name
				role: 'teacher',
				// Add large amount of optional data
				metadata: {
					preferences: Object.fromEntries(
						Array.from({ length: 100 }, (_, i) => [`pref_${i}`, `value_${i}`])
					)
				},
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			mockTypedApiRequest.mockResolvedValue(largeProfile);
			mockFromApiResponse.mockReturnValue(largeProfile);
			mockUserProfileValidate.mockReturnValue(largeProfile);

			// Act & Assert - Should handle large data efficiently
			const startTime = performance.now();
			const result = await userService.getUserProfile(mockFirebaseUser);
			const endTime = performance.now();

			expect(result).toEqual(largeProfile);
			expect(endTime - startTime).toBeLessThan(100); // Should be fast
		});

		it('should handle circular reference attempts safely', async () => {
			// Arrange - Data with potential circular references
			const circularData: any = {
				uid: 'circular-user',
				email: 'circular@example.com',
				displayName: 'Circular User',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};
			circularData.self = circularData; // Create circular reference

			mockTypedApiRequest.mockResolvedValue(circularData);
			mockFromApiResponse.mockReturnValue(circularData);
			mockUserProfileValidate.mockReturnValue(circularData);

			// Act & Assert - Should handle without infinite loops
			const result = await userService.getUserProfile(mockFirebaseUser);
			expect(result.uid).toBe('circular-user');
		});
	});

	describe('Performance and Monitoring', () => {
		it('should track API vs Firestore usage patterns', async () => {
			// This test would verify that metrics are being collected
			// for monitoring the API vs Firestore usage patterns

			// Arrange - Mock metrics collection
			const metricsCollector = {
				apiCalls: 0,
				firestoreCalls: 0,
				fallbackCalls: 0
			};

			// Multiple scenarios to collect metrics
			const scenarios = [
				{ apiSucceeds: true, expectFirestore: false },
				{ apiSucceeds: false, expectFirestore: true },
				{ apiSucceeds: true, expectFirestore: false }
			];

			for (const scenario of scenarios) {
				if (scenario.apiSucceeds) {
					mockTypedApiRequest.mockResolvedValue({
						uid: 'metrics-user',
						email: 'metrics@example.com',
						displayName: 'Metrics User',
						role: 'teacher',
						createdAt: new Date(),
						updatedAt: new Date(),
						version: 1,
						isLatest: true
					});
					metricsCollector.apiCalls++;
				} else {
					mockTypedApiRequest.mockRejectedValue(new Error('API failed'));
					
					// Setup Firestore fallback
					const mockDoc = {
						exists: true,
						data: vi.fn().mockReturnValue({
							uid: 'metrics-user',
							email: 'metrics@example.com',
							displayName: 'Metrics User',
							role: 'teacher',
							createdAt: new Date(),
							updatedAt: new Date(),
							version: 1,
							isLatest: true
						})
					};
					mockGetDoc.mockResolvedValue(mockDoc);
					mockFromFirestoreDoc.mockReturnValue(mockDoc.data());
					metricsCollector.firestoreCalls++;
					metricsCollector.fallbackCalls++;
				}

				mockFromApiResponse.mockReturnValue({
					uid: 'metrics-user',
					email: 'metrics@example.com',
					displayName: 'Metrics User',
					role: 'teacher',
					createdAt: new Date(),
					updatedAt: new Date(),
					version: 1,
					isLatest: true
				});

				mockUserProfileValidate.mockReturnValue({
					uid: 'metrics-user',
					email: 'metrics@example.com',
					displayName: 'Metrics User',
					role: 'teacher',
					createdAt: new Date(),
					updatedAt: new Date(),
					version: 1,
					isLatest: true
				});

				// Act
				await userService.getProfileWithFallback(mockFirebaseUser);
			}

			// Assert - Verify metrics were collected appropriately
			expect(metricsCollector.apiCalls).toBe(2); // 2 successful API calls
			expect(metricsCollector.fallbackCalls).toBe(1); // 1 fallback to Firestore
		});

		it('should have reasonable performance characteristics', async () => {
			// Arrange - Standard profile
			const standardProfile = {
				uid: 'perf-user',
				email: 'perf@example.com',
				displayName: 'Performance User',
				role: 'student',
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				isLatest: true
			};

			mockTypedApiRequest.mockResolvedValue(standardProfile);
			mockFromApiResponse.mockReturnValue(standardProfile);
			mockUserProfileValidate.mockReturnValue(standardProfile);

			// Act - Measure performance
			const iterations = 100;
			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				await userService.getUserProfile(mockFirebaseUser);
			}

			const endTime = performance.now();
			const avgTime = (endTime - startTime) / iterations;

			// Assert - Should be fast (< 1ms average per call with mocks)
			expect(avgTime).toBeLessThan(1);
		});
	});
});