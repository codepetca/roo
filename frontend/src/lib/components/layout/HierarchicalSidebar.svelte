<script lang="ts">
	import { onMount } from 'svelte';
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Badge, Button } from '$lib/components/ui';
	import type { Classroom, Assignment } from '@shared/schemas/core';

	// Props
	let {
		onClassroomSelect,
		onAssignmentSelect
	}: {
		onClassroomSelect?: (classroomId: string) => void;
		onAssignmentSelect?: (assignmentId: string, classroomId: string) => void;
	} = $props();

	// Local state for UI interactions
	let expandedClassrooms = $state<Set<string>>(new Set());
	let hoveredItem = $state<string | null>(null);

	// Reactive data from store
	let classrooms = $derived(dataStore.classrooms);
	let assignments = $derived(dataStore.assignments);
	let selectedClassroomId = $derived(dataStore.selectedClassroomId);
	let selectedAssignmentId = $derived(dataStore.selectedAssignmentId);
	let loading = $derived(dataStore.loading);
	let error = $derived(dataStore.error);
	let hasData = $derived(dataStore.hasData);

	// Get assignments grouped by classroom from the data store
	let assignmentsByClassroom = $derived(dataStore.assignmentsByClassroom());

	// Toggle classroom expansion
	function toggleClassroomExpansion(classroomId: string) {
		const newExpanded = new Set(expandedClassrooms);
		if (newExpanded.has(classroomId)) {
			newExpanded.delete(classroomId);
		} else {
			newExpanded.add(classroomId);
		}
		expandedClassrooms = newExpanded;
		
		// Save to localStorage for persistence
		localStorage.setItem('expandedClassrooms', JSON.stringify([...newExpanded]));
	}

	// Handle classroom selection
	async function handleClassroomSelect(classroomId: string) {
		// Expand classroom if not already expanded
		if (!expandedClassrooms.has(classroomId)) {
			toggleClassroomExpansion(classroomId);
		}
		
		// Select in store
		dataStore.selectClassroom(classroomId);
		
		// Clear assignment selection when selecting classroom
		if (selectedAssignmentId) {
			dataStore.selectAssignment('');
		}
		
		onClassroomSelect?.(classroomId);
	}

	// Handle assignment selection
	function handleAssignmentSelect(assignmentId: string, classroomId: string) {
		// Ensure classroom is selected and expanded
		if (selectedClassroomId !== classroomId) {
			dataStore.selectClassroom(classroomId);
		}
		if (!expandedClassrooms.has(classroomId)) {
			toggleClassroomExpansion(classroomId);
		}
		
		// Select assignment
		dataStore.selectAssignment(assignmentId);
		
		onAssignmentSelect?.(assignmentId, classroomId);
	}

	// Get assignment type icon path
	function getAssignmentIcon(assignment: Assignment): string {
		if (assignment.type === 'quiz') {
			return 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3';
		}
		return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
	}

	// Initialize data and restore expanded state
	onMount(() => {
		// Initialize data store if needed
		if (!dataStore.initialized) {
			dataStore.initialize();
		}
		
		// Restore expanded classrooms from localStorage
		try {
			const stored = localStorage.getItem('expandedClassrooms');
			if (stored) {
				const parsed = JSON.parse(stored);
				expandedClassrooms = new Set(parsed);
			}
		} catch (e) {
			console.warn('Failed to restore expanded classrooms:', e);
		}
	});
</script>

<div class="flex h-full flex-col bg-white border-r border-gray-200 shadow-sm" style="width: 320px;">
	<!-- Header (No "My Classes" text - just action button) -->
	<div class="border-b border-gray-200 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-2">
				<svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
				</svg>
				<h2 class="text-lg font-semibold text-gray-900">Classrooms</h2>
			</div>
			<Button variant="secondary" size="sm" onclick={dataStore.refresh} disabled={loading}>
				{#snippet children()}
					{#if loading}
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					{:else}
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
						</svg>
					{/if}
				{/snippet}
			</Button>
		</div>
	</div>

	<!-- Loading State -->
	{#if loading && !hasData}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
				<p class="mt-2 text-sm text-gray-600">Loading classrooms...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="text-center">
				<svg class="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"/>
				</svg>
				<p class="mt-2 text-sm text-red-600">{error}</p>
				<Button variant="secondary" size="sm" onclick={dataStore.refresh} class="mt-2">
					{#snippet children()}
						Try Again
					{/snippet}
				</Button>
			</div>
		</div>
	{:else if !hasData}
		<!-- Empty State -->
		<div class="flex flex-1 items-center justify-center p-4">
			<div class="space-y-4 text-center">
				<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">Get Started with Roo</h3>
				<p class="text-xs text-gray-500">Import classroom data to see your classes</p>
				<Button variant="primary" size="sm" onclick={() => (window.location.href = '/teacher/data-import')} class="mt-4">
					{#snippet children()}
						<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
						</svg>
						Import Data
					{/snippet}
				</Button>
			</div>
		</div>
	{:else}
		<!-- Hierarchical Classroom/Assignment Tree -->
		<div class="flex-1 overflow-y-auto">
			<div class="space-y-1 p-2">
				{#each classrooms as classroom (classroom.id)}
					{@const classroomAssignments = assignmentsByClassroom.get(classroom.id) || []}
					{@const isExpanded = expandedClassrooms.has(classroom.id)}
					{@const isSelected = selectedClassroomId === classroom.id}
					
					<!-- Classroom Item -->
					<div class="space-y-1">
						<div
							onmouseenter={() => hoveredItem = classroom.id}
							onmouseleave={() => hoveredItem = null}
							class="w-full rounded-lg transition-all duration-200 {isSelected
								? 'bg-blue-50 border border-blue-200 shadow-sm'
								: hoveredItem === classroom.id
									? 'bg-gray-50 border border-gray-200'
									: 'border border-transparent hover:bg-gray-50'}"
						>
							<div class="flex items-center justify-between p-3">
								<!-- Classroom Info -->
								<div class="min-w-0 flex-1">
									<div class="flex items-center space-x-2">
										<!-- Expand/Collapse Icon -->
										<button
											onclick={() => toggleClassroomExpansion(classroom.id)}
											class="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 transition-colors"
											aria-label="Toggle classroom assignments"
										>
											<svg
												class="h-4 w-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
											</svg>
										</button>
										
										<!-- Classroom Icon -->
										<div class="flex-shrink-0 p-1.5 bg-blue-100 text-blue-600 rounded-lg">
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
											</svg>
										</div>
										
										<!-- Clickable Classroom Name Area -->
										<button
											onclick={() => handleClassroomSelect(classroom.id)}
											class="min-w-0 flex-1 text-left hover:bg-gray-100 rounded px-2 py-1 transition-colors"
										>
											<h3 class="truncate font-medium text-gray-900 text-sm">{classroom.name}</h3>
											<p class="truncate text-xs text-gray-500">{classroom.courseCode || classroom.section || ''}</p>
										</button>
									</div>
									
									<!-- Classroom Metadata -->
									<div class="mt-2 ml-6 flex items-center gap-2 text-xs">
										<Badge variant="info" size="sm">
											{#snippet children()}
												{classroom.studentCount} students
											{/snippet}
										</Badge>
										<Badge variant="secondary" size="sm">
											{#snippet children()}
												{classroomAssignments.length} assignments
											{/snippet}
										</Badge>
										{#if classroom.ungradedSubmissions && classroom.ungradedSubmissions > 0}
											<Badge variant="warning" size="sm">
												{#snippet children()}
													{classroom.ungradedSubmissions} pending
												{/snippet}
											</Badge>
										{/if}
									</div>
								</div>
								
								<!-- Selection Indicator -->
								{#if isSelected}
									<svg class="h-5 w-5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
									</svg>
								{/if}
							</div>
						</div>
						
						<!-- Assignment List (Expandable) -->
						{#if isExpanded && classroomAssignments.length > 0}
							<div class="ml-6 space-y-1 border-l border-gray-200 pl-4">
								{#each classroomAssignments as assignment (assignment.id)}
									{@const isAssignmentSelected = selectedAssignmentId === assignment.id}
									
									<button
										onclick={() => handleAssignmentSelect(assignment.id, classroom.id)}
										onmouseenter={() => hoveredItem = assignment.id}
										onmouseleave={() => hoveredItem = null}
										class="w-full rounded-md p-2 text-left transition-all duration-150 {isAssignmentSelected
											? 'bg-blue-50 border border-blue-200'
											: hoveredItem === assignment.id
												? 'bg-gray-50 border border-gray-200'
												: 'border border-transparent hover:bg-gray-50'}"
									>
										<div class="flex items-center space-x-2">
											<!-- Assignment Type Icon -->
											<div class="flex-shrink-0 p-1 {assignment.type === 'quiz' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'} rounded">
												<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getAssignmentIcon(assignment)}/>
												</svg>
											</div>
											
											<div class="min-w-0 flex-1">
												<h4 class="truncate font-medium text-gray-900 text-sm">
													{dataStore.getAssignmentDisplayTitle(assignment)}
												</h4>
												<div class="flex items-center space-x-2 text-xs text-gray-500">
													<span>{dataStore.getAssignmentTypeLabel(assignment)}</span>
													<span>•</span>
													<span>{assignment.maxScore || assignment.maxPoints || 0} pts</span>
													{#if assignment.dueDate}
														<span>•</span>
														<span>Due {dataStore.formatDate(assignment.dueDate)}</span>
													{/if}
												</div>
											</div>
											
											<!-- Assignment Selection Indicator -->
											{#if isAssignmentSelected}
												<svg class="h-4 w-4 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
												</svg>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						{:else if isExpanded && classroomAssignments.length === 0}
							<div class="ml-6 pl-4 border-l border-gray-200">
								<p class="text-xs text-gray-500 italic p-2">No assignments yet</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Footer with Import Button -->
	<div class="border-t border-gray-200 p-4">
		<Button variant="outline" size="sm" onclick={() => (window.location.href = '/teacher/data-import')} class="w-full">
			{#snippet children()}
				<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
				</svg>
				Import More Data
			{/snippet}
		</Button>
	</div>
</div>