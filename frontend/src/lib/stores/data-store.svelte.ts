/**
 * Schema-First Data Store with Real-time Updates
 * Single source of truth using Zod schema-inferred types
 * Location: frontend/src/lib/stores/data-store.svelte.ts
 */

import { api } from '$lib/api';
import { auth } from '$lib/stores/auth.svelte';
import { realtimeService } from '$lib/services/firestore-realtime';
import type { Classroom, Assignment, TeacherDashboard, DashboardUser } from '@shared/schemas/core';

/**
 * Schema-first data store with reactive arrays and computed values
 */
class DataStore {
	// Core data arrays using schema-inferred types
	classrooms = $state<Classroom[]>([]);
	assignments = $state<Assignment[]>([]);

	// User state
	currentUser = $state<DashboardUser | null>(null);

	// Loading and error states
	loading = $state<boolean>(false);
	error = $state<string | null>(null);
	initialized = $state<boolean>(false);

	// Dashboard-specific state
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
		totalStudents: this.classrooms.reduce((sum, c) => sum + c.studentCount, 0),
		totalAssignments: this.assignments.length,
		ungradedSubmissions: this.classrooms.reduce((sum, c) => sum + c.ungradedSubmissions, 0),
		averageGrade: 0 // TODO: Calculate from grades collection
	});

	// Computed state
	hasData = $derived(this.classrooms.length > 0 || this.assignments.length > 0);

	// Computed assignment groupings for UI
	assignmentsGrouped = $derived({
		all: this.assignments,
		quizzes: this.assignments.filter(a => a.type === 'quiz'),
		assignments: this.assignments.filter(a => a.type !== 'quiz')
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

	/**
	 * Initialize the data store and load all data
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			this.setLoading(true);
			this.clearError();

			console.log('🚀 Initializing data store...');

			// Check if user is authenticated
			if (!auth.isAuthenticated()) {
				console.warn('⚠️ User not authenticated, cannot initialize data store');
				this.setError('Please log in to view your dashboard data');
				return;
			}

			// Verify user is a teacher
			if (!auth.isTeacher()) {
				console.warn('⚠️ User is not a teacher, cannot load teacher dashboard');
				this.setError('Teacher access required');
				return;
			}

			console.log('✅ User authenticated as teacher, loading dashboard data...');

			// Load initial dashboard data
			await this.loadDashboardData();

			// Setup real-time listeners if we have data
			if (this.currentUser?.schoolEmail) {
				this.setupRealtimeListeners();
			}

			this.initialized = true;
			console.log('✅ Data store initialized successfully');
		} catch (error) {
			console.error('❌ Failed to initialize data store:', error);

			// Provide more specific error messages
			if (error instanceof Error) {
				if (error.message.includes('403')) {
					this.setError('Access denied. Please check your account permissions.');
				} else if (error.message.includes('401')) {
					this.setError('Authentication expired. Please log in again.');
				} else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
					this.setError('Network error. Please check your connection and try again.');
				} else {
					this.setError(`Failed to load dashboard data: ${error.message}`);
				}
			} else {
				this.setError('Failed to initialize application data');
			}
		} finally {
			this.setLoading(false);
		}
	}

	/**
	 * Load dashboard data from API
	 */
	async loadDashboardData(): Promise<void> {
		try {
			console.log('📦 Loading dashboard data from API...');
			console.log('🔐 Current auth state:', {
				isAuthenticated: auth.isAuthenticated(),
				isTeacher: auth.isTeacher(),
				userEmail: auth.user?.email,
				userRole: auth.user?.role
			});

			// Get teacher dashboard data
			const dashboardData = await api.getTeacherDashboard();

			console.log('📊 Dashboard data received:', {
				classroomCount: dashboardData.classrooms?.length || 0,
				teacher: dashboardData.teacher?.email,
				teacherSchoolEmail: dashboardData.teacher?.schoolEmail,
				stats: dashboardData.stats,
				recentActivityCount: dashboardData.recentActivity?.length || 0
			});

			// Set current user
			this.currentUser = dashboardData.teacher;

			// Set classrooms array directly (already validated by API)
			if (dashboardData.classrooms && dashboardData.classrooms.length > 0) {
				this.classrooms = dashboardData.classrooms;

				console.log(
					'🏠 Loaded classrooms:',
					this.classrooms.map((c) => ({
						id: c.id,
						name: c.name,
						studentCount: c.studentCount,
						assignmentCount: c.assignmentCount
					}))
				);

				// Load assignments for these classrooms
				await this.loadAssignmentsForClassrooms(this.classrooms.map((c) => c.id));
			} else {
				console.warn('⚠️ No classrooms found in dashboard data');
				this.classrooms = [];
			}

			// Set recent activity
			if (dashboardData.recentActivity) {
				this.recentActivity = dashboardData.recentActivity;
				console.log('📈 Recent activity loaded:', dashboardData.recentActivity.length);
			} else {
				console.warn('⚠️ No recent activity found in dashboard data');
				this.recentActivity = [];
			}
		} catch (error) {
			console.error('❌ Failed to load dashboard data:', error);

			// Log additional context for debugging
			console.error('🔍 Debug context:', {
				authUser: auth.user,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			});

			throw error;
		}
	}

	/**
	 * Load assignments for specific classrooms
	 */
	async loadAssignmentsForClassrooms(classroomIds: string[]): Promise<void> {
		try {
			console.log('📝 Loading assignments for classrooms:', classroomIds.length);

			// Load assignments from API
			const allAssignments = await api.listAssignments();

			// Filter assignments for our classrooms (already validated by API)
			const relevantAssignments = allAssignments.filter((assignment) =>
				classroomIds.includes(assignment.classroomId)
			);

			this.assignments = relevantAssignments;

			console.log('✅ Loaded assignments:', relevantAssignments.length);
		} catch (error) {
			console.error('❌ Failed to load assignments:', error);
			// Don't throw - assignments are secondary to classrooms
		}
	}

	/**
	 * Setup real-time listeners for live updates
	 */
	setupRealtimeListeners(): void {
		if (!this.currentUser?.schoolEmail) {
			console.warn('⚠️ Cannot setup real-time listeners without teacher email');
			return;
		}

		console.log('🔊 Setting up real-time listeners...');

		// Listen to classroom changes
		realtimeService.subscribeToClassrooms(this.currentUser.schoolEmail, async (change) => {
			if (change.type === 'added' && change.classroom) {
				// Add new classroom
				this.classrooms = [...this.classrooms, change.classroom];
				
				// Load assignments for the new classroom
				console.log('📝 Loading assignments for new classroom:', change.classroom.id);
				try {
					const newAssignments = await api.listAssignmentsByClassroom(change.classroom.id);
					// Add new assignments that don't already exist
					const existingIds = new Set(this.assignments.map(a => a.id));
					const uniqueNewAssignments = newAssignments.filter(a => !existingIds.has(a.id));
					if (uniqueNewAssignments.length > 0) {
						this.assignments = [...this.assignments, ...uniqueNewAssignments];
						console.log('✅ Added', uniqueNewAssignments.length, 'assignments for classroom', change.classroom.id);
					}
				} catch (error) {
					console.error('❌ Failed to load assignments for new classroom:', error);
				}
				
				// Update assignment listeners with new classroom
				this.updateAssignmentListeners();
			} else if (change.type === 'modified' && change.classroom) {
				// Update existing classroom
				this.classrooms = this.classrooms.map((c) => (c.id === change.id ? change.classroom! : c));
			} else if (change.type === 'removed') {
				// Remove classroom
				this.classrooms = this.classrooms.filter((c) => c.id !== change.id);
				// Remove assignments for this classroom
				this.assignments = this.assignments.filter((a) => a.classroomId !== change.id);
				// Update assignment listeners
				this.updateAssignmentListeners();
			}
		});

		// Set up initial assignment listeners
		this.updateAssignmentListeners();
	}

	/**
	 * Update assignment listeners based on current classrooms
	 */
	private updateAssignmentListeners(): void {
		const classroomIds = this.classrooms.map((c) => c.id);
		
		if (classroomIds.length > 0) {
			console.log('🔄 Updating assignment listeners for classrooms:', classroomIds);
			
			// Unsubscribe from previous assignment listener
			realtimeService.unsubscribe('assignments');
			
			// Subscribe to assignments for all current classrooms
			realtimeService.subscribeToAssignments(classroomIds, (change) => {
				if (change.type === 'added' && change.assignment) {
					// Check if assignment already exists
					const exists = this.assignments.some(a => a.id === change.assignment!.id);
					if (!exists) {
						this.assignments = [...this.assignments, change.assignment];
					}
				} else if (change.type === 'modified' && change.assignment) {
					// Update existing assignment
					this.assignments = this.assignments.map((a) =>
						a.id === change.id ? change.assignment! : a
					);
				} else if (change.type === 'removed') {
					// Remove assignment
					this.assignments = this.assignments.filter((a) => a.id !== change.id);
				}
			});
		} else {
			console.log('⚠️ No classrooms to listen to for assignments');
			realtimeService.unsubscribe('assignments');
		}
	}

	/**
	 * Refresh all data manually
	 */
	refresh = async (): Promise<void> => {
		try {
			this.setLoading(true);
			this.clearError();

			console.log('🔄 Refreshing all data...');

			// Reload dashboard data
			await this.loadDashboardData();

			// Restart listeners with fresh data
			if (this.currentUser?.schoolEmail) {
				realtimeService.unsubscribeAll();
				this.setupRealtimeListeners();
			}

			console.log('✅ Data refreshed successfully');
		} catch (error) {
			console.error('❌ Failed to refresh data:', error);
			this.setError('Failed to refresh data');
		} finally {
			this.setLoading(false);
		}
	};

	/**
	 * Select a classroom
	 */
	selectClassroom(classroomId: string): void {
		const classroom = this.classrooms.find((c) => c.id === classroomId);
		if (classroom) {
			this.selectedClassroomId = classroomId;
			console.log('🏠 Selected classroom:', classroom.name);
		} else {
			console.warn('⚠️ Classroom not found:', classroomId);
		}
	}

	/**
	 * Select an assignment
	 */
	selectAssignment(assignmentId: string): void {
		const assignment = this.assignments.find((a) => a.id === assignmentId);
		if (assignment) {
			this.selectedAssignmentId = assignmentId;
			console.log('📝 Selected assignment:', assignment.title || assignment.name);
		} else {
			console.warn('⚠️ Assignment not found:', assignmentId);
		}
	}

	/**
	 * Clear selections
	 */
	clearSelections(): void {
		this.selectedClassroomId = null;
		this.selectedAssignmentId = null;
	}

	/**
	 * Set loading state
	 */
	setLoading(loading: boolean): void {
		this.loading = loading;
		if (loading) {
			this.error = null;
		}
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
	 * Get display title for assignment (handles both title and name fields)
	 */
	getAssignmentDisplayTitle(assignment: Assignment): string {
		return assignment.title || assignment.name || 'Untitled Assignment';
	}

	/**
	 * Get type label for assignment
	 */
	getAssignmentTypeLabel(assignment: Assignment): string {
		if (assignment.type === 'quiz') return 'Quiz';
		if (assignment.type === 'coding') return 'Coding';
		if (assignment.type === 'written') return 'Written';
		if (assignment.type === 'form') return 'Form';
		return 'Assignment';
	}

	/**
	 * Check if assignment is auto-gradable
	 */
	isAssignmentAutoGradable(assignment: Assignment): boolean {
		return assignment.type === 'quiz' || assignment.type === 'form';
	}

	/**
	 * Clean up when user logs out
	 */
	cleanup(): void {
		console.log('🧼 Cleaning up data store...');

		// Unsubscribe from all listeners
		realtimeService.unsubscribeAll();

		// Clear all data
		this.classrooms = [];
		this.assignments = [];
		this.recentActivity = [];
		this.currentUser = null;
		this.initialized = false;

		// Clear selections
		this.clearSelections();

		// Clear states
		this.loading = false;
		this.error = null;
	}

	/**
	 * Load test data for development
	 */
	loadTestData(): void {
		console.log('🧪 Loading test data...');

		// Create test classrooms using schema-compliant objects
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

		this.classrooms = testClassrooms;

		// Create test assignments using schema-compliant objects
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

		this.initialized = true;
		console.log('✅ Test data loaded');
	}
}

// Export singleton instance
export const dataStore = new DataStore();
