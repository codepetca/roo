<script lang="ts">
	import { onMount } from 'svelte';
	import { appState } from '$lib/stores';
	import { Badge, Button } from '$lib/components/ui';

	// Props
	let {
		selectedClassroomId = $bindable(),
		onClassroomSelect
	}: {
		selectedClassroomId?: string;
		onClassroomSelect?: (classroomId: string) => void;
	} = $props();

	// Sync with centralized store
	$effect(() => {
		if (selectedClassroomId !== appState.selectedClassroomId) {
			selectedClassroomId = appState.selectedClassroomId;
		}
	});

	// Handle classroom selection
	async function handleClassroomSelect(classroomId: string) {
		await appState.selectClassroom(classroomId);
		onClassroomSelect?.(classroomId);
	}

	onMount(() => {
		appState.loadDashboard();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-gray-200 p-4">
		<h2 class="text-lg font-semibold text-gray-900">My Classes</h2>
		<p class="text-sm text-gray-600">Select a class to view assignments</p>
	</div>

	<!-- Loading State -->
	{#if appState.loading}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-2 text-sm text-gray-600">Loading classes...</p>
			</div>
		</div>
	{:else if appState.error}
		<!-- Error State -->
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="text-center">
				<svg
					class="mx-auto h-12 w-12 text-red-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
				<p class="mt-2 text-sm text-red-600">{appState.error}</p>
				<Button variant="secondary" size="sm" onclick={appState.loadDashboard} class="mt-2">
					{#snippet children()}
						Try Again
					{/snippet}
				</Button>
			</div>
		</div>
	{:else if !appState.hasData}
		<!-- Empty State -->
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="space-y-4 text-center">
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
				<h3 class="mt-2 text-sm font-medium text-gray-900">Get Started with Roo</h3>
				<p class="text-xs text-gray-500">Import classroom data or connect to Google Classroom</p>

				<Button
					variant="primary"
					size="sm"
					onclick={() => (window.location.href = '/teacher/data-import')}
					class="mt-4"
				>
					{#snippet children()}
						<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
						Import Data
					{/snippet}
				</Button>
			</div>
		</div>
	{:else}
		<!-- Classroom List -->
		<div class="flex-1 overflow-y-auto">
			<div class="space-y-1 p-2">
				{#each appState.classrooms as classroom (classroom.id)}
					<button
						onclick={() => handleClassroomSelect(classroom.id)}
						class="w-full rounded-lg p-3 text-left transition-colors {appState.selectedClassroomId ===
						classroom.id
							? 'border border-blue-200 bg-blue-50'
							: 'hover:bg-gray-50'}"
					>
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<h3 class="truncate font-medium text-gray-900">{classroom.name}</h3>
								<p class="truncate text-sm text-gray-600">{classroom.courseCode}</p>
							</div>
							{#if appState.selectedClassroomId === classroom.id}
								<svg
									class="h-5 w-5 flex-shrink-0 text-blue-600"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						</div>

						<!-- Metadata badges -->
						<div class="mt-2 flex items-center gap-2 text-xs">
							{#if classroom.assignmentCount !== undefined}
								<Badge variant="info" size="sm">
									{#snippet children()}
										{classroom.assignmentCount} assignments
									{/snippet}
								</Badge>
							{/if}
							{#if classroom.ungradedSubmissions !== undefined && classroom.ungradedSubmissions > 0}
								<Badge variant="warning" size="sm">
									{#snippet children()}
										{classroom.ungradedSubmissions} pending
									{/snippet}
								</Badge>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Footer -->
	<div class="border-t border-gray-200 p-4">
		<Button variant="secondary" size="sm" onclick={appState.refresh} class="w-full">
			{#snippet children()}
				<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Refresh
			{/snippet}
		</Button>
	</div>
</div>
