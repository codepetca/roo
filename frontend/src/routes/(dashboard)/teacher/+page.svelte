<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Button, Alert, Card } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/dashboard';
	import { api } from '$lib/api';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Set data in store when component mounts
	onMount(async () => {
		console.log('📦 Dashboard page mounted, setting data from load functions...');
		
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

			// Update store with dashboard data
			dataStore.setData({
				classrooms: dashboardData.classrooms || [],
				recentActivity: dashboardData.recentActivity || [],
				user: {
					...data.user,
					...dashboardData.teacher // Update with real user data
				}
			});
		} catch (error) {
			console.error('❌ Failed to load dashboard data client-side:', error);
			dataStore.setError('Failed to load dashboard data');
		} finally {
			dataStore.setLoading(false);
		}
	});

	// Reactive state from data store (updated by load functions)
	let loading = $derived(dataStore.loading);
	let error = $derived(dataStore.error || (data.error ? data.error : null));
	let hasData = $derived(dataStore.hasData);
	let teacher = $derived(dataStore.currentUser);
	let classrooms = $derived(dataStore.classrooms);
	let assignments = $derived(dataStore.assignments);
	let dashboardStats = $derived(dataStore.dashboardStats);
	// let recentActivity = $derived(dataStore.recentActivity);

	// Debug logging for data store state changes
	$effect(() => {
		console.log('🐛 Data Store State Update:', {
			loading,
			hasData,
			classroomsCount: classrooms?.length || 0,
			assignmentsCount: assignments?.length || 0,
			teacher: teacher?.email || 'None',
			error: error || 'None'
		});
		
		if (classrooms?.length > 0) {
			console.log('🏫 Classrooms Details:', classrooms.map(c => ({ name: c.name, id: c.id })));
		}
	});

	// Manual refresh using SvelteKit invalidation
	async function handleRefresh() {
		console.log('🔄 Manual refresh triggered...');
		dataStore.setLoading(true);

		try {
			// Invalidate the page data to trigger a reload
			await invalidate('/dashboard/teacher');
			console.log('✅ Page data invalidated and reloaded');
		} catch (err) {
			console.error('❌ Refresh failed:', err);
			dataStore.setError('Failed to refresh data');
		} finally {
			dataStore.setLoading(false);
		}
	}

	// Navigate to data import
	function goToDataImport() {
		window.location.href = '/teacher/data-import';
	}

	// Transform dashboard stats for display (commented out - not currently used)
	// let statsData = $derived(() => {
	// 	if (!dashboardStats) return [];
	// 	return [
	// 		{
	// 			title: 'Total Assignments',
	// 			value: dashboardStats.totalAssignments || 0,
	// 			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
	// 			color: 'bg-blue-500'
	// 		},
	// 		{
	// 			title: 'Total Students',
	// 			value: dashboardStats.totalStudents || 0,
	// 			icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
	// 			color: 'bg-green-500'
	// 		},
	// 		{
	// 			title: 'Pending Review',
	// 			value: dashboardStats.ungradedSubmissions || 0,
	// 			icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z',
	// 			color: 'bg-orange-500'
	// 		}
	// 	];
	// });
</script>

{#snippet actions()}
	<div class="flex gap-2">
		<Button variant="secondary" onclick={goToDataImport}>
			{#snippet children()}
				Import Data
			{/snippet}
		</Button>
		<Button variant="primary" onclick={handleRefresh} disabled={loading}>
			{#snippet children()}
				{loading ? 'Refreshing...' : 'Refresh'}
			{/snippet}
		</Button>
		<Button variant="secondary" onclick={dataStore.loadTestData}>
			{#snippet children()}
				Load Test Data
			{/snippet}
		</Button>
	</div>
{/snippet}

<div class="space-y-6">
	<!-- Page Header -->
	<PageHeader
		title="Teacher Dashboard"
		description="Manage assignments, review submissions, and track student progress with AI-powered grading."
		{actions}
	/>


	<!-- Error State -->
	{#if error}
		<Alert
			variant="error"
			title="Error loading dashboard"
			dismissible
			onDismiss={dataStore.clearError}
		>
			{#snippet children()}
				{error}
				<div class="mt-3">
					<Button variant="secondary" size="sm" onclick={handleRefresh}>
						{#snippet children()}
							Try Again
						{/snippet}
					</Button>
				</div>
			{/snippet}
		</Alert>
	{/if}


	<!-- Simple Assignments List -->
	{#if assignments && assignments.length > 0}
		<Card>
			{#snippet children()}
				<div class="p-6">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">
						📝 All Assignments ({assignments.length})
					</h3>
					<div class="space-y-3">
						{#each assignments as assignment (assignment.id || assignment.name)}
							<div class="rounded-lg border border-gray-200 p-4">
								<div class="flex items-start justify-between">
									<div>
										<h4 class="font-medium text-gray-900">
											{assignment.title || assignment.name || 'Untitled Assignment'}
										</h4>
										<p class="text-sm text-gray-600">
											Classroom: {assignment.classroomId}
										</p>
										<p class="text-sm text-gray-500">
											Type: {assignment.type || 'Unknown'} • Max Score: {assignment.maxScore ||
												assignment.maxPoints ||
												0}
										</p>
									</div>
									<div class="text-right">
										<span
											class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
										>
											{assignment.type || 'assignment'}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/snippet}
		</Card>
	{:else}
		<Card>
			{#snippet children()}
				<div class="p-6 text-center">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">No Assignments Found</h3>
					<p class="text-gray-600">
						{#if loading}
							Loading assignments...
						{:else if classrooms?.length === 0}
							No classrooms found. Import classroom data first.
						{:else}
							No assignments found in {classrooms?.length || 0} classrooms.
						{/if}
					</p>
					<div class="mt-4 space-x-2">
						<Button variant="primary" onclick={handleRefresh}>
							{#snippet children()}
								Refresh Data
							{/snippet}
						</Button>
						<Button variant="secondary" onclick={dataStore.loadTestData}>
							{#snippet children()}
								Load Test Data
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	{/if}
</div>
