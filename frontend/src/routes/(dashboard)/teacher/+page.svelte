<script lang="ts">
	import { onMount } from 'svelte';
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { api } from '$lib/api';
	import type { PageData } from './$types';
	import ClassroomSelector from '$lib/components/dashboard/ClassroomSelector.svelte';
	import AssignmentSidebar from '$lib/components/dashboard/AssignmentSidebar.svelte';
	import StudentProgressGrid from '$lib/components/dashboard/StudentProgressGrid.svelte';
	import StudentGradeGrid from '$lib/components/dashboard/StudentGradeGrid.svelte';

	let { data }: { data: PageData } = $props();

	// Set data in store when component mounts
	onMount(async () => {
		console.log('📦 Dashboard page mounted, setting data from load functions...');

		// Initialize view mode from localStorage
		dataStore.initializeViewMode();

		// Log load function data for debugging
		console.log('📦 Load Function Data:', {
			user: data.user.email,
			classroomsFromLoad: data.classrooms?.length || 0,
			assignmentsFromLoad: data.assignments?.length || 0,
			hasLoadError: data.error || 'None'
		});

		// Set the assignments data from load functions (already loaded server-side)
		dataStore.setData({
			assignments: data.assignments,
			user: data.user
		});

		// Load dashboard data client-side (requires authentication)
		try {
			console.log('📡 Loading dashboard data client-side with authentication...');
			dataStore.setLoading(true);

			const dashboardData = await api.getTeacherDashboard();
			console.log('✅ Dashboard data loaded client-side:', dashboardData);

			// Extract all assignments into flat array for compatibility
			const allAssignments = (dashboardData.classrooms || []).flatMap(
				(classroom) => classroom.assignments || []
			);
			console.log('📝 Extracted assignments from classrooms:', allAssignments.length);

			// Update store with dashboard data
			dataStore.setData({
				classrooms: dashboardData.classrooms || [],
				assignments: allAssignments, // Flat array for backward compatibility
				recentActivity: dashboardData.recentActivity || [],
				user: {
					...data.user,
					...dashboardData.teacher // Update with real user data
				}
			});

			// Auto-select first classroom if none is selected
			if (dashboardData.classrooms?.length > 0 && !dataStore.selectedClassroomId) {
				console.log('🏠 Auto-selecting first classroom:', dashboardData.classrooms[0].name);
				dataStore.selectClassroom(dashboardData.classrooms[0].id);
			}
		} catch (error) {
			console.error('❌ Failed to load dashboard data client-side:', error);
			dataStore.setError('Failed to load dashboard data');
		} finally {
			dataStore.setLoading(false);
		}
	});

	// Reactive state from data store
	// loading is used by child components that receive it via context or props
	let loading = $derived(dataStore.loading); // eslint-disable-line @typescript-eslint/no-unused-vars
	let error = $derived(dataStore.error || (data.error ? data.error : null));
	let viewMode = $derived(dataStore.viewMode);

	// Reactive effect to auto-fetch submissions when assignment is selected
	$effect(() => {
		const assignmentId = dataStore.selectedAssignmentId;
		const classroomId = dataStore.selectedClassroomId;

		console.log('🔄 Effect triggered for submission fetching:', {
			assignmentId,
			classroomId,
			hasCache: assignmentId ? dataStore.submissionsCache.has(assignmentId) : false,
			cacheSize: dataStore.submissionsCache.size,
			loadingSubmissions: dataStore.loadingSubmissions
		});

		if (assignmentId && classroomId && !dataStore.submissionsCache.has(assignmentId) && !dataStore.loadingSubmissions && !dataStore.failedSubmissionRequests.has(assignmentId)) {
			console.log('🔄 Assignment selected, fetching submissions:', assignmentId);
			dataStore.fetchSubmissionsForAssignment(assignmentId);
		} else if (assignmentId && dataStore.submissionsCache.has(assignmentId)) {
			console.log('✅ Submissions already cached for assignment:', assignmentId);
		} else if (assignmentId && dataStore.failedSubmissionRequests.has(assignmentId)) {
			console.log('⚠️ Assignment has failed requests, skipping fetch:', assignmentId);
		}
	});
</script>

<!-- Dynamic layout structure based on view mode -->
<div class="flex h-full flex-col">
	<!-- Top: Classroom Selector (always visible) -->
	<ClassroomSelector />

	<!-- Main Content Area - Different layouts based on view mode -->
	{#if viewMode === 'grid'}
		<!-- Two-panel layout for Grade Grid View -->
		<div class="flex-1 overflow-hidden">
			<StudentGradeGrid />
		</div>
	{:else}
		<!-- Three-panel layout for Assignment View -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Left: Assignment Sidebar -->
			<AssignmentSidebar />

			<!-- Right: Student Progress Grid -->
			<div class="flex-1 overflow-hidden">
				<StudentProgressGrid />
			</div>
		</div>
	{/if}

	<!-- Error Display (floating) -->
	{#if error}
		<div
			class="absolute right-4 bottom-4 z-50 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg"
		>
			<div class="flex items-start">
				<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Error loading data</h3>
					<p class="mt-1 text-sm text-red-700">{error}</p>
					<button
						class="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
						onclick={() => dataStore.clearError()}
					>
						Dismiss
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
