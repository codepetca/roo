<script lang="ts">
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Badge } from '$lib/components/ui';

	// Get reactive data from store
	let classrooms = $derived(dataStore.classrooms);
	let selectedClassroom = $derived(dataStore.selectedClassroom);
	let selectedClassroomId = $derived(dataStore.selectedClassroomId);
	let loading = $derived(dataStore.loading);

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

	// Auto-select first classroom if none selected
	$effect(() => {
		if (!selectedClassroomId && classrooms.length > 0) {
			dataStore.selectClassroom(classrooms[0].id);
		}
	});
</script>

<div class="relative border-b border-gray-200 bg-white px-6 py-4">
	<div class="flex items-center justify-between">
		<!-- Classroom Info -->
		<div class="flex items-center space-x-4">
			<div>
				<label class="block text-xs font-medium tracking-wider text-gray-500 uppercase">
					Current Classroom
				</label>
				{#if loading}
					<div class="mt-1 h-8 w-48 animate-pulse rounded bg-gray-200"></div>
				{:else if selectedClassroom}
					<button
						onclick={toggleDropdown}
						class="mt-1 flex items-center space-x-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50"
						class:bg-gray-50={isDropdownOpen}
					>
						<div>
							<h2 class="text-lg font-semibold text-gray-900">
								{selectedClassroom.name}
							</h2>
							<p class="text-sm text-gray-600">
								{selectedClassroom.section ? `Section ${selectedClassroom.section}` : 'No section'}
							</p>
						</div>
						<!-- Dropdown arrow -->
						<svg
							class="h-5 w-5 text-gray-400 transition-transform"
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
							<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
								<path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
							</svg>
							{selectedClassroom.studentCount || 0} Students
						{/snippet}
					</Badge>

					<Badge variant="info">
						{#snippet children()}
							<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
								<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
								<path
									fill-rule="evenodd"
									d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h2a1 1 0 100-2 2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H6z"
									clip-rule="evenodd"
								/>
							</svg>
							{selectedClassroom.assignmentCount || 0} Assignments
						{/snippet}
					</Badge>

					{#if selectedClassroom.ungradedSubmissions && selectedClassroom.ungradedSubmissions > 0}
						<Badge variant="warning">
							{#snippet children()}
								<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
								{selectedClassroom.ungradedSubmissions} Ungraded
							{/snippet}
						</Badge>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Quick Actions -->
		<div class="flex items-center space-x-2">
			<button
				class="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				onclick={() => (window.location.href = '/teacher/data-import')}
			>
				Import Data
			</button>
			<button
				class="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				onclick={() => dataStore.setLoading(true)}
				disabled={loading}
			>
				{loading ? 'Refreshing...' : 'Refresh'}
			</button>
		</div>
	</div>

	<!-- Dropdown Menu -->
	{#if isDropdownOpen && classrooms.length > 0}
		<div
			class="absolute top-full left-6 z-50 mt-1 w-96 rounded-lg border border-gray-200 bg-white shadow-lg"
		>
			<div class="max-h-96 overflow-y-auto p-2">
				{#each classrooms as classroom (classroom.id)}
					<button
						onclick={() => selectClassroom(classroom.id)}
						class="w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-50"
						class:bg-blue-50={classroom.id === selectedClassroomId}
						class:border-blue-200={classroom.id === selectedClassroomId}
						class:border={classroom.id === selectedClassroomId}
					>
						<div class="flex items-center justify-between">
							<div>
								<div class="font-medium text-gray-900">{classroom.name}</div>
								<div class="text-sm text-gray-600">
									{classroom.section ? `Section ${classroom.section}` : ''} •
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
