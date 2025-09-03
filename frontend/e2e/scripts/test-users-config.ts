/**
 * Test Users Configuration
 * Location: frontend/e2e/scripts/test-users-config.ts
 *
 * Centralized configuration for all multi-user E2E test accounts
 * Shared between setup scripts, cleanup scripts, and test files
 */

export interface TestUserConfig {
	uid: string;
	email: string;
	password: string;
	displayName: string;
	role: 'teacher' | 'student';
	schoolEmail?: string;
	snapshotFile?: string;
}

/**
 * Common test password for all accounts
 */
export const TEST_PASSWORD = 'test123';

/**
 * Teacher test accounts configuration
 */
export const TEST_TEACHERS: Record<string, TestUserConfig> = {
	teacher1: {
		uid: 'teacher1-e2e-uid',
		email: 'teacher1@test.com',
		password: TEST_PASSWORD,
		displayName: 'Alice Anderson',
		role: 'teacher',
		schoolEmail: 'teacher1@schoolemail.com',
		snapshotFile: 'teacher1-snapshot.json'
	},
	teacher2: {
		uid: 'teacher2-e2e-uid',
		email: 'teacher2@test.com',
		password: TEST_PASSWORD,
		displayName: 'Bob Brown',
		role: 'teacher',
		schoolEmail: 'teacher2@schoolemail.com',
		snapshotFile: 'teacher2-snapshot.json'
	},
	teacher3: {
		uid: 'teacher3-e2e-uid',
		email: 'teacher3@test.com',
		password: TEST_PASSWORD,
		displayName: 'Carol Chen',
		role: 'teacher',
		schoolEmail: 'teacher3@schoolemail.com',
		snapshotFile: 'teacher3-snapshot.json'
	}
};

/**
 * Student test accounts configuration
 */
export const TEST_STUDENTS: Record<string, TestUserConfig> = {
	student1: {
		uid: 'student1-e2e-uid',
		email: 'student1@schoolemail.com',
		password: TEST_PASSWORD,
		displayName: 'Alex Smith',
		role: 'student',
		schoolEmail: 'student1@schoolemail.com'
	},
	student2: {
		uid: 'student2-e2e-uid',
		email: 'student2@schoolemail.com',
		password: TEST_PASSWORD,
		displayName: 'Blake Johnson',
		role: 'student',
		schoolEmail: 'student2@schoolemail.com'
	},
	student3: {
		uid: 'student3-e2e-uid',
		email: 'student3@schoolemail.com',
		password: TEST_PASSWORD,
		displayName: 'Casey Williams',
		role: 'student',
		schoolEmail: 'student3@schoolemail.com'
	},
	student4: {
		uid: 'student4-e2e-uid',
		email: 'student4@schoolemail.com',
		password: TEST_PASSWORD,
		displayName: 'Dana Davis',
		role: 'student',
		schoolEmail: 'student4@schoolemail.com'
	},
	student5: {
		uid: 'student5-e2e-uid',
		email: 'student5@schoolemail.com',
		password: TEST_PASSWORD,
		displayName: 'Elliott Evans',
		role: 'student',
		schoolEmail: 'student5@schoolemail.com'
	},
	student6: {
		uid: 'student6-e2e-uid',
		email: 'student6@schoolemail.com',
		password: TEST_PASSWORD,
		displayName: 'Finley Foster',
		role: 'student',
		schoolEmail: 'student6@schoolemail.com'
	},
	student7: {
		uid: 'student7-e2e-uid',
		email: 'student7@schoolemail.com',
		password: TEST_PASSWORD,
		displayName: 'Gray Garcia',
		role: 'student',
		schoolEmail: 'student7@schoolemail.com'
	},
	student8: {
		uid: 'student8-e2e-uid',
		email: 'student8@schoolemail.com',
		password: TEST_PASSWORD,
		displayName: 'Harper Harris',
		role: 'student',
		schoolEmail: 'student8@schoolemail.com'
	}
};

/**
 * Combined list of all test users
 */
export const ALL_TEST_USERS: TestUserConfig[] = [
	...Object.values(TEST_TEACHERS),
	...Object.values(TEST_STUDENTS)
];

/**
 * Student enrollment matrix for testing cross-enrollment scenarios
 */
export const STUDENT_ENROLLMENTS: Record<string, string[]> = {
	student1: ['teacher1:CS 101', 'teacher2:CS 201'], // Cross-teacher enrollment
	student2: ['teacher1:CS 101', 'teacher1:CS 102'], // Same teacher multiple classes
	student3: ['teacher1:CS 101', 'teacher3:CS 301'], // Intro + Advanced progression
	student4: ['teacher1:CS 102'], // Single enrollment
	student5: ['teacher2:CS 201', 'teacher3:CS 301'], // Web dev + Advanced algorithms
	student6: ['teacher2:CS 202'], // Database focus
	student7: ['teacher2:CS 202', 'teacher3:CS 301'], // Database + Advanced cross-enrollment
	student8: ['teacher2:CS 202'] // Single enrollment database
};

/**
 * Expected data counts for each teacher (for verification)
 */
export const EXPECTED_TEACHER_DATA = {
	teacher1: {
		classrooms: 2,
		totalStudents: 4, // student1, student2, student3, student4
		totalAssignments: 5,
		classroomNames: ['CS 101: Introduction to Programming', 'CS 102: Data Structures']
	},
	teacher2: {
		classrooms: 2,
		totalStudents: 4, // student1, student5, student6, student7, student8
		totalAssignments: 5,
		classroomNames: ['CS 201: Web Development', 'CS 202: Database Systems']
	},
	teacher3: {
		classrooms: 1,
		totalStudents: 3, // student3, student5, student7
		totalAssignments: 4,
		classroomNames: ['CS 301: Advanced Algorithms']
	}
};

/**
 * Helper function to get user by email
 */
export function getUserByEmail(email: string): TestUserConfig | undefined {
	return ALL_TEST_USERS.find((user) => user.email === email);
}

/**
 * Helper function to get all teachers
 */
export function getAllTeachers(): TestUserConfig[] {
	return Object.values(TEST_TEACHERS);
}

/**
 * Helper function to get all students
 */
export function getAllStudents(): TestUserConfig[] {
	return Object.values(TEST_STUDENTS);
}

/**
 * Helper function to get teacher by key
 */
export function getTeacher(teacherKey: keyof typeof TEST_TEACHERS): TestUserConfig {
	return TEST_TEACHERS[teacherKey];
}

/**
 * Helper function to get student by key
 */
export function getStudent(studentKey: keyof typeof TEST_STUDENTS): TestUserConfig {
	return TEST_STUDENTS[studentKey];
}

/**
 * Helper to get students enrolled in a specific teacher's classes
 */
export function getStudentsForTeacher(teacherKey: keyof typeof TEST_TEACHERS): TestUserConfig[] {
	const teacherPrefix = `${teacherKey}:`;
	const enrolledStudentKeys = Object.keys(STUDENT_ENROLLMENTS).filter((studentKey) =>
		STUDENT_ENROLLMENTS[studentKey].some((enrollment) => enrollment.startsWith(teacherPrefix))
	);

	return enrolledStudentKeys
		.map((studentKey) => TEST_STUDENTS[studentKey as keyof typeof TEST_STUDENTS])
		.filter(Boolean);
}

/**
 * Helper to get teachers for a specific student
 */
export function getTeachersForStudent(studentKey: keyof typeof TEST_STUDENTS): TestUserConfig[] {
	const enrollments = STUDENT_ENROLLMENTS[studentKey] || [];
	const teacherKeys = enrollments.map((enrollment) => enrollment.split(':')[0]);
	const uniqueTeacherKeys = [...new Set(teacherKeys)];

	return uniqueTeacherKeys
		.map((teacherKey) => TEST_TEACHERS[teacherKey as keyof typeof TEST_TEACHERS])
		.filter(Boolean);
}
