/**
 * Classroom store using Svelte 5 runes
 * Centralized state management for classroom data, assignments, and selections
 * Location: frontend/src/lib/stores/classroom.svelte.ts
 */

import { api } from '../api';
import type { ClassroomResponse, AssignmentResponse } from '../schemas';

// Global classroom state using Svelte 5 runes
let classrooms = $state<ClassroomResponse[]>([]);
let selectedClassroomId = $state<string | undefined>(undefined);
let assignments = $state<AssignmentResponse[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

// Derived values (Svelte 5 proper syntax - no arrow functions)
let selectedClassroom = $derived(
	classrooms.find(c => c.id === selectedClassroomId) || null
);

let hasClassrooms = $derived(classrooms.length > 0);

let totalAssignments = $derived(assignments.length);

let quizCount = $derived(assignments.filter(a => a.isQuiz).length);

let totalSubmissions = $derived(
	assignments.reduce((sum, a) => sum + (a.submissionCount || 0), 0)
);

let ungradedSubmissions = $derived(
	assignments.reduce((sum, a) => {
		const ungraded = (a.submissionCount || 0) - (a.gradedCount || 0);
		return sum + ungraded;
	}, 0)
);

/**
 * Load teacher's classrooms from the API
 */
async function loadClassrooms(): Promise<void> {
	try {
		loading = true;
		error = null;
		classrooms = await api.getTeacherClassrooms();

		// Auto-select first classroom if none selected and we have classrooms
		if (!selectedClassroomId && classrooms.length > 0) {
			selectedClassroomId = classrooms[0].id;
			// Load assignments for the auto-selected classroom
			await loadAssignments();
		}
	} catch (err: unknown) {
		console.error('Failed to load classrooms:', err);
		error = err instanceof Error ? err.message : 'Failed to load classrooms';
		classrooms = []; // Clear classrooms on error
	} finally {
		loading = false;
	}
}

/**
 * Load assignments for the selected classroom
 */
async function loadAssignments(): Promise<void> {
	if (!selectedClassroomId) {
		assignments = [];
		return;
	}

	try {
		loading = true;
		error = null;
		assignments = await api.getClassroomAssignments(selectedClassroomId);
	} catch (err: unknown) {
		console.error('Failed to load assignments:', err);
		error = err instanceof Error ? err.message : 'Failed to load assignments';
		assignments = []; // Clear assignments on error
	} finally {
		loading = false;
	}
}

/**
 * Select a classroom and load its assignments
 */
async function selectClassroom(classroomId: string): Promise<void> {
	if (selectedClassroomId === classroomId) return;
	
	selectedClassroomId = classroomId;
	await loadAssignments();
}

/**
 * Clear the selected classroom
 */
function clearSelection(): void {
	selectedClassroomId = undefined;
	assignments = [];
}

/**
 * Refresh current data
 */
async function refresh(): Promise<void> {
	await Promise.all([
		loadClassrooms(),
		selectedClassroomId ? loadAssignments() : Promise.resolve()
	]);
}

/**
 * Clear error state
 */
function clearError(): void {
	error = null;
}

// Export reactive properties and actions (Svelte 5 style with closures)
export const classroomStore = {
	// Reactive state and derived values accessed via getters to maintain reactivity
	get classrooms() { return classrooms; },
	get selectedClassroomId() { return selectedClassroomId; },
	get selectedClassroom() { return selectedClassroom; },
	get assignments() { return assignments; },
	get loading() { return loading; },
	get error() { return error; },
	get hasClassrooms() { return hasClassrooms; },
	get totalAssignments() { return totalAssignments; },
	get quizCount() { return quizCount; },
	get totalSubmissions() { return totalSubmissions; },
	get ungradedSubmissions() { return ungradedSubmissions; },

	// Actions
	loadClassrooms,
	loadAssignments,
	selectClassroom,
	clearSelection,
	refresh,
	clearError
};