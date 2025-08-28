<script lang="ts">
	import { Badge } from '$lib/components/ui';
	import { getSortIcon, getSortDescription } from '$lib/utils/sorting';
	import type { Assignment } from '@shared/schemas/core';
	import type { Snippet } from 'svelte';

	let {
		assignments = [],
		selectedAssignmentId = null,
		onSelect,
		sortField = 'date',
		onSortToggle,
		loading = false,
		role = 'teacher',
		customAssignmentContent
	}: {
		assignments?: Assignment[];
		selectedAssignmentId?: string | null;
		onSelect?: (assignmentId: string) => void;
		sortField?: 'date' | 'name';
		onSortToggle?: () => void;
		loading?: boolean;
		role?: 'teacher' | 'student';
		customAssignmentContent?: Snippet<[Assignment]>;
	} = $props();

	// Helper function to check if assignment is a Google Form
	function isGoogleForm(assignment: Assignment): boolean {
		return assignment.classification?.platform === 'google_form';
	}

	function handleAssignmentSelect(assignmentId: string) {
		onSelect?.(assignmentId);
	}

	function handleSortToggle() {
		onSortToggle?.();
	}

	function getAssignmentIcon(type: string) {
		switch (type) {
			case 'quiz':
				return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
			case 'code':
			case 'karel':
				return 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z';
			default:
				return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
		}
	}

	function getAssignmentDisplayTitle(assignment: Assignment): string {
		return assignment.title || assignment.name || 'Untitled Assignment';
	}
</script>

<div class="flex h-full w-80 flex-col border-r border-gray-200 bg-gray-50">
	<!-- Header -->
	<div class="border-b border-gray-200 bg-white">
		<button
			onclick={handleSortToggle}
			class="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset"
			title={getSortDescription(sortField)}
		>
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-medium tracking-wider text-gray-700 uppercase">
					{role === 'teacher' ? 'Assessments' : 'Assignments'}
				</h3>
				<span class="ml-2 text-xs text-gray-500">
					{sortField === 'date' ? '📅' : '🔤'}
				</span>
			</div>
		</button>
	</div>

	<!-- Assignment Lists -->
	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<!-- Loading State -->
			<div class="space-y-3 p-4">
				{#each Array.from({ length: 6 }, (_, i) => i) as i}
					<div class="animate-pulse rounded-lg bg-white p-3">
						<div class="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
						<div class="h-3 w-1/2 rounded bg-gray-200"></div>
					</div>
				{/each}
			</div>
		{:else if assignments.length === 0}
			<!-- Empty State -->
			<div class="flex h-full flex-col items-center justify-center p-8 text-center">
				<div class="mb-4 rounded-full bg-gray-100 p-3">
					<svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
				</div>
				<h4 class="mb-1 text-sm font-medium text-gray-900">No assignments yet</h4>
				<p class="text-xs text-gray-500">
					{role === 'teacher'
						? 'Create assignments to see them here'
						: 'Assignments will appear here when available'}
				</p>
			</div>
		{:else}
			<!-- Simple chronological assignment list -->
			<div>
				{#each assignments as assignment (assignment.id)}
					<button
						onclick={() => handleAssignmentSelect(assignment.id)}
						class="w-full border-b border-gray-200 py-2 text-left transition-all
							{assignment.id === selectedAssignmentId ? 'bg-blue-200' : 'bg-white hover:bg-gray-50'}"
					>
						<div class="min-w-0 flex-1 px-3">
							<div class="flex items-center space-x-2">
								<svg
									class="h-4 w-4 flex-shrink-0 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={getAssignmentIcon(assignment.type)}
									/>
								</svg>
								<h5 class="truncate text-sm font-medium text-gray-900">
									{getAssignmentDisplayTitle(assignment)}
								</h5>
							</div>
							<div class="mt-1 flex items-center justify-between text-xs text-gray-600">
								<div class="flex items-center space-x-2">
									<span>Max: {assignment.maxScore || 0} pts</span>
									{#if assignment.dueDate}
										<span>•</span>
										<span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
									{/if}
								</div>
								{#if isGoogleForm(assignment)}
									<span
										class="rounded bg-purple-200 px-2 py-0.5 text-xs font-medium text-purple-700"
									>
										Form
									</span>
								{/if}
							</div>
							{#if customAssignmentContent}
								{@render customAssignmentContent(assignment)}
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
