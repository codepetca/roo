<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import type { AssignmentResponse } from '$lib/schemas';
	import { Button, Alert } from '$lib/components/ui';
	import { ClassroomSidebar, AssignmentListItem, EmptyState, PageHeader, LoadingSkeleton } from '$lib/components/dashboard';

	// State using Svelte 5 runes
	let assignments = $state<AssignmentResponse[]>([]);
	let selectedClassroomId = $state<string | undefined>(undefined);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let syncing = $state(false);
	let syncMessage = $state<string | null>(null);

	// Derived statistics
	let totalAssignments = $derived(assignments.length);
	let quizCount = $derived(assignments.filter((a) => a.isQuiz).length);
	let regularAssignments = $derived(assignments.filter((a) => !a.isQuiz).length);
	let totalSubmissions = $derived(assignments.reduce((sum, a) => sum + (a.submissionCount || 0), 0));
	let ungradedSubmissions = $derived(assignments.reduce((sum, a) => {
		const ungraded = (a.submissionCount || 0) - (a.gradedCount || 0);
		return sum + ungraded;
	}, 0));

	// Load assignments for selected classroom
	async function loadAssignments() {
		if (!selectedClassroomId) {
			assignments = [];
			return;
		}

		try {
			loading = true;
			error = null;
			assignments = await api.getClassroomAssignments(selectedClassroomId);
		} catch (err: unknown) {
			console.error('Failed to load assignments:', err);
			error = err instanceof Error ? err.message : 'Failed to load assignments';
		} finally {
			loading = false;
		}
	}

	// Handle classroom selection
	function handleClassroomSelect(classroomId: string) {
		selectedClassroomId = classroomId;
		loadAssignments();
	}

	// Handle assignment view
	function handleViewAssignment(assignmentId: string) {
		window.location.href = `/dashboard/teacher/assignments/${assignmentId}`;
	}

	async function syncData() {
		try {
			syncing = true;
			syncMessage = null;
			error = null;

			const result = await api.syncAllData();
			
			if (result.success) {
				syncMessage = `Successfully synced ${result.assignmentsProcessed} assignments and ${result.submissionsProcessed} submissions from Google Sheets`;
				// Reload assignments for current classroom
				await loadAssignments();
			} else {
				syncMessage = `Sync completed with errors: ${result.assignmentsProcessed} assignments, ${result.submissionsProcessed} submissions. ${result.errors.length} errors occurred.`;
				console.error('Sync errors:', result.errors);
			}
		} catch (err: unknown) {
			console.error('Failed to sync data:', err);
			error = err instanceof Error ? err.message : 'Failed to sync data from Google Sheets';
		} finally {
			syncing = false;
		}
	}

	// Move sidebar content to the sidebar area on mount
	onMount(() => {
		const sidebarContent = document.getElementById('sidebar-content');
		const sidebarTarget = document.getElementById('classroom-sidebar');
		
		if (sidebarContent && sidebarTarget) {
			const content = sidebarContent.innerHTML;
			sidebarTarget.innerHTML = content;
			sidebarContent.remove();
		}
	});
</script>

{#snippet actions()}
	<div class="flex gap-2">
		<Button variant="secondary" onclick={syncData} loading={syncing}>
			{#snippet children()}
				Sync from Sheets
			{/snippet}
		</Button>
		<Button variant="primary" onclick={loadAssignments} {loading}>
			{#snippet children()}
				Refresh
			{/snippet}
		</Button>
	</div>
{/snippet}

<!-- Render sidebar in the designated sidebar area -->
<div id="sidebar-content" style="display: none;">
	<ClassroomSidebar 
		bind:selectedClassroomId={selectedClassroomId}
		onClassroomSelect={handleClassroomSelect}
	/>
</div>

<div class="space-y-6">
	<!-- Page Header -->
	<PageHeader
		title="Teacher Dashboard"
		description="Manage assignments, review submissions, and track student progress with AI-powered grading."
		{actions}
	/>

	<!-- Sync Message -->
	{#if syncMessage}
		<Alert
			variant="success"
			title="Sync Complete"
			dismissible
			onDismiss={() => (syncMessage = null)}
		>
			{#snippet children()}
				{syncMessage}
			{/snippet}
		</Alert>
	{/if}

	<!-- Main Content -->
	{#if !selectedClassroomId}
		<!-- No classroom selected -->
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Select a Class</h3>
			<p class="mt-1 text-sm text-gray-500">Choose a class from the sidebar to view its assignments and manage submissions.</p>
		</div>
	{:else if loading}
		<!-- Loading State -->
		<LoadingSkeleton type="card" rows={3} />
	{:else if error}
		<!-- Error State -->
		<Alert
			variant="error"
			title="Error loading assignments"
			dismissible
			onDismiss={() => (error = null)}
		>
			{#snippet children()}
				{error}
				<div class="mt-3">
					<Button variant="secondary" size="sm" onclick={loadAssignments}>
						{#snippet children()}
							Try Again
						{/snippet}
					</Button>
				</div>
			{/snippet}
		</Alert>
	{:else}
		<!-- Quick Stats -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Assignments</p>
						<p class="text-2xl font-semibold text-gray-900">{totalAssignments}</p>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3" />
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Quizzes</p>
						<p class="text-2xl font-semibold text-gray-900">{quizCount}</p>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Submissions</p>
						<p class="text-2xl font-semibold text-gray-900">{totalSubmissions}</p>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Pending Review</p>
						<p class="text-2xl font-semibold text-gray-900">{ungradedSubmissions}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Assignments List -->
		<div class="bg-white rounded-lg border border-gray-200">
			<div class="px-6 py-4 border-b border-gray-200">
				<h3 class="text-lg font-semibold text-gray-900">Assignments & Tests</h3>
				<p class="text-sm text-gray-600">Manage assignments for the selected class</p>
			</div>
			
			<div class="p-6">
				{#if assignments.length === 0}
					<EmptyState
						icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						title="No assignments yet"
						description="Create your first assignment to get started with AI-powered grading."
						actionLabel="Create Assignment"
						onAction={() => (window.location.href = '/dashboard/teacher/assignments')}
					/>
				{:else}
					<div class="space-y-4">
						{#each assignments as assignment (assignment.id)}
							<AssignmentListItem 
								{assignment} 
								onView={handleViewAssignment}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
