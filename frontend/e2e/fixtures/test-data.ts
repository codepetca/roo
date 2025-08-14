/**
 * E2E Test Data Scenarios
 * Location: frontend/e2e/fixtures/test-data.ts
 *
 * Specialized test data scenarios optimized for E2E testing
 */

import type {
	ClassroomSnapshot,
	ClassroomWithData,
	TeacherProfile,
	StudentSnapshot,
	AssignmentWithStats,
	SubmissionSnapshot
} from '@shared/schemas/classroom-snapshot';

/**
 * Test Data Scenarios - Different complexity levels for various test needs
 */

// Small dataset for fast tests
export const SMALL_DATASET = {
	classroomCount: 1,
	assignmentCount: 2,
	studentCount: 5,
	submissionCount: 8
};

// Medium dataset for realistic tests
export const MEDIUM_DATASET = {
	classroomCount: 3,
	assignmentCount: 10,
	studentCount: 75,
	submissionCount: 150
};

// Large dataset for stress tests
export const LARGE_DATASET = {
	classroomCount: 8,
	assignmentCount: 40,
	studentCount: 200,
	submissionCount: 500
};

/**
 * Create mock teacher for E2E tests
 */
export function createMockTeacher(overrides: Partial<TeacherProfile> = {}): TeacherProfile {
	return {
		email: 'dev.codepet@gmail.com',
		name: 'Dev CodePet',
		isTeacher: true,
		displayName: 'Dev CodePet',
		...overrides
	};
}

/**
 * Create mock student data
 */
export function createMockStudents(
	count: number,
	classroomId: string = 'classroom-1'
): StudentSnapshot[] {
	const students: StudentSnapshot[] = [];

	// Always include Stewart as the first student for testing
	students.push({
		id: 'stewart-chan',
		email: 'stewart.chan@gapps.yrdsb.ca',
		name: 'Stewart Chan',
		firstName: 'Stewart',
		lastName: 'Chan',
		displayName: 'Stewart Chan',
		userId: 'stewart-chan-user',
		courseId: classroomId,
		joinTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // Joined 15 days ago
		overallGrade: 87.5, // Good student grade
		submissionCount: 8,
		gradedSubmissionCount: 7
	});

	const firstNames = [
		'Alice',
		'Bob',
		'Carol',
		'David',
		'Eve',
		'Frank',
		'Grace',
		'Henry',
		'Ivy',
		'Jack'
	];
	const lastNames = [
		'Anderson',
		'Brown',
		'Chen',
		'Davis',
		'Evans',
		'Garcia',
		'Harris',
		'Johnson',
		'Kumar',
		'Lopez'
	];

	// Generate remaining students (count - 1 since Stewart is already added)
	const remainingCount = Math.max(0, count - 1);
	for (let index = 0; index < remainingCount; index++) {
		const firstName = firstNames[index % firstNames.length];
		const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
		const studentNumber = String(index + 2).padStart(3, '0'); // Start from 002 since Stewart is 001

		students.push({
			id: `student-${studentNumber}`,
			email: `student${studentNumber}@test.com`,
			name: `${firstName} ${lastName}`,
			firstName,
			lastName,
			displayName: `${firstName} ${lastName}`,
			userId: `user-${studentNumber}`,
			courseId: classroomId,
			joinTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random join time in last 30 days
			overallGrade: Math.round((Math.random() * 40 + 60) * 10) / 10, // Random grade between 60-100
			submissionCount: Math.floor(Math.random() * 10) + 1,
			gradedSubmissionCount: Math.floor(Math.random() * 8) + 1
		});
	}

	return students;
}

/**
 * Create mock assignments with realistic data
 */
export function createMockAssignments(
	count: number,
	classroomId: string = 'classroom-1'
): AssignmentWithStats[] {
	const assignmentTitles = [
		'Karel Basic Movement',
		'Karel Functions and Loops',
		'Karel Problem Solving',
		'Python Variables and Data Types',
		'Python Control Flow',
		'Python Functions',
		'Python Lists and Dictionaries',
		'Python Classes and Objects',
		'Python File Handling',
		'Python Final Project'
	];

	const descriptions = [
		'Learn to move Karel forward, turn, and pick up beepers',
		'Create functions and use loops to solve complex Karel problems',
		'Apply problem-solving strategies to challenging Karel worlds',
		'Understand variables, strings, numbers, and basic data types in Python',
		'Master if statements, loops, and conditional logic',
		'Write and use functions with parameters and return values',
		'Work with lists, dictionaries, and data structures',
		'Learn object-oriented programming concepts',
		'Read from and write to files in Python',
		'Capstone project combining all learned concepts'
	];

	return Array.from({ length: count }, (_, index) => {
		const title = assignmentTitles[index % assignmentTitles.length];
		const description = descriptions[index % descriptions.length];
		const isOverdue = Math.random() < 0.2; // 20% chance of being overdue
		const dueDate = isOverdue
			? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Past due
			: new Date(Date.now() + (Math.random() * 30 + 1) * 24 * 60 * 60 * 1000); // Future due date

		const totalStudents = Math.floor(Math.random() * 20) + 15; // 15-35 students
		const submitted = Math.floor(totalStudents * (0.6 + Math.random() * 0.35)); // 60-95% submission rate
		const graded = Math.floor(submitted * (0.4 + Math.random() * 0.5)); // 40-90% grading rate
		const pending = submitted - graded;

		return {
			id: `assignment-${String(index + 1).padStart(2, '0')}`,
			title: `${title} ${index > 9 ? `(${Math.floor(index / 10) + 1})` : ''}`,
			description,
			type: Math.random() < 0.8 ? 'assignment' : 'quiz',
			status: Math.random() < 0.1 ? 'draft' : 'published',
			maxScore: [50, 75, 100, 100, 100][Math.floor(Math.random() * 5)], // Common point values
			dueDate: dueDate.toISOString(),
			creationTime: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
			updateTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
			workType: 'ASSIGNMENT',
			alternateLink: `https://classroom.google.com/assignment/${index + 1}`,
			submissionStats: {
				total: totalStudents,
				submitted,
				graded,
				pending
			},
			points: [50, 75, 100, 100, 100][Math.floor(Math.random() * 5)],
			gradingPeriodId: `period-${Math.floor(index / 3) + 1}`,
			categoryId: `category-${(index % 3) + 1}`
		};
	});
}

/**
 * Create mock submissions for assignments
 */
export function createMockSubmissions(
	assignments: AssignmentWithStats[],
	students: StudentSnapshot[],
	classroomId: string = 'classroom-1'
): SubmissionSnapshot[] {
	const submissions: SubmissionSnapshot[] = [];

	assignments.forEach((assignment) => {
		const submissionCount = assignment.submissionStats.submitted;
		const gradedCount = assignment.submissionStats.graded;

		// Select random students for this assignment
		const submittingStudents = students.sort(() => Math.random() - 0.5).slice(0, submissionCount);

		submittingStudents.forEach((student, index) => {
			const isGraded = index < gradedCount;
			const submissionId = `${assignment.id}-${student.id}`;

			const codeExamples = [
				'function move() {\n  karel.move();\n}',
				'for i in range(5):\n    print(f"Hello {i}")',
				'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
				'class Student:\n    def __init__(self, name):\n        self.name = name',
				'with open("data.txt", "r") as file:\n    content = file.read()'
			];

			const submission: SubmissionSnapshot = {
				id: submissionId,
				assignmentId: assignment.id,
				studentId: student.id,
				studentEmail: student.email,
				studentName: student.name,
				submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
				status: isGraded ? 'graded' : Math.random() < 0.8 ? 'submitted' : 'pending',
				content: codeExamples[Math.floor(Math.random() * codeExamples.length)],
				documentUrl: `https://docs.google.com/document/${submissionId}`,
				createdAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
				updatedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
			};

			if (isGraded) {
				const score = Math.round(((Math.random() * 40 + 60) * assignment.maxScore) / 100); // 60-100% range
				submission.grade = {
					score,
					maxScore: assignment.maxScore,
					feedback:
						score >= assignment.maxScore * 0.9
							? 'Excellent work! Clean code and perfect implementation.'
							: score >= assignment.maxScore * 0.8
								? 'Good work! Minor improvements suggested.'
								: 'Satisfactory. Please review the feedback and improve.',
					gradedBy: 'ai',
					gradedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
					criteriaScores: [
						{
							name: 'Code Quality',
							score: Math.round(score * (0.9 + Math.random() * 0.2)),
							maxScore: assignment.maxScore,
							feedback: 'Good structure and readability'
						},
						{
							name: 'Functionality',
							score: Math.round(score * (0.8 + Math.random() * 0.3)),
							maxScore: assignment.maxScore,
							feedback: 'Works correctly with minor issues'
						}
					]
				};
			}

			submissions.push(submission);
		});
	});

	return submissions;
}

/**
 * Create mock classroom with complete data
 */
export function createMockClassroomWithData(
	scenario: typeof SMALL_DATASET | typeof MEDIUM_DATASET | typeof LARGE_DATASET = SMALL_DATASET,
	classroomIndex: number = 0
): ClassroomWithData {
	const classroomId = `classroom-${String(classroomIndex + 1).padStart(2, '0')}`;
	const subjects = ['Computer Science', 'Programming', 'Software Engineering', 'Data Science'];
	const levels = ['101', '102', '201', '301', '401'];
	const sections = ['A', 'B', 'C', 'MWF', 'TTh', 'Evening'];

	const subject = subjects[classroomIndex % subjects.length];
	const level = levels[Math.floor(classroomIndex / subjects.length) % levels.length];
	const section = sections[classroomIndex % sections.length];

	const students = createMockStudents(scenario.studentCount, classroomId);
	const assignments = createMockAssignments(scenario.assignmentCount, classroomId);
	const submissions = createMockSubmissions(assignments, students, classroomId);

	return {
		id: classroomId,
		name: `${subject} ${level}: Introduction to Programming`,
		section: `Section ${section}`,
		description: `Learn ${subject.toLowerCase()} fundamentals and programming concepts`,
		descriptionHeading: 'Course Overview',
		room: `Lab ${classroomIndex + 1}${String.fromCharCode(65 + (classroomIndex % 3))}`,
		enrollmentCode: `code${String(classroomIndex + 1).padStart(3, '0')}`,
		courseState: Math.random() < 0.05 ? 'ARCHIVED' : 'ACTIVE',
		creationTime: new Date(
			Date.now() - (30 + classroomIndex * 7) * 24 * 60 * 60 * 1000
		).toISOString(),
		updateTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
		alternateLink: `https://classroom.google.com/c/${classroomId}`,
		teacherGroupEmail: `teachers-${classroomId}@school.edu`,
		courseGroupEmail: `${classroomId}@school.edu`,
		studentCount: students.length,
		assignmentCount: assignments.length,
		totalSubmissions: submissions.length,
		ungradedSubmissions: submissions.filter(
			(s) => s.status === 'pending' || s.status === 'submitted'
		).length,
		assignments,
		students,
		submissions,
		teacherFolder: {
			id: `folder-${classroomId}`,
			title: `${subject} ${level} Teacher Resources`,
			alternateLink: `https://drive.google.com/drive/folders/${classroomId}`
		},
		calendarId: `calendar-${classroomId}`,
		ownerId: 'teacher-123',
		guardianNotificationSettings: { enabled: Math.random() < 0.7 }
	};
}

/**
 * Create complete classroom snapshot for different scenarios
 */
export function createMockClassroomSnapshot(
	scenario: 'small' | 'medium' | 'large' | 'empty' = 'small'
): ClassroomSnapshot {
	let dataset;
	let classroomCount;

	switch (scenario) {
		case 'small':
			dataset = SMALL_DATASET;
			classroomCount = 1;
			break;
		case 'medium':
			dataset = MEDIUM_DATASET;
			classroomCount = 3;
			break;
		case 'large':
			dataset = LARGE_DATASET;
			classroomCount = 8;
			break;
		case 'empty':
			return createEmptyClassroomSnapshot();
	}

	const classrooms = Array.from({ length: classroomCount }, (_, index) =>
		createMockClassroomWithData(dataset, index)
	);

	const globalStats = {
		totalClassrooms: classrooms.length,
		totalStudents: classrooms.reduce((sum, c) => sum + c.studentCount, 0),
		totalAssignments: classrooms.reduce((sum, c) => sum + c.assignmentCount, 0),
		totalSubmissions: classrooms.reduce((sum, c) => sum + c.totalSubmissions, 0),
		ungradedSubmissions: classrooms.reduce((sum, c) => sum + c.ungradedSubmissions, 0),
		averageGrade: Math.round((Math.random() * 20 + 75) * 10) / 10 // 75-95% range
	};

	return {
		teacher: createMockTeacher(),
		classrooms,
		globalStats,
		snapshotMetadata: {
			fetchedAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
			source: 'mock',
			version: '1.0.0'
		}
	};
}

/**
 * Create empty classroom snapshot for testing empty states
 */
export function createEmptyClassroomSnapshot(): ClassroomSnapshot {
	return {
		teacher: createMockTeacher(),
		classrooms: [],
		globalStats: {
			totalClassrooms: 0,
			totalStudents: 0,
			totalAssignments: 0,
			totalSubmissions: 0,
			ungradedSubmissions: 0,
			averageGrade: 0
		},
		snapshotMetadata: {
			fetchedAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			source: 'mock',
			version: '1.0.0'
		}
	};
}

/**
 * Create invalid snapshot data for error testing
 */
export function createInvalidSnapshotData() {
	return {
		invalidJson: '{ invalid json content: missing quotes }',
		missingTeacher: {
			classrooms: [],
			globalStats: {},
			snapshotMetadata: {}
		},
		invalidSchema: {
			teacher: { email: 'invalid-email' }, // Invalid email format
			classrooms: 'not-an-array',
			globalStats: { totalStudents: 'not-a-number' }
		}
	};
}

/**
 * Generate test file content
 */
export function createTestFileContent(scenario: 'valid' | 'invalid' | 'empty' = 'valid'): string {
	switch (scenario) {
		case 'valid':
			return JSON.stringify(createMockClassroomSnapshot('small'), null, 2);
		case 'empty':
			return JSON.stringify(createEmptyClassroomSnapshot(), null, 2);
		case 'invalid':
			return createInvalidSnapshotData().invalidJson;
	}
}

/**
 * Create mock File objects for upload testing
 */
export function createMockFile(
	scenario: 'valid' | 'invalid' | 'empty' = 'valid',
	filename: string = 'test-snapshot.json'
): File {
	const content = createTestFileContent(scenario);
	const blob = new Blob([content], { type: 'application/json' });
	return new File([blob], filename, { type: 'application/json' });
}
