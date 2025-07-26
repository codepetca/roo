<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import type { Assignment, Grade, SerializedTimestamp } from '@shared/types';

	// State using Svelte 5 runes
	let myGrades = $state<Grade[]>([]);
	let assignments = $state<Assignment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Assignment lookup for grade display
	let assignmentLookup = $derived(() => {
		const lookup: Record<string, Assignment> = {};
		assignments.forEach((assignment) => {
			lookup[assignment.id] = assignment;
		});
		return lookup;
	});

	// Statistics
	let totalGrades = $derived(myGrades.length);
	let avgScore = $derived(() => {
		if (myGrades.length === 0) return 0;
		const totalPercentage = myGrades.reduce((sum, grade) => {
			return sum + (grade.score / grade.maxScore) * 100;
		}, 0);
		return Math.round((totalPercentage / myGrades.length) * 10) / 10;
	});

	async function loadMyGrades() {
		try {
			loading = true;
			error = null;

			// Load assignments first
			assignments = await api.listAssignments();

			// Load all grades and filter for current student
			// TODO: Replace with student-specific API endpoint
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
			console.error('Failed to load grades:', err);
			error = (err as Error)?.message || 'Failed to load grades';
		} finally {
			loading = false;
		}
	}

	function formatDateTime(timestamp: SerializedTimestamp | null): string {
		try {
			if (timestamp && timestamp._seconds) {
				return new Date(timestamp._seconds * 1000).toLocaleString();
			}
			return 'No date';
		} catch {
			return 'Invalid date';
		}
	}

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

	onMount(() => {
		loadMyGrades();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">My Grades</h1>
			<p class="mt-1 text-gray-600">View your assignment grades and feedback</p>
		</div>
		<button
			onclick={loadMyGrades}
			disabled={loading}
			class="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
		>
			{#if loading}
				<svg
					class="mr-2 -ml-1 inline h-4 w-4 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Refreshing...
			{:else}
				<svg class="mr-2 inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Refresh
			{/if}
		</button>
	</div>

	{#if loading}
		<!-- Loading State -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each Array.from({ length: 2 }, (_, i) => i) as i (i)}
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
				<h3 class="font-medium text-red-800">Error loading grades</h3>
			</div>
			<p class="mt-1 text-red-700">{error}</p>
			<button
				onclick={loadMyGrades}
				class="mt-3 rounded-md bg-red-100 px-3 py-1 text-sm text-red-800 transition-colors hover:bg-red-200"
			>
				Try Again
			</button>
		</div>
	{:else}
		<!-- Summary Statistics -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<div class="rounded-lg bg-white p-6 shadow">
				<div class="flex items-center">
					<div class="rounded-lg bg-blue-100 p-2 text-blue-600">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Grades</p>
						<p class="text-2xl font-bold text-gray-900">{totalGrades}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg bg-white p-6 shadow">
				<div class="flex items-center">
					<div class="rounded-lg bg-green-100 p-2 text-green-600">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Average Score</p>
						<p class="text-2xl font-bold text-gray-900">{avgScore}%</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Grades List -->
		<div class="rounded-lg bg-white shadow">
			<div class="border-b border-gray-200 p-6">
				<h3 class="text-lg font-semibold text-gray-900">Grade History</h3>
			</div>

			<div class="overflow-x-auto">
				{#if myGrades.length === 0}
					<div class="p-12 text-center">
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
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900">No grades yet</h3>
						<p class="mt-1 text-sm text-gray-500">
							Your grades will appear here once assignments are graded.
						</p>
					</div>
				{:else}
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Assignment
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Score
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Grade
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Graded By
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Date
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Feedback
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each myGrades as grade (grade.id || `${grade.studentId}-${grade.assignmentId}`)}
								{@const assignment = assignmentLookup[grade.assignmentId]}
								{@const percentage = Math.round((grade.score / grade.maxScore) * 100)}
								{@const letterGrade = getLetterGrade(percentage)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">
											{assignment?.title || 'Unknown Assignment'}
										</div>
										<div class="text-sm text-gray-500">
											{assignment?.isQuiz ? 'Quiz' : 'Assignment'}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">
											{grade.score}/{grade.maxScore}
										</div>
										<div class="text-sm text-gray-500">{percentage}%</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
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
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {grade.gradedBy ===
											'ai'
												? 'bg-purple-100 text-purple-800'
												: 'bg-gray-100 text-gray-800'}"
										>
											{grade.gradedBy === 'ai' ? 'AI' : 'Manual'}
										</span>
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
										{formatDateTime(grade.gradedAt)}
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap">
										{#if grade.feedback}
											<button
												class="text-blue-600 hover:text-blue-900"
												title="View feedback"
												onclick={() => alert(grade.feedback)}
											>
												View Feedback
											</button>
										{:else}
											<span class="text-gray-400">No feedback</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	{/if}
</div>
