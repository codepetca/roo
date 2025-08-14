/**
 * Assignment Collection - Manages assignment models with specific queries
 * Location: frontend/src/lib/models/assignment.collection.ts
 */

import { BaseCollection } from './base.collection';
import { AssignmentModel } from './assignment.model';

/**
 * Collection for managing assignment models with assignment-specific queries
 */
export class AssignmentCollection extends BaseCollection<AssignmentModel> {
	/**
	 * Get assignments for a specific classroom
	 */
	byClassroom = $derived((classroomId: string) => {
		return this.filter((assignment) => assignment.classroomId === classroomId);
	});

	/**
	 * Get quiz assignments only
	 */
	quizzes = $derived(this.filter((assignment) => assignment.isQuiz));

	/**
	 * Get non-quiz assignments
	 */
	assignments = $derived(this.filter((assignment) => !assignment.isQuiz));

	/**
	 * Get assignments with ungraded submissions
	 */
	withUngraded = $derived(this.filter((assignment) => assignment.hasUngraded));

	/**
	 * Get overdue assignments
	 */
	overdue = $derived(this.filter((assignment) => assignment.isOverdue));

	/**
	 * Get assignments due soon (within 7 days)
	 */
	dueSoon = $derived(() => {
		return this.filter((assignment) => {
			const days = assignment.daysUntilDue;
			return days !== null && days >= 0 && days <= 7;
		});
	});

	/**
	 * Get assignments by type
	 */
	byType(type: 'coding' | 'quiz' | 'written' | 'form'): AssignmentModel[] {
		if (type === 'quiz') {
			return this.quizzes;
		}
		return this.filter((assignment) => assignment.type === type);
	}

	/**
	 * Get assignments sorted by due date (soonest first)
	 */
	sortedByDueDate = $derived(() => {
		return this.sorted((a, b) => {
			// No due date goes to the end
			if (!a.dueDate && !b.dueDate) return 0;
			if (!a.dueDate) return 1;
			if (!b.dueDate) return -1;

			return a.dueDate.getTime() - b.dueDate.getTime();
		});
	});

	/**
	 * Get assignments sorted by ungraded count (most first)
	 */
	sortedByUngraded = $derived(this.sorted((a, b) => b.ungradedCount - a.ungradedCount));

	/**
	 * Get assignments sorted by title
	 */
	sortedByTitle = $derived(this.sorted((a, b) => a.displayTitle.localeCompare(b.displayTitle)));

	/**
	 * Search assignments by title or description
	 */
	search(query: string): AssignmentModel[] {
		const lowercaseQuery = query.toLowerCase();
		return this.filter((assignment) => {
			const title = assignment.displayTitle.toLowerCase();
			const description = assignment.description?.toLowerCase() || '';

			return title.includes(lowercaseQuery) || description.includes(lowercaseQuery);
		});
	}

	/**
	 * Get assignments for multiple classrooms
	 */
	byClassrooms(classroomIds: string[]): AssignmentModel[] {
		return this.filter((assignment) => classroomIds.includes(assignment.classroomId));
	}

	/**
	 * Get auto-gradable assignments
	 */
	autoGradable = $derived(this.filter((assignment) => assignment.isAutoGradable()));

	/**
	 * Get statistics for assignments
	 */
	get statistics() {
		return $derived({
			total: this.count,
			quizzes: this.quizzes.length,
			assignments: this.assignments.length,
			withUngraded: this.withUngraded.length,
			overdue: this.overdue.length,
			dueSoon: this.dueSoon.length,
			autoGradable: this.autoGradable.length,
			totalUngraded: this.all.reduce((sum, a) => sum + a.ungradedCount, 0),
			averageCompletion:
				this.all.length > 0
					? Math.round(this.all.reduce((sum, a) => sum + a.completionRate, 0) / this.all.length)
					: 0
		});
	}

	/**
	 * Create an assignment model from Firestore data
	 */
	createModel(data: any): AssignmentModel {
		return AssignmentModel.fromFirestore(data);
	}
}
