<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { api } from '$lib/api';
	import type { Assignment, Submission, Grade } from '@shared/types';

	// State using Svelte 5 runes
	let assignment = $state<Assignment | null>(null);
	let submissions = $state<Submission[]>([]);
	let grades = $state<Grade[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let activeTab = $state<'overview' | 'submissions' | 'grades'>('overview');

	// Get assignment ID from route params
	let assignmentId = $derived($page.params.id);

	// Derived statistics
	let stats = $derived(() => {
		const totalSubmissions = submissions.length;
		const gradedSubmissions = submissions.filter((s) => s.status === 'graded').length;
		const pendingSubmissions = submissions.filter((s) => s.status === 'pending').length;
		const avgScore =
			grades.length > 0 ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length : 0;

		return {
			totalSubmissions,
			gradedSubmissions,
			pendingSubmissions,
			avgScore: Math.round(avgScore * 10) / 10
		};
	});

	async function loadAssignmentData() {
		if (!assignmentId) return;

		try {
			loading = true;
			error = null;

			// For now, we'll get the assignment from the assignments list
			// In a real app, you'd have an endpoint like GET /assignments/:id
			const allAssignments = await api.listAssignments();
			assignment = allAssignments.find((a) => a.id === assignmentId) || null;

			if (!assignment) {
				error = 'Assignment not found';
				return;
			}

			// Load submissions and grades for this assignment
			try {
				submissions = await api.getSubmissionsByAssignment(assignmentId);
			} catch (err) {
				console.warn('Could not load submissions:', err);
				submissions = [];
			}

			try {
				grades = await api.getGradesByAssignment(assignmentId);
			} catch (err) {
				console.warn('Could not load grades:', err);
				grades = [];
			}
		} catch (err) {
			console.error('Failed to load assignment data:', err);
			error = err instanceof Error ? err.message : 'Failed to load assignment data';
		} finally {
			loading = false;
		}
	}

	function formatDate(timestamp: { _seconds: number; _nanoseconds: number } | null | undefined): string {
		try {
			if (timestamp && timestamp._seconds) {
				return new Date(timestamp._seconds * 1000).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				});
			}
			return 'No date';
		} catch {
			return 'Invalid date';
		}
	}

	function formatDateTime(timestamp: { _seconds: number; _nanoseconds: number } | null | undefined): string {
		try {
			if (timestamp && timestamp._seconds) {
				return new Date(timestamp._seconds * 1000).toLocaleString();
			}
			return 'No date';
		} catch {
			return 'Invalid date';
		}
	}

	onMount(() => {
		loadAssignmentData();
	});
</script>

<svelte:head>
	<title>{assignment?.title || 'Assignment'} - Roo</title>
</svelte:head>

{#if loading}
	<!-- Loading State -->
	<div class="space-y-6">
		<div class="animate-pulse rounded-lg bg-white p-6 shadow">
			<div class="mb-4 h-8 w-1/2 rounded bg-gray-200"></div>
			<div class="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
			<div class="h-4 w-1/2 rounded bg-gray-200"></div>
		</div>
	</div>
{:else if error}
	<!-- Error State -->
	<div class="rounded-lg border border-red-200 bg-red-50 p-6">
		<div class="flex items-center">
			<svg class="mr-2 h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<h3 class="font-medium text-red-800">Error loading assignment</h3>
		</div>
		<p class="mt-1 text-red-700">{error}</p>
		<button
			onclick={loadAssignmentData}
			class="mt-3 rounded-md bg-red-100 px-3 py-1 text-sm text-red-800 transition-colors hover:bg-red-200"
		>
			Try Again
		</button>
	</div>
{:else if assignment}
	<div class="space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-start justify-between">
				<div>
					<div class="mb-2 flex items-center space-x-3">
						<div
							class="p-2 {assignment.isQuiz
								? 'bg-green-100 text-green-600'
								: 'bg-blue-100 text-blue-600'} rounded-lg"
						>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
						<h1 class="text-2xl font-bold text-gray-900">{assignment.title}</h1>
						<span
							class="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium {assignment.isQuiz
								? 'bg-green-100 text-green-800'
								: 'bg-blue-100 text-blue-800'}"
						>
							{assignment.isQuiz ? 'Quiz' : 'Assignment'}
						</span>
					</div>

					<p class="mb-4 text-gray-600">{assignment.description || 'No description available'}</p>

					<div class="flex items-center space-x-6 text-sm text-gray-500">
						<span class="flex items-center">
							<svg class="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Due: {formatDate(assignment.dueDate)}
						</span>
						<span class="flex items-center">
							<svg class="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
							{assignment.maxPoints} points
						</span>
						{#if assignment.isQuiz && assignment.formId}
							<span class="flex items-center text-green-600">
								<svg class="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								Form ID: {assignment.formId}
							</span>
						{/if}
					</div>
				</div>

				<a
					href="/dashboard/assignments"
					class="text-sm font-medium text-gray-500 hover:text-gray-700"
				>
					← Back to Assignments
				</a>
			</div>
		</div>

		<!-- Statistics Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
			<div class="rounded-lg bg-white p-6 shadow">
				<div class="flex items-center">
					<div class="rounded-lg bg-blue-100 p-2 text-blue-600">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Submissions</p>
						<p class="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
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
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Graded</p>
						<p class="text-2xl font-bold text-gray-900">{stats.gradedSubmissions}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg bg-white p-6 shadow">
				<div class="flex items-center">
					<div class="rounded-lg bg-yellow-100 p-2 text-yellow-600">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Pending</p>
						<p class="text-2xl font-bold text-gray-900">{stats.pendingSubmissions}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg bg-white p-6 shadow">
				<div class="flex items-center">
					<div class="rounded-lg bg-purple-100 p-2 text-purple-600">
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
						<p class="text-sm font-medium text-gray-600">Avg Score</p>
						<p class="text-2xl font-bold text-gray-900">{stats.avgScore}%</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Tab Navigation -->
		<div class="rounded-lg bg-white shadow">
			<div class="border-b border-gray-200">
				<nav class="flex space-x-8 px-6">
					<button
						onclick={() => (activeTab = 'overview')}
						class="border-b-2 py-4 text-sm font-medium transition-colors {activeTab === 'overview'
							? 'border-blue-500 text-blue-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					>
						Overview
					</button>
					<button
						onclick={() => (activeTab = 'submissions')}
						class="border-b-2 py-4 text-sm font-medium transition-colors {activeTab ===
						'submissions'
							? 'border-blue-500 text-blue-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					>
						Submissions ({submissions.length})
					</button>
					<button
						onclick={() => (activeTab = 'grades')}
						class="border-b-2 py-4 text-sm font-medium transition-colors {activeTab === 'grades'
							? 'border-blue-500 text-blue-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					>
						Grades ({grades.length})
					</button>
				</nav>
			</div>

			<!-- Tab Content -->
			<div class="p-6">
				{#if activeTab === 'overview'}
					<!-- Overview Tab -->
					<div class="space-y-6">
						<div>
							<h3 class="mb-3 text-lg font-semibold text-gray-900">Assignment Details</h3>
							<dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
								<div>
									<dt class="text-sm font-medium text-gray-500">Type</dt>
									<dd class="mt-1 text-sm text-gray-900">
										{assignment.isQuiz ? 'Quiz' : 'Assignment'}
									</dd>
								</div>
								<div>
									<dt class="text-sm font-medium text-gray-500">Maximum Points</dt>
									<dd class="mt-1 text-sm text-gray-900">{assignment.maxPoints}</dd>
								</div>
								<div>
									<dt class="text-sm font-medium text-gray-500">Due Date</dt>
									<dd class="mt-1 text-sm text-gray-900">{formatDate(assignment.dueDate)}</dd>
								</div>
								<div>
									<dt class="text-sm font-medium text-gray-500">Created</dt>
									<dd class="mt-1 text-sm text-gray-900">{formatDateTime(assignment.createdAt)}</dd>
								</div>
								{#if assignment.formId}
									<div>
										<dt class="text-sm font-medium text-gray-500">Google Form ID</dt>
										<dd class="mt-1 font-mono text-sm text-gray-900">{assignment.formId}</dd>
									</div>
								{/if}
							</dl>
						</div>

						{#if assignment.gradingRubric}
							<div>
								<h3 class="mb-3 text-lg font-semibold text-gray-900">Grading Rubric</h3>
								<div class="rounded-lg bg-gray-50 p-4">
									<p class="mb-2 text-sm text-gray-600">
										<strong>Enabled:</strong>
										{assignment.gradingRubric.enabled ? 'Yes' : 'No'}
									</p>
									{#if assignment.gradingRubric.criteria && assignment.gradingRubric.criteria.length > 0}
										<div class="mb-2">
											<p class="mb-1 text-sm font-medium text-gray-700">Criteria:</p>
											<div class="flex flex-wrap gap-2">
												{#each assignment.gradingRubric.criteria as criterion (criterion)}
													<span
														class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
													>
														{criterion}
													</span>
												{/each}
											</div>
										</div>
									{/if}
									{#if assignment.gradingRubric.promptTemplate}
										<div>
											<p class="mb-1 text-sm font-medium text-gray-700">Prompt Template:</p>
											<p class="rounded border bg-white p-2 text-sm text-gray-600">
												{assignment.gradingRubric.promptTemplate}
											</p>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{:else if activeTab === 'submissions'}
					<!-- Submissions Tab -->
					<div>
						<h3 class="mb-4 text-lg font-semibold text-gray-900">Student Submissions</h3>
						{#if submissions.length === 0}
							<p class="py-8 text-center text-gray-500">
								No submissions found for this assignment.
							</p>
						{:else}
							<div class="space-y-4">
								{#each submissions as submission (submission.id || submission.studentEmail)}
									<div class="rounded-lg border border-gray-200 p-4">
										<div class="flex items-center justify-between">
											<div>
												<h4 class="font-medium text-gray-900">{submission.studentName}</h4>
												<p class="text-sm text-gray-500">{submission.studentEmail}</p>
												<p class="text-sm text-gray-500">
													Submitted: {formatDateTime(submission.submittedAt)}
												</p>
											</div>
											<span
												class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {submission.status ===
												'graded'
													? 'bg-green-100 text-green-800'
													: submission.status === 'grading'
														? 'bg-blue-100 text-blue-800'
														: submission.status === 'pending'
															? 'bg-yellow-100 text-yellow-800'
															: 'bg-red-100 text-red-800'}"
											>
												{submission.status}
											</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if activeTab === 'grades'}
					<!-- Grades Tab -->
					<div>
						<h3 class="mb-4 text-lg font-semibold text-gray-900">Grades</h3>
						{#if grades.length === 0}
							<p class="py-8 text-center text-gray-500">No grades available for this assignment.</p>
						{:else}
							<div class="space-y-4">
								{#each grades as grade (grade.id || `${grade.studentId}-${grade.assignmentId}`)}
									<div class="rounded-lg border border-gray-200 p-4">
										<div class="flex items-center justify-between">
											<div>
												<h4 class="font-medium text-gray-900">
													{grade.studentName || 'Unknown Student'}
												</h4>
												<p class="text-sm text-gray-500">
													Graded: {formatDateTime(grade.gradedAt)}
												</p>
												<p class="mt-1 text-sm text-gray-600">{grade.feedback}</p>
											</div>
											<div class="text-right">
												<p class="text-2xl font-bold text-gray-900">
													{grade.score}/{grade.maxScore}
												</p>
												<p class="text-sm text-gray-500">
													{Math.round((grade.score / grade.maxScore) * 100)}%
												</p>
												<span
													class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {grade.gradedBy ===
													'ai'
														? 'bg-blue-100 text-blue-800'
														: 'bg-gray-100 text-gray-800'}"
												>
													{grade.gradedBy === 'ai' ? 'AI Graded' : 'Manual'}
												</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
