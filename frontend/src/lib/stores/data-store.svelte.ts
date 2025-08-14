/**
 * Model-Based Data Store with Real-time Updates
 * Single source of truth using validated models and collections
 * Location: frontend/src/lib/stores/data-store.svelte.ts
 */

import { api } from '$lib/api';
import { auth } from '$lib/stores/auth.svelte';
import { realtimeService } from '$lib/services/firestore-realtime';
import { ClassroomCollection } from '$lib/models/classroom.collection';
import { AssignmentCollection } from '$lib/models/assignment.collection';
import { ClassroomModel } from '$lib/models/classroom.model';
import { AssignmentModel } from '$lib/models/assignment.model';
import type { TeacherDashboard, DashboardUser } from '@shared/schemas/core';

/**
 * Enhanced data store with model-based collections and real-time sync
 */
class DataStore {
	// Model collections
	classrooms = new ClassroomCollection();
	assignments = new AssignmentCollection();

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
		totalClassrooms: this.classrooms.count,
		totalStudents: this.classrooms.totalStudents,
		totalAssignments: this.classrooms.totalAssignments,
		ungradedSubmissions: this.classrooms.totalUngradedSubmissions,
		averageGrade: 0 // TODO: Calculate from grades collection
	});

	// Computed state
	hasData = $derived(this.classrooms.count > 0 || this.assignments.count > 0);

	// Selected entities state
	selectedClassroomId = $state<string | null>(null);
	selectedAssignmentId = $state<string | null>(null);

	selectedClassroom = $derived(
		this.selectedClassroomId ? this.classrooms.get(this.selectedClassroomId) : null
	);

	selectedAssignment = $derived(
		this.selectedAssignmentId ? this.assignments.get(this.selectedAssignmentId) : null
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

			// Populate classroom collection with models
			if (dashboardData.classrooms && dashboardData.classrooms.length > 0) {
				const classroomModels = dashboardData.classrooms.map((classroom) =>
					ClassroomModel.fromFirestore(classroom)
				);
				this.classrooms.setAll(classroomModels);

				console.log(
					'🏠 Loaded classrooms:',
					classroomModels.map((c) => ({
						id: c.id,
						name: c.displayName,
						studentCount: c.studentCount,
						assignmentCount: c.assignmentCount
					}))
				);

				// Load assignments for these classrooms
				await this.loadAssignmentsForClassrooms(classroomModels.map((c) => c.id));
			} else {
				console.warn('⚠️ No classrooms found in dashboard data');
				this.classrooms.clear();
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

			// Filter assignments for our classrooms and create models
			const relevantAssignments = allAssignments
				.filter((assignment) => classroomIds.includes(assignment.classroomId))
				.map((assignment) => AssignmentModel.fromFirestore(assignment));

			this.assignments.setAll(relevantAssignments);

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
		realtimeService.subscribeToClassrooms(this.currentUser.schoolEmail, this.classrooms);

		// Listen to assignment changes for active classrooms
		const classroomIds = this.classrooms.ids;
		if (classroomIds.length > 0) {
			realtimeService.subscribeToAssignments(classroomIds, this.assignments);
		}
	}

	/**
	 * Refresh all data manually
	 */
	async refresh(): Promise<void> {
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
	}

	/**
	 * Select a classroom
	 */
	selectClassroom(classroomId: string): void {
		const classroom = this.classrooms.get(classroomId);
		if (classroom) {
			this.selectedClassroomId = classroomId;
			console.log('🏠 Selected classroom:', classroom.displayName);
		} else {
			console.warn('⚠️ Classroom not found:', classroomId);
		}
	}

	/**
	 * Select an assignment
	 */
	selectAssignment(assignmentId: string): void {
		const assignment = this.assignments.get(assignmentId);
		if (assignment) {
			this.selectedAssignmentId = assignmentId;
			console.log('📝 Selected assignment:', assignment.displayTitle);
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
	 * Clean up when user logs out
	 */
	cleanup(): void {
		console.log('🧼 Cleaning up data store...');

		// Unsubscribe from all listeners
		realtimeService.unsubscribeAll();

		// Clear all data
		this.classrooms.clear();
		this.assignments.clear();
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

		// Create test classrooms
		const testClassrooms = [
			ClassroomModel.fromFirestore({
				id: 'test-classroom-1',
				teacherId: 'test@teacher.com',
				name: 'Computer Science Period 1',
				section: '01',
				studentCount: 25,
				assignmentCount: 8,
				activeSubmissions: 18,
				ungradedSubmissions: 5,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}),
			ClassroomModel.fromFirestore({
				id: 'test-classroom-2',
				teacherId: 'test@teacher.com',
				name: 'Computer Science Period 2',
				section: '02',
				studentCount: 20,
				assignmentCount: 6,
				activeSubmissions: 12,
				ungradedSubmissions: 3,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
		];

		this.classrooms.setAll(testClassrooms);

		// Create test assignments
		const testAssignments = [
			AssignmentModel.fromFirestore({
				id: 'test-assignment-1',
				classroomId: 'test-classroom-1',
				title: 'Karel the Dog - Basic Commands',
				description: 'Introduction to programming with Karel',
				maxPoints: 100,
				isQuiz: false,
				submissionCount: 20,
				gradedCount: 15,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}),
			AssignmentModel.fromFirestore({
				id: 'test-assignment-2',
				classroomId: 'test-classroom-1',
				title: 'Programming Quiz #1',
				description: 'Basic programming concepts',
				maxPoints: 50,
				isQuiz: true,
				submissionCount: 22,
				gradedCount: 22,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
		];

		this.assignments.setAll(testAssignments);

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
