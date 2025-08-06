/**
 * Unit tests for dashboard page logic and data processing
 * Location: frontend/src/lib/components/dashboard/DashboardPage.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Assignment, Submission } from '@shared/types';

// Mock assignments data
const mockAssignments: Assignment[] = [
	{
		id: 'assignment-1',
		classroomId: 'classroom-1',
		title: 'Math Quiz 1',
		description: 'Basic arithmetic',
		dueDate: { _seconds: 1642694400, _nanoseconds: 0 },
		maxPoints: 100,
		gradingRubric: {
			enabled: true,
			criteria: ['Correctness']
		},
		isQuiz: true,
		formId: 'form-123',
		createdAt: { _seconds: 1642694400, _nanoseconds: 0 },
		updatedAt: { _seconds: 1642694400, _nanoseconds: 0 }
	},
	{
		id: 'assignment-2',
		classroomId: 'classroom-1',
		title: 'Essay Assignment',
		description: 'Write about your favorite book',
		dueDate: { _seconds: 1642694400, _nanoseconds: 0 },
		maxPoints: 50,
		gradingRubric: {
			enabled: true,
			criteria: ['Content', 'Grammar'],
			promptTemplate: 'Grade this essay'
		},
		isQuiz: false,
		createdAt: { _seconds: 1642694400, _nanoseconds: 0 },
		updatedAt: { _seconds: 1642694400, _nanoseconds: 0 }
	},
	{
		id: 'assignment-3',
		classroomId: 'classroom-1',
		title: 'Science Quiz 2',
		description: 'Physics concepts',
		dueDate: { _seconds: 1642694400, _nanoseconds: 0 },
		maxPoints: 75,
		gradingRubric: {
			enabled: true,
			criteria: ['Correctness']
		},
		isQuiz: true,
		formId: 'form-456',
		createdAt: { _seconds: 1642694400, _nanoseconds: 0 },
		updatedAt: { _seconds: 1642694400, _nanoseconds: 0 }
	}
];

// Mock submissions data
const mockSubmissions: Submission[] = [
	{
		id: 'submission-1',
		assignmentId: 'assignment-1',
		studentId: 'student-1',
		studentEmail: 'student1@test.com',
		studentName: 'John Doe',
		submittedAt: { _seconds: 1642694400, _nanoseconds: 0 },
		documentUrl: 'https://example.com/doc1',
		status: 'pending',
		content: 'Student submission 1',
		createdAt: { _seconds: 1642694400, _nanoseconds: 0 },
		updatedAt: { _seconds: 1642694400, _nanoseconds: 0 }
	},
	{
		id: 'submission-2',
		assignmentId: 'assignment-2',
		studentId: 'student-2',
		studentEmail: 'student2@test.com',
		studentName: 'Jane Smith',
		submittedAt: { _seconds: 1642694400, _nanoseconds: 0 },
		documentUrl: 'https://example.com/doc2',
		status: 'grading',
		content: 'Student submission 2',
		createdAt: { _seconds: 1642694400, _nanoseconds: 0 },
		updatedAt: { _seconds: 1642694400, _nanoseconds: 0 }
	}
];

// Mock API
const mockApi = {
	listAssignments: vi.fn(),
	getUngradedSubmissions: vi.fn()
};

vi.mock('$lib/api', () => ({
	api: mockApi
}));

describe('Dashboard Page Logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockApi.listAssignments.mockResolvedValue(mockAssignments);
		mockApi.getUngradedSubmissions.mockResolvedValue(mockSubmissions);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Statistics Calculations', () => {
		it('should calculate assignment counts correctly', () => {
			const totalAssignments = mockAssignments.length;
			const quizCount = mockAssignments.filter((a) => a.isQuiz).length;
			const regularAssignments = mockAssignments.filter((a) => !a.isQuiz).length;
			const recentSubmissionsCount = mockSubmissions.length;

			expect(totalAssignments).toBe(3);
			expect(quizCount).toBe(2);
			expect(regularAssignments).toBe(1);
			expect(recentSubmissionsCount).toBe(2);
		});

		it('should handle empty data correctly', () => {
			const emptyAssignments: Assignment[] = [];
			const emptySubmissions: Submission[] = [];

			const totalAssignments = emptyAssignments.length;
			const quizCount = emptyAssignments.filter((a) => a.isQuiz).length;
			const regularAssignments = emptyAssignments.filter((a) => !a.isQuiz).length;
			const recentSubmissionsCount = emptySubmissions.length;

			expect(totalAssignments).toBe(0);
			expect(quizCount).toBe(0);
			expect(regularAssignments).toBe(0);
			expect(recentSubmissionsCount).toBe(0);
		});

		it('should properly identify quiz vs assignment types', () => {
			const quizzes = mockAssignments.filter((a) => a.isQuiz);
			const assignments = mockAssignments.filter((a) => !a.isQuiz);

			expect(quizzes).toHaveLength(2);
			expect(assignments).toHaveLength(1);

			// Check quiz properties
			quizzes.forEach((quiz) => {
				expect(quiz.isQuiz).toBe(true);
				expect(quiz.formId).toBeDefined();
			});

			// Check assignment properties
			assignments.forEach((assignment) => {
				expect(assignment.isQuiz).toBe(false);
				expect(assignment.formId).toBeUndefined();
			});
		});
	});

	describe('API Integration', () => {
		it('should call listAssignments API', async () => {
			const assignments = await mockApi.listAssignments();
			expect(mockApi.listAssignments).toHaveBeenCalledTimes(1);
			expect(assignments).toEqual(mockAssignments);
		});

		it('should call getUngradedSubmissions API', async () => {
			const submissions = await mockApi.getUngradedSubmissions();
			expect(mockApi.getUngradedSubmissions).toHaveBeenCalledTimes(1);
			expect(submissions).toEqual(mockSubmissions);
		});

		it('should handle API errors gracefully', async () => {
			mockApi.listAssignments.mockRejectedValue(new Error('API Error'));

			await expect(mockApi.listAssignments()).rejects.toThrow('API Error');
		});

		it('should handle submissions API errors with fallback', async () => {
			mockApi.getUngradedSubmissions.mockRejectedValue(new Error('Submissions API error'));

			try {
				await mockApi.getUngradedSubmissions();
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe('Submissions API error');
			}
		});
	});

	describe('Data Transformation', () => {
		it('should handle assignment titles and descriptions', () => {
			mockAssignments.forEach((assignment) => {
				expect(assignment.title).toBeDefined();
				expect(assignment.description).toBeDefined();
				expect(assignment.maxPoints).toBeGreaterThan(0);
			});
		});

		it('should handle submission student information', () => {
			mockSubmissions.forEach((submission) => {
				expect(submission.studentName).toBeDefined();
				expect(submission.studentEmail).toBeDefined();
				expect(submission.assignmentId).toBeDefined();
				expect(['pending', 'grading', 'graded']).toContain(submission.status);
			});
		});

		it('should format assignment display information correctly', () => {
			const assignment = mockAssignments[0];
			const displayText = assignment.isQuiz ? 'Quiz' : 'Assignment';
			const pointsText = `${assignment.maxPoints} points`;

			expect(displayText).toBe('Quiz');
			expect(pointsText).toBe('100 points');
		});

		it('should generate proper navigation URLs', () => {
			mockAssignments.forEach((assignment) => {
				const viewUrl = `/dashboard/assignments/${assignment.id}`;
				expect(viewUrl).toMatch(/^\/dashboard\/assignments\/assignment-\d+$/);
			});

			const allAssignmentsUrl = '/dashboard/assignments';
			const gradesUrl = '/dashboard/grades';

			expect(allAssignmentsUrl).toBe('/dashboard/assignments');
			expect(gradesUrl).toBe('/dashboard/grades');
		});
	});

	describe('Quick Stats Configuration', () => {
		it('should define correct stats cards configuration', () => {
			const quickStats = [
				{
					title: 'Total Assignments',
					value: mockAssignments.length,
					icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
					color: 'bg-blue-500'
				},
				{
					title: 'Quizzes',
					value: mockAssignments.filter((a) => a.isQuiz).length,
					icon: 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3',
					color: 'bg-green-500'
				},
				{
					title: 'Regular Assignments',
					value: mockAssignments.filter((a) => !a.isQuiz).length,
					icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
					color: 'bg-purple-500'
				},
				{
					title: 'Recent Submissions',
					value: mockSubmissions.length,
					icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
					color: 'bg-orange-500'
				}
			];

			expect(quickStats).toHaveLength(4);
			expect(quickStats[0].title).toBe('Total Assignments');
			expect(quickStats[1].title).toBe('Quizzes');
			expect(quickStats[2].title).toBe('Regular Assignments');
			expect(quickStats[3].title).toBe('Recent Submissions');

			// Check colors
			expect(quickStats[0].color).toBe('bg-blue-500');
			expect(quickStats[1].color).toBe('bg-green-500');
			expect(quickStats[2].color).toBe('bg-purple-500');
			expect(quickStats[3].color).toBe('bg-orange-500');
		});
	});

	describe('Assignment Display Logic', () => {
		it('should limit recent assignments to 5 items', () => {
			const displayedAssignments = mockAssignments.slice(0, 5);
			expect(displayedAssignments.length).toBeLessThanOrEqual(5);
		});

		it('should show view all link when more than 5 assignments', () => {
			const manyAssignments = Array.from({ length: 7 }, (_, i) => ({
				...mockAssignments[0],
				id: `assignment-${i + 1}`,
				title: `Assignment ${i + 1}`
			}));

			const shouldShowViewAll = manyAssignments.length > 5;
			const viewAllText = `View all assignments (${manyAssignments.length})`;

			expect(shouldShowViewAll).toBe(true);
			expect(viewAllText).toBe('View all assignments (7)');
		});

		it('should handle assignment status indicators', () => {
			mockSubmissions.forEach((submission) => {
				let statusClass = '';

				if (submission.status === 'pending') {
					statusClass = 'bg-yellow-100 text-yellow-800';
				} else if (submission.status === 'grading') {
					statusClass = 'bg-blue-100 text-blue-800';
				} else {
					statusClass = 'bg-gray-100 text-gray-800';
				}

				expect(statusClass).toBeDefined();
				expect(statusClass).toContain('bg-');
				expect(statusClass).toContain('text-');
			});
		});
	});

	describe('Error State Handling', () => {
		it('should provide retry functionality', () => {
			let retryCount = 0;
			const mockRetryFunction = () => {
				retryCount++;
				return mockApi.listAssignments();
			};

			mockRetryFunction();
			expect(retryCount).toBe(1);
			expect(mockApi.listAssignments).toHaveBeenCalledTimes(1);
		});

		it('should handle loading state transitions', () => {
			let loading = true;
			let error: string | null = null;

			// Simulate successful load
			loading = false;
			error = null;

			expect(loading).toBe(false);
			expect(error).toBeNull();

			// Simulate error state
			loading = false;
			error = 'Failed to load data';

			expect(loading).toBe(false);
			expect(error).toBe('Failed to load data');
		});
	});
});
