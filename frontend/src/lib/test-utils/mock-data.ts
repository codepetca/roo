/**
 * Mock Data Factory for Testing
 * Location: frontend/src/lib/test-utils/mock-data.ts
 *
 * Centralized mock data creation for consistent testing across components and stores
 */

import type {
	ClassroomSnapshot,
	ClassroomWithData,
	TeacherProfile,
	SnapshotMetadata,
	StudentSnapshot,
	AssignmentWithStats,
	SubmissionSnapshot
} from '@shared/schemas/classroom-snapshot';
import type { ClassroomResponse, AssignmentResponse } from '../schemas';

/**
 * Create a mock teacher profile
 */
export function createMockTeacher(): TeacherProfile {
	return {
		email: 'teacher@test.com',
		name: 'Test Teacher',
		isTeacher: true,
		displayName: 'Ms. Teacher'
	};
}

/**
 * Create mock snapshot metadata
 */
export function createMockSnapshotMetadata(
	source: 'mock' | 'google-classroom' | 'roo-api' = 'mock'
): SnapshotMetadata {
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

	return {
		fetchedAt: now.toISOString(),
		expiresAt: expiresAt.toISOString(),
		source,
		version: '1.0.0'
	};
}

/**
 * Create a mock student
 */
export function createMockStudent(overrides: Partial<StudentSnapshot> = {}): StudentSnapshot {
	return {
		id: 'student-1',
		email: 'student@test.com',
		name: 'Test Student',
		firstName: 'Test',
		lastName: 'Student',
		displayName: 'Test Student',
		userId: 'user-123',
		courseId: 'course-1',
		joinTime: new Date().toISOString(),
		overallGrade: 85.5,
		submissionCount: 5,
		gradedSubmissionCount: 4,
		...overrides
	};
}

/**
 * Create a mock assignment with stats
 */
export function createMockAssignment(
	overrides: Partial<AssignmentWithStats> = {}
): AssignmentWithStats {
	return {
		id: 'assignment-1',
		title: 'Test Assignment',
		description: 'A test programming assignment',
		type: 'assignment',
		status: 'published',
		maxScore: 100,
		dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
		creationTime: new Date().toISOString(),
		updateTime: new Date().toISOString(),
		workType: 'ASSIGNMENT',
		alternateLink: 'https://classroom.google.com/assignment/123',
		submissionStats: {
			total: 25,
			submitted: 20,
			graded: 15,
			pending: 5
		},
		points: 100,
		gradingPeriodId: 'grading-period-1',
		categoryId: 'category-1',
		...overrides
	};
}

/**
 * Create a mock quiz assignment
 */
export function createMockQuiz(overrides: Partial<AssignmentWithStats> = {}): AssignmentWithStats {
	return createMockAssignment({
		id: 'quiz-1',
		title: 'Python Basics Quiz',
		description: 'Quiz covering basic Python concepts',
		type: 'quiz',
		maxScore: 50,
		submissionStats: {
			total: 25,
			submitted: 25,
			graded: 25,
			pending: 0
		},
		...overrides
	});
}

/**
 * Create a mock submission
 */
export function createMockSubmission(
	overrides: Partial<SubmissionSnapshot> = {}
): SubmissionSnapshot {
	return {
		id: 'submission-1',
		assignmentId: 'assignment-1',
		studentId: 'student-1',
		studentEmail: 'student@test.com',
		studentName: 'Test Student',
		submittedAt: new Date().toISOString(),
		status: 'submitted',
		content: 'def hello_world():\n    print("Hello, World!")',
		documentUrl: 'https://docs.google.com/document/123',
		grade: {
			score: 85,
			maxScore: 100,
			feedback: 'Good work! Well structured code.',
			gradedBy: 'ai',
			gradedAt: new Date().toISOString(),
			criteriaScores: [
				{
					name: 'Code Quality',
					score: 90,
					maxScore: 100,
					feedback: 'Clean and readable code'
				},
				{
					name: 'Functionality',
					score: 80,
					maxScore: 100,
					feedback: 'Works correctly with minor issues'
				}
			]
		},
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

/**
 * Create a mock classroom with data
 */
export function createMockClassroom(overrides: Partial<ClassroomWithData> = {}): ClassroomWithData {
	const assignments = [
		createMockAssignment(),
		createMockQuiz(),
		createMockAssignment({
			id: 'assignment-2',
			title: 'Data Structures',
			status: 'draft'
		})
	];

	const students = [
		createMockStudent(),
		createMockStudent({
			id: 'student-2',
			email: 'student2@test.com',
			name: 'Jane Doe'
		}),
		createMockStudent({
			id: 'student-3',
			email: 'student3@test.com',
			name: 'Bob Smith'
		})
	];

	const submissions = [
		createMockSubmission(),
		createMockSubmission({
			id: 'submission-2',
			studentId: 'student-2',
			status: 'graded'
		}),
		createMockSubmission({
			id: 'submission-3',
			studentId: 'student-3',
			status: 'pending'
		})
	];

	return {
		id: 'classroom-1',
		name: 'CS 101: Introduction to Programming',
		section: 'Fall 2024',
		description: 'Learn the basics of programming with Python',
		descriptionHeading: 'Course Overview',
		room: 'Computer Lab A',
		enrollmentCode: 'abc123',
		courseState: 'ACTIVE',
		creationTime: new Date().toISOString(),
		updateTime: new Date().toISOString(),
		alternateLink: 'https://classroom.google.com/c/123',
		teacherGroupEmail: 'teachers-cs101@school.edu',
		courseGroupEmail: 'cs101-fall2024@school.edu',
		studentCount: students.length,
		assignmentCount: assignments.length,
		totalSubmissions: submissions.length,
		ungradedSubmissions: submissions.filter((s) => s.status === 'pending').length,
		assignments,
		students,
		submissions,
		teacherFolder: {
			id: 'folder-123',
			title: 'CS 101 Teacher Resources',
			alternateLink: 'https://drive.google.com/drive/folders/123'
		},
		calendarId: 'calendar-123',
		ownerId: 'teacher-123',
		guardianNotificationSettings: {
			enabled: true
		},
		...overrides
	};
}

/**
 * Create multiple mock classrooms
 */
export function createMockClassrooms(count: number = 3): ClassroomWithData[] {
	return Array.from({ length: count }, (_, index) =>
		createMockClassroom({
			id: `classroom-${index + 1}`,
			name: `CS ${101 + index}: Programming ${index + 1}`,
			section: `Section ${index + 1}`,
			enrollmentCode: `code${index + 1}`
		})
	);
}

/**
 * Create a complete mock classroom snapshot
 */
export function createMockClassroomSnapshot(
	overrides: Partial<ClassroomSnapshot> = {}
): ClassroomSnapshot {
	const classrooms = createMockClassrooms(2);

	const globalStats = {
		totalClassrooms: classrooms.length,
		totalStudents: classrooms.reduce((sum, c) => sum + c.studentCount, 0),
		totalAssignments: classrooms.reduce((sum, c) => sum + c.assignmentCount, 0),
		totalSubmissions: classrooms.reduce((sum, c) => sum + c.totalSubmissions, 0),
		ungradedSubmissions: classrooms.reduce((sum, c) => sum + c.ungradedSubmissions, 0),
		averageGrade: 82.5
	};

	return {
		teacher: createMockTeacher(),
		classrooms,
		globalStats,
		snapshotMetadata: createMockSnapshotMetadata(),
		...overrides
	};
}

/**
 * Create mock diff data for jsondiffpatch
 */
export function createMockDiffData() {
	return {
		globalStats: {
			totalStudents: [25, 30], // Changed from 25 to 30
			totalAssignments: [5] // Added new assignment
		},
		classrooms: {
			_t: 'a', // Array type
			0: {
				studentCount: [25, 30], // Changed student count
				assignments: {
					_t: 'a',
					2: [
						{
							// Added new assignment
							id: 'assignment-3',
							title: 'New Assignment',
							status: 'draft'
						}
					]
				}
			}
		}
	};
}

/**
 * Create a mock File object for upload testing
 */
export function createMockFile(
	content: string = JSON.stringify(createMockClassroomSnapshot()),
	filename: string = 'classroom-snapshot.json',
	type: string = 'application/json'
): File {
	const blob = new Blob([content], { type });
	return new File([blob], filename, { type });
}

/**
 * Create an invalid mock file for error testing
 */
export function createInvalidMockFile(): File {
	const invalidContent = '{ invalid json content }';
	return createMockFile(invalidContent, 'invalid.json');
}

/**
 * Create mock classroom response data (for API compatibility)
 */
export function createMockClassroomResponse(
	overrides: Partial<ClassroomResponse> = {}
): ClassroomResponse {
	return {
		id: 'classroom-1',
		name: 'CS 101: Introduction to Programming',
		courseCode: 'CS101',
		section: 'Fall 2024',
		description: 'Learn the basics of programming',
		teacherName: 'Test Teacher',
		studentCount: 25,
		assignmentCount: 3,
		ungradedSubmissions: 2,
		lastActivity: new Date().toISOString(),
		...overrides
	};
}

/**
 * Create mock assignment response data (for API compatibility)
 */
export function createMockAssignmentResponse(
	overrides: Partial<AssignmentResponse> = {}
): AssignmentResponse {
	return {
		id: 'assignment-1',
		classroomId: 'classroom-1',
		title: 'Python Basics',
		description: 'Learn Python fundamentals',
		dueDate: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 },
		maxPoints: 100,
		gradingRubric: {
			enabled: true,
			criteria: ['Code Quality', 'Functionality'],
			promptTemplate: 'Grade this Python assignment'
		},
		isQuiz: false,
		submissionCount: 20,
		gradedCount: 15,
		avgScore: 85.5,
		createdAt: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 },
		updatedAt: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 },
		...overrides
	};
}

/**
 * Create a list of mock FileList for drag & drop testing
 */
export function createMockFileList(files: File[]): FileList {
	const fileList = {
		length: files.length,
		item: (index: number) => files[index] || null,
		[Symbol.iterator]: function* () {
			for (let i = 0; i < files.length; i++) {
				yield files[i];
			}
		}
	};

	// Add indexed properties
	files.forEach((file, index) => {
		(fileList as any)[index] = file;
	});

	return fileList as FileList;
}

/**
 * Create mock drag event with files
 */
export function createMockDragEvent(files: File[]): DragEvent {
	const dataTransfer = {
		files: createMockFileList(files),
		types: ['Files'],
		getData: vi.fn(),
		setData: vi.fn()
	};

	return {
		type: 'drop',
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		dataTransfer
	} as any as DragEvent;
}

/**
 * Reset all mock functions - useful in beforeEach
 */
export function resetAllMocks() {
	vi.clearAllMocks();
}

/**
 * Export commonly used mock combinations
 */
export const mockData = {
	teacher: createMockTeacher(),
	classroom: createMockClassroom(),
	classrooms: createMockClassrooms(),
	snapshot: createMockClassroomSnapshot(),
	diffData: createMockDiffData(),
	validFile: createMockFile(),
	invalidFile: createInvalidMockFile(),
	classroomResponse: createMockClassroomResponse(),
	assignmentResponse: createMockAssignmentResponse()
};

// Make vi available for mocking
import { vi } from 'vitest';
