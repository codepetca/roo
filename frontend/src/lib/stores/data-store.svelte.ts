/**
 * Simplified Data Store for Teacher Dashboard
 * Uses simple arrays with Svelte 5 runes - no realtime complexity
 * Location: frontend/src/lib/stores/data-store.svelte.ts
 */

import type {
	Classroom,
	Assignment,
	DashboardUser,
	Submission,
	Grade,
	SubmissionWithGrade,
	StudentEnrollment
} from '@shared/schemas/core';
import { SvelteMap } from 'svelte/reactivity';
import { api } from '$lib/api/endpoints';
import {
	sortAssignments,
	sortStudentProgress,
	type AssignmentSortField,
	type StudentSortField,
	type SortDirection,
	getNextSortDirection,
	getNextAssignmentSortField
} from '$lib/utils/sorting';

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

	// Grade All functionality
	gradingInProgress = $state<boolean>(false);
	gradingProgress = $state<{ current: number; total: number; status: string }>({
		current: 0,
		total: 0,
		status: ''
	});

	// Recent activity
	recentActivity = $state<
		Array<{
			type: 'submission' | 'grade' | 'assignment';
			timestamp: string;
			details: any;
		}>
	>([]);

	// Submission caching for selected assignments
	submissionsCache = $state(new Map<string, SubmissionWithGrade[]>());
	enrollmentCache = $state(new Map<string, StudentEnrollment[]>());
	loadingSubmissions = $state<boolean>(false);
	failedSubmissionRequests = $state<Set<string>>(new Set());

	// Grade grid caching for classroom view
	gradeGridCache = $state(new Map<string, Map<string, Map<string, Grade | null>>>());
	loadingGridData = $state<boolean>(false);

	// Manual grid data state (replacing computed property)
	_gradeGridData = $state<{
		students: Array<{ id: string; name: string; email: string }>;
		assignments: any[];
		grades: Map<string, Map<string, any>>;
	}>({ students: [], assignments: [], grades: new Map() });

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


	// Selected entities state
	selectedClassroomId = $state<string | null>(null);
	selectedAssignmentId = $state<string | null>(null);

	// View mode state
	viewMode = $state<'assignment' | 'grid'>('assignment');

	// Sorting state
	assignmentSortField = $state<AssignmentSortField>('date');
	studentSortField = $state<StudentSortField>('name');
	studentSortDirection = $state<SortDirection>('asc');

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
		const grouped = new SvelteMap<string, Assignment[]>();

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

	// Assignments for the selected classroom - use nested classroom data with sorting
	selectedClassroomAssignments = $derived.by(() => {
		if (!this.selectedClassroomId) {
			console.log('📋 No selectedClassroomId, returning empty array');
			return [];
		}

		// Find the selected classroom and return its nested assignments
		const classroom = this.classrooms.find((c) => c.id === this.selectedClassroomId);
		const assignments = classroom?.assignments || [];

		console.log('📋 selectedClassroomAssignments debug:', {
			selectedClassroomId: this.selectedClassroomId,
			classroom: classroom ? { id: classroom.id, name: classroom.name } : 'not found',
			assignmentsCount: assignments.length,
			sortField: this.assignmentSortField
		});

		// Apply sorting
		return sortAssignments(assignments, this.assignmentSortField, 'asc');
	});

	// Current submissions for selected assignment
	currentSubmissions = $derived(this.submissionsCache.get(this.selectedAssignmentId || '') || []);

	// Loading state for student progress
	loadingStudentProgress = $derived(this.loadingSubmissions);

	// Student progress combining enrollments and submissions
	studentProgress = $derived.by(() => {
		if (!this.selectedAssignmentId || !this.selectedClassroomId) {
			console.log('📊 StudentProgress: No assignment or classroom selected');
			return [];
		}

		const submissions = this.submissionsCache.get(this.selectedAssignmentId) || [];
		const enrollments = this.enrollmentCache.get(this.selectedClassroomId) || [];

		console.log('📊 StudentProgress:', {
			selectedAssignmentId: this.selectedAssignmentId,
			selectedClassroomId: this.selectedClassroomId,
			submissionsCount: submissions.length,
			enrollmentsCount: enrollments.length,
			loadingSubmissions: this.loadingSubmissions
		});

		// If no enrollments and not loading, return empty (nothing to display)
		if (enrollments.length === 0 && !this.loadingSubmissions) {
			console.log('📊 StudentProgress: No enrollments found');
			return [];
		}

		const studentMap = new Map();

		// Start with ALL enrolled students
		enrollments.forEach((enrollment) => {
			studentMap.set(enrollment.studentId, {
				studentId: enrollment.studentId,
				studentName: enrollment.name,
				studentEmail: enrollment.email,
				submission: null,
				submittedAt: null,
				status: 'not_submitted' as const,
				score: undefined,
				maxScore: this.selectedAssignment?.maxScore,
				percentage: undefined,
				feedback: undefined
			});
		});

		// Overlay submission data where it exists
		submissions.forEach((sub) => {
			if (studentMap.has(sub.studentId)) {
				const existing = studentMap.get(sub.studentId);
				studentMap.set(sub.studentId, {
					...existing,
					submission: sub,
					submittedAt: sub.submittedAt,
					status: sub.status || 'submitted',
					score: sub.grade?.score,
					maxScore: sub.grade?.maxScore || this.selectedAssignment?.maxScore,
					percentage: sub.grade?.percentage,
					feedback: sub.grade?.feedback
				});
			}
		});

		const result = Array.from(studentMap.values());
		console.log('📊 StudentProgress result before sorting:', {
			total: result.length,
			withSubmissions: result.filter((s) => s.status !== 'not_submitted').length,
			withoutSubmissions: result.filter((s) => s.status === 'not_submitted').length
		});

		// Apply sorting
		const sortedResult = sortStudentProgress(
			result,
			this.studentSortField,
			this.studentSortDirection
		);
		console.log('📊 StudentProgress sorted by:', this.studentSortField, this.studentSortDirection);
		return sortedResult;
	});

	// Getter for grid data (replaces computed property)
	get gradeGridData() {
		return this._gradeGridData;
	}

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
	 * Set view mode
	 */
	setViewMode(mode: 'assignment' | 'grid'): void {
		this.viewMode = mode;
		console.log('👁️ View mode changed to:', mode);

		// Store preference in localStorage
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('teacherDashboardViewMode', mode);
		}
	}

	/**
	 * Fetch submissions for a specific assignment
	 */
	async fetchSubmissionsForAssignment(assignmentId: string): Promise<void> {
		// Skip if already cached
		if (this.submissionsCache.has(assignmentId)) {
			console.log('📡 Submissions already cached for:', assignmentId);
			return;
		}

		// Check if this request has already failed
		if (this.failedSubmissionRequests.has(assignmentId)) {
			console.log('⚠️ Skipping submission fetch for assignment that already failed:', assignmentId);
			return;
		}

		console.log('📡 Fetching submissions for assignment:', assignmentId);
		this.loadingSubmissions = true;
		this.error = null; // Clear any previous errors

		try {
			const response = await api.getSubmissionsByAssignment(assignmentId);

			// Cache the submissions (maintain backward compatibility)
			const newCache = new Map(this.submissionsCache);
			newCache.set(assignmentId, response.submissions);
			this.submissionsCache = newCache;

			// Cache enrollment data for this assignment's classroom
			const newEnrollmentCache = new Map(this.enrollmentCache);
			newEnrollmentCache.set(response.classroomId, response.enrollments);
			this.enrollmentCache = newEnrollmentCache;

			console.log('✅ Submissions and enrollments loaded:', {
				assignmentId,
				classroomId: response.classroomId,
				submissionsCount: response.submissions.length,
				enrollmentsCount: response.enrollments.length,
				submissionRate: response.stats.submissionRate,
				cacheSize: this.submissionsCache.size
			});
		} catch (error) {
			console.error('❌ Failed to fetch submissions:', error);
			// Add to failed requests to prevent infinite retries
			const newFailedSet = new Set(this.failedSubmissionRequests);
			newFailedSet.add(assignmentId);
			this.failedSubmissionRequests = newFailedSet;
			this.setError('Failed to load submissions');
		} finally {
			this.loadingSubmissions = false;
		}
	}

	/**
	 * Fetch all submissions for all assignments in a classroom (for grid view)
	 */
	async fetchAllSubmissionsForClassroom(classroomId: string): Promise<void> {
		const classroom = this.classrooms.find((c) => c.id === classroomId);

		// Get assignments directly from classroom data or from the general assignment list
		let assignments = [];
		if (classroom && 'assignments' in classroom && Array.isArray(classroom.assignments)) {
			assignments = classroom.assignments;
		} else {
			// Fallback to filtering from the general assignments array
			assignments = this.assignments.filter((a) => a.classroomId === classroomId);
		}

		console.log('📋 Debug fetchAllSubmissionsForClassroom:', {
			classroomId,
			classroom: classroom ? { id: classroom.id, name: classroom.name } : 'not found',
			assignmentsFromClassroom:
				classroom && 'assignments' in classroom ? classroom.assignments?.length : 'none',
			assignmentsFromFilter: this.assignments.filter((a) => a.classroomId === classroomId).length,
			assignmentsCount: assignments.length,
			selectedClassroomAssignments: this.selectedClassroomAssignments.length
		});

		if (!classroom) {
			console.log('📋 No classroom found for grid data:', classroomId);
			this.loadingGridData = false;
			return;
		}

		if (assignments.length === 0) {
			console.log('📋 No assignments found for classroom grid data');
			this.loadingGridData = false;
			return;
		}

		console.log('📋 Fetching all submissions for classroom grid view:', {
			classroomId,
			assignmentsCount: assignments.length
		});

		this.loadingGridData = true;
		this.error = null;

		try {
			// Fetch submissions for all assignments in parallel
			const fetchPromises = assignments.map(async (assignment) => {
				// Skip if already cached
				if (!this.submissionsCache.has(assignment.id)) {
					console.log(
						'📡 Fetching submissions for assignment:',
						assignment.id,
						assignment.title || assignment.name
					);
					const response = await api.getSubmissionsByAssignment(assignment.id);
					return { assignmentId: assignment.id, submissions: response.submissions };
				}
				console.log('📡 Using cached submissions for assignment:', assignment.id);
				return {
					assignmentId: assignment.id,
					submissions: this.submissionsCache.get(assignment.id)!
				};
			});

			const results = await Promise.all(fetchPromises);

			// Update cache with new data
			const newCache = new Map(this.submissionsCache);
			results.forEach(({ assignmentId, submissions }) => {
				newCache.set(assignmentId, submissions);
			});
			this.submissionsCache = newCache;

			console.log('✅ All submissions loaded for classroom grid:', {
				classroomId,
				totalCacheSize: this.submissionsCache.size,
				totalSubmissions: results.reduce((sum, r) => sum + r.submissions.length, 0)
			});

			// Update grid data after loading submissions
			console.log('🔄 Updating grid data after submissions loaded...');
			this.updateGridData();
		} catch (error) {
			console.error('❌ Failed to fetch classroom submissions:', error);
			this.setError('Failed to load grade grid data');
		} finally {
			this.loadingGridData = false;
		}
	}

	/**
	 * Update grid data based on current classroom and submissions
	 */
	updateGridData(): void {
		console.log('📋 Updating grid data:', {
			selectedClassroomId: this.selectedClassroomId,
			viewMode: this.viewMode,
			shouldUpdate: this.selectedClassroomId && this.viewMode === 'grid',
			assignmentsTotal: this.assignments.length,
			cacheSize: this.submissionsCache.size
		});

		// Only update grid data if we have a selected classroom and are in grid mode
		if (!this.selectedClassroomId) {
			console.log('📋 GridData: Not updating - no classroom selected');
			this._gradeGridData = { students: [], assignments: [], grades: new Map() };
			return;
		}

		// Get assignments for the selected classroom
		const assignments = this.assignments.filter((a) => a.classroomId === this.selectedClassroomId);

		console.log('📋 GridData: Assignments for classroom:', {
			classroomId: this.selectedClassroomId,
			totalAssignments: this.assignments.length,
			filteredAssignments: assignments.length,
			firstAssignment: assignments[0]
				? { id: assignments[0].id, title: assignments[0].title }
				: 'none'
		});

		if (assignments.length === 0) {
			console.log('📋 GridData: No assignments found for classroom');
			this._gradeGridData = { students: [], assignments: [], grades: new Map() };
			return;
		}

		// Extract students and build grade matrix from cached submissions
		const studentMap = new Map();
		const gradeMatrix = new Map();

		assignments.forEach((assignment) => {
			const submissions = this.submissionsCache.get(assignment.id) || [];
			console.log(
				`📋 GridData: Processing assignment ${assignment.id}, submissions: ${submissions.length}`
			);

			submissions.forEach((sub) => {
				// Add student if not already added
				if (!studentMap.has(sub.studentId)) {
					studentMap.set(sub.studentId, {
						id: sub.studentId,
						name: sub.studentName,
						email: sub.studentEmail
					});
				}

				// Add grade to matrix
				if (!gradeMatrix.has(sub.studentId)) {
					gradeMatrix.set(sub.studentId, new Map());
				}
				gradeMatrix.get(sub.studentId)!.set(assignment.id, sub.grade || null);
			});
		});

		// Sort students using the existing sorting logic
		const unsortedStudents = Array.from(studentMap.values());
		const studentsForSorting = unsortedStudents.map((student) => ({
			studentId: student.id,
			studentName: student.name,
			studentEmail: student.email,
			status: 'unknown' // Default status for grid sorting
		}));

		const sortedStudentData = sortStudentProgress(
			studentsForSorting,
			this.studentSortField,
			this.studentSortDirection
		);
		const sortedStudents = sortedStudentData.map(
			(studentData) => unsortedStudents.find((s) => s.id === studentData.studentId)!
		);

		const result = {
			students: sortedStudents,
			assignments: assignments,
			grades: gradeMatrix
		};

		console.log('📋 GridData update result:', {
			studentsCount: result.students.length,
			assignmentsCount: result.assignments.length,
			gradeMatrixSize: result.grades.size,
			firstStudent: result.students[0]
				? { id: result.students[0].id, name: result.students[0].name }
				: 'none'
		});

		this._gradeGridData = result;
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
	 * Initialize view mode from localStorage
	 */
	initializeViewMode(): void {
		if (typeof localStorage !== 'undefined') {
			const savedViewMode = localStorage.getItem('teacherDashboardViewMode');
			if (savedViewMode === 'grid' || savedViewMode === 'assignment') {
				this.viewMode = savedViewMode;
				console.log('📁 Loaded view mode from localStorage:', savedViewMode);
			}
		}
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
		// Google forms and assignments with auto-grade classification can be auto-graded
		return assignment.classification?.platform === 'google_form' || assignment.classification?.gradingApproach === 'auto_grade';
	}

	/**
	 * Toggle assignment sort field (date ↔ title)
	 */
	toggleAssignmentSort(): void {
		this.assignmentSortField = getNextAssignmentSortField(this.assignmentSortField);
		console.log('🔄 Assignment sort toggled to:', this.assignmentSortField);
	}

	/**
	 * Set student sort field and direction
	 */
	setStudentSort(field: StudentSortField, direction?: SortDirection): void {
		this.studentSortField = field;

		if (field === 'name') {
			// Name sorting is always ascending
			this.studentSortDirection = 'asc';
		} else if (direction !== undefined) {
			this.studentSortDirection = direction;
		} else {
			// Toggle direction for other fields
			this.studentSortDirection = getNextSortDirection(this.studentSortDirection);
		}

		console.log('🔄 Student sort set to:', this.studentSortField, this.studentSortDirection);
	}

	/**
	 * Toggle student sort direction (for sortable fields)
	 */
	toggleStudentSort(field: StudentSortField): void {
		if (this.studentSortField === field && field !== 'name') {
			// Same field, toggle direction (except for name which is always ascending)
			this.studentSortDirection = getNextSortDirection(this.studentSortDirection);
		} else {
			// Different field, set it with appropriate initial direction
			this.setStudentSort(field);
		}

		// Update grid data to reflect new sorting
		if (this.viewMode === 'grid' && this.selectedClassroomId) {
			this.updateGridData();
		}
	}

	/**
	 * Grade all ungraded submissions for a specific assignment
	 */
	async gradeAllAssignments(assignmentId: string) {
		if (this.gradingInProgress) {
			console.warn('Grading already in progress');
			return;
		}

		console.log('🤖 Starting Grade All for assignment:', assignmentId);
		this.gradingInProgress = true;
		this.gradingProgress = { current: 0, total: 0, status: 'Initializing...' };

		try {
			// Call the API endpoint
			const result = await api.gradeAllAssignments({ assignmentId });

			// Update progress with final results
			const statusMessage =
				result.failedCount > 0
					? `Completed: ${result.gradedCount}/${result.totalSubmissions} graded successfully (${result.failedCount} failed)`
					: `Completed: ${result.gradedCount}/${result.totalSubmissions} graded successfully`;

			this.gradingProgress = {
				current: result.gradedCount,
				total: result.totalSubmissions,
				status: statusMessage
			};

			// Update the cached submissions with the new grades for reactivity
			if (result.results && result.results.length > 0) {
				const currentSubmissions = this.submissionsCache.get(assignmentId) || [];

				// Create a map of grades by submissionId for quick lookup
				const gradesMap = new Map(
					result.results.map((r) => [
						r.submissionId,
						{
							id: r.gradeId,
							score: r.score,
							maxScore: r.maxScore,
							feedback: r.feedback,
							percentage: Math.round((r.score / r.maxScore) * 100),
							gradedAt: new Date(),
							gradedBy: 'ai'
						}
					])
				);

				// Update each submission with its grade
				const updatedSubmissions = currentSubmissions.map((sub) => {
					const grade = gradesMap.get(sub.id);
					if (grade) {
						return {
							...sub,
							grade,
							status: 'graded' as const
						};
					}
					return sub;
				});

				// Update the cache - this triggers reactivity!
				const newCache = new Map(this.submissionsCache);
				newCache.set(assignmentId, updatedSubmissions);
				this.submissionsCache = newCache;

				console.log('📊 Updated submissions cache with grades:', {
					assignmentId,
					totalSubmissions: updatedSubmissions.length,
					gradedCount: updatedSubmissions.filter((s) => s.status === 'graded').length
				});
			}

			console.log('✅ Grade All completed:', result);

			// Handle partial failures
			if (result.failedCount > 0 && result.failures) {
				console.warn(`⚠️ Some grades failed:`, result.failures);
				this.error = `Successfully graded ${result.gradedCount} submissions, but ${result.failedCount} failed. Check console for details.`;
			} else {
				this.error = null;
			}
		} catch (error) {
			console.error('❌ Grade All failed:', error);
			this.error = error instanceof Error ? error.message : 'Failed to grade assignments';
			this.gradingProgress = { current: 0, total: 0, status: 'Failed' };
		} finally {
			this.gradingInProgress = false;
			// Clear progress after a delay to let users see the final status
			setTimeout(() => {
				this.gradingProgress = { current: 0, total: 0, status: '' };
			}, 3000);
		}
	}

	/**
	 * Retry failed grading for specific submissions
	 */
	async retryFailedGrades(assignmentId: string, submissionIds: string[]) {
		if (this.gradingInProgress) {
			console.warn('Grading already in progress');
			return;
		}

		console.log('🔄 Retrying failed grades for submissions:', submissionIds);
		this.gradingInProgress = true;
		this.gradingProgress = {
			current: 0,
			total: submissionIds.length,
			status: 'Retrying failed grades...'
		};

		try {
			// For now, retry by calling the same endpoint but this could be optimized
			// to only retry specific submissions
			const result = await api.gradeAllAssignments({ assignmentId });

			this.gradingProgress = {
				current: result.gradedCount,
				total: result.totalSubmissions,
				status: `Retry completed: ${result.gradedCount} graded, ${result.failedCount} still failed`
			};

			// Update the cached submissions with the new grades for reactivity
			if (result.results && result.results.length > 0) {
				const currentSubmissions = this.submissionsCache.get(assignmentId) || [];

				// Create a map of grades by submissionId for quick lookup
				const gradesMap = new Map(
					result.results.map((r) => [
						r.submissionId,
						{
							id: r.gradeId,
							score: r.score,
							maxScore: r.maxScore,
							feedback: r.feedback,
							percentage: Math.round((r.score / r.maxScore) * 100),
							gradedAt: new Date(),
							gradedBy: 'ai'
						}
					])
				);

				// Update each submission with its grade
				const updatedSubmissions = currentSubmissions.map((sub) => {
					const grade = gradesMap.get(sub.id);
					if (grade) {
						return {
							...sub,
							grade,
							status: 'graded' as const
						};
					}
					return sub;
				});

				// Update the cache - this triggers reactivity!
				const newCache = new Map(this.submissionsCache);
				newCache.set(assignmentId, updatedSubmissions);
				this.submissionsCache = newCache;
			}

			if (result.failedCount > 0) {
				this.error = `Retry completed, but ${result.failedCount} submissions still failed.`;
			} else {
				this.error = null;
			}
		} catch (error) {
			console.error('❌ Retry failed:', error);
			this.error = error instanceof Error ? error.message : 'Retry operation failed';
			this.gradingProgress = { current: 0, total: submissionIds.length, status: 'Retry failed' };
		} finally {
			this.gradingInProgress = false;
			setTimeout(() => {
				this.gradingProgress = { current: 0, total: 0, status: '' };
			}, 3000);
		}
	}

	/**
	 * Refresh all data (deprecated - using reactive updates instead)
	 */
	private async refreshData() {
		// No longer needed - we update the cache directly for reactivity
		console.log('refreshData called but using reactive updates instead');
	}

	/**
	 * Clear all cached data and failed requests
	 */
	clearCache() {
		this.submissionsCache.clear();
		this.gradeGridCache.clear();
		this.failedSubmissionRequests.clear();
		console.log('🧹 All caches cleared');
	}

	/**
	 * Clear failed request tracking for a specific assignment
	 */
	clearFailedRequest(assignmentId: string) {
		const newFailedSet = new Set(this.failedSubmissionRequests);
		newFailedSet.delete(assignmentId);
		this.failedSubmissionRequests = newFailedSet;
		console.log('🔄 Cleared failed request for assignment:', assignmentId);
	}
}

// Export singleton instance
export const dataStore = new DataStore();
