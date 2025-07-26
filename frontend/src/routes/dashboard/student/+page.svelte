<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import type { Assignment, Grade } from '@shared/types';

	// State using Svelte 5 runes
	let myGrades = $state<Grade[]>([]);
	let assignments = $state<Assignment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Student-specific derived statistics
	let totalGrades = $derived(myGrades.length);
	let averageScore = $derived(() => {
		if (myGrades.length === 0) return 0;
		const totalPercentage = myGrades.reduce((sum, grade) => {
			return sum + (grade.score / grade.maxScore) * 100;
		}, 0);
		return Math.round(totalPercentage / myGrades.length);
	});
	let completedAssignments = $derived(myGrades.length);
	let totalAssignments = $derived(assignments.length);

	// Quick stats for student dashboard
	let quickStats = $derived([
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

	async function loadStudentDashboardData() {
		try {
			loading = true;
			error = null;

			// Load all assignments to see what's available
			assignments = await api.listAssignments();

			// For now, try to load grades from all assignments
			// TODO: Replace with student-specific API endpoints
			let allGrades: Grade[] = [];
			for (const assignment of assignments) {
				try {
					const grades = await api.getGradesByAssignment(assignment.id);
					// Filter grades for current student (by email for now)
					const studentGrades = grades.filter((grade) => grade.studentEmail === auth.user?.email);
					allGrades = [...allGrades, ...studentGrades];
				} catch (err) {
					console.warn(`Could not load grades for assignment ${assignment.id}:`, err);
				}
			}

			myGrades = allGrades;
		} catch (err: unknown) {
			console.error('Failed to load student dashboard data:', err);
			error = (err as Error)?.message || 'Failed to load dashboard data';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStudentDashboardData();
	});
</script>

<div class="space-y-6">
	<!-- Welcome Section -->
	<div class="rounded-lg bg-white p-6 shadow">
		<h1 class="mb-2 text-2xl font-bold text-gray-900">Student Dashboard</h1>
		<p class="text-gray-600">
			Welcome back, {auth.user?.email?.split('@')[0] || 'Student'}! Track your grades and view
			assignment feedback.
		</p>
	</div>

	{#if loading}
		<!-- Loading State -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
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
				onclick={loadStudentDashboardData}
				class="mt-3 rounded-md bg-red-100 px-3 py-1 text-sm text-red-800 transition-colors hover:bg-red-200"
			>
				Try Again
			</button>
		</div>
	{:else}
		<!-- Quick Stats Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each quickStats as stat (stat.title)}
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
			<!-- Recent Grades -->
			<div class="rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 p-6">
					<h3 class="text-lg font-semibold text-gray-900">Recent Grades</h3>
				</div>
				<div class="p-6">
					{#if recentGrades.length === 0}
						<p class="py-4 text-center text-gray-500">No grades available</p>
					{:else}
						<div class="space-y-4">
							{#each recentGrades as grade (grade.id || `${grade.studentId}-${grade.assignmentId}`)}
								{@const percentage = Math.round((grade.score / grade.maxScore) * 100)}
								{@const letterGrade = getLetterGrade(percentage)}
								<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
									<div class="flex items-center space-x-3">
										<div
											class="rounded-lg p-2 {percentage >= 90
												? 'bg-green-100 text-green-600'
												: percentage >= 80
													? 'bg-blue-100 text-blue-600'
													: percentage >= 70
														? 'bg-yellow-100 text-yellow-600'
														: 'bg-red-100 text-red-600'}"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
												/>
											</svg>
										</div>
										<div>
											<p class="font-medium text-gray-900">Assignment {grade.assignmentId}</p>
											<p class="text-sm text-gray-500">
												{grade.score}/{grade.maxScore} • {percentage}%
											</p>
										</div>
									</div>
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {percentage >=
										90
											? 'bg-green-100 text-green-800'
											: percentage >= 80
												? 'bg-blue-100 text-blue-800'
												: percentage >= 70
													? 'bg-yellow-100 text-yellow-800'
													: percentage >= 60
														? 'bg-orange-100 text-orange-800'
														: 'bg-red-100 text-red-800'}"
									>
										{letterGrade}
									</span>
								</div>
							{/each}
						</div>
						{#if myGrades.length > 5}
							<div class="mt-4 text-center">
								<a
									href="/dashboard/student/grades"
									class="text-sm font-medium text-blue-600 hover:text-blue-700"
								>
									View all grades ({myGrades.length})
								</a>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Available Assignments -->
			<div class="rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 p-6">
					<h3 class="text-lg font-semibold text-gray-900">Available Assignments</h3>
				</div>
				<div class="p-6">
					{#if assignments.length === 0}
						<p class="py-4 text-center text-gray-500">No assignments available</p>
					{:else}
						<div class="space-y-4">
							{#each assignments.slice(0, 5) as assignment (assignment.id)}
								{@const hasGrade = myGrades.some((g) => g.assignmentId === assignment.id)}
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
									<div class="flex items-center space-x-2">
										{#if hasGrade}
											<span
												class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
											>
												Completed
											</span>
										{:else}
											<span
												class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
											>
												Pending
											</span>
										{/if}
									</div>
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
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<a
					href="/dashboard/student/grades"
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
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
					<div>
						<p class="font-medium text-gray-900">View All Grades</p>
						<p class="text-sm text-gray-600">See your complete grade history</p>
					</div>
				</a>

				<button
					onclick={loadStudentDashboardData}
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
						<p class="text-sm text-gray-600">Update your grades and assignments</p>
					</div>
				</button>
			</div>
		</div>
	{/if}
</div>
