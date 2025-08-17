/**
 * Unit tests for API client with mocking and error handling
 * Location: frontend/src/lib/api.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Assignment, Submission, Grade } from '@shared/schemas/core';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
vi.mock('$env/static/public', () => ({
	PUBLIC_USE_EMULATORS: 'true',
	PUBLIC_FUNCTIONS_EMULATOR_URL: 'http://localhost:5001/test-project/us-central1',
	PUBLIC_FIREBASE_API_KEY: 'test-api-key',
	PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
	PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
	PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
	PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef'
}));

// Mock Firebase functions with authenticated user
const mockUser = {
	uid: 'test-user-123',
	email: 'test.teacher@gmail.com',
	displayName: 'Test Teacher',
	getIdToken: vi.fn().mockResolvedValue('mock-id-token-12345')
};

vi.mock('./firebase', () => ({
	firebaseAuth: {
		currentUser: mockUser
	},
	firebaseFunctions: {},
	googleProvider: {},
	signInWithGoogle: vi.fn(),
	signOut: vi.fn(),
	onAuthStateChange: vi.fn(),
	getCurrentUserToken: vi.fn().mockResolvedValue('mock-id-token-12345')
}));

vi.mock('firebase/functions', () => ({
	httpsCallable: vi.fn()
}));

describe('API Client', () => {
	let api: (typeof import('./api'))['api'];

	beforeEach(async () => {
		vi.clearAllMocks();
		// Import API after mocks are set up
		const apiModule = await import('./api');
		api = apiModule.api;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('API Base Configuration', () => {
		it('should use emulator URL when in emulator mode', async () => {
			const { API_BASE_URL } = await import('./api');
			expect(API_BASE_URL).toBe('http://localhost:5001/test-project/us-central1');
		});
	});

	describe('Error Handling', () => {
		it('should handle HTTP errors properly', async () => {
			// Create a proper Response-like object that can be called multiple times
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
				json: vi.fn().mockResolvedValue({ message: 'Not found' })
			};

			mockFetch.mockResolvedValue(mockResponse);

			await expect(api.listAssignments()).rejects.toThrow('Not Found');
		});

		it('should handle network errors', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			await expect(api.listAssignments()).rejects.toThrow('Network error');
		});

		it('should handle malformed JSON responses', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				json: () => Promise.reject(new Error('Invalid JSON'))
			});

			await expect(api.listAssignments()).rejects.toThrow('Unknown error');
		});
	});

	describe('Assignments API', () => {
		// Raw API response (what the server sends - ISO strings)
		const mockAssignmentResponse = [
			{
				id: 'assignment-1',
				classroomId: 'classroom-1',
				title: 'Test Assignment',
				description: 'A test assignment',
				dueDate: '2022-01-20T12:00:00.000Z',
				maxScore: 100,
				rubric: {
					enabled: true,
					criteria: [
						{
							id: 'content-1',
							title: 'Content',
							description: 'Quality of content',
							maxPoints: 50
						},
						{
							id: 'grammar-1',
							title: 'Grammar',
							description: 'Grammar and style',
							maxPoints: 50
						}
					]
				},
				status: 'published',
				submissionCount: 0,
				gradedCount: 0,
				pendingCount: 0,
				createdAt: '2022-01-20T12:00:00.000Z',
				updatedAt: '2022-01-20T12:00:00.000Z'
			},
			{
				id: 'quiz-1',
				classroomId: 'classroom-1',
				title: 'Test Quiz',
				description: 'A test quiz',
				dueDate: '2022-01-20T12:00:00.000Z',
				maxScore: 50,
				rubric: {
					enabled: true,
					criteria: [
						{
							id: 'correctness-1',
							title: 'Correctness',
							description: 'Answer accuracy',
							maxPoints: 50
						}
					]
				},
				status: 'published',
				type: 'quiz',
				submissionCount: 0,
				gradedCount: 0,
				pendingCount: 0,
				createdAt: '2022-01-20T12:00:00.000Z',
				updatedAt: '2022-01-20T12:00:00.000Z'
			}
		];

		// Expected result after schema transformation (Date objects)
		const expectedAssignments: Assignment[] = [
			{
				id: 'assignment-1',
				classroomId: 'classroom-1',
				title: 'Test Assignment',
				description: 'A test assignment',
				dueDate: new Date('2022-01-20T12:00:00.000Z'),
				maxScore: 100,
				rubric: {
					enabled: true,
					criteria: [
						{
							id: 'content-1',
							title: 'Content',
							description: 'Quality of content',
							maxPoints: 50
						},
						{
							id: 'grammar-1',
							title: 'Grammar',
							description: 'Grammar and style',
							maxPoints: 50
						}
					]
				},
				status: 'published',
				submissionCount: 0,
				gradedCount: 0,
				pendingCount: 0,
				createdAt: new Date('2022-01-20T12:00:00.000Z'),
				updatedAt: new Date('2022-01-20T12:00:00.000Z')
			},
			{
				id: 'quiz-1',
				classroomId: 'classroom-1',
				title: 'Test Quiz',
				description: 'A test quiz',
				dueDate: new Date('2022-01-20T12:00:00.000Z'),
				maxScore: 50,
				rubric: {
					enabled: true,
					criteria: [
						{
							id: 'correctness-1',
							title: 'Correctness',
							description: 'Answer accuracy',
							maxPoints: 50
						}
					]
				},
				status: 'published',
				type: 'quiz',
				submissionCount: 0,
				gradedCount: 0,
				pendingCount: 0,
				createdAt: new Date('2022-01-20T12:00:00.000Z'),
				updatedAt: new Date('2022-01-20T12:00:00.000Z')
			}
		];

		it('should list assignments successfully', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: mockAssignmentResponse
					})
			});

			const result = await api.listAssignments();

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/assignments',
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);
			expect(result).toEqual(expectedAssignments);
		});

		it('should handle empty assignments list', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: null
					})
			});

			const result = await api.listAssignments();
			expect(result).toEqual([]);
		});

		it('should create assignment successfully', async () => {
			const newAssignment = mockAssignmentResponse[0];
			const expectedAssignment = expectedAssignments[0];
			const createRequest = {
				title: 'Test Assignment',
				description: 'A test assignment',
				maxPoints: 100
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: newAssignment
					})
			});

			const result = await api.createAssignment(createRequest);

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/assignments',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(createRequest)
				})
			);
			expect(result).toEqual(expectedAssignment);
		});
	});

	describe('Submissions API', () => {
		// Raw API response (what the server sends - ISO strings)
		const mockSubmissionResponse = [
			{
				id: 'submission-1',
				assignmentId: 'assignment-1',
				classroomId: 'classroom-1',
				studentId: 'student-1',
				studentEmail: 'student@test.com',
				studentName: 'Test Student',
				version: 1,
				isLatest: true,
				content: 'Student submission content',
				attachments: [],
				status: 'submitted',
				submittedAt: '2022-01-20T12:00:00.000Z',
				source: 'roo-direct',
				late: false,
				grade: null,
				createdAt: '2022-01-20T12:00:00.000Z',
				updatedAt: '2022-01-20T12:00:00.000Z'
			}
		];

		// Expected result after schema transformation (Date objects)
		const expectedSubmissions: Submission[] = [
			{
				id: 'submission-1',
				assignmentId: 'assignment-1',
				classroomId: 'classroom-1',
				studentId: 'student-1',
				studentEmail: 'student@test.com',
				studentName: 'Test Student',
				version: 1,
				isLatest: true,
				content: 'Student submission content',
				attachments: [],
				status: 'submitted',
				submittedAt: new Date('2022-01-20T12:00:00.000Z'),
				source: 'roo-direct',
				late: false,
				grade: null,
				createdAt: new Date('2022-01-20T12:00:00.000Z'),
				updatedAt: new Date('2022-01-20T12:00:00.000Z')
			}
		];

		it('should get submissions by assignment', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: mockSubmissionResponse
					})
			});

			const result = await api.getSubmissionsByAssignment('assignment-1');

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/submissions/assignment/assignment-1',
				expect.any(Object)
			);
			expect(result).toEqual(expectedSubmissions);
		});

		it('should get individual submission', async () => {
			const mockSubmission = mockSubmissionResponse[0];
			const expectedSubmission = expectedSubmissions[0];

			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: mockSubmission
					})
			});

			const result = await api.getSubmission('submission-1');

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/submissions/submission-1',
				expect.any(Object)
			);
			expect(result).toEqual(expectedSubmission);
		});

		it('should create submission successfully', async () => {
			const newSubmission = mockSubmissionResponse[0];
			const expectedSubmission = expectedSubmissions[0];
			const createRequest = {
				assignmentId: 'assignment-1',
				studentId: 'student-1',
				studentName: 'Test Student',
				studentEmail: 'student@test.com',
				submissionText: 'Student submission content',
				status: 'pending' as const
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: newSubmission
					})
			});

			const result = await api.createSubmission(createRequest);

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/submissions',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(createRequest)
				})
			);
			expect(result).toEqual(expectedSubmission);
		});

		it('should update submission status', async () => {
			const updateRequest = {
				status: 'graded' as const,
				gradeId: 'grade-1'
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: { ...mockSubmissionResponse[0], status: 'graded' }
					})
			});

			const result = await api.updateSubmissionStatus('submission-1', updateRequest);

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/submissions/submission-1/status',
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify(updateRequest)
				})
			);
			expect(result.status).toBe('graded');
		});
	});

	describe('Grades API', () => {
		// Raw API response (what the server sends - ISO strings)
		const mockGradeResponse = [
			{
				id: 'grade-1',
				submissionId: 'submission-1',
				assignmentId: 'assignment-1',
				studentId: 'student-1',
				classroomId: 'classroom-1',
				score: 85,
				maxScore: 100,
				percentage: 85,
				feedback: 'Good work!',
				rubricScores: [
					{
						criterionId: 'content-1',
						criterionTitle: 'Content',
						score: 85,
						maxScore: 100,
						feedback: 'Well written content'
					}
				],
				gradedBy: 'ai',
				gradedAt: '2022-01-20T12:00:00.000Z',
				gradingMethod: 'points',
				version: 1,
				isLatest: true,
				submissionVersionGraded: 1,
				isLocked: false,
				createdAt: '2022-01-20T16:00:00.000Z',
				updatedAt: '2022-01-20T16:00:00.000Z'
			}
		];

		// Expected result after schema transformation (Date objects)
		const expectedGrades: Grade[] = [
			{
				id: 'grade-1',
				submissionId: 'submission-1',
				assignmentId: 'assignment-1',
				studentId: 'student-1',
				classroomId: 'classroom-1',
				score: 85,
				maxScore: 100,
				percentage: 85,
				feedback: 'Good work!',
				rubricScores: [
					{
						criterionId: 'content-1',
						criterionTitle: 'Content',
						score: 85,
						maxScore: 100,
						feedback: 'Well written content'
					}
				],
				gradedBy: 'ai',
				gradedAt: new Date('2022-01-20T12:00:00.000Z'),
				gradingMethod: 'points',
				version: 1,
				isLatest: true,
				submissionVersionGraded: 1,
				isLocked: false,
				createdAt: new Date('2022-01-20T16:00:00.000Z'),
				updatedAt: new Date('2022-01-20T16:00:00.000Z')
			}
		];

		it('should get grades by assignment', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: mockGradeResponse
					})
			});

			const result = await api.getGradesByAssignment('assignment-1');

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/grades/assignment/assignment-1',
				expect.any(Object)
			);
			expect(result).toEqual(expectedGrades);
		});

		it('should get grade by submission', async () => {
			const mockGrade = mockGradeResponse[0];
			const expectedGrade = expectedGrades[0];

			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: mockGrade
					})
			});

			const result = await api.getGradeBySubmission('submission-1');

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/grades/submission/submission-1',
				expect.any(Object)
			);
			expect(result).toEqual(expectedGrade);
		});
	});

	describe('Grading API', () => {
		it('should grade quiz successfully', async () => {
			const gradingRequest = {
				submissionId: 'submission-1',
				formId: 'form-123',
				assignmentId: 'assignment-1',
				studentId: 'student-1',
				studentName: 'Test Student',
				studentAnswers: { '1': 'A', '2': 'B' }
			};

			const gradingResult = {
				gradeId: 'grade-1',
				grading: {
					totalScore: 85,
					totalPossible: 100,
					questionGrades: [
						{
							questionNumber: 1,
							isCorrect: true,
							studentAnswer: 'A',
							correctAnswer: 'A',
							points: 50
						}
					]
				}
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: gradingResult
					})
			});

			const result = await api.gradeQuiz(gradingRequest);

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/grade-quiz',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(gradingRequest)
				})
			);
			expect(result).toEqual(gradingResult);
		});

		it('should grade code successfully', async () => {
			const gradingRequest = {
				submissionId: 'submission-1',
				submissionText: 'function hello() { return "Hello World"; }',
				assignmentId: 'assignment-1',
				assignmentTitle: 'Coding Assignment',
				studentId: 'student-1',
				studentName: 'Test Student',
				maxPoints: 100,
				isCodeAssignment: true
			};

			const gradingResult = {
				gradeId: 'grade-1',
				grading: {
					score: 90,
					feedback: 'Excellent implementation!',
					criteriaScores: [
						{
							name: 'Logic',
							score: 90,
							maxScore: 100,
							feedback: 'Good logical structure'
						}
					]
				}
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: gradingResult
					})
			});

			const result = await api.gradeCode(gradingRequest);

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/grade-code',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(gradingRequest)
				})
			);
			expect(result).toEqual(gradingResult);
		});
	});

	describe('Health Check', () => {
		it('should check API status', async () => {
			const statusResponse = {
				status: 'healthy',
				version: '1.0.0',
				endpoints: ['/assignments', '/submissions', '/grades']
			};

			// Wrap in ApiResponse format for typedApiRequest
			const wrappedResponse = {
				success: true,
				data: statusResponse
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(wrappedResponse)
			});

			const result = await api.getStatus();

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5001/test-project/us-central1/api/',
				expect.any(Object)
			);
			expect(result).toEqual(statusResponse);
		});
	});

	describe('Type Safety', () => {
		it('should handle API response validation', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: false,
						error: 'Validation failed'
					})
			});

			await expect(api.listAssignments()).rejects.toThrow('Validation failed');
		});

		it('should return empty arrays for null data', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: null
					})
			});

			const result = await api.getSubmissionsByAssignment('assignment-1');
			expect(result).toEqual([]);
		});
	});
});
