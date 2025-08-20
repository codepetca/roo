<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores';
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { api } from '$lib/api';
	import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
	import ClassroomSelector from '$lib/components/dashboard/ClassroomSelector.svelte';
	import BaseAssignmentSidebar from '$lib/components/dashboard/BaseAssignmentSidebar.svelte';
	import StudentAssignmentDetail from '$lib/components/dashboard/StudentAssignmentDetail.svelte';
	import StatsGrid from '$lib/components/core/StatsGrid.svelte';
	import { PageHeader } from '$lib/components/dashboard';
	import { Alert, Button } from '$lib/components/ui';
	import type { Assignment, Grade, Classroom, StudentDashboard } from '@shared/schemas/core';

	// State using Svelte 5 runes
	let dashboardData = $state<StudentDashboard | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let viewMode = $state<'assignment' | 'grid'>('assignment');
	let selectedClassroomId = $state<string | null>(null);
	let selectedAssignmentId = $state<string | null>(null);

	// Derived state
	let selectedClassroom = $derived(
		dashboardData?.classrooms.find(c => c.classroom.id === selectedClassroomId)?.classroom
	);
	let selectedClassroomData = $derived(
		dashboardData?.classrooms.find(c => c.classroom.id === selectedClassroomId)
	);
	let assignments = $derived(selectedClassroomData?.assignments || []);
	let myGrades = $derived(selectedClassroomData?.grades || []);
	let selectedAssignment = $derived(
		assignments.find(a => a.id === selectedAssignmentId)
	);
	let selectedAssignmentGrade = $derived(
		myGrades.find(g => g.assignmentId === selectedAssignmentId)
	);

	// Student-specific derived statistics  
	let totalGrades = $derived(dashboardData?.overallStats.completedAssignments || 0);
	let averageScore = $derived(Math.round(dashboardData?.overallStats.averageGrade || 0));
	let completedAssignments = $derived(dashboardData?.overallStats.completedAssignments || 0);
	let totalAssignments = $derived(dashboardData?.overallStats.totalAssignments || 0);

	// Transform stats for StatsGrid component
	let statsData = $derived(() => [
		{
			title: 'Average Grade',
			value: `${averageScore}%`,
			icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
			color:
				averageScore >= 90
					? 'bg-green-500'
					: averageScore >= 80
						? 'bg-blue-500'
						: averageScore >= 70
							? 'bg-yellow-500'
							: 'bg-red-500'
		},
		{
			title: 'Total Grades',
			value: totalGrades,
			icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
			color: 'bg-purple-500'
		},
		{
			title: 'Completed',
			value: `${completedAssignments}/${totalAssignments}`,
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'bg-green-500'
		},
		{
			title: 'Pending',
			value: Math.max(0, totalAssignments - completedAssignments),
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'bg-orange-500'
		}
	]);

	// Recent grades for display
	let recentGrades = $derived(myGrades.slice(0, 5));

	function getLetterGrade(percentage: number): string {
		if (percentage >= 97) return 'A+';
		if (percentage >= 93) return 'A';
		if (percentage >= 90) return 'A-';
		if (percentage >= 87) return 'B+';
		if (percentage >= 83) return 'B';
		if (percentage >= 80) return 'B-';
		if (percentage >= 77) return 'C+';
		if (percentage >= 73) return 'C';
		if (percentage >= 70) return 'C-';
		if (percentage >= 67) return 'D+';
		if (percentage >= 63) return 'D';
		if (percentage >= 60) return 'D-';
		return 'F';
	}

	// Simple student data store integration
	function selectClassroom(classroomId: string) {
		selectedClassroomId = classroomId;
		selectedAssignmentId = null; // Clear assignment selection when changing classrooms
		// Update the main data store for ClassroomSelector compatibility
		if (dashboardData) {
			dataStore.setData({
				classrooms: dashboardData.classrooms.map(c => c.classroom),
				assignments: selectedClassroomData?.assignments || []
			});
			dataStore.selectClassroom(classroomId);
		}
	}

	function selectAssignment(assignmentId: string) {
		selectedAssignmentId = assignmentId;
		// Update the main data store for consistency
		dataStore.selectAssignment(assignmentId);
	}

	function toggleSort() {
		dataStore.toggleAssignmentSort();
	}

	function setViewMode(mode: 'assignment' | 'grid') {
		viewMode = mode;
		// Update the main data store so ClassroomSelector can reflect the change
		if (dataStore.setViewMode) {
			dataStore.setViewMode(mode);
		}
	}

	// Sync view mode changes from ClassroomSelector back to local state
	$effect(() => {
		const storeViewMode = dataStore.viewMode;
		if (storeViewMode && storeViewMode !== viewMode) {
			viewMode = storeViewMode;
		}
	});

	async function loadStudentDashboardData() {
		try {
			loading = true;
			error = null;

			console.log('🔍 Loading student dashboard data...');

			dashboardData = await api.getStudentDashboard();
			console.log('✅ Loaded student dashboard data:', dashboardData);

			// Initialize the main data store with student data for shared component compatibility
			if (dashboardData.classrooms.length > 0) {
				dataStore.setData({
					classrooms: dashboardData.classrooms.map(c => c.classroom),
					assignments: [],
					user: {
						id: auth.user?.uid || '',
						email: auth.user?.email || '',
						displayName: auth.user?.displayName || auth.user?.email || '',
						role: 'student' as const,
						classroomIds: dashboardData.classrooms.map(c => c.classroom.id),
						totalStudents: 0,
						totalClassrooms: dashboardData.classrooms.length
					}
				});

				// Auto-select first classroom if none selected
				if (!selectedClassroomId) {
					selectClassroom(dashboardData.classrooms[0].classroom.id);
				}
			}

		} catch (err: unknown) {
			console.error('❌ Failed to load student dashboard data:', err);
			error = (err as Error)?.message || 'Failed to load dashboard data';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStudentDashboardData();
	});

	// Auto-select first assignment when classroom changes
	$effect(() => {
		if (assignments.length > 0 && !selectedAssignmentId) {
			selectedAssignmentId = assignments[0].id;
		}
	});

	// Sync classroom selection from dataStore back to local state
	$effect(() => {
		const storeSelectedClassroomId = dataStore.selectedClassroomId;
		if (storeSelectedClassroomId && storeSelectedClassroomId !== selectedClassroomId) {
			selectedClassroomId = storeSelectedClassroomId;
			selectedAssignmentId = null; // Reset assignment selection
		}
	});

	// Sync assignment selection from dataStore back to local state  
	$effect(() => {
		const storeSelectedAssignmentId = dataStore.selectedAssignmentId;
		if (storeSelectedAssignmentId && storeSelectedAssignmentId !== selectedAssignmentId) {
			selectedAssignmentId = storeSelectedAssignmentId;
		}
	});
</script>

<DashboardLayout {viewMode} {error}>
	{#snippet topComponent()}
		{#if dashboardData}
			<ClassroomSelector role="student" />
		{/if}
	{/snippet}

	{#snippet sidebarComponent()}
		{#if viewMode === 'assignment' && selectedClassroom}
			<BaseAssignmentSidebar
				{assignments}
				{selectedAssignmentId}
				onSelect={selectAssignment}
				sortField="date"
				onSortToggle={toggleSort}
				{loading}
				role="student"
			>
				{#snippet customAssignmentContent(assignment)}
					{@const hasGrade = myGrades.some(g => g.assignmentId === assignment.id)}
					{#if hasGrade}
						<span class="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
							✓ Graded
						</span>
					{:else}
						<span class="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800">
							Pending
						</span>
					{/if}
				{/snippet}
			</BaseAssignmentSidebar>
		{/if}
	{/snippet}

	{#snippet mainComponent()}
		{#if viewMode === 'grid'}
			<!-- Student Grades Grid View -->
			<div class="flex-1 overflow-auto p-6">
				<h2 class="text-lg font-semibold mb-4">All My Grades</h2>
				{#if !loading && dashboardData}
					<StatsGrid stats={statsData} />
				{/if}
			</div>
		{:else if selectedAssignment}
			<!-- Assignment Detail View -->
			<StudentAssignmentDetail
				assignment={selectedAssignment}
				grade={selectedAssignmentGrade}
				{loading}
			>
				{#snippet actions()}
					<div class="flex gap-2">
						<Button variant="outline" onclick={loadStudentDashboardData} disabled={loading}>
							{#snippet children()}
								{#if loading}
									<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Refreshing...
								{:else}
									<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
									Refresh
								{/if}
							{/snippet}
						</Button>
					</div>
				{/snippet}
			</StudentAssignmentDetail>
		{:else}
			<!-- Overview when no assignment selected -->
			<div class="flex-1 overflow-auto p-6">
				<PageHeader
					title="Student Dashboard"
					description="Welcome back, {auth.user?.email?.split('@')[0] || 'Student'}! Select a classroom and assignment to view detailed feedback."
				/>

				{#if error}
					<Alert variant="error" title="Error loading dashboard" dismissible onDismiss={() => (error = null)}>
						{#snippet children()}
							{error}
							<div class="mt-3">
								<Button variant="secondary" size="sm" onclick={loadStudentDashboardData}>
									{#snippet children()}
										Try Again
									{/snippet}
								</Button>
							</div>
						{/snippet}
					</Alert>
				{:else if loading}
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
						{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
							<div class="animate-pulse rounded-lg bg-white p-6 shadow-sm">
								<div class="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
								<div class="h-8 w-1/2 rounded bg-gray-200"></div>
							</div>
						{/each}
					</div>
				{:else if dashboardData}
					<StatsGrid stats={statsData} />
				{/if}
			</div>
		{/if}
	{/snippet}
</DashboardLayout>
