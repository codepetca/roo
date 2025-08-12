/**
 * Classroom store using Svelte 5 runes
 * Location: frontend/src/lib/stores/classroom.svelte.ts
 */

import { api } from '../api';
import type { ClassroomResponse, AssignmentResponse } from '../schemas';

// Global state using Svelte 5 runes
let classrooms = $state<ClassroomResponse[]>([]);
let selectedClassroom = $state<ClassroomResponse | null>(null);
let assignments = $state<AssignmentResponse[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

/**
 * Load classrooms for the current teacher
 */
async function loadClassrooms(): Promise<void> {
	loading = true;
	error = null;

	try {
		const result = await api.getTeacherClassrooms();
		classrooms = result;
	} catch (err) {
		console.error('Failed to load classrooms:', err);
		error = err instanceof Error ? err.message : 'Failed to load classrooms';
		classrooms = [];
	} finally {
		loading = false;
	}
}

/**
 * Select a classroom and load its assignments
 */
async function selectClassroom(classroom: ClassroomResponse): Promise<void> {
	selectedClassroom = classroom;
	loading = true;
	error = null;

	try {
		const result = await api.getClassroomAssignments(classroom.id);
		assignments = result;
	} catch (err) {
		console.error('Failed to load classroom assignments:', err);
		error = err instanceof Error ? err.message : 'Failed to load assignments';
		assignments = [];
	} finally {
		loading = false;
	}
}

/**
 * Clear selected classroom
 */
function clearSelection(): void {
	selectedClassroom = null;
	assignments = [];
	error = null;
}

/**
 * Refresh current data
 */
async function refresh(): Promise<void> {
	await api.refresh();
	await loadClassrooms();

	if (selectedClassroom) {
		// Refresh assignments for selected classroom
		const updatedClassroom = classrooms.find((c) => c.id === selectedClassroom?.id);
		if (updatedClassroom) {
			await selectClassroom(updatedClassroom);
		}
	}
}

// Export store with reactive properties and actions
export const classroomStore = {
	// Reactive state accessed via getters
	get classrooms() {
		return classrooms;
	},
	get selectedClassroom() {
		return selectedClassroom;
	},
	get assignments() {
		return assignments;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},

	// Actions
	loadClassrooms,
	selectClassroom,
	clearSelection,
	refresh
};
