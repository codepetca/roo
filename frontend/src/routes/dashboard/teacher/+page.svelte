<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import type { Assignment, Submission, Grade } from '@shared/types';

	// State using Svelte 5 runes
	let assignments = $state<Assignment[]>([]);
	let recentSubmissions = $state<Submission[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

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
			color: 'bg-blue-500'
		},
		{
			title: 'Quizzes',
			value: quizCount,
			icon: 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3',
			color: 'bg-green-500'
		},
		{
			title: 'Regular Assignments',
			value: regularAssignments,
			icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
			color: 'bg-purple-500'
		},
		{
			title: 'Recent Submissions',
			value: recentSubmissionsCount,
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'bg-orange-500'
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
		} catch (err: any) {
			console.error('Failed to load dashboard data:', err);
			error = err.message || 'Failed to load dashboard data';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadDashboardData();
	});
</script>

<div class="space-y-6">
	<!-- Welcome Section -->
	<div class="rounded-lg bg-white p-6 shadow">
		<h1 class="mb-2 text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
		<p class="text-gray-600">
			Manage assignments, review submissions, and track student progress with AI-powered grading.
		</p>
	</div>

	{#if loading}
		<!-- Loading State -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<div class="animate-pulse rounded-lg bg-white p-6 shadow">
					<div class="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
					<div class="h-8 w-1/2 rounded bg-gray-200"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="rounded-lg border border-red-200 bg-red-50 p-6">
			<div class="flex items-center">
				<svg
					class="mr-2 h-5 w-5 text-red-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h3 class="font-medium text-red-800">Error loading dashboard</h3>
			</div>
			<p class="mt-1 text-red-700">{error}</p>
			<button
				onclick={loadDashboardData}
				class="mt-3 rounded-md bg-red-100 px-3 py-1 text-sm text-red-800 transition-colors hover:bg-red-200"
			>
				Try Again
			</button>
		</div>
	{:else}
		<!-- Quick Stats Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each quickStats as stat}
				<div class="rounded-lg bg-white p-6 shadow">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">{stat.title}</p>
							<p class="text-3xl font-bold text-gray-900">{stat.value}</p>
						</div>
						<div class="rounded-lg p-3 {stat.color}">
							<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={stat.icon}
								/>
							</svg>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Recent Activity -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Recent Assignments -->
			<div class="rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 p-6">
					<h3 class="text-lg font-semibold text-gray-900">Recent Assignments</h3>
				</div>
				<div class="p-6">
					{#if assignments.length === 0}
						<p class="py-4 text-center text-gray-500">No assignments found</p>
					{:else}
						<div class="space-y-4">
							{#each assignments.slice(0, 5) as assignment}
								<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
									<div class="flex items-center space-x-3">
										<div
											class="p-2 {assignment.isQuiz
												? 'bg-green-100 text-green-600'
												: 'bg-blue-100 text-blue-600'} rounded-lg"
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
											<p class="text-sm text-gray-500">
												{assignment.isQuiz ? 'Quiz' : 'Assignment'} • {assignment.maxPoints} points
											</p>
										</div>
									</div>
									<a
										href="/dashboard/teacher/assignments/{assignment.id}"
										class="text-sm font-medium text-blue-600 hover:text-blue-700"
									>
										View
									</a>
								</div>
							{/each}
						</div>
						{#if assignments.length > 5}
							<div class="mt-4 text-center">
								<a
									href="/dashboard/teacher/assignments"
									class="text-sm font-medium text-blue-600 hover:text-blue-700"
								>
									View all assignments ({assignments.length})
								</a>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Pending Submissions -->
			<div class="rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 p-6">
					<h3 class="text-lg font-semibold text-gray-900">Pending Submissions</h3>
				</div>
				<div class="p-6">
					{#if recentSubmissions.length === 0}
						<p class="py-4 text-center text-gray-500">No pending submissions</p>
					{:else}
						<div class="space-y-4">
							{#each recentSubmissions.slice(0, 5) as submission}
								<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
									<div>
										<p class="font-medium text-gray-900">{submission.studentName}</p>
										<p class="text-sm text-gray-500">Assignment ID: {submission.assignmentId}</p>
									</div>
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {submission.status ===
										'pending'
											? 'bg-yellow-100 text-yellow-800'
											: submission.status === 'grading'
												? 'bg-blue-100 text-blue-800'
												: 'bg-gray-100 text-gray-800'}"
									>
										{submission.status}
									</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="rounded-lg bg-white p-6 shadow">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<a
					href="/dashboard/teacher/assignments"
					class="flex items-center rounded-lg bg-blue-50 p-4 transition-colors hover:bg-blue-100"
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
				</a>

				<a
					href="/dashboard/teacher/grades"
					class="flex items-center rounded-lg bg-green-50 p-4 transition-colors hover:bg-green-100"
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
				</a>

				<button
					onclick={loadDashboardData}
					class="flex items-center rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
				>
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
					<div>
						<p class="font-medium text-gray-900">Refresh Data</p>
						<p class="text-sm text-gray-600">Update dashboard information</p>
					</div>
				</button>
			</div>
		</div>
	{/if}
</div>
