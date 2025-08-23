<script lang="ts">
	import { Card, Badge, Button } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/dashboard';
	import type { Assignment, Grade } from '@shared/schemas/core';
	import type { Snippet } from 'svelte';

	let {
		assignment,
		grade,
		loading = false,
		actions
	}: {
		assignment?: Assignment;
		grade?: Grade;
		loading?: boolean;
		actions?: Snippet;
	} = $props();

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

	function getGradeColor(percentage: number): string {
		if (percentage >= 90) return 'bg-green-500';
		if (percentage >= 80) return 'bg-blue-500';
		if (percentage >= 70) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	function getGradeTextColor(percentage: number): string {
		if (percentage >= 90) return 'text-green-800 bg-green-100';
		if (percentage >= 80) return 'text-blue-800 bg-blue-100';
		if (percentage >= 70) return 'text-yellow-800 bg-yellow-100';
		return 'text-red-800 bg-red-100';
	}

	function formatDateTime(timestamp: any): string {
		try {
			let date: Date;
			if (timestamp && typeof timestamp === 'object') {
				if (timestamp._seconds) {
					date = new Date(timestamp._seconds * 1000);
				} else if (timestamp.seconds) {
					date = new Date(timestamp.seconds * 1000);
				} else if (timestamp instanceof Date) {
					date = timestamp;
				} else {
					return 'No date';
				}
			} else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
				date = new Date(timestamp);
			} else {
				return 'No date';
			}

			if (isNaN(date.getTime())) {
				return 'Invalid date';
			}

			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			});
		} catch {
			return 'Invalid date';
		}
	}

	function getAssignmentTypeIcon(type: string) {
		switch (type) {
			case 'quiz':
				return 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3';
			default:
				return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
		}
	}
</script>

<div class="flex-1 overflow-auto">
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		{#if loading}
			<!-- Loading State -->
			<div class="space-y-6">
				<div class="animate-pulse">
					<div class="mb-4 h-8 w-1/3 rounded bg-gray-200"></div>
					<div class="h-4 w-2/3 rounded bg-gray-200"></div>
				</div>
				<div class="animate-pulse rounded-lg bg-white p-6 shadow">
					<div class="mb-4 h-6 w-1/4 rounded bg-gray-200"></div>
					<div class="space-y-3">
						<div class="h-4 w-3/4 rounded bg-gray-200"></div>
						<div class="h-4 w-1/2 rounded bg-gray-200"></div>
					</div>
				</div>
			</div>
		{:else if !assignment}
			<!-- No Assignment Selected -->
			<div class="flex h-96 flex-col items-center justify-center text-center">
				<div class="mb-6 rounded-full bg-gray-100 p-6">
					<svg
						class="h-12 w-12 text-gray-400"
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
				<h3 class="mb-2 text-lg font-medium text-gray-900">Select an assignment</h3>
				<p class="max-w-sm text-gray-500">
					Choose an assignment from the sidebar to view your grade and feedback details.
				</p>
			</div>
		{:else}
			<!-- Assignment Detail View -->
			<div class="space-y-6">
				<!-- Page Header -->
				<PageHeader
					title={assignment.title || assignment.name || 'Untitled Assignment'}
					description="Assignment details and your grade"
					{actions}
				/>

				{#if grade}
					<!-- Grade Summary Card -->
					<Card>
						{#snippet children()}
							<div class="p-6">
								<div class="mb-4 flex items-center justify-between">
									<h3 class="text-lg font-semibold text-gray-900">Your Grade</h3>
									<Badge variant="secondary">
										{grade.gradedBy === 'ai' ? '🤖 AI Graded' : '👨‍🏫 Manual'}
									</Badge>
								</div>

								<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
									<!-- Score Display -->
									<div class="text-center">
										<div class="flex items-center justify-center">
											<div class="rounded-full {getGradeColor(grade.percentage)} mb-3 p-6">
												<div class="text-2xl font-bold text-white">
													{Math.round(grade.percentage)}%
												</div>
											</div>
										</div>
										<div class="space-y-1">
											<div class="text-lg font-semibold text-gray-900">
												{grade.score}/{grade.maxScore}
											</div>
											<div
												class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium {getGradeTextColor(
													grade.percentage
												)}"
											>
												{getLetterGrade(grade.percentage)}
											</div>
										</div>
									</div>

									<!-- Grade Details -->
									<div class="space-y-4 lg:col-span-2">
										<div class="grid grid-cols-2 gap-4">
											<div>
												<dt class="text-sm font-medium text-gray-500">Assignment Type</dt>
												<dd class="mt-1 flex items-center text-sm text-gray-900">
													<svg
														class="mr-2 h-4 w-4 text-gray-400"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d={getAssignmentTypeIcon(assignment.type)}
														/>
													</svg>
													{assignment.classification?.platform === 'google_form' ? 'Form' : 'Assignment'}
												</dd>
											</div>
											<div>
												<dt class="text-sm font-medium text-gray-500">Graded On</dt>
												<dd class="mt-1 text-sm text-gray-900">
													{formatDateTime(grade.gradedAt)}
												</dd>
											</div>
										</div>

										{#if grade.gradingMethod}
											<div>
												<dt class="text-sm font-medium text-gray-500">Grading Method</dt>
												<dd class="mt-1 text-sm text-gray-900 capitalize">
													{grade.gradingMethod.replace('_', ' ')}
												</dd>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/snippet}
					</Card>
				{/if}

				<!-- Assignment Information -->
				<Card>
					{#snippet children()}
						<div class="p-6">
							<h3 class="mb-4 text-lg font-semibold text-gray-900">Assignment Information</h3>
							<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<dt class="text-sm font-medium text-gray-500">Points Possible</dt>
									<dd class="mt-1 text-sm text-gray-900">{assignment.maxScore} points</dd>
								</div>
								<div>
									<dt class="text-sm font-medium text-gray-500">Assignment Type</dt>
									<dd class="mt-1 text-sm text-gray-900">
										{assignment.classification?.platform === 'google_form' ? 'Form' : 'Assignment'}
									</dd>
								</div>
								{#if assignment.description}
									<div class="sm:col-span-2">
										<dt class="text-sm font-medium text-gray-500">Description</dt>
										<dd class="mt-1 text-sm whitespace-pre-wrap text-gray-900">
											{assignment.description}
										</dd>
									</div>
								{/if}
							</dl>
						</div>
					{/snippet}
				</Card>

				{#if grade?.feedback}
					<!-- Feedback Section -->
					<Card>
						{#snippet children()}
							<div class="p-6">
								<h3 class="mb-4 text-lg font-semibold text-gray-900">Feedback</h3>
								<div class="prose prose-sm max-w-none">
									<div class="rounded-lg bg-gray-50 p-4 whitespace-pre-wrap text-gray-700">
										{grade.feedback}
									</div>
								</div>
							</div>
						{/snippet}
					</Card>
				{/if}

				{#if grade?.rubricScores && grade.rubricScores.length > 0}
					<!-- Rubric Breakdown -->
					<Card>
						{#snippet children()}
							<div class="p-6">
								<h3 class="mb-4 text-lg font-semibold text-gray-900">Rubric Breakdown</h3>
								<div class="space-y-4">
									{#each grade.rubricScores as rubricScore}
										<div class="rounded-lg border p-4">
											<div class="mb-2 flex items-start justify-between">
												<h4 class="font-medium text-gray-900">{rubricScore.criterionTitle}</h4>
												<div class="text-sm font-medium text-gray-900">
													{rubricScore.score}/{rubricScore.maxScore}
												</div>
											</div>
											{#if rubricScore.feedback}
												<p class="mt-2 text-sm text-gray-600">{rubricScore.feedback}</p>
											{/if}
											<!-- Progress bar -->
											<div class="mt-3">
												<div class="h-2 rounded-full bg-gray-200">
													<div
														class="h-2 rounded-full bg-blue-600 transition-all duration-300"
														style="width: {(rubricScore.score / rubricScore.maxScore) * 100}%"
													></div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/snippet}
					</Card>
				{/if}

				{#if !grade}
					<!-- No Grade Yet -->
					<Card>
						{#snippet children()}
							<div class="p-12 text-center">
								<div
									class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 p-6"
								>
									<svg
										class="h-8 w-8 text-gray-400"
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
								</div>
								<h3 class="mb-2 text-lg font-medium text-gray-900">Not Graded Yet</h3>
								<p class="mx-auto max-w-sm text-gray-500">
									This assignment hasn't been graded yet. Check back later to see your results and
									feedback.
								</p>
							</div>
						{/snippet}
					</Card>
				{/if}
			</div>
		{/if}
	</div>
</div>
