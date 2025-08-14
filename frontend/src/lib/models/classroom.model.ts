/**
 * Classroom Model - Domain model for classroom entities
 * Location: frontend/src/lib/models/classroom.model.ts
 */

import { BaseModel } from './base.model';
import { classroomSchema } from '@shared/schemas/core';
import { z } from 'zod';

/**
 * Classroom model with reactive state and computed properties
 */
export class ClassroomModel extends BaseModel<typeof classroomSchema> {
	protected schema = classroomSchema;

	// Core fields
	teacherId = $state<string>('');
	name = $state<string>('');
	section = $state<string | undefined>();
	description = $state<string | undefined>();

	// Google Classroom integration
	externalId = $state<string | undefined>();
	enrollmentCode = $state<string | undefined>();
	alternateLink = $state<string | undefined>();
	courseState = $state<string | undefined>();

	// Relationships
	studentIds = $state<string[]>([]);
	assignmentIds = $state<string[]>([]);

	// Statistics
	studentCount = $state<number>(0);
	assignmentCount = $state<number>(0);
	activeSubmissions = $state<number>(0);
	ungradedSubmissions = $state<number>(0);

	// Computed properties
	displayName = $derived(this.section ? `${this.name} - ${this.section}` : this.name);

	hasUngradedWork = $derived(this.ungradedSubmissions > 0);

	completionRate = $derived(() => {
		const total = this.studentCount * this.assignmentCount;
		if (total === 0) return 0;
		return Math.round((this.activeSubmissions / total) * 100);
	});

	statusBadge = $derived(() => {
		if (this.ungradedSubmissions > 0) {
			return {
				text: `${this.ungradedSubmissions} pending`,
				variant: 'warning' as const
			};
		}
		return {
			text: 'Up to date',
			variant: 'success' as const
		};
	});

	/**
	 * Create a ClassroomModel from Firestore data
	 */
	static fromFirestore(data: unknown): ClassroomModel {
		return ClassroomModel.fromData(data);
	}

	/**
	 * Check if a student is enrolled
	 */
	hasStudent(studentId: string): boolean {
		return this.studentIds.includes(studentId);
	}

	/**
	 * Check if an assignment belongs to this classroom
	 */
	hasAssignment(assignmentId: string): boolean {
		return this.assignmentIds.includes(assignmentId);
	}

	/**
	 * Add a student to the classroom
	 */
	addStudent(studentId: string): void {
		if (!this.hasStudent(studentId)) {
			this.studentIds.push(studentId);
			this.studentCount++;
		}
	}

	/**
	 * Remove a student from the classroom
	 */
	removeStudent(studentId: string): void {
		const index = this.studentIds.indexOf(studentId);
		if (index !== -1) {
			this.studentIds.splice(index, 1);
			this.studentCount = Math.max(0, this.studentCount - 1);
		}
	}

	/**
	 * Update statistics
	 */
	updateStats(stats: {
		studentCount?: number;
		assignmentCount?: number;
		activeSubmissions?: number;
		ungradedSubmissions?: number;
	}): void {
		if (stats.studentCount !== undefined) this.studentCount = stats.studentCount;
		if (stats.assignmentCount !== undefined) this.assignmentCount = stats.assignmentCount;
		if (stats.activeSubmissions !== undefined) this.activeSubmissions = stats.activeSubmissions;
		if (stats.ungradedSubmissions !== undefined)
			this.ungradedSubmissions = stats.ungradedSubmissions;
	}
}
