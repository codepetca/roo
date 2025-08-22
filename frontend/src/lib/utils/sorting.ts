/**
 * Sorting utilities for student and assignment data
 * Location: frontend/src/lib/utils/sorting.ts
 */

import type { Assignment } from '@shared/schemas/core';

export type SortDirection = 'asc' | 'desc';
export type AssignmentSortField = 'date' | 'title';
export type StudentSortField = 'name' | 'status' | 'submitted' | 'grade';

/**
 * Sort assignments by date or title
 */
export function sortAssignments(
	assignments: Assignment[],
	sortField: AssignmentSortField,
	direction: SortDirection = 'asc'
): Assignment[] {
	if (!assignments || assignments.length === 0) return [];

	const sorted = [...assignments].sort((a, b) => {
		let comparison = 0;

		switch (sortField) {
			case 'date':
				// Sort by due date, fall back to creation date
				const dateA = new Date(a.dueDate || a.createdAt || 0);
				const dateB = new Date(b.dueDate || b.createdAt || 0);
				comparison = dateA.getTime() - dateB.getTime();
				break;

			case 'title':
				// Sort by title or name
				const titleA = (a.title || a.name || '').toLowerCase();
				const titleB = (b.title || b.name || '').toLowerCase();
				comparison = titleA.localeCompare(titleB);
				break;

			default:
				return 0;
		}

		return direction === 'asc' ? comparison : -comparison;
	});

	return sorted;
}

/**
 * Student progress item type for sorting
 */
export interface StudentProgressItem {
	studentId: string;
	studentName: string;
	studentEmail: string;
	firstName?: string;
	lastName?: string;
	status: string;
	submittedAt?: Date | string;
	score?: number;
	maxScore?: number;
	percentage?: number;
	feedback?: string;
}

/**
 * Extract first and last names from student name
 */
function extractNames(name: string): { firstName: string; lastName: string } {
	// Handle undefined, null, or empty names gracefully
	if (!name || typeof name !== 'string') {
		return { firstName: '', lastName: '' };
	}

	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) {
		return { firstName: parts[0], lastName: '' };
	}
	const firstName = parts[0];
	const lastName = parts.slice(1).join(' ');
	return { firstName, lastName };
}

/**
 * Sort student progress data
 */
export function sortStudentProgress(
	students: StudentProgressItem[],
	sortField: StudentSortField,
	direction: SortDirection = 'asc'
): StudentProgressItem[] {
	if (!students || students.length === 0) return [];

	// Filter out students with invalid or missing names when sorting by name
	const validStudents =
		sortField === 'name'
			? students.filter((student) => student.studentName && typeof student.studentName === 'string')
			: students;

	const sorted = [...validStudents].sort((a, b) => {
		let comparison = 0;

		switch (sortField) {
			case 'name':
				// Sort by lastName, firstName (always ascending for name)
				const namesA = extractNames(a.studentName);
				const namesB = extractNames(b.studentName);

				// First compare last names
				comparison = namesA.lastName.toLowerCase().localeCompare(namesB.lastName.toLowerCase());

				// If last names are equal, compare first names
				if (comparison === 0) {
					comparison = namesA.firstName.toLowerCase().localeCompare(namesB.firstName.toLowerCase());
				}
				break;

			case 'status':
				// Sort by status: pending first (submitted, pending_review) then others (graded, not_submitted)
				const statusA = a.status || '';
				const statusB = b.status || '';

				const isPendingA = statusA === 'submitted' || statusA === 'pending_review';
				const isPendingB = statusB === 'submitted' || statusB === 'pending_review';

				if (isPendingA && !isPendingB) comparison = -1;
				else if (!isPendingA && isPendingB) comparison = 1;
				else comparison = statusA.localeCompare(statusB);
				break;

			case 'submitted':
				// Sort by submission date
				const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
				const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
				comparison = dateA - dateB;
				break;

			case 'grade':
				// Sort by percentage or score
				const gradeA = a.percentage ?? (a.score && a.maxScore ? (a.score / a.maxScore) * 100 : 0);
				const gradeB = b.percentage ?? (b.score && b.maxScore ? (b.score / b.maxScore) * 100 : 0);
				comparison = gradeA - gradeB;
				break;

			default:
				return 0;
		}

		// For name sorting, always use ascending (as requested)
		if (sortField === 'name') {
			return comparison;
		}

		return direction === 'asc' ? comparison : -comparison;
	});

	return sorted;
}

/**
 * Get next sort direction for toggling
 */
export function getNextSortDirection(current: SortDirection): SortDirection {
	return current === 'asc' ? 'desc' : 'asc';
}

/**
 * Get next assignment sort field for toggling
 */
export function getNextAssignmentSortField(current: AssignmentSortField): AssignmentSortField {
	return current === 'date' ? 'title' : 'date';
}

/**
 * Get sort icon based on field and direction
 */
export function getSortIcon(isActive: boolean, direction?: SortDirection): string {
	if (!isActive) return '↕️'; // Neutral sort icon
	return direction === 'asc' ? '▲' : '▼';
}

/**
 * Get readable sort description for UI
 */
export function getSortDescription(
	field: AssignmentSortField | StudentSortField,
	direction?: SortDirection
): string {
	const directionText = direction === 'desc' ? 'descending' : 'ascending';

	switch (field) {
		case 'date':
			return `Sorted by date (${directionText})`;
		case 'title':
			return `Sorted by title (${directionText})`;
		case 'name':
			return 'Sorted by last name, first name';
		case 'status':
			return 'Sorted by status (pending first)';
		case 'submitted':
			return `Sorted by submission date (${directionText})`;
		case 'grade':
			return `Sorted by grade (${directionText})`;
		default:
			return 'Sorted';
	}
}
