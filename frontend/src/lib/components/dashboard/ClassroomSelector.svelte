<script lang="ts">
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Badge } from '$lib/components/ui';

	// Get reactive data from store
	let classrooms = $derived(dataStore.classrooms);
	let selectedClassroom = $derived(dataStore.selectedClassroom);
	let selectedClassroomId = $derived(dataStore.selectedClassroomId);
	let loading = $derived(dataStore.loading);
	let viewMode = $derived(dataStore.viewMode);
	let gradingInProgress = $derived(dataStore.gradingInProgress);
	let gradingProgress = $derived(dataStore.gradingProgress);

	// Dropdown state
	let isDropdownOpen = $state(false);

	function selectClassroom(classroomId: string) {
		dataStore.selectClassroom(classroomId);
		isDropdownOpen = false;
	}

	function toggleDropdown() {
		if (classrooms.length > 0) {
			isDropdownOpen = !isDropdownOpen;
		}
	}

	function setViewMode(mode: 'assignment' | 'grid') {
		dataStore.setViewMode(mode);
	}

	// Auto-select first classroom if none selected
	$effect(() => {
		if (!selectedClassroomId && classrooms.length > 0) {
			dataStore.selectClassroom(classrooms[0].id);
		}
	});
</script>

<div class="relative border-b border-gray-200 bg-white px-4 py-1">
	<div class="flex items-center justify-between">
		<!-- Left Section: Classroom Info and Stats -->
		<div class="flex items-center space-x-4">
			<div>
				{#if loading}
					<div class="mt-1 h-8 w-48 animate-pulse rounded bg-gray-200"></div>
				{:else if selectedClassroom}
					<button
						onclick={toggleDropdown}
						class="mt-1 flex w-72 items-center justify-between rounded-lg bg-blue-100 px-4 py-2 text-left transition-colors hover:bg-blue-200"
						class:bg-blue-200={isDropdownOpen}
					>
						<h2 class="text-lg font-semibold text-blue-700">
							{selectedClassroom.name}
						</h2>
						<!-- Dropdown arrow -->
						<svg
							class="h-5 w-5 flex-shrink-0 text-blue-500 transition-transform"
							class:rotate-180={isDropdownOpen}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
				{:else}
					<div class="mt-1 text-sm text-gray-500">No classrooms available</div>
				{/if}
			</div>

			<!-- Classroom Stats -->
			{#if selectedClassroom}
				<div class="flex items-center space-x-4">
					<Badge variant="secondary">
						{#snippet children()}
							<div class="flex items-center">
								<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
									<path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
								</svg>
								{selectedClassroom.studentCount || 0} Students
							</div>
						{/snippet}
					</Badge>

					{#if selectedClassroom.ungradedSubmissions && selectedClassroom.ungradedSubmissions > 0}
						<Badge variant="warning">
							{#snippet children()}
								<div class="flex items-center">
									<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
											clip-rule="evenodd"
										/>
									</svg>
									{selectedClassroom.ungradedSubmissions} Ungraded
								</div>
							{/snippet}
						</Badge>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Center Section: View Mode Toggle -->
		{#if selectedClassroom}
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
				<div class="flex items-center space-x-1 rounded-lg bg-white p-1">
					<button
						class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {viewMode ===
						'assignment'
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-700 hover:bg-gray-100'}"
						onclick={() => setViewMode('assignment')}
					>
						📝 Assessments
					</button>
					<button
						class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {viewMode === 'grid'
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-700 hover:bg-gray-100'}"
						onclick={() => setViewMode('grid')}
					>
						👥 Students
					</button>
				</div>
			</div>
		{/if}

		<!-- Right Section: Grade All + Refresh Button -->
		<div class="flex items-center space-x-2">
			<!-- Grade All Button (only in assessments mode) -->
			{#if selectedClassroom && viewMode === 'assignment'}
				<button
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={() => dataStore.gradeAllAssignments(selectedClassroom.id)}
					disabled={gradingInProgress || loading}
					title={gradingInProgress ? gradingProgress.status || 'Grading in progress...' : 'Grade all ungraded assignments in this classroom'}
				>
					{#if gradingInProgress}
						<svg class="mr-1 inline h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						{#if gradingProgress.total > 0}
							{gradingProgress.current}/{gradingProgress.total}
						{:else}
							Grading...
						{/if}
					{:else}
						🤖 Grade All
					{/if}
				</button>
			{/if}
			
			<button
				class="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-50"
				onclick={() => dataStore.setLoading(true)}
				disabled={loading}
				title={loading ? 'Refreshing...' : 'Refresh'}
			>
				<svg
					class="h-4 w-4 transition-transform"
					class:animate-spin={loading}
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
			</button>
		</div>
	</div>

	<!-- Dropdown Menu -->
	{#if isDropdownOpen && classrooms.length > 0}
		<div
			class="absolute top-full left-4 z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg"
		>
			<div class="max-h-96 overflow-y-auto p-2">
				{#each classrooms as classroom (classroom.id)}
					<button
						onclick={() => selectClassroom(classroom.id)}
						class="w-full rounded-lg p-3 text-left transition-colors hover:bg-blue-50"
						class:bg-blue-50={classroom.id === selectedClassroomId}
						class:border-blue-200={classroom.id === selectedClassroomId}
						class:border={classroom.id === selectedClassroomId}
					>
						<div class="flex items-center justify-between">
							<div>
								<div class="font-medium text-gray-900">{classroom.name}</div>
								<div class="text-sm text-gray-600">
									{classroom.studentCount || 0} students •
									{classroom.assignmentCount || 0} assignments
								</div>
							</div>
							{#if classroom.id === selectedClassroomId}
								<svg class="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						</div>
						{#if classroom.ungradedSubmissions && classroom.ungradedSubmissions > 0}
							<div class="mt-1">
								<Badge variant="warning" size="sm">
									{#snippet children()}
										{classroom.ungradedSubmissions} submissions need grading
									{/snippet}
								</Badge>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Click outside to close dropdown -->
	{#if isDropdownOpen}
		<button
			class="fixed inset-0 z-40"
			onclick={() => (isDropdownOpen = false)}
			aria-label="Close dropdown"
		></button>
	{/if}
</div>
