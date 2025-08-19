<script lang="ts">
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Badge } from '$lib/components/ui';
	import type { Assignment } from '@shared/schemas/core';

	// Get reactive data from store
	let selectedClassroomId = $derived(dataStore.selectedClassroomId);
	let selectedAssignmentId = $derived(dataStore.selectedAssignmentId);
	let assignments = $derived(dataStore.selectedClassroomAssignments);
	let loading = $derived(dataStore.loading);

	// Debug logging for assignment sidebar
	$effect(() => {
		console.log('📋 AssignmentSidebar Debug:', {
			selectedClassroomId,
			selectedAssignmentId,
			assignmentsCount: assignments?.length || 0,
			assignments: Array.isArray(assignments) ? assignments.map(a => ({ 
				id: a.id, 
				title: a.title, 
				name: a.name,
				displayTitle: a.title || a.name || 'Untitled',
				type: a.type,
				allKeys: Object.keys(a)
			})) : 'not an array',
			assignmentsType: typeof assignments,
			assignmentsValue: assignments,
			loading
		});
	});

	// Group assignments by type
	let groupedAssignments = $derived.by(() => {
		if (!Array.isArray(assignments)) {
			console.log('📋 GroupedAssignments: Not an array, returning empty groups');
			return { quizzes: [], assignments: [] };
		}
		const quizzes = assignments.filter((a) => a.type === 'quiz');
		const regularAssignments = assignments.filter((a) => a.type !== 'quiz');
		
		console.log('📋 GroupedAssignments:', {
			totalAssignments: assignments.length,
			quizzesCount: quizzes.length,
			regularAssignmentsCount: regularAssignments.length,
			quizzes: quizzes.map(q => ({ id: q.id, title: q.title || q.name, type: q.type })),
			regularAssignments: regularAssignments.map(a => ({ id: a.id, title: a.title || a.name, type: a.type }))
		});
		
		return { quizzes, assignments: regularAssignments };
	});

	function selectAssignment(assignmentId: string) {
		dataStore.selectAssignment(assignmentId);
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

	// Auto-select first assignment if none selected
	$effect(() => {
		if (!selectedAssignmentId && Array.isArray(assignments) && assignments.length > 0) {
			dataStore.selectAssignment(assignments[0].id);
		}
	});
</script>

<div class="flex h-full w-80 flex-col border-r border-gray-200 bg-gray-50">
	<!-- Header -->
	<div class="border-b border-gray-200 bg-white px-4 py-3">
		<h3 class="text-sm font-semibold tracking-wider text-gray-900 uppercase">Assignments</h3>
		{#if selectedClassroomId && Array.isArray(assignments) && assignments.length > 0}
			<p class="mt-1 text-xs text-gray-600">
				{assignments.length} total ({groupedAssignments?.quizzes?.length || 0} quizzes, {groupedAssignments?.assignments?.length || 0} assignments)
			</p>
		{/if}
	</div>

	<!-- Assignment List -->
	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<!-- Loading skeleton -->
			<div class="space-y-2 p-3">
				{#each Array(5) as _}
					<div class="h-20 animate-pulse rounded-lg bg-gray-200"></div>
				{/each}
			</div>
		{:else if !selectedClassroomId}
			<!-- No classroom selected -->
			<div class="flex h-full items-center justify-center p-4">
				<div class="text-center">
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
					<p class="mt-2 text-sm text-gray-600">Select a classroom to view assignments</p>
				</div>
			</div>
		{:else if !Array.isArray(assignments) || assignments.length === 0}
			<!-- No assignments -->
			<div class="flex h-full items-center justify-center p-4">
				<div class="text-center">
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
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p class="mt-2 text-sm text-gray-600">No assignments in this classroom</p>
					<button
						class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
						onclick={() => console.log('Create assignment')}
					>
						Create First Assignment
					</button>
				</div>
			</div>
		{:else}
			<div class="space-y-4 p-3">
				<!-- Quizzes Section -->
				{#if groupedAssignments?.quizzes?.length > 0}
					<div>
						<h4 class="mb-2 px-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Quizzes ({groupedAssignments.quizzes.length})
						</h4>
						<div class="space-y-2">
							{#each groupedAssignments.quizzes as assignment (assignment.id)}
								<button
									onclick={() => selectAssignment(assignment.id)}
									class="w-full rounded-lg border bg-white p-3 text-left transition-all hover:shadow-sm"
									class:border-blue-500={assignment.id === selectedAssignmentId}
									class:bg-blue-50={assignment.id === selectedAssignmentId}
									class:border-gray-200={assignment.id !== selectedAssignmentId}
								>
									<div class="flex items-start justify-between">
										<div class="min-w-0 flex-1">
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
													{assignment.title || assignment.name || 'Untitled Quiz'}
												</h5>
											</div>
											<div class="mt-1 flex items-center space-x-2 text-xs text-gray-600">
												<span>Max: {assignment.maxScore || assignment.maxPoints || 0} pts</span>
												{#if assignment.dueDate}
													<span>•</span>
													<span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
												{/if}
											</div>
										</div>
										<Badge variant="info" size="sm">
											{#snippet children()}
												Quiz
											{/snippet}
										</Badge>
									</div>
									{#if assignment.id === selectedAssignmentId}
										<div class="mt-2 flex items-center justify-between text-xs">
											<span class="font-medium text-blue-600">Currently viewing</span>
										</div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Regular Assignments Section -->
				{#if groupedAssignments?.assignments?.length > 0}
					<div>
						<h4 class="mb-2 px-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Assignments ({groupedAssignments?.assignments?.length || 0})
						</h4>
						<div class="space-y-2">
							{#each groupedAssignments?.assignments || [] as assignment (assignment.id)}
								<button
									onclick={() => selectAssignment(assignment.id)}
									class="w-full rounded-lg border bg-white p-3 text-left transition-all hover:shadow-sm"
									class:border-blue-500={assignment.id === selectedAssignmentId}
									class:bg-blue-50={assignment.id === selectedAssignmentId}
									class:border-gray-200={assignment.id !== selectedAssignmentId}
								>
									<div class="flex items-start justify-between">
										<div class="min-w-0 flex-1">
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
													{assignment.title || assignment.name || 'Untitled Assignment'}
												</h5>
											</div>
											<div class="mt-1 flex items-center space-x-2 text-xs text-gray-600">
												<span>Max: {assignment.maxScore || assignment.maxPoints || 0} pts</span>
												{#if assignment.dueDate}
													<span>•</span>
													<span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
												{/if}
											</div>
										</div>
										<Badge variant="secondary" size="sm">
											{#snippet children()}
												{assignment.type || 'Assignment'}
											{/snippet}
										</Badge>
									</div>
									{#if assignment.id === selectedAssignmentId}
										<div class="mt-2 flex items-center justify-between text-xs">
											<span class="font-medium text-blue-600">Currently viewing</span>
										</div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Footer Actions -->
	<div class="border-t border-gray-200 bg-white p-3">
		<button
			class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
			disabled={!selectedClassroomId}
			onclick={() => console.log('Create new assignment')}
		>
			+ New Assignment
		</button>
	</div>
</div>
