<script lang="ts">
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Badge } from '$lib/components/ui';
	import type { Grade } from '@shared/schemas/core';

	// Get reactive data from store
	let selectedClassroom = $derived(dataStore.selectedClassroom);
	let gradeGridData = $derived(dataStore.gradeGridData);
	let loadingGridData = $derived(dataStore.loadingGridData);

	// Reactive effect to fetch grid data when classroom changes
	$effect(() => {
		const classroomId = dataStore.selectedClassroomId;
		const viewMode = dataStore.viewMode;

		console.log('🔄 StudentGradeGrid effect triggered:', {
			classroomId,
			viewMode,
			shouldFetch: classroomId && viewMode === 'grid'
		});

		if (classroomId && viewMode === 'grid') {
			console.log('🔄 Fetching grid data for classroom:', classroomId);
			// Use setTimeout to prevent blocking the main thread
			setTimeout(() => {
				dataStore.fetchAllSubmissionsForClassroom(classroomId);
			}, 0);
		}
	});

	// Debug effect to monitor gradeGridData changes
	$effect(() => {
		console.log('📊 StudentGradeGrid gradeGridData changed:', {
			studentsCount: gradeGridData.students?.length || 0,
			assignmentsCount: gradeGridData.assignments?.length || 0,
			gradesMapSize: gradeGridData.grades?.size || 0,
			viewMode: dataStore.viewMode,
			classroomSelected: !!dataStore.selectedClassroomId
		});
	});

	// Helper function to get grade for a student-assignment combination
	function getGrade(studentId: string, assignmentId: string): Grade | null {
		if (!gradeGridData.grades) return null;
		const studentGrades = gradeGridData.grades.get(studentId);
		if (!studentGrades) return null;
		return studentGrades.get(assignmentId) || null;
	}

	// Helper function to format grade display
	function formatGrade(grade: Grade | null): string {
		if (!grade) return '—';
		if (grade.score !== undefined && grade.maxScore !== undefined) {
			return `${grade.score}/${grade.maxScore}`;
		}
		if (grade.percentage !== undefined) {
			return `${grade.percentage}%`;
		}
		return '—';
	}

	// Helper function to get grade color based on percentage
	function getGradeColor(grade: Grade | null): string {
		if (!grade || grade.percentage === undefined) return 'text-gray-400';
		if (grade.percentage >= 80) return 'text-green-600';
		if (grade.percentage >= 60) return 'text-yellow-600';
		return 'text-red-600';
	}

	// Helper function to get background color for grade cells
	function getGradeBackground(grade: Grade | null): string {
		if (!grade || grade.percentage === undefined) return 'bg-gray-50';
		if (grade.percentage >= 80) return 'bg-green-50';
		if (grade.percentage >= 60) return 'bg-yellow-50';
		return 'bg-red-50';
	}

	// Helper function to get initials from name
	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((part) => part.charAt(0))
			.join('')
			.substring(0, 2)
			.toUpperCase();
	}

	// Handle cell click to navigate to specific student-assignment combination
	function handleCellClick(studentId: string, assignmentId: string) {
		console.log('📱 Grade cell clicked:', { studentId, assignmentId });
		// TODO: Implement navigation to grading interface
	}
</script>

<div class="flex h-full flex-col">
	{#if !selectedClassroom}
		<!-- No classroom selected -->
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<svg
					class="mx-auto h-16 w-16 text-gray-400"
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
				<h3 class="mt-4 text-lg font-medium text-gray-900">Select a Classroom</h3>
				<p class="mt-2 text-sm text-gray-600">
					Choose a classroom from the dropdown to view the grade grid
				</p>
			</div>
		</div>
	{:else}
		<!-- Grade Grid Table -->
		<div class="flex-1 overflow-auto">
			{#if loadingGridData}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<div
							class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
						></div>
						<p class="mt-2 text-sm text-gray-600">Loading grade data...</p>
					</div>
				</div>
			{:else if !gradeGridData.students || gradeGridData.students.length === 0}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<svg
							class="mx-auto h-16 w-16 text-gray-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v-4m6 2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v-4m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v-4"
							/>
						</svg>
						<h3 class="mt-4 text-lg font-medium text-gray-900">No Grade Data</h3>
						<p class="mt-2 text-sm text-gray-600">
							There are no submissions or grades available for this classroom yet.
						</p>
					</div>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<!-- Table Header -->
						<thead class="sticky top-0 z-10 bg-gray-50">
							<tr>
								<!-- Student Name Column -->
								<th
									class="sticky left-0 z-20 w-80 border-r border-gray-300 bg-gray-50 px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Student
								</th>
								<!-- Assignment Columns -->
								{#each gradeGridData.assignments || [] as assignment (assignment.id)}
									<th
										class="max-w-32 min-w-24 px-2 py-2 text-center text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										<div class="truncate" title={assignment.title || assignment.name}>
											{assignment.title || assignment.name || 'Untitled'}
										</div>
										<div class="mt-1 text-xs text-gray-400">
											{assignment.type === 'quiz' ? 'Quiz' : 'Assignment'}
										</div>
									</th>
								{/each}
							</tr>
						</thead>

						<!-- Table Body -->
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each gradeGridData.students || [] as student (student.id)}
								<tr class="hover:bg-gray-50">
									<!-- Student Name Cell (Sticky) -->
									<td
										class="sticky left-0 z-10 w-80 border-r border-gray-300 bg-white px-3 py-2 whitespace-nowrap"
									>
										<div class="flex items-center gap-2">
											<!-- Small Avatar Circle -->
											<div
												class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700"
												title={student.name}
											>
												{getInitials(student.name)}
											</div>
											<span class="text-sm font-medium text-gray-900">{student.name}</span>
											<span class="text-xs text-gray-400">({student.email.split('@')[0]})</span>
										</div>
									</td>

									<!-- Grade Cells -->
									{#each gradeGridData.assignments || [] as assignment (assignment.id)}
										{@const grade = getGrade(student.id, assignment.id)}
										<td
											class="cursor-pointer px-2 py-1 text-center transition-colors {getGradeBackground(
												grade
											)} hover:bg-opacity-80"
											onclick={() => handleCellClick(student.id, assignment.id)}
										>
											<div class="text-sm font-medium {getGradeColor(grade)}">
												{formatGrade(grade)}
											</div>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Ensure proper table scrolling with sticky elements */
	.overflow-x-auto {
		scrollbar-width: thin;
		scrollbar-color: #cbd5e0 #f7fafc;
	}

	.overflow-x-auto::-webkit-scrollbar {
		height: 8px;
	}

	.overflow-x-auto::-webkit-scrollbar-track {
		background: #f7fafc;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb {
		background-color: #cbd5e0;
		border-radius: 4px;
	}
</style>
