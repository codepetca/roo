/**
 * TDD Tests for Data Adapters - Unified Architecture
 * Location: frontend/src/lib/data/adapters.test.ts
 * 
 * Testing data normalization across different Firebase sources:
 * - API responses with { success, data, error } wrapper
 * - Firestore documents with .data() method
 * - Real-time listener data (raw objects)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataAdapter } from './adapters';
import type { ApiResponse } from './validation';

describe('DataAdapter - TDD Red Phase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('fromApiResponse', () => {
		it('should extract data from successful API response', () => {
			// Arrange - Red Phase: Write test first, expect it to fail
			const apiResponse: ApiResponse<{ id: string; name: string }> = {
				success: true,
				data: { id: 'test-123', name: 'Test User' },
				error: null
			};

			// Act & Assert - This test should FAIL initially (Red phase)
			const result = DataAdapter.fromApiResponse(apiResponse);
			expect(result).toEqual({ id: 'test-123', name: 'Test User' });
		});

		it('should throw error when API response indicates failure', () => {
			// Arrange
			const failedResponse: ApiResponse<null> = {
				success: false,
				data: null,
				error: 'User not found'
			};

			// Act & Assert - This should FAIL initially 
			expect(() => DataAdapter.fromApiResponse(failedResponse)).toThrow('User not found');
		});

		it('should throw error when API response has no data field', () => {
			// Arrange
			const invalidResponse: ApiResponse<null> = {
				success: true,
				data: null,
				error: null
			};

			// Act & Assert - This should FAIL initially
			expect(() => DataAdapter.fromApiResponse(invalidResponse)).toThrow('API response missing data field');
		});

		it('should throw error when API response data is undefined', () => {
			// Arrange
			const undefinedResponse = {
				success: true,
				data: undefined,
				error: null
			} as ApiResponse<any>;

			// Act & Assert - This should FAIL initially
			expect(() => DataAdapter.fromApiResponse(undefinedResponse)).toThrow('API response missing data field');
		});

		it('should handle complex nested data structures', () => {
			// Arrange - Test complex objects
			const complexResponse: ApiResponse<{
				user: { id: string; profile: { name: string; roles: string[] } };
				metadata: { timestamp: number };
			}> = {
				success: true,
				data: {
					user: {
						id: 'user-123',
						profile: { name: 'John Doe', roles: ['teacher', 'admin'] }
					},
					metadata: { timestamp: 1640995200000 }
				},
				error: null
			};

			// Act & Assert - This should FAIL initially
			const result = DataAdapter.fromApiResponse(complexResponse);
			expect(result.user.profile.roles).toContain('teacher');
			expect(result.metadata.timestamp).toBe(1640995200000);
		});
	});

	describe('fromFirestoreDoc', () => {
		it('should extract data from Firestore document snapshot', () => {
			// Arrange - Mock Firestore document
			const mockFirestoreDoc = {
				exists: true,
				id: 'doc-123',
				data: vi.fn().mockReturnValue({
					uid: 'user-123',
					email: 'test@example.com',
					role: 'teacher'
				}),
				ref: { path: 'users/doc-123' }
			};

			// Act & Assert - This should FAIL initially (Red phase)
			const result = DataAdapter.fromFirestoreDoc(mockFirestoreDoc);
			expect(result).toEqual({
				uid: 'user-123',
				email: 'test@example.com',
				role: 'teacher'
			});
			expect(mockFirestoreDoc.data).toHaveBeenCalled();
		});

		it('should throw error when Firestore document does not exist', () => {
			// Arrange
			const nonExistentDoc = {
				exists: false,
				id: 'doc-123',
				data: vi.fn().mockReturnValue(undefined)
			};

			// Act & Assert - This should FAIL initially
			expect(() => DataAdapter.fromFirestoreDoc(nonExistentDoc)).toThrow('Document does not exist');
		});

		it('should throw error when Firestore document data is null', () => {
			// Arrange
			const nullDataDoc = {
				exists: true,
				id: 'doc-123',
				data: vi.fn().mockReturnValue(null)
			};

			// Act & Assert - This should FAIL initially
			expect(() => DataAdapter.fromFirestoreDoc(nullDataDoc)).toThrow('Document data is null or undefined');
		});

		it('should handle Firestore documents with server timestamps', () => {
			// Arrange - Mock document with Firestore timestamp
			const timestampDoc = {
				exists: true,
				id: 'doc-123',
				data: vi.fn().mockReturnValue({
					uid: 'user-123',
					createdAt: {
						_seconds: 1640995200,
						_nanoseconds: 123456789,
						toDate: vi.fn().mockReturnValue(new Date('2022-01-01T00:00:00.123Z'))
					},
					updatedAt: {
						_seconds: 1640995260,
						_nanoseconds: 0,
						toDate: vi.fn().mockReturnValue(new Date('2022-01-01T00:01:00.000Z'))
					}
				})
			};

			// Act & Assert - This should FAIL initially
			const result = DataAdapter.fromFirestoreDoc(timestampDoc);
			expect(result.uid).toBe('user-123');
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.updatedAt).toBeInstanceOf(Date);
		});

		it('should preserve all document fields including nested objects', () => {
			// Arrange
			const complexDoc = {
				exists: true,
				id: 'complex-doc',
				data: vi.fn().mockReturnValue({
					uid: 'teacher-123',
					profile: {
						name: 'Dr. Smith',
						subjects: ['Math', 'Physics'],
						preferences: {
							theme: 'dark',
							notifications: true
						}
					},
					assignments: ['assignment-1', 'assignment-2']
				})
			};

			// Act & Assert - This should FAIL initially
			const result = DataAdapter.fromFirestoreDoc(complexDoc);
			expect(result.profile.subjects).toHaveLength(2);
			expect(result.profile.preferences.theme).toBe('dark');
			expect(result.assignments).toContain('assignment-1');
		});
	});

	describe('fromRealtimeData', () => {
		it('should handle real-time listener data (raw objects)', () => {
			// Arrange - Real-time data is usually a plain object
			const realtimeData = {
				uid: 'user-123',
				email: 'realtime@example.com',
				role: 'student',
				lastActive: 1640995200000
			};

			// Act & Assert - This should FAIL initially (Red phase)
			const result = DataAdapter.fromRealtimeData(realtimeData);
			expect(result).toEqual(realtimeData);
			expect(result.uid).toBe('user-123');
			expect(result.role).toBe('student');
		});

		it('should throw error when real-time data is null', () => {
			// Act & Assert - This should FAIL initially
			expect(() => DataAdapter.fromRealtimeData(null)).toThrow('Real-time data is null or undefined');
		});

		it('should throw error when real-time data is undefined', () => {
			// Act & Assert - This should FAIL initially
			expect(() => DataAdapter.fromRealtimeData(undefined)).toThrow('Real-time data is null or undefined');
		});

		it('should handle array data from real-time listeners', () => {
			// Arrange - Sometimes real-time data is an array
			const arrayData = [
				{ id: 'item-1', name: 'First Item' },
				{ id: 'item-2', name: 'Second Item' }
			];

			// Act & Assert - This should FAIL initially
			const result = DataAdapter.fromRealtimeData(arrayData);
			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('First Item');
		});

		it('should preserve primitive values in real-time data', () => {
			// Arrange - Test with different primitive types
			const primitiveData = {
				stringValue: 'test',
				numberValue: 123,
				booleanValue: true,
				nullValue: null,
				arrayValue: [1, 2, 3],
				objectValue: { nested: 'value' }
			};

			// Act & Assert - This should FAIL initially
			const result = DataAdapter.fromRealtimeData(primitiveData);
			expect(result.stringValue).toBe('test');
			expect(result.numberValue).toBe(123);
			expect(result.booleanValue).toBe(true);
			expect(result.nullValue).toBeNull();
			expect(result.arrayValue).toEqual([1, 2, 3]);
			expect(result.objectValue.nested).toBe('value');
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle empty objects gracefully', () => {
			// Test all adapter methods with empty objects
			const emptyApiResponse: ApiResponse<{}> = {
				success: true,
				data: {},
				error: null
			};

			const emptyDoc = {
				exists: true,
				id: 'empty-doc',
				data: vi.fn().mockReturnValue({})
			};

			// These should FAIL initially (Red phase)
			expect(DataAdapter.fromApiResponse(emptyApiResponse)).toEqual({});
			expect(DataAdapter.fromFirestoreDoc(emptyDoc)).toEqual({});
			expect(DataAdapter.fromRealtimeData({})).toEqual({});
		});

		it('should handle very large objects without performance issues', () => {
			// Arrange - Create large object to test performance
			const largeObject = {};
			for (let i = 0; i < 1000; i++) {
				(largeObject as any)[`field_${i}`] = `value_${i}`;
			}

			const largeApiResponse: ApiResponse<typeof largeObject> = {
				success: true,
				data: largeObject,
				error: null
			};

			// Act & Assert - This should FAIL initially
			const startTime = performance.now();
			const result = DataAdapter.fromApiResponse(largeApiResponse);
			const endTime = performance.now();

			expect(Object.keys(result)).toHaveLength(1000);
			expect(endTime - startTime).toBeLessThan(10); // Should be fast (< 10ms)
		});

		it('should handle circular references safely', () => {
			// Arrange - Create object with circular reference
			const circularObj: any = { name: 'test' };
			circularObj.self = circularObj;

			// Act & Assert - This should FAIL initially
			// DataAdapter should handle or throw meaningful error for circular refs
			expect(() => DataAdapter.fromRealtimeData(circularObj)).not.toThrow();
		});

		it('should validate input types strictly', () => {
			// Test type validation for each adapter method
			
			// Test invalid API response (missing success field)
			const invalidApiResponse = { data: 'test' } as any;
			expect(() => DataAdapter.fromApiResponse(invalidApiResponse)).toThrow();

			// Test invalid Firestore doc (missing exists field)
			const invalidDoc = { data: vi.fn() } as any;
			expect(() => DataAdapter.fromFirestoreDoc(invalidDoc)).toThrow();

			// Test non-object real-time data
			expect(() => DataAdapter.fromRealtimeData('invalid' as any)).toThrow();
		});
	});

	describe('Type Safety and Schema Compliance', () => {
		it('should maintain type information through conversion', () => {
			// Arrange - Strongly typed data
			interface UserProfile {
				uid: string;
				email: string;
				role: 'teacher' | 'student';
				metadata?: {
					createdAt: Date;
					preferences: Record<string, any>;
				};
			}

			const typedApiResponse: ApiResponse<UserProfile> = {
				success: true,
				data: {
					uid: 'typed-user',
					email: 'typed@example.com',
					role: 'teacher',
					metadata: {
						createdAt: new Date(),
						preferences: { theme: 'light' }
					}
				},
				error: null
			};

			// Act & Assert - Type safety should be preserved
			const result = DataAdapter.fromApiResponse(typedApiResponse);
			expect(typeof result.uid).toBe('string');
			expect(['teacher', 'student']).toContain(result.role);
			expect(result.metadata?.createdAt).toBeInstanceOf(Date);
		});

		it('should work with union types and optional fields', () => {
			// Arrange - Test optional and union types
			interface FlexibleData {
				id: string;
				status: 'active' | 'inactive' | 'pending';
				settings?: {
					notifications?: boolean;
					theme?: 'light' | 'dark';
				};
			}

			const flexibleResponse: ApiResponse<FlexibleData> = {
				success: true,
				data: {
					id: 'flexible-123',
					status: 'active'
					// settings is optional
				},
				error: null
			};

			// Act & Assert - Should handle optional fields
			const result = DataAdapter.fromApiResponse(flexibleResponse);
			expect(result.id).toBe('flexible-123');
			expect(result.status).toBe('active');
			expect(result.settings).toBeUndefined();
		});
	});
});