<script lang="ts">
	import type { AssignmentResponse } from '$lib/schemas';
	import { Badge, Button } from '$lib/components/ui';
	import { formatTimestamp } from '$lib/schemas';

	// Props
	let {
		assignment,
		onView
	}: {
		assignment: AssignmentResponse;
		onView?: (assignmentId: string) => void;
	} = $props();

	// Derived properties
	let isQuiz = $derived(assignment.isQuiz);
	let submissionProgress = $derived(() => {
		if (assignment.submissionCount && assignment.gradedCount !== undefined) {
			return `${assignment.gradedCount}/${assignment.submissionCount} graded`;
		}
		if (assignment.submissionCount) {
			return `${assignment.submissionCount} submitted`;
		}
		return 'No submissions';
	});

	// Handle click
	function handleClick() {
		onView?.(assignment.id);
	}
</script>

<div
	class="cursor-pointer rounded-lg border transition-all hover:shadow-md {isQuiz
		? 'border-teal-200 bg-teal-50 hover:bg-teal-100'
		: 'border-gray-200 bg-white hover:bg-gray-50'}"
	onclick={handleClick}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
	<div class="p-4">
		<!-- Header row -->
		<div class="flex items-start justify-between">
			<div class="flex min-w-0 flex-1 items-center space-x-3">
				<!-- Icon -->
				<div
					class="rounded-lg p-2 {isQuiz
						? 'bg-teal-100 text-teal-600'
						: 'bg-blue-100 text-blue-600'} flex-shrink-0"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d={isQuiz
								? 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3'
								: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'}
						/>
					</svg>
				</div>

				<!-- Title and details -->
				<div class="min-w-0 flex-1">
					<h3 class="truncate font-semibold text-gray-900">{assignment.title}</h3>
					{#if assignment.description}
						<p class="mt-1 truncate text-sm text-gray-600">{assignment.description}</p>
					{/if}
				</div>
			</div>

			<!-- View button -->
			<Button variant="ghost" size="sm" onclick={handleClick}>
				{#snippet children()}
					View
				{/snippet}
			</Button>
		</div>

		<!-- Metadata row -->
		<div class="mt-3 flex items-center justify-between">
			<div class="flex items-center gap-3 text-sm">
				<!-- Type badge -->
				<Badge variant={isQuiz ? 'success' : 'info'} size="sm">
					{#snippet children()}
						{isQuiz ? 'Quiz' : 'Assignment'}
					{/snippet}
				</Badge>

				<!-- Points -->
				<span class="text-gray-600">{assignment.maxPoints} points</span>

				<!-- Due date -->
				{#if assignment.dueDate}
					<span class="text-gray-600">
						Due: {formatTimestamp(assignment.dueDate)}
					</span>
				{/if}
			</div>

			<!-- Submission status -->
			<div class="text-sm text-gray-600">
				{submissionProgress}
			</div>
		</div>

		<!-- Progress bar for grading (if there are submissions) -->
		{#if assignment.submissionCount && assignment.submissionCount > 0}
			<div class="mt-3">
				<div class="mb-1 flex items-center justify-between text-xs text-gray-600">
					<span>Grading Progress</span>
					<span>{assignment.gradedCount || 0}/{assignment.submissionCount}</span>
				</div>
				<div class="h-2 w-full rounded-full bg-gray-200">
					<div
						class="h-2 rounded-full transition-all {isQuiz ? 'bg-teal-500' : 'bg-blue-500'}"
						style="width: {assignment.submissionCount > 0
							? ((assignment.gradedCount || 0) / assignment.submissionCount) * 100
							: 0}%"
					></div>
				</div>
			</div>
		{/if}
	</div>
</div>
