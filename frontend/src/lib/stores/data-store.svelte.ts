/**
 * Simplified Data Store for Teacher Dashboard
 * Uses simple arrays with Svelte 5 runes - no realtime complexity
 * Location: frontend/src/lib/stores/data-store.svelte.ts
 */

import type { Classroom, Assignment, DashboardUser, Submission, Grade } from '@shared/schemas/core';

/**
 * Simple data store with basic reactive arrays
 */
class DataStore {
	// Simple arrays with Svelte 5 runes
	classrooms = $state<Classroom[]>([]);
	assignments = $state<Assignment[]>([]);
	submissions = $state<Submission[]>([]);
	grades = $state<Grade[]>([]);

	// User state
	currentUser = $state<DashboardUser | null>(null);

	// Simple loading and error states
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Recent activity
	recentActivity = $state<
		Array<{
			type: 'submission' | 'grade' | 'assignment';
			timestamp: string;
			details: any;
		}>
	>([]);

	// Computed dashboard statistics
	dashboardStats = $derived({
		totalClassrooms: this.classrooms.length,
		totalStudents: this.classrooms.reduce((sum, c) => sum + (c.studentCount || 0), 0),
		totalAssignments: this.assignments.length,
		ungradedSubmissions: this.classrooms.reduce((sum, c) => sum + (c.ungradedSubmissions || 0), 0),
		averageGrade: 0 // TODO: Calculate from grades if needed
	});

	// Computed state for UI
	hasData = $derived(this.classrooms.length > 0 || this.assignments.length > 0);

	// Assignment groupings for UI
	assignmentsGrouped = $derived({
		all: this.assignments,
		quizzes: this.assignments.filter((a) => a.type === 'quiz'),
		assignments: this.assignments.filter((a) => a.type !== 'quiz')
	});

	// Selected entities state
	selectedClassroomId = $state<string | null>(null);
	selectedAssignmentId = $state<string | null>(null);

	selectedClassroom = $derived(
		this.selectedClassroomId
			? (this.classrooms.find((c) => c.id === this.selectedClassroomId) ?? null)
			: null
	);

	selectedAssignment = $derived(
		this.selectedAssignmentId
			? (this.assignments.find((a) => a.id === this.selectedAssignmentId) ?? null)
			: null
	);

	// Assignment grouping by classroom for hierarchical navigation
	assignmentsByClassroom = $derived(() => {
		const grouped = new Map<string, Assignment[]>();

		// Initialize with empty arrays for all classrooms
		for (const classroom of this.classrooms) {
			grouped.set(classroom.id, []);
		}

		// Group assignments by classroom
		for (const assignment of this.assignments) {
			const classroomId = assignment.classroomId;
			if (!grouped.has(classroomId)) {
				grouped.set(classroomId, []);
			}
			grouped.get(classroomId)!.push(assignment);
		}

		return grouped;
	});

	// Assignments for the selected classroom
	selectedClassroomAssignments = $derived(() => {
		if (!this.selectedClassroomId) {
			return [];
		}
		return this.assignments.filter((a) => a.classroomId === this.selectedClassroomId);
	});

	/**
	 * Set data from SvelteKit load functions
	 */
	setData(data: {
		classrooms?: Classroom[];
		assignments?: Assignment[];
		user?: DashboardUser;
		recentActivity?: any[];
	}) {
		console.log('📦 Setting data from load functions:', {
			classrooms: data.classrooms?.length || 0,
			assignments: data.assignments?.length || 0,
			user: data.user?.email
		});

		if (data.classrooms) this.classrooms = data.classrooms;
		if (data.assignments) this.assignments = data.assignments;
		if (data.user) this.currentUser = data.user;
		if (data.recentActivity) this.recentActivity = data.recentActivity;

		this.error = null;
		console.log('✅ Data store updated successfully');
	}

	/**
	 * Select a classroom
	 */
	selectClassroom(classroomId: string): void {
		const classroom = this.classrooms.find((c) => c.id === classroomId);
		if (classroom) {
			this.selectedClassroomId = classroomId;
			this.selectedAssignmentId = null; // Clear assignment selection
			console.log('🏠 Selected classroom:', classroom.name);
		} else {
			console.warn('⚠️ Classroom not found:', classroomId);
		}
	}

	/**
	 * Select an assignment
	 */
	selectAssignment(assignmentId: string): void {
		if (!assignmentId) {
			this.selectedAssignmentId = null;
			console.log('📝 Cleared assignment selection');
			return;
		}

		const assignment = this.assignments.find((a) => a.id === assignmentId);
		if (assignment) {
			this.selectedAssignmentId = assignmentId;

			// Auto-select the classroom if not already selected
			if (this.selectedClassroomId !== assignment.classroomId) {
				this.selectedClassroomId = assignment.classroomId;
				console.log('🏠 Auto-selected classroom for assignment');
			}

			console.log('📝 Selected assignment:', assignment.title || assignment.name);
		} else {
			console.warn('⚠️ Assignment not found:', assignmentId);
		}
	}

	/**
	 * Select an assignment within a specific classroom
	 */
	selectAssignmentInClassroom(classroomId: string, assignmentId: string): void {
		// First select the classroom
		this.selectClassroom(classroomId);

		// Then select the assignment (only if it belongs to the classroom)
		const assignment = this.assignments.find(
			(a) => a.id === assignmentId && a.classroomId === classroomId
		);
		if (assignment) {
			this.selectedAssignmentId = assignmentId;
			console.log('📝 Selected assignment in classroom:', assignment.title || assignment.name);
		} else {
			console.warn('⚠️ Assignment not found in classroom:', assignmentId, classroomId);
		}
	}

	/**
	 * Clear current selection
	 */
	clearSelection(): void {
		this.selectedClassroomId = null;
		this.selectedAssignmentId = null;
		console.log('🔄 Cleared all selections');
	}

	/**
	 * Set error state
	 */
	setError(error: string | null): void {
		this.error = error;
		this.loading = false;
	}

	/**
	 * Clear error
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Set loading state
	 */
	setLoading(loading: boolean): void {
		this.loading = loading;
		if (loading) this.error = null;
	}

	/**
	 * Load test data for development
	 */
	loadTestData(): void {
		console.log('🧪 Loading test data...');

		const testClassrooms: Classroom[] = [
			{
				id: 'test-classroom-1',
				teacherId: 'test@teacher.com',
				name: 'Computer Science Period 1',
				section: '01',
				studentCount: 25,
				assignmentCount: 8,
				activeSubmissions: 18,
				ungradedSubmissions: 5,
				courseState: 'ACTIVE',
				studentIds: [],
				assignmentIds: [],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'test-classroom-2',
				teacherId: 'test@teacher.com',
				name: 'Computer Science Period 2',
				section: '02',
				studentCount: 20,
				assignmentCount: 6,
				activeSubmissions: 12,
				ungradedSubmissions: 3,
				courseState: 'ACTIVE',
				studentIds: [],
				assignmentIds: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		const testAssignments: Assignment[] = [
			{
				id: 'test-assignment-1',
				classroomId: 'test-classroom-1',
				title: 'Karel the Dog - Basic Commands',
				name: 'Karel the Dog - Basic Commands',
				description: 'Introduction to programming with Karel',
				maxScore: 100,
				type: 'coding',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'test-assignment-2',
				classroomId: 'test-classroom-1',
				title: 'Programming Quiz #1',
				name: 'Programming Quiz #1',
				description: 'Basic programming concepts',
				maxScore: 50,
				type: 'quiz',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		// Set test data
		this.classrooms = testClassrooms;
		this.assignments = testAssignments;

		// Set test user
		this.currentUser = {
			id: 'test-teacher-id',
			email: 'test@teacher.com',
			name: 'Test Teacher',
			role: 'teacher',
			schoolEmail: 'test@school.edu',
			classroomIds: ['test-classroom-1', 'test-classroom-2'],
			totalStudents: 45,
			totalClassrooms: 2,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		console.log('✅ Test data loaded:', {
			classrooms: this.classrooms.length,
			assignments: this.assignments.length
		});
	}

	/**
	 * Helper function to format date for display
	 */
	formatDate(date: Date | { _seconds: number } | undefined): string {
		if (!date) return 'No due date';

		// Handle Firestore timestamp format
		if (typeof date === 'object' && '_seconds' in date) {
			date = new Date(date._seconds * 1000);
		}

		// Convert string to Date if needed
		if (typeof date === 'string') {
			date = new Date(date);
		}

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	/**
	 * Get display title for assignment
	 */
	getAssignmentDisplayTitle(assignment: Assignment): string {
		return assignment.title || assignment.name || 'Untitled Assignment';
	}

	/**
	 * Get assignment type label for display
	 */
	getAssignmentTypeLabel(assignment: Assignment): string {
		switch (assignment.type) {
			case 'quiz':
				return 'Quiz';
			case 'coding':
				return 'Coding';
			case 'project':
				return 'Project';
			default:
				return 'Assignment';
		}
	}

	/**
	 * Check if assignment can be auto-graded
	 */
	isAssignmentAutoGradable(assignment: Assignment): boolean {
		// Only quizzes can be auto-graded in this implementation
		return assignment.type === 'quiz';
	}
}

// Export singleton instance
export const dataStore = new DataStore();
