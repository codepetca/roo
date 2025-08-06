/**
 * Teacher Dashboard store using Svelte 5 runes
 * Manages teacher dashboard data, classroom statistics, and normalized data
 * Location: frontend/src/lib/stores/teacher-dashboard.svelte.ts
 */

import { api } from '$lib/api';
import type { TeacherDashboard, Classroom, AssignmentWithStats } from '@shared/schemas/core';

// Dashboard state
let dashboardData = $state<TeacherDashboard | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

// Classroom selection state
let selectedClassroomId = $state<string | null>(null);
let classroomStats = $state<any>(null);
let classroomAssignments = $state<AssignmentWithStats[]>([]);

// Quick stats derived from dashboard data
const quickStats = $derived(() => {
	if (!dashboardData) return null;
	return dashboardData.stats;
});

const classrooms = $derived(() => {
	return dashboardData?.classrooms || [];
});

const selectedClassroom = $derived(() => {
	if (!selectedClassroomId || !dashboardData) return null;
	return dashboardData.classrooms.find(c => c.id === selectedClassroomId) || null;
});

const recentActivity = $derived(() => {
	return dashboardData?.recentActivity || [];
});

/**
 * Load complete teacher dashboard data
 */
async function loadDashboard(): Promise<void> {
	try {
		loading = true;
		error = null;

		// Load dashboard data from new API
		dashboardData = await api.getTeacherDashboard();
		
		console.log('Dashboard loaded successfully', {
			classroomCount: dashboardData.classrooms.length,
			totalStudents: dashboardData.stats.totalStudents,
			ungradedSubmissions: dashboardData.stats.ungradedSubmissions
		});

	} catch (err: unknown) {
		console.error('Failed to load dashboard:', err);
		error = err instanceof Error ? err.message : 'Failed to load dashboard data';
		dashboardData = null;
	} finally {
		loading = false;
	}
}

/**
 * Select a classroom and load its detailed statistics
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

		console.log('Classroom selected', {
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
 * Refresh dashboard data
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
 * Reset selection state
 */
function clearSelection(): void {
	selectedClassroomId = null;
	classroomStats = null;
	classroomAssignments = [];
}

/**
 * Get classroom by ID (helper)
 */
function getClassroom(classroomId: string): Classroom | null {
	return classrooms.find(c => c.id === classroomId) || null;
}

/**
 * Get ungraded submissions count for a specific classroom
 */
function getUngradedCount(classroomId?: string): number {
	if (!dashboardData) return 0;
	
	if (classroomId) {
		const classroom = getClassroom(classroomId);
		return classroom?.ungradedSubmissions || 0;
	}
	
	return dashboardData.stats.ungradedSubmissions;
}

// Export reactive properties and actions (Svelte 5 style)
export const teacherDashboardStore = {
	// Reactive state
	get dashboardData() { return dashboardData; },
	get loading() { return loading; },
	get error() { return error; },
	get selectedClassroomId() { return selectedClassroomId; },
	get classroomStats() { return classroomStats; },
	get classroomAssignments() { return classroomAssignments; },
	
	// Derived state
	get quickStats() { return quickStats; },
	get classrooms() { return classrooms; },
	get selectedClassroom() { return selectedClassroom; },
	get recentActivity() { return recentActivity; },
	
	// Actions
	loadDashboard,
	selectClassroom,
	refresh,
	clearError,
	clearSelection,
	getClassroom,
	getUngradedCount
};