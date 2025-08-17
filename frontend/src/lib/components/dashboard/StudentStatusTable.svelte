<script lang="ts">
	import { Badge, Button } from '$lib/components/ui';
	import { dataStore } from '$lib/stores/data-store.svelte';
	import type { Assignment } from '@shared/schemas/core';

	// Props
	let {
		assignment,
		onViewSubmission,
		onGradeSubmission
	}: {
		assignment: Assignment;
		onViewSubmission?: (studentId: string, submissionId?: string) => void;
		onGradeSubmission?: (studentId: string, submissionId?: string) => void;
	} = $props();

	// Get student status data from store
	let studentStatus = $derived(dataStore.assignmentStudentStatus);
	let loading = $derived(dataStore.loadingAssignmentData);

	// Computed statistics
	let stats = $derived(() => {
		const total = studentStatus.length;
		const submitted = studentStatus.filter((s) => s.status !== 'not_submitted').length;
		const graded = studentStatus.filter((s) => s.status === 'graded').length;
		const pending = studentStatus.filter((s) => s.status === 'pending_review').length;
		const average =
			graded > 0
				? Math.round(
						studentStatus
							.filter((s) => s.percentage !== null)
							.reduce((sum, s) => sum + (s.percentage || 0), 0) / graded
					)
				: null;

		return { total, submitted, graded, pending, average };
	});

	// Get status badge variant and text
	function getStatusBadge(status: string) {
		switch (status) {
			case 'graded':
				return { variant: 'success' as const, text: 'Graded', icon: '✓' };
			case 'pending_review':
				return { variant: 'warning' as const, text: 'Pending Review', icon: '⏳' };
			case 'submitted':
				return { variant: 'info' as const, text: 'Submitted', icon: '📝' };
			case 'not_submitted':
				return { variant: 'secondary' as const, text: 'Not Submitted', icon: '❌' };
			default:
				return { variant: 'secondary' as const, text: 'Unknown', icon: '?' };
		}
	}

	// Format submission date
	function formatSubmissionDate(date: string | Date | null): string {
		if (!date) return 'Not submitted';
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Handle view submission
	function handleViewSubmission(student: (typeof studentStatus)[0]) {
		onViewSubmission?.(student.studentId, student.submission?.id);
	}

	// Handle grade submission
	function handleGradeSubmission(student: (typeof studentStatus)[0]) {
		onGradeSubmission?.(student.studentId, student.submission?.id);
	}
</script>

<div class="space-y-6">
	<!-- Summary Statistics -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
			<div class="text-2xl font-bold text-blue-900">{stats.submitted}/{stats.total}</div>
			<div class="text-sm text-blue-700">Submitted</div>
		</div>
		<div class="rounded-lg border border-green-200 bg-green-50 p-4">
			<div class="text-2xl font-bold text-green-900">{stats.graded}</div>
			<div class="text-sm text-green-700">Graded</div>
		</div>
		<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
			<div class="text-2xl font-bold text-yellow-900">{stats.pending}</div>
			<div class="text-sm text-yellow-700">Pending Review</div>
		</div>
		<div class="rounded-lg border border-purple-200 bg-purple-50 p-4">
			<div class="text-2xl font-bold text-purple-900">
				{stats.average !== null ? `${stats.average}%` : 'N/A'}
			</div>
			<div class="text-sm text-purple-700">Average Grade</div>
		</div>
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="py-8 text-center">
			<div
				class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
			<p class="mt-2 text-sm text-gray-600">Loading student data...</p>
		</div>
	{:else if studentStatus.length === 0}
		<!-- Empty State -->
		<div class="py-12 text-center">
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
					d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v2c0 .656.126 1.283.356 1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">No Students Enrolled</h3>
			<p class="mt-1 text-sm text-gray-500">
				No students found for this assignment. Check that students are enrolled in the classroom.
			</p>
		</div>
	{:else}
		<!-- Student Status Table -->
		<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-200 px-6 py-3">
				<h3 class="text-lg font-medium text-gray-900">Student Progress</h3>
				<p class="text-sm text-gray-600">
					{stats.submitted} of {stats.total} students have submitted their work
				</p>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Student</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Status</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Submitted</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Grade</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each studentStatus as student (student.studentId)}
							{@const statusBadge = getStatusBadge(student.status)}
							<tr class="hover:bg-gray-50">
								<!-- Student Info -->
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<div class="h-8 w-8 flex-shrink-0">
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200"
											>
												<span class="text-sm font-medium text-gray-600">
													{student.studentName.charAt(0).toUpperCase()}
												</span>
											</div>
										</div>
										<div class="ml-3">
											<div class="text-sm font-medium text-gray-900">{student.studentName}</div>
											<div class="text-sm text-gray-500">{student.studentEmail}</div>
										</div>
									</div>
								</td>

								<!-- Status Badge -->
								<td class="px-6 py-4 whitespace-nowrap">
									<Badge variant={statusBadge.variant}>
										{#snippet children()}
											{statusBadge.icon} {statusBadge.text}
										{/snippet}
									</Badge>
								</td>

								<!-- Submission Date -->
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatSubmissionDate(student.submittedAt)}
								</td>

								<!-- Grade -->
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{#if student.score !== null && student.percentage !== null}
										<div class="flex items-center space-x-2">
											<span class="font-medium">{student.score}/{student.maxScore}</span>
											<Badge
												variant={student.percentage >= 80
													? 'success'
													: student.percentage >= 60
														? 'warning'
														: 'error'}
											>
												{#snippet children()}
													{student.percentage}%
												{/snippet}
											</Badge>
										</div>
									{:else}
										<span class="text-gray-400">Not graded</span>
									{/if}
								</td>

								<!-- Actions -->
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<div class="flex space-x-2">
										{#if student.submission}
											<Button
												variant="outline"
												size="sm"
												onclick={() => handleViewSubmission(student)}
											>
												{#snippet children()}
													View
												{/snippet}
											</Button>

											{#if student.status !== 'graded'}
												<Button
													variant="primary"
													size="sm"
													onclick={() => handleGradeSubmission(student)}
												>
													{#snippet children()}
														Grade
													{/snippet}
												</Button>
											{/if}
										{:else}
											<span class="text-sm text-gray-400">No submission</span>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
