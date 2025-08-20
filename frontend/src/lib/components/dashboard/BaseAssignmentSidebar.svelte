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

	// Group assignments by type
	let groupedAssignments = $derived.by(() => {
		if (!Array.isArray(assignments)) {
			return { quizzes: [], assignments: [] };
		}
		const quizzes = assignments.filter((a) => a.type === 'quiz');
		const regularAssignments = assignments.filter((a) => a.type !== 'quiz');

		return { quizzes, assignments: regularAssignments };
	});

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
			<div class="p-4 space-y-3">
				{#each Array.from({ length: 6 }, (_, i) => i) as i}
					<div class="animate-pulse rounded-lg bg-white p-3">
						<div class="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
						<div class="h-3 w-1/2 rounded bg-gray-200"></div>
					</div>
				{/each}
			</div>
		{:else if assignments.length === 0}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center h-full p-8 text-center">
				<div class="rounded-full bg-gray-100 p-3 mb-4">
					<svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
				</div>
				<h4 class="text-sm font-medium text-gray-900 mb-1">No assignments yet</h4>
				<p class="text-xs text-gray-500">
					{role === 'teacher' ? 'Create assignments to see them here' : 'Assignments will appear here when available'}
				</p>
			</div>
		{:else}
			<!-- Assignment Groups -->
			<div class="p-4 space-y-6">
				<!-- Quizzes -->
				{#if groupedAssignments.quizzes.length > 0}
					<div>
						<div class="mb-2 flex items-center">
							<h4 class="text-xs font-semibold text-gray-800 uppercase tracking-wider">Quizzes</h4>
							<Badge variant="secondary" class="ml-2">
								{groupedAssignments.quizzes.length}
							</Badge>
						</div>
						<div class="space-y-1">
							{#each groupedAssignments.quizzes as assignment}
								<button
									onclick={() => handleAssignmentSelect(assignment.id)}
									class="w-full text-left p-3 rounded-lg transition-colors border
										{assignment.id === selectedAssignmentId 
											? 'bg-blue-100 border-blue-200 text-blue-900' 
											: 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'}"
								>
									<div class="flex items-start space-x-3">
										<div class="mt-0.5 rounded-md p-1 
											{assignment.id === selectedAssignmentId 
												? 'bg-blue-200 text-blue-700' 
												: 'bg-green-100 text-green-600'}">
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
													d={getAssignmentIcon(assignment.type)} />
											</svg>
										</div>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-sm truncate">
												{getAssignmentDisplayTitle(assignment)}
											</p>
											<div class="flex items-center justify-between mt-1">
												<p class="text-xs text-gray-500 truncate">
													{assignment.maxScore} points
												</p>
												{#if customAssignmentContent}
													{@render customAssignmentContent(assignment)}
												{/if}
											</div>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Regular Assignments -->
				{#if groupedAssignments.assignments.length > 0}
					<div>
						<div class="mb-2 flex items-center">
							<h4 class="text-xs font-semibold text-gray-800 uppercase tracking-wider">Assignments</h4>
							<Badge variant="secondary" class="ml-2">
								{groupedAssignments.assignments.length}
							</Badge>
						</div>
						<div class="space-y-1">
							{#each groupedAssignments.assignments as assignment}
								<button
									onclick={() => handleAssignmentSelect(assignment.id)}
									class="w-full text-left p-3 rounded-lg transition-colors border
										{assignment.id === selectedAssignmentId 
											? 'bg-blue-100 border-blue-200 text-blue-900' 
											: 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'}"
								>
									<div class="flex items-start space-x-3">
										<div class="mt-0.5 rounded-md p-1 
											{assignment.id === selectedAssignmentId 
												? 'bg-blue-200 text-blue-700' 
												: 'bg-blue-100 text-blue-600'}">
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
													d={getAssignmentIcon(assignment.type)} />
											</svg>
										</div>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-sm truncate">
												{getAssignmentDisplayTitle(assignment)}
											</p>
											<div class="flex items-center justify-between mt-1">
												<p class="text-xs text-gray-500 truncate">
													{assignment.maxScore} points
												</p>
												{#if customAssignmentContent}
													{@render customAssignmentContent(assignment)}
												{/if}
											</div>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>