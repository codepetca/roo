<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import type { Assignment } from '@shared/types';

	// State using Svelte 5 runes
	let assignments = $state<Assignment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let activeFilter = $state<'all' | 'quizzes' | 'assignments'>('all');

	// Filtered assignments based on search and filter
	let filteredAssignments = $derived(() => {
		let filtered = assignments;

		// Filter by type
		if (activeFilter === 'quizzes') {
			filtered = filtered.filter((a) => a.isQuiz);
		} else if (activeFilter === 'assignments') {
			filtered = filtered.filter((a) => !a.isQuiz);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			filtered = filtered.filter(
				(a) => a.title.toLowerCase().includes(query) || a.description.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	// Statistics for the current filter (computed but not displayed in current UI)
	// let stats = $derived(() => {
	//	const total = filteredAssignments.length;
	//	const quizzes = filteredAssignments.filter((a) => a.isQuiz).length;
	//	const regularAssignments = filteredAssignments.filter((a) => !a.isQuiz).length;
	//
	//	return { total, quizzes, regularAssignments };
	// });

	// Filter tabs configuration
	const filterTabs = [
		{ key: 'all' as const, label: 'All', count: assignments.length },
		{
			key: 'quizzes' as const,
			label: 'Quizzes',
			count: assignments.filter((a) => a.isQuiz).length
		},
		{
			key: 'assignments' as const,
			label: 'Assignments',
			count: assignments.filter((a) => !a.isQuiz).length
		}
	];

	async function loadAssignments() {
		try {
			loading = true;
			error = null;
			assignments = await api.listAssignments();
		} catch (err) {
			console.error('Failed to load assignments:', err);
			error = err instanceof Error ? err.message : 'Failed to load assignments';
		} finally {
			loading = false;
		}
	}

	function formatDate(timestamp: { _seconds: number; _nanoseconds: number } | null | undefined): string {
		try {
			if (timestamp && timestamp._seconds) {
				return new Date(timestamp._seconds * 1000).toLocaleDateString();
			}
			return 'No date';
		} catch {
			return 'Invalid date';
		}
	}

	onMount(() => {
		loadAssignments();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Assignments & Quizzes</h1>
			<p class="mt-1 text-gray-600">
				Manage your assignments and quizzes imported from Google Sheets
			</p>
		</div>
		<button
			onclick={loadAssignments}
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

	{#if loading && assignments.length === 0}
		<!-- Loading State -->
		<div class="rounded-lg bg-white p-6 shadow">
			<div class="animate-pulse space-y-4">
				<div class="h-4 w-1/4 rounded bg-gray-200"></div>
				<div class="space-y-3">
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<div class="h-16 rounded bg-gray-200"></div>
					{/each}
				</div>
			</div>
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
				<h3 class="font-medium text-red-800">Error loading assignments</h3>
			</div>
			<p class="mt-1 text-red-700">{error}</p>
			<button
				onclick={loadAssignments}
				class="mt-3 rounded-md bg-red-100 px-3 py-1 text-sm text-red-800 transition-colors hover:bg-red-200"
			>
				Try Again
			</button>
		</div>
	{:else}
		<!-- Filters and Search -->
		<div class="rounded-lg bg-white shadow">
			<div class="border-b border-gray-200 p-6">
				<!-- Search Bar -->
				<div class="mb-4">
					<div class="relative">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search assignments and quizzes..."
							class="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
						/>
						<svg
							class="absolute top-2.5 left-3 h-5 w-5 text-gray-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
				</div>

				<!-- Filter Tabs -->
				<div class="flex space-x-1">
					{#each filterTabs as tab (tab.key)}
						<button
							onclick={() => (activeFilter = tab.key)}
							class="rounded-md px-4 py-2 text-sm font-medium transition-colors {activeFilter ===
							tab.key
								? 'border border-blue-200 bg-blue-100 text-blue-700'
								: 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}"
						>
							{tab.label}
							<span
								class="ml-1 rounded-full px-2 py-0.5 text-xs {activeFilter === tab.key
									? 'bg-blue-200 text-blue-800'
									: 'bg-gray-200 text-gray-600'}"
							>
								{tab.key === 'all'
									? assignments.length
									: tab.key === 'quizzes'
										? assignments.filter((a) => a.isQuiz).length
										: assignments.filter((a) => !a.isQuiz).length}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Results Summary -->
			<div class="border-b border-gray-200 bg-gray-50 px-6 py-3">
				<p class="text-sm text-gray-600">
					Showing {filteredAssignments.length} of {assignments.length}
					{filteredAssignments.length === 1 ? 'item' : 'items'}
					{searchQuery.trim() ? `matching "${searchQuery}"` : ''}
				</p>
			</div>

			<!-- Assignment List -->
			<div class="divide-y divide-gray-200">
				{#if filteredAssignments.length === 0}
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
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
						<p class="mt-1 text-sm text-gray-500">
							{searchQuery.trim()
								? 'Try adjusting your search terms or filters.'
								: 'No assignments have been imported yet.'}
						</p>
					</div>
				{:else}
					{#each filteredAssignments as assignment (assignment.id)}
						<div class="p-6 transition-colors hover:bg-gray-50">
							<div class="flex items-start justify-between">
								<div class="flex items-start space-x-4">
									<!-- Type Icon -->
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

									<!-- Assignment Info -->
									<div class="min-w-0 flex-1">
										<div class="mb-1 flex items-center space-x-2">
											<h3 class="truncate text-lg font-semibold text-gray-900">
												{assignment.title}
											</h3>
											<span
												class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {assignment.isQuiz
													? 'bg-green-100 text-green-800'
													: 'bg-blue-100 text-blue-800'}"
											>
												{assignment.isQuiz ? 'Quiz' : 'Assignment'}
											</span>
										</div>

										<p class="mb-2 line-clamp-2 text-sm text-gray-600">
											{assignment.description || 'No description available'}
										</p>

										<div class="flex items-center space-x-4 text-sm text-gray-500">
											<span class="flex items-center">
												<svg
													class="mr-1 h-4 w-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
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
												<svg
													class="mr-1 h-4 w-4"
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
												{assignment.maxPoints} points
											</span>
											{#if assignment.isQuiz && assignment.formId}
												<span class="flex items-center text-green-600">
													<svg
														class="mr-1 h-4 w-4"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
													Auto-gradable
												</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Actions -->
								<div class="flex items-center space-x-2">
									<a
										href="/dashboard/assignments/{assignment.id}"
										class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
									>
										View Details
									</a>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
