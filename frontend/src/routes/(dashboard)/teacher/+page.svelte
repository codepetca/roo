<script lang="ts">
	import { onMount } from 'svelte';
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { api } from '$lib/api';
	import type { PageData } from './$types';
	import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
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

<DashboardLayout {viewMode} {error}>
	{#snippet topComponent()}
		<ClassroomSelector role="teacher" />
	{/snippet}

	{#snippet sidebarComponent()}
		{#if viewMode === 'assignment'}
			<AssignmentSidebar />
		{/if}
	{/snippet}

	{#snippet mainComponent()}
		{#if viewMode === 'grid'}
			<StudentGradeGrid />
		{:else}
			<StudentProgressGrid />
		{/if}
	{/snippet}
</DashboardLayout>
