/**
 * Classroom Collection - Manages classroom models with specific queries
 * Location: frontend/src/lib/models/classroom.collection.ts
 */

import { BaseCollection } from './base.collection';
import { ClassroomModel } from './classroom.model';

/**
 * Collection for managing classroom models with classroom-specific queries
 */
export class ClassroomCollection extends BaseCollection<ClassroomModel> {
	/**
	 * Get classrooms for a specific teacher
	 */
	byTeacher = $derived((teacherId: string) => {
		return this.filter((classroom) => classroom.teacherId === teacherId);
	});

	/**
	 * Get classrooms with ungraded submissions
	 */
	withUngradedWork = $derived(this.filter((classroom) => classroom.ungradedSubmissions > 0));

	/**
	 * Get active classrooms (not archived)
	 */
	active = $derived(this.filter((classroom) => classroom.courseState !== 'ARCHIVED'));

	/**
	 * Get archived classrooms
	 */
	archived = $derived(this.filter((classroom) => classroom.courseState === 'ARCHIVED'));

	/**
	 * Total student count across all classrooms
	 */
	totalStudents = $derived(this.all.reduce((sum, classroom) => sum + classroom.studentCount, 0));

	/**
	 * Total assignment count across all classrooms
	 */
	totalAssignments = $derived(
		this.all.reduce((sum, classroom) => sum + classroom.assignmentCount, 0)
	);

	/**
	 * Total ungraded submissions across all classrooms
	 */
	totalUngradedSubmissions = $derived(
		this.all.reduce((sum, classroom) => sum + classroom.ungradedSubmissions, 0)
	);

	/**
	 * Get classroom by external ID (Google Classroom ID)
	 */
	byExternalId(externalId: string): ClassroomModel | undefined {
		return this.find((classroom) => classroom.externalId === externalId);
	}

	/**
	 * Get classrooms sorted by name
	 */
	sortedByName = $derived(this.sorted((a, b) => a.name.localeCompare(b.name)));

	/**
	 * Get classrooms sorted by ungraded count (most first)
	 */
	sortedByUngradedWork = $derived(
		this.sorted((a, b) => b.ungradedSubmissions - a.ungradedSubmissions)
	);

	/**
	 * Get classrooms with students
	 */
	withStudents = $derived(this.filter((classroom) => classroom.studentCount > 0));

	/**
	 * Search classrooms by name or section
	 */
	search(query: string): ClassroomModel[] {
		const lowercaseQuery = query.toLowerCase();
		return this.filter((classroom) => {
			const name = classroom.name.toLowerCase();
			const section = classroom.section?.toLowerCase() || '';
			const description = classroom.description?.toLowerCase() || '';

			return (
				name.includes(lowercaseQuery) ||
				section.includes(lowercaseQuery) ||
				description.includes(lowercaseQuery)
			);
		});
	}

	/**
	 * Get dashboard statistics
	 */
	get dashboardStats() {
		return $derived({
			totalClassrooms: this.count,
			activeClassrooms: this.active.length,
			totalStudents: this.totalStudents,
			totalAssignments: this.totalAssignments,
			ungradedSubmissions: this.totalUngradedSubmissions,
			classroomsWithWork: this.withUngradedWork.length
		});
	}

	/**
	 * Create a classroom model from Firestore data
	 */
	createModel(data: any): ClassroomModel {
		return ClassroomModel.fromFirestore(data);
	}
}
