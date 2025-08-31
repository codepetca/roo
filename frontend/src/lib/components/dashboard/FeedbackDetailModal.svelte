<script lang="ts">
	import { Modal, Badge } from '$lib/components/ui';
	import type { Snippet } from 'svelte';

	interface StudentProgressItem {
		studentId: string;
		studentName: string;
		studentEmail: string;
		status: string;
		submittedAt?: Date;
		score?: number;
		maxScore?: number;
		percentage?: number;
		feedback?: string;
		questionGrades?: Array<{
			name?: string;
			questionNumber?: number;
			score: number;
			maxScore: number;
			feedback: string;
		}>;
	}

	interface FeedbackDetailModalProps {
		open: boolean;
		student: StudentProgressItem | null;
		onClose: () => void;
	}

	let { open, student, onClose }: FeedbackDetailModalProps = $props();

	// Get modal title
	let modalTitle = $derived(student ? `Feedback for ${student.studentName}` : 'Feedback Details');

	// Check if this is a quiz with question-by-question feedback
	let hasQuestionGrades = $derived(student?.questionGrades && student.questionGrades.length > 0);

	// Debug: log what data we're receiving
	$effect(() => {
		if (student) {
			console.log('🎯 FeedbackDetailModal: student data:', {
				name: student.studentName,
				hasQuestionGrades: !!student.questionGrades,
				questionGradesLength: student.questionGrades?.length || 0,
				questionGrades: student.questionGrades,
				firstItemStructure: student.questionGrades?.[0] ? Object.keys(student.questionGrades[0]) : null,
				firstItemSample: student.questionGrades?.[0]
			});
		}
	});

	function formatDate(date?: Date): string {
		if (!date) return 'Not submitted';
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getGradeBadgeVariant(percentage?: number): 'success' | 'warning' | 'error' {
		if (!percentage) return 'error';
		if (percentage >= 80) return 'success';
		if (percentage >= 60) return 'warning';
		return 'error';
	}

	function getQuestionBadgeVariant(
		score: number,
		maxScore: number
	): 'success' | 'warning' | 'error' {
		const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
		if (percentage >= 80) return 'success';
		if (percentage >= 60) return 'warning';
		return 'error';
	}
</script>

<Modal {open} title={modalTitle} {onClose} maxWidth="2xl">
	{#snippet children()}
		{#if student}
			<!-- Overall Grade Summary -->
			<div class="mb-6 rounded-lg bg-gray-50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900">Overall Grade</h3>
					<div class="text-sm text-gray-500">
						Submitted: {formatDate(student.submittedAt)}
					</div>
				</div>

				<div class="flex items-center space-x-4">
					{#if student.score !== undefined && student.maxScore !== undefined}
						<div class="text-2xl font-bold text-gray-900">
							{student.score}/{student.maxScore}
						</div>
						<Badge variant={getGradeBadgeVariant(student.percentage)} size="lg">
							{#snippet children()}
								{student.percentage}%
							{/snippet}
						</Badge>
					{:else}
						<div class="text-lg text-gray-500">Not graded</div>
					{/if}
				</div>
			</div>

			{#if hasQuestionGrades}
				<!-- Question-by-Question Breakdown -->
				<div class="mb-6">
					<h3 class="mb-4 text-lg font-medium text-gray-900">Detailed Breakdown</h3>
					<div class="space-y-3">
						{#each student.questionGrades as questionGrade, index}
							<div class="rounded-lg border border-gray-200 p-4">
								<div class="mb-2 flex items-center justify-between">
									<h4 class="font-medium text-gray-900">
										{#if questionGrade.name}
											{questionGrade.name}
										{:else if questionGrade.questionNumber}
											Question {questionGrade.questionNumber}
										{:else}
											Criteria {index + 1}
										{/if}
									</h4>
									<div class="flex items-center space-x-2">
										<span class="text-sm font-medium text-gray-700">
											{questionGrade.score}/{questionGrade.maxScore}
										</span>
										<Badge
											variant={getQuestionBadgeVariant(questionGrade.score, questionGrade.maxScore)}
											size="sm"
										>
											{#snippet children()}
												{questionGrade.maxScore > 0
													? Math.round((questionGrade.score / questionGrade.maxScore) * 100)
													: 0}%
											{/snippet}
										</Badge>
									</div>
								</div>

								{#if questionGrade.feedback}
									<div
										class="rounded border-l-4 border-blue-200 bg-blue-50 p-3 text-sm text-gray-700"
									>
										<div class="mb-1 font-medium text-blue-800">AI Feedback:</div>
										<div class="whitespace-pre-wrap">{questionGrade.feedback}</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Overall Feedback -->
			{#if student.feedback}
				<div class="mb-4">
					<h3 class="mb-3 text-lg font-medium text-gray-900">Overall Feedback</h3>
					<div class="rounded-lg border-l-4 border-green-200 bg-green-50 p-4">
						<div class="mb-2 font-medium text-green-800">AI Assessment:</div>
						<div class="text-sm whitespace-pre-wrap text-green-700">
							{student.feedback}
						</div>
					</div>
				</div>
			{/if}

			<!-- Student Info -->
			<div class="border-t pt-4 text-sm text-gray-500">
				<div><strong>Student:</strong> {student.studentName}</div>
				<div><strong>Email:</strong> {student.studentEmail}</div>
				<div><strong>Status:</strong> {student.status}</div>
			</div>
		{:else}
			<div class="py-8 text-center">
				<p class="text-gray-500">No student selected</p>
			</div>
		{/if}
	{/snippet}

	{#snippet actions()}
		<button
			onclick={onClose}
			class="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
		>
			Close
		</button>
	{/snippet}
</Modal>
