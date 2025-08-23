<script lang="ts">
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Badge, Button, Card } from '$lib/components/ui';
	import { getSortIcon, getSortDescription } from '$lib/utils/sorting';
	import type { Assignment } from '@shared/schemas/core';
	import type { StudentSortField } from '$lib/utils/sorting';

	// Get reactive data from store
	let selectedAssignment = $derived(dataStore.selectedAssignment);
	let selectedClassroom = $derived(dataStore.selectedClassroom);
	let loading = $derived(dataStore.loading);

	// Use real student progress data from store
	let studentProgress = $derived(dataStore.studentProgress);
	let loadingStudentProgress = $derived(dataStore.loadingStudentProgress);

	// Sorting state
	let sortField = $derived(dataStore.studentSortField);
	let sortDirection = $derived(dataStore.studentSortDirection);

	// Calculate statistics from real student progress data
	let stats = $derived(() => {
		const total = studentProgress.length; // Total enrolled students
		const submitted = studentProgress.filter((s) => s.status !== 'not_submitted').length;
		const graded = studentProgress.filter((s) => s.status === 'graded').length;
		const pending = studentProgress.filter((s) => s.status === 'submitted').length;
		const notSubmitted = studentProgress.filter((s) => s.status === 'not_submitted').length;
		const averageGrade =
			graded > 0
				? Math.round(
						studentProgress
							.filter((s) => s.percentage !== undefined)
							.reduce((sum, s) => sum + (s.percentage || 0), 0) / graded
					)
				: 0;

		return { total, submitted, graded, pending, notSubmitted, averageGrade };
	});

	/**
	 * Truncate AI feedback for display in the comments column
	 */
	function truncateComment(comment: string | undefined, maxLength = 120): string {
		if (!comment || comment.trim() === '') {
			return '—';
		}
		return comment.length > maxLength ? comment.slice(0, maxLength) + '...' : comment;
	}

	/**
	 * Get full AI feedback text for tooltip
	 */
	function getFullComment(student: any): string {
		return student.feedback || student.grade?.feedback || 'No feedback available';
	}

	// Define the student progress type for function parameters
	type StudentProgressItem = {
		studentId: string;
		studentName: string;
		studentEmail: string;
		status: string;
		submittedAt?: Date;
		score?: number;
		maxScore?: number;
		percentage?: number;
		feedback?: string;
	};

	function formatDate(date?: Date): string {
		if (!date) return '—';
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Manual grade state management
	let manualGrades = $state<Map<string, string>>(new Map());

	function gradeStudent(student: StudentProgressItem) {
		console.log('Grade student:', student.studentName);
		// TODO: Implement grading modal/navigation
	}

	async function handleManualGradeInput(studentId: string, value: string) {
		// Update the reactive map with new value
		const newGrades = new Map(manualGrades);
		if (value.trim() === '') {
			newGrades.delete(studentId);
			// TODO: Delete manual grade from backend
			console.log('Removing manual grade for student:', studentId);
		} else {
			newGrades.set(studentId, value);
			// Auto-save to backend when value is valid
			if (!isNaN(Number(value))) {
				console.log('Auto-saving manual grade:', {
					studentId,
					grade: value
				});
				// TODO: Implement API call to save manual grade
			}
		}
		manualGrades = newGrades;
	}

	function handleSort(field: StudentSortField) {
		dataStore.toggleStudentSort(field);
	}
</script>

<div class="flex h-full flex-col">
	{#if !selectedAssignment || !selectedClassroom}
		<!-- No assignment selected -->
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
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
					/>
				</svg>
				<h3 class="mt-4 text-lg font-medium text-gray-900">Select an Assignment</h3>
				<p class="mt-2 text-sm text-gray-600">
					Choose a classroom and assignment from the sidebar to view student progress
				</p>
			</div>
		</div>
	{:else}
		<!-- Student Table -->
		<div class="flex-1 overflow-auto">
			{#if loadingStudentProgress}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<div
							class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
						></div>
						<p class="mt-2 text-sm text-gray-600">Loading student data...</p>
					</div>
				</div>
			{:else}
				<!-- Responsive CSS Grid Layout (2:1:1:2:4:1 ratio) -->
				<div class="min-w-full bg-white">
					<!-- Grid Header -->
					<div
						class="grid grid-cols-[2fr_1fr_1fr_1fr_5fr_0.5fr] gap-4 border-b border-gray-200 bg-gray-50 px-6 py-3"
					>
						<div
							class="min-w-0 cursor-pointer rounded px-2 py-1 transition-colors hover:bg-gray-100"
							onclick={() => handleSort('name')}
							title={getSortDescription('name')}
						>
							<div
								class="flex items-center space-x-1 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								<span>Student</span>
								<span class="text-xs">
									{getSortIcon(sortField === 'name', sortDirection)}
								</span>
							</div>
						</div>
						<div
							class="min-w-0 cursor-pointer rounded px-2 py-1 transition-colors hover:bg-gray-100"
							onclick={() => handleSort('submitted')}
							title={getSortDescription('submitted', sortDirection)}
						>
							<div
								class="flex items-center space-x-1 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								<span>Submitted</span>
								<span class="text-xs">
									{getSortIcon(sortField === 'submitted', sortDirection)}
								</span>
							</div>
						</div>
						<div
							class="min-w-0 cursor-pointer rounded px-2 py-1 transition-colors hover:bg-gray-100"
							onclick={() => handleSort('grade')}
							title={getSortDescription('grade', sortDirection)}
						>
							<div
								class="flex items-center space-x-1 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								<span>Grade</span>
								<span class="text-xs">
									{getSortIcon(sortField === 'grade', sortDirection)}
								</span>
							</div>
						</div>
						<div
							class="min-w-0 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Manual Grade
						</div>
						<div
							class="min-w-0 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							title="AI-generated feedback and comments"
						>
							AI Comments
						</div>
						<div
							class="min-w-0 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Actions
						</div>
					</div>

					<!-- Grid Rows -->
					{#each studentProgress as student (student.studentId)}
						<div
							class="grid grid-cols-[2fr_1fr_1fr_1fr_5fr_0.5fr] gap-4 border-b border-gray-200 px-6 py-4 hover:bg-gray-50"
						>
							<!-- Student Column (2fr) -->
							<div class="flex min-w-0 items-center">
								<div class="h-10 w-10 flex-shrink-0">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
										<span class="text-sm font-medium text-gray-700">
											{student.studentName
												.split(' ')
												.map((n) => n[0])
												.join('')
												.toUpperCase()}
										</span>
									</div>
								</div>
								<div class="ml-4 min-w-0 flex-1">
									<div class="truncate text-sm font-medium text-gray-900">
										{student.studentName}
									</div>
									<div class="truncate text-sm text-gray-500">
										{student.studentEmail.split('@')[0]}
									</div>
								</div>
							</div>

							<!-- Submitted Column (1fr) -->
							<div class="flex min-w-0 items-center text-sm">
								{#if student.status === 'not_submitted'}
									<span class="text-gray-400 italic">Not Submitted</span>
								{:else}
									<span class="truncate text-gray-900">{formatDate(student.submittedAt)}</span>
								{/if}
							</div>

							<!-- Grade Column (1fr) -->
							<div class="flex min-w-0 items-center">
								{#if student.score !== undefined && student.maxScore !== undefined}
									<div class="flex items-center space-x-2">
										<span class="text-sm font-medium text-gray-900">
											{student.score}/{student.maxScore}
										</span>
										<Badge
											variant={student.percentage >= 80
												? 'success'
												: student.percentage >= 60
													? 'warning'
													: 'error'}
											size="sm"
										>
											{#snippet children()}
												{student.percentage}%
											{/snippet}
										</Badge>
									</div>
								{:else}
									<span class="text-sm text-gray-400">—</span>
								{/if}
							</div>

							<!-- Manual Grade Column (2fr) -->
							<div class="flex min-w-0 items-center">
								<div class="flex w-full items-center space-x-2">
									<input
										type="number"
										min="0"
										max={student.maxScore || 100}
										class="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
										value={manualGrades.get(student.studentId) || ''}
										oninput={(e) => handleManualGradeInput(student.studentId, e.target.value)}
										title="Enter manual grade (auto-saves)"
									/>
									<span class="text-xs text-gray-500">/{student.maxScore || 100}</span>
								</div>
							</div>

							<!-- AI Comments Column (4fr) -->
							<div class="flex min-w-0 items-center text-sm" title={getFullComment(student)}>
								{#if student.status === 'not_submitted'}
									<span class="text-gray-400 italic">No submission</span>
								{:else}
									<span class="break-words text-gray-900"
										>{truncateComment(student.feedback, 120)}</span
									>
								{/if}
							</div>

							<!-- Actions Column (1fr) - Moved to end -->
							<div class="flex min-w-0 items-center">
								<Button variant="primary" size="sm" onclick={() => gradeStudent(student)}>
									{#snippet children()}
										Grade
									{/snippet}
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
