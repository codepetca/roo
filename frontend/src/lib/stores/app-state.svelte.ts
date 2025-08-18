/**
 * Unified Application State Store using Svelte 5 runes
 * Single source of truth for all application state
 * Location: frontend/src/lib/stores/app-state.svelte.ts
 */

import { api } from '$lib/api';
import type {
	Teacher,
	Classroom,
	Assignment,
	Submission,
	Grade,
	StudentEnrollment,
	AssignmentWithStats,
	DashboardUser
} from '@shared/schemas/core';

// Core application state using $state runes
let currentUser = $state<DashboardUser | null>(null);
let teacher = $state<Teacher | null>(null);
let classrooms = $state<Classroom[]>([]);
const assignments = $state<Assignment[]>([]);
const submissions = $state<Submission[]>([]);
const grades = $state<Grade[]>([]);
const studentEnrollments = $state<StudentEnrollment[]>([]);

// UI state
let loading = $state(false);
let error = $state<string | null>(null);
let selectedClassroomId = $state<string | null>(null);
let selectedAssignmentId = $state<string | null>(null);

// Dashboard specific state
let dashboardStats = $state<{
	totalStudents: number;
	totalAssignments: number;
	ungradedSubmissions: number;
	averageGrade: number;
} | null>(null);

let recentActivity = $state<
	Array<{
		type: string;
		timestamp: string;
		details: any;
	}>
>([]);

// Classroom detail state
let classroomStats = $state<any>(null);
let classroomAssignments = $state<AssignmentWithStats[]>([]);

// Derived values - computed from state
const selectedClassroom = $derived(classrooms.find((c) => c.id === selectedClassroomId) || null);

const selectedAssignment = $derived(assignments.find((a) => a.id === selectedAssignmentId) || null);

const hasData = $derived(classrooms.length > 0 || assignments.length > 0);

const ungradedCount = $derived(() => {
	if (selectedClassroomId) {
		const classroom = classrooms.find((c) => c.id === selectedClassroomId);
		return classroom?.ungradedSubmissions || 0;
	}
	return dashboardStats?.ungradedSubmissions || 0;
});

/**
 * Load teacher dashboard data from API
 */
async function loadDashboard(): Promise<void> {
	try {
		loading = true;
		error = null;

		console.log('🔍 Loading dashboard data...');

		// Load dashboard data from API
		const result = await api.getTeacherDashboard();
		console.log('📦 Dashboard data received:', result);

		// Update state directly - mutations trigger reactivity
		currentUser = result.teacher;
		teacher = result.teacher;
		classrooms = result.classrooms;
		dashboardStats = result.stats;
		recentActivity = result.recentActivity;

		console.log('✅ Dashboard loaded:', {
			classroomCount: classrooms.length,
			totalStudents: dashboardStats?.totalStudents || 0,
			totalAssignments: dashboardStats?.totalAssignments || 0
		});
	} catch (err: unknown) {
		console.error('❌ Failed to load dashboard:', err);
		error = err instanceof Error ? err.message : 'Failed to load dashboard data';

		// Clear data on error
		currentUser = null;
		teacher = null;
		classrooms = [];
		dashboardStats = null;
		recentActivity = [];
	} finally {
		loading = false;
	}
}

/**
 * Load test data for debugging
 */
function loadTestData(): void {
	console.log('🧪 Loading test data...');

	loading = false;
	error = null;

	// Set test teacher
	teacher = {
		id: 'test-teacher-id',
		email: 'test@teacher.com',
		name: 'Test Teacher',
		role: 'teacher',
		schoolEmail: 'test@school.edu',
		classroomIds: ['test-classroom-1', 'test-classroom-2'],
		totalStudents: 45,
		totalClassrooms: 2,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	currentUser = teacher;

	// Set test classrooms
	classrooms = [
		{
			id: 'test-classroom-1',
			teacherId: 'test@school.edu',
			name: 'Test CS P1',
			section: '01',
			externalId: 'test-001',
			enrollmentCode: 'ABC123',
			alternateLink: 'https://test.com',
			courseState: 'ACTIVE',
			studentIds: Array.from({ length: 25 }, (_, i) => `student-${i + 1}`),
			assignmentIds: Array.from({ length: 8 }, (_, i) => `assignment-${i + 1}`),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			ungradedSubmissions: 5,
			studentCount: 25,
			assignmentCount: 8,
			activeSubmissions: 12,
			assignments: []
		},
		{
			id: 'test-classroom-2',
			teacherId: 'test@school.edu',
			name: 'Test CS P2',
			section: '02',
			externalId: 'test-002',
			enrollmentCode: 'DEF456',
			alternateLink: 'https://test.com',
			courseState: 'ACTIVE',
			studentIds: Array.from({ length: 20 }, (_, i) => `student-${i + 26}`),
			assignmentIds: Array.from({ length: 6 }, (_, i) => `assignment-${i + 9}`),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			ungradedSubmissions: 3,
			studentCount: 20,
			assignmentCount: 6,
			activeSubmissions: 8,
			assignments: []
		}
	];

	// Set test stats
	dashboardStats = {
		totalStudents: 45,
		totalAssignments: 14,
		ungradedSubmissions: 8,
		averageGrade: 87.5
	};

	// Set test recent activity with unique timestamps
	const now = new Date();
	recentActivity = [
		{
			type: 'submission',
			timestamp: new Date(now.getTime() - 60000).toISOString(), // 1 minute ago
			details: {
				classroomId: 'test-classroom-1',
				classroomName: 'Test CS P1',
				studentName: 'John Test',
				assignmentId: 'assignment-1'
			}
		},
		{
			type: 'grade',
			timestamp: new Date(now.getTime() - 120000).toISOString(), // 2 minutes ago
			details: {
				classroomId: 'test-classroom-2',
				classroomName: 'Test CS P2',
				score: 95,
				maxScore: 100
			}
		}
	];

	console.log('✅ Test data loaded');
}

/**
 * Select a classroom and load its details
 */
async function selectClassroom(classroomId: string): Promise<void> {
	try {
		selectedClassroomId = classroomId;

		// Load detailed classroom stats and assignments
		const [stats, assignments] = await Promise.all([
			api.getClassroomStats(classroomId),
			api.getClassroomAssignmentsWithStats(classroomId)
		]);

		classroomStats = stats.statistics;
		classroomAssignments = assignments;

		console.log('Classroom selected:', {
			classroomId,
			studentCount: stats.statistics.studentCount,
			assignmentCount: assignments.length
		});
	} catch (err: unknown) {
		console.error('Failed to load classroom details:', err);
		error = err instanceof Error ? err.message : 'Failed to load classroom details';
	}
}

/**
 * Clear the current selection
 */
function clearSelection(): void {
	selectedClassroomId = null;
	selectedAssignmentId = null;
	classroomStats = null;
	classroomAssignments = [];
}

/**
 * Refresh all data
 */
async function refresh(): Promise<void> {
	await loadDashboard();

	// Reload selected classroom if there is one
	if (selectedClassroomId) {
		await selectClassroom(selectedClassroomId);
	}
}

/**
 * Clear error state
 */
function clearError(): void {
	error = null;
}

/**
 * Export unified app state with clean getter properties
 * This is the single source of truth for the entire application
 */
export const appState = {
	// Core entities - direct property access for reactivity
	get user() {
		return currentUser;
	},
	get teacher() {
		return teacher;
	},
	get classrooms() {
		return classrooms;
	},
	get assignments() {
		return assignments;
	},
	get submissions() {
		return submissions;
	},
	get grades() {
		return grades;
	},
	get studentEnrollments() {
		return studentEnrollments;
	},

	// UI state
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	get selectedClassroomId() {
		return selectedClassroomId;
	},
	get selectedAssignmentId() {
		return selectedAssignmentId;
	},

	// Dashboard specific
	get dashboardStats() {
		return dashboardStats;
	},
	get recentActivity() {
		return recentActivity;
	},

	// Classroom details
	get classroomStats() {
		return classroomStats;
	},
	get classroomAssignments() {
		return classroomAssignments;
	},

	// Derived values
	get selectedClassroom() {
		return selectedClassroom;
	},
	get selectedAssignment() {
		return selectedAssignment;
	},
	get hasData() {
		return hasData;
	},
	get ungradedCount() {
		return ungradedCount();
	},

	// Actions - methods that mutate state
	loadDashboard,
	loadTestData,
	selectClassroom,
	clearSelection,
	refresh,
	clearError
};
