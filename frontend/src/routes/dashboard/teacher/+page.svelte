<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import type { Assignment, Submission } from '@shared/types';
	import { Card, Button, Badge, Alert } from '$lib/components/ui';
	import { StatsCard, EmptyState, PageHeader, LoadingSkeleton } from '$lib/components/dashboard';

	// State using Svelte 5 runes
	let assignments = $state<Assignment[]>([]);
	let recentSubmissions = $state<Submission[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let syncing = $state(false);
	let syncMessage = $state<string | null>(null);

	// Derived statistics
	let totalAssignments = $derived(assignments.length);
	let quizCount = $derived(assignments.filter((a) => a.isQuiz).length);
	let regularAssignments = $derived(assignments.filter((a) => !a.isQuiz).length);
	let recentSubmissionsCount = $derived(recentSubmissions.length);

	// Quick stats cards data
	let quickStats = $derived([
		{
			title: 'Total Assignments',
			value: totalAssignments,
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
			color: 'blue' as const
		},
		{
			title: 'Quizzes',
			value: quizCount,
			icon: 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3',
			color: 'green' as const
		},
		{
			title: 'Regular Assignments',
			value: regularAssignments,
			icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
			color: 'purple' as const
		},
		{
			title: 'Recent Submissions',
			value: recentSubmissionsCount,
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'orange' as const
		}
	]);

	async function loadDashboardData() {
		try {
			loading = true;
			error = null;

			// Load assignments
			assignments = await api.listAssignments();

			// Load recent ungraded submissions (for demo purposes)
			try {
				recentSubmissions = await api.getUngradedSubmissions();
			} catch (err) {
				console.warn('Could not load ungraded submissions:', err);
				recentSubmissions = [];
			}
		} catch (err: unknown) {
			console.error('Failed to load dashboard data:', err);
			error = err instanceof Error ? err.message : 'Failed to load dashboard data';
		} finally {
			loading = false;
		}
	}

	async function syncData() {
		try {
			syncing = true;
			syncMessage = null;
			error = null;

			const result = await api.syncAllData();
			
			if (result.success) {
				syncMessage = `Successfully synced ${result.assignmentsProcessed} assignments and ${result.submissionsProcessed} submissions from Google Sheets`;
				// Reload dashboard data to show updated content
				await loadDashboardData();
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

	onMount(() => {
		loadDashboardData();
	});
</script>

{#snippet actions()}
	<div class="flex gap-2">
		<Button variant="secondary" onclick={syncData} loading={syncing}>
			{#snippet children()}
				Sync from Sheets
			{/snippet}
		</Button>
		<Button variant="primary" onclick={loadDashboardData} {loading}>
			{#snippet children()}
				Refresh
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

	{#if loading}
		<!-- Loading State -->
		<LoadingSkeleton type="stats" />
		<LoadingSkeleton type="card" rows={2} />
	{:else if error}
		<!-- Error State -->
		<Alert
			variant="error"
			title="Error loading dashboard"
			dismissible
			onDismiss={() => (error = null)}
		>
			{#snippet children()}
				{error}
				<div class="mt-3">
					<Button variant="secondary" size="sm" onclick={loadDashboardData}>
						{#snippet children()}
							Try Again
						{/snippet}
					</Button>
				</div>
			{/snippet}
		</Alert>
	{:else}
		<!-- Quick Stats Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each quickStats as stat (stat.title)}
				<StatsCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
			{/each}
		</div>

		<!-- Recent Activity -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Recent Assignments -->
			<Card>
				{#snippet children()}
					<div class="mb-4 border-b border-gray-200 pb-4">
						<h3 class="text-lg font-semibold text-gray-900">Recent Assignments</h3>
					</div>

					{#if assignments.length === 0}
						<EmptyState
							icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							title="No assignments yet"
							description="Create your first assignment to get started with AI-powered grading."
							actionLabel="Create Assignment"
							onAction={() => (window.location.href = '/dashboard/teacher/assignments')}
						/>
					{:else}
						<div class="space-y-3">
							{#each assignments.slice(0, 5) as assignment (assignment.id)}
								<div
									class="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
								>
									<div class="flex items-center space-x-3">
										<div
											class="rounded-lg p-2 {assignment.isQuiz
												? 'bg-green-100 text-green-600'
												: 'bg-blue-100 text-blue-600'}"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d={assignment.isQuiz
														? 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3'
														: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'}
												/>
											</svg>
										</div>
										<div>
											<p class="font-medium text-gray-900">{assignment.title}</p>
											<div class="flex items-center gap-2">
												<Badge variant={assignment.isQuiz ? 'success' : 'info'} size="sm">
													{#snippet children()}
														{assignment.isQuiz ? 'Quiz' : 'Assignment'}
													{/snippet}
												</Badge>
												<span class="text-sm text-gray-500">{assignment.maxPoints} points</span>
											</div>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onclick={() =>
											(window.location.href = `/dashboard/teacher/assignments/${assignment.id}`)}
									>
										{#snippet children()}
											View
										{/snippet}
									</Button>
								</div>
							{/each}
						</div>

						{#if assignments.length > 5}
							<div class="mt-4 text-center">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => (window.location.href = '/dashboard/teacher/assignments')}
								>
									{#snippet children()}
										View all assignments ({assignments.length})
									{/snippet}
								</Button>
							</div>
						{/if}
					{/if}
				{/snippet}
			</Card>

			<!-- Pending Submissions -->
			<Card>
				{#snippet children()}
					<div class="mb-4 border-b border-gray-200 pb-4">
						<h3 class="text-lg font-semibold text-gray-900">Pending Submissions</h3>
					</div>

					{#if recentSubmissions.length === 0}
						<EmptyState
							icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							title="No pending submissions"
							description="All submissions have been graded or no submissions have been received yet."
						/>
					{:else}
						<div class="space-y-3">
							{#each recentSubmissions.slice(0, 5) as submission (submission.id || submission.studentEmail)}
								<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
									<div>
										<p class="font-medium text-gray-900">{submission.studentName}</p>
										<p class="text-sm text-gray-500">Assignment ID: {submission.assignmentId}</p>
									</div>
									<Badge
										variant={submission.status === 'pending'
											? 'warning'
											: submission.status === 'grading'
												? 'info'
												: 'default'}
										size="sm"
									>
										{#snippet children()}
											{submission.status}
										{/snippet}
									</Badge>
								</div>
							{/each}
						</div>
					{/if}
				{/snippet}
			</Card>
		</div>

		<!-- Quick Actions -->
		<Card>
			{#snippet children()}
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-5">
					<button
						onclick={() => (window.location.href = '/dashboard/teacher/assignments')}
						class="flex w-full items-center rounded-lg bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
					>
						<svg
							class="mr-3 h-8 w-8 text-blue-600"
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
						<div>
							<p class="font-medium text-gray-900">View All Assignments</p>
							<p class="text-sm text-gray-600">Manage quizzes and assignments</p>
						</div>
					</button>

					<button
						onclick={() => (window.location.href = '/dashboard/teacher/grades')}
						class="flex w-full items-center rounded-lg bg-green-50 p-4 text-left transition-colors hover:bg-green-100"
					>
						<svg
							class="mr-3 h-8 w-8 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
						<div>
							<p class="font-medium text-gray-900">Review Grades</p>
							<p class="text-sm text-gray-600">View and manage student grades</p>
						</div>
					</button>

					<button
						onclick={() => (window.location.href = '/teacher/onboarding')}
						class="flex w-full items-center rounded-lg bg-indigo-50 p-4 text-left transition-colors hover:bg-indigo-100"
					>
						<svg
							class="mr-3 h-8 w-8 text-indigo-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
						<div>
							<p class="font-medium text-gray-900">Set Up Google Sheets</p>
							<p class="text-sm text-gray-600">Automate your sheet creation and setup</p>
						</div>
					</button>

					<button
						onclick={syncData}
						disabled={syncing}
						class="flex w-full items-center rounded-lg bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100 disabled:opacity-50"
					>
						<svg
							class="mr-3 h-8 w-8 text-purple-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						<div>
							<p class="font-medium text-gray-900">
								{syncing ? 'Syncing...' : 'Sync from Google Sheets'}
							</p>
							<p class="text-sm text-gray-600">Import latest data from school sheets</p>
						</div>
					</button>

					<Button
						variant="secondary"
						onclick={loadDashboardData}
						class="flex h-auto items-center justify-start p-4"
					>
						{#snippet children()}
							<svg
								class="mr-3 h-8 w-8 text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							<div class="text-left">
								<p class="font-medium text-gray-900">Refresh Data</p>
								<p class="text-sm text-gray-600">Update dashboard information</p>
							</div>
						{/snippet}
					</Button>
				</div>
			{/snippet}
		</Card>
	{/if}
</div>
