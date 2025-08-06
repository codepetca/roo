<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { classroomStore } from '$lib/stores';
	import { Button, Alert } from '$lib/components/ui';
	import {
		ClassroomSidebar,
		AssignmentListItem,
		EmptyState,
		PageHeader,
		LoadingSkeleton
	} from '$lib/components/dashboard';
	import StudentResetManager from '$lib/components/auth/StudentResetManager.svelte';

	// Local UI state
	let syncing = $state(false);
	let syncMessage = $state<string | null>(null);

	// Handle classroom selection from sidebar
	function handleClassroomSelect(classroomId: string) {
		// The classroom store handles the selection and loading
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
				// Reload data from the store
				await classroomStore.refresh();
			} else {
				syncMessage = `Sync completed with errors: ${result.assignmentsProcessed} assignments, ${result.submissionsProcessed} submissions. ${result.errors.length} errors occurred.`;
				console.error('Sync errors:', result.errors);
			}
		} catch (err: unknown) {
			console.error('Failed to sync data:', err);
			// Set error on store
			classroomStore.clearError();
		} finally {
			syncing = false;
		}
	}

	// Move sidebar content to the sidebar area on mount
	onMount(() => {
		console.log('🚀 Teacher dashboard mounted');

		const sidebarContent = document.getElementById('sidebar-content');
		const sidebarTarget = document.getElementById('classroom-sidebar');

		if (sidebarContent && sidebarTarget) {
			// Move the entire component, not just innerHTML
			while (sidebarContent.firstChild) {
				sidebarTarget.appendChild(sidebarContent.firstChild);
			}
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
		<Button variant="primary" onclick={classroomStore.refresh} loading={classroomStore.loading}>
			{#snippet children()}
				Refresh
			{/snippet}
		</Button>
	</div>
{/snippet}

<!-- Render sidebar in the designated sidebar area -->
<div id="sidebar-content" style="display: none;">
	<ClassroomSidebar onClassroomSelect={handleClassroomSelect} />
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
	{#if !classroomStore.selectedClassroomId}
		<!-- No classroom selected -->
		<div class="py-12 text-center">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Select a Class</h3>
			<p class="mt-1 text-sm text-gray-500">
				Choose a class from the sidebar to view its assignments and manage submissions.
			</p>
		</div>
	{:else if classroomStore.loading}
		<!-- Loading State -->
		<LoadingSkeleton type="card" rows={3} />
	{:else if classroomStore.error}
		<!-- Error State -->
		<Alert
			variant="error"
			title="Error loading assignments"
			dismissible
			onDismiss={classroomStore.clearError}
		>
			{#snippet children()}
				{classroomStore.error}
				<div class="mt-3">
					<Button variant="secondary" size="sm" onclick={classroomStore.loadAssignments}>
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
			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg
							class="h-8 w-8 text-blue-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Assignments</p>
						<p class="text-2xl font-semibold text-gray-900">{classroomStore.totalAssignments}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg
							class="h-8 w-8 text-teal-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Quizzes</p>
						<p class="text-2xl font-semibold text-gray-900">{classroomStore.quizCount}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg
							class="h-8 w-8 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Submissions</p>
						<p class="text-2xl font-semibold text-gray-900">{classroomStore.totalSubmissions}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg
							class="h-8 w-8 text-orange-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Pending Review</p>
						<p class="text-2xl font-semibold text-gray-900">{classroomStore.ungradedSubmissions}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Student Management -->
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="border-b border-gray-200 px-6 py-4">
				<h3 class="text-lg font-semibold text-gray-900">Student Management</h3>
				<p class="text-sm text-gray-600">Help students with login issues and account access</p>
			</div>
			<div class="p-6">
				<StudentResetManager />
			</div>
		</div>

		<!-- Google Sheets Configuration -->
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="border-b border-gray-200 px-6 py-4">
				<h3 class="text-lg font-semibold text-gray-900">Google Sheets Configuration</h3>
				<p class="text-sm text-gray-600">
					Manage your Google Sheet settings and retrieve AppScript code
				</p>
			</div>
			<div class="p-6">
				<div class="space-y-4">
					<div class="flex items-start space-x-3">
						<svg
							class="h-8 w-8 flex-shrink-0 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3"
							/>
						</svg>
						<div class="flex-1">
							<p class="text-sm text-gray-700">
								Access your Google Sheet setup to retrieve the AppScript code, change sheet
								settings, or configure a new sheet for your board account.
							</p>
							<ul class="mt-2 space-y-1 text-sm text-gray-600">
								<li>• Retrieve AppScript code if you missed it during initial setup</li>
								<li>• Update Google Sheet configuration</li>
								<li>• Set up sheets for additional board accounts</li>
							</ul>
						</div>
					</div>
					<div class="flex justify-start">
						<Button variant="primary" onclick={() => goto('/teacher/onboarding')}>
							{#snippet children()}
								Manage Sheet Setup
							{/snippet}
						</Button>
					</div>
				</div>
			</div>
		</div>

		<!-- Assignments List -->
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="border-b border-gray-200 px-6 py-4">
				<h3 class="text-lg font-semibold text-gray-900">Assignments & Tests</h3>
				<p class="text-sm text-gray-600">Manage assignments for the selected class</p>
			</div>

			<div class="p-6">
				{#if classroomStore.assignments.length === 0}
					<EmptyState
						icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						title="No assignments yet"
						description="Create your first assignment to get started with AI-powered grading."
						actionLabel="Create Assignment"
						onAction={() => (window.location.href = '/dashboard/teacher/assignments')}
					/>
				{:else}
					<div class="space-y-4">
						{#each classroomStore.assignments as assignment (assignment.id)}
							<AssignmentListItem {assignment} onView={handleViewAssignment} />
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
