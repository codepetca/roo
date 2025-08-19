<script lang="ts">
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Badge, Button, Card } from '$lib/components/ui';
	import type { Assignment } from '@shared/schemas/core';

	// Get reactive data from store
	let selectedAssignment = $derived(dataStore.selectedAssignment);
	let selectedClassroom = $derived(dataStore.selectedClassroom);
	let loading = $derived(dataStore.loading);

	// Use real student progress data from store
	let studentProgress = $derived(dataStore.studentProgress);
	let loadingStudentProgress = $derived(dataStore.loadingStudentProgress);

	// Calculate statistics from real student progress data
	let stats = $derived(() => {
		const total = studentProgress.length;
		const submitted = studentProgress.filter((s) => s.status !== 'not_submitted').length;
		const graded = studentProgress.filter((s) => s.status === 'graded').length;
		const pending = studentProgress.filter((s) => s.status === 'submitted').length;
		const averageGrade =
			graded > 0
				? Math.round(
						studentProgress
							.filter((s) => s.percentage !== undefined)
							.reduce((sum, s) => sum + (s.percentage || 0), 0) / graded
					)
				: 0;

		return { total, submitted, graded, pending, averageGrade };
	});

	function getStatusBadge(status: string) {
		switch (status) {
			case 'graded':
				return { variant: 'success' as const, text: 'Graded', icon: '✓' };
			case 'submitted':
				return { variant: 'warning' as const, text: 'Pending Review', icon: '⏳' };
			case 'not_submitted':
				return { variant: 'secondary' as const, text: 'Not Submitted', icon: '—' };
			default:
				return { variant: 'secondary' as const, text: 'Unknown', icon: '?' };
		}
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

	function gradeStudent(student: StudentProgressItem) {
		console.log('Grade student:', student.studentName);
		// TODO: Implement grading modal/navigation
	}

	function viewSubmission(student: StudentProgressItem) {
		console.log('View submission:', student.studentName);
		// TODO: Implement submission viewer
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
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Student
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Status
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Submitted
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Grade
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each studentProgress as student (student.studentId)}
							{@const statusBadge = getStatusBadge(student.status)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<div class="h-10 w-10 flex-shrink-0">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200"
											>
												<span class="text-sm font-medium text-gray-700">
													{student.studentName
														.split(' ')
														.map((n) => n[0])
														.join('')
														.toUpperCase()}
												</span>
											</div>
										</div>
										<div class="ml-4">
											<div class="text-sm font-medium text-gray-900">{student.studentName}</div>
											<div class="text-sm text-gray-500">{student.studentEmail}</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<Badge variant={statusBadge.variant}>
										{#snippet children()}
											{statusBadge.icon} {statusBadge.text}
										{/snippet}
									</Badge>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatDate(student.submittedAt)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
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
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<div class="flex space-x-2">
										{#if student.status === 'submitted'}
											<Button variant="primary" size="sm" onclick={() => gradeStudent(student)}>
												{#snippet children()}
													Grade
												{/snippet}
											</Button>
										{/if}
										{#if student.status !== 'not_submitted'}
											<Button variant="outline" size="sm" onclick={() => viewSubmission(student)}>
												{#snippet children()}
													View
												{/snippet}
											</Button>
										{/if}
										{#if student.status === 'graded'}
											<Button variant="outline" size="sm" onclick={() => gradeStudent(student)}>
												{#snippet children()}
													Edit Grade
												{/snippet}
											</Button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
</div>
