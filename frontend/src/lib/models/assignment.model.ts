/**
 * Assignment Model - Domain model for assignment entities
 * Location: frontend/src/lib/models/assignment.model.ts
 */

import { BaseModel } from './base.model';
import { assignmentSchema } from '@shared/schemas/core';
import { z } from 'zod';

/**
 * Assignment model with reactive state and computed properties
 */
export class AssignmentModel extends BaseModel<typeof assignmentSchema> {
	protected schema = assignmentSchema;

	// Core fields
	classroomId = $state<string>('');
	title = $state<string | undefined>();
	name = $state<string | undefined>(); // Google Classroom uses 'name'
	description = $state<string | undefined>();
	type = $state<'coding' | 'quiz' | 'written' | 'form' | undefined>();

	// Timing
	dueDate = $state<Date | undefined>();

	// Grading
	maxPoints = $state<number>(100);
	isQuiz = $state<boolean>(false);

	// Google Forms integration
	formId = $state<string | undefined>();
	formUrl = $state<string | undefined>();

	// Source tracking
	sourceFileId = $state<string | undefined>();
	sourceType = $state<'googleClassroom' | 'googleForms' | 'manual' | undefined>();

	// Statistics (populated from joins)
	submissionCount = $state<number>(0);
	gradedCount = $state<number>(0);
	averageScore = $state<number | undefined>();

	// Computed properties
	displayTitle = $derived(this.title || this.name || 'Untitled Assignment');

	isOverdue = $derived(() => {
		if (!this.dueDate) return false;
		return new Date() > this.dueDate;
	});

	daysUntilDue = $derived(() => {
		if (!this.dueDate) return null;
		const now = new Date();
		const diff = this.dueDate.getTime() - now.getTime();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	});

	dueDateStatus = $derived(() => {
		const days = this.daysUntilDue;
		if (days === null) return { text: 'No due date', variant: 'neutral' as const };
		if (days < 0) return { text: 'Overdue', variant: 'error' as const };
		if (days === 0) return { text: 'Due today', variant: 'warning' as const };
		if (days === 1) return { text: 'Due tomorrow', variant: 'warning' as const };
		if (days <= 7) return { text: `Due in ${days} days`, variant: 'info' as const };
		return { text: `Due in ${days} days`, variant: 'neutral' as const };
	});

	completionRate = $derived(() => {
		if (this.submissionCount === 0) return 0;
		return Math.round((this.gradedCount / this.submissionCount) * 100);
	});

	ungradedCount = $derived(this.submissionCount - this.gradedCount);

	hasUngraded = $derived(this.ungradedCount > 0);

	typeIcon = $derived(() => {
		if (this.isQuiz) return 'quiz';
		switch (this.type) {
			case 'coding':
				return 'code';
			case 'written':
				return 'document';
			case 'form':
				return 'form';
			default:
				return 'assignment';
		}
	});

	typeLabel = $derived(() => {
		if (this.isQuiz) return 'Quiz';
		switch (this.type) {
			case 'coding':
				return 'Coding';
			case 'written':
				return 'Written';
			case 'form':
				return 'Form';
			default:
				return 'Assignment';
		}
	});

	/**
	 * Create an AssignmentModel from Firestore data
	 */
	static fromFirestore(data: unknown): AssignmentModel {
		return AssignmentModel.fromData(data);
	}

	/**
	 * Format due date for display
	 */
	formatDueDate(): string {
		if (!this.dueDate) return 'No due date';

		const options: Intl.DateTimeFormatOptions = {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		};

		// Add year if not current year
		const now = new Date();
		if (this.dueDate.getFullYear() !== now.getFullYear()) {
			options.year = 'numeric';
		}

		return this.dueDate.toLocaleDateString('en-US', options);
	}

	/**
	 * Check if assignment is auto-gradable
	 */
	isAutoGradable(): boolean {
		return this.isQuiz && !!this.formId;
	}

	/**
	 * Update submission statistics
	 */
	updateStats(stats: {
		submissionCount?: number;
		gradedCount?: number;
		averageScore?: number;
	}): void {
		if (stats.submissionCount !== undefined) this.submissionCount = stats.submissionCount;
		if (stats.gradedCount !== undefined) this.gradedCount = stats.gradedCount;
		if (stats.averageScore !== undefined) this.averageScore = stats.averageScore;
	}
}
