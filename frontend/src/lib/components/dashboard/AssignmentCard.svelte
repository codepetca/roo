<script lang="ts">
	import type { AssignmentWithStats } from '@shared/schemas/core';
	import { Card, Badge, Button } from '$lib/components/ui';
	
	let { assignment, onView, onGrade }: { 
		assignment: AssignmentWithStats; 
		onView?: (assignmentId: string) => void;
		onGrade?: (assignmentId: string) => void;
	} = $props();

	function handleView() {
		if (onView) {
			onView(assignment.id);
		}
	}

	function handleGrade() {
		if (onGrade) {
			onGrade(assignment.id);
		}
	}

	// Calculate progress percentages
	const totalSubmissions = assignment.submissionCount;
	const gradedSubmissions = assignment.gradedCount;
	const pendingSubmissions = assignment.pendingCount;
	
	const completionRate = totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0;
	const pendingRate = totalSubmissions > 0 ? Math.round((pendingSubmissions / totalSubmissions) * 100) : 0;

	// Format due date
	const dueDateFormatted = assignment.dueDate 
		? new Date(assignment.dueDate).toLocaleDateString() 
		: null;
	
	// Check if due date is passed
	const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
</script>

<Card>
	{#snippet children()}
		<div class="p-6">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<h4 class="text-lg font-semibold text-gray-900">{assignment.title}</h4>
					{#if assignment.description}
						<p class="text-sm text-gray-600 mt-1 line-clamp-2">{assignment.description}</p>
					{/if}
					
					<div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
						<span class="capitalize">{assignment.type}</span>
						{#if dueDateFormatted}
							<span class="flex items-center" class:text-red-600={isOverdue}>
								<svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										  d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0v1a2 2 0 002 2h4a2 2 0 002-2V7m-6 0h6" />
								</svg>
								Due {dueDateFormatted}
								{#if isOverdue}
									<span class="text-red-600 ml-1">(Overdue)</span>
								{/if}
							</span>
						{/if}
						<span>{assignment.maxScore} points</span>
					</div>
				</div>
				<div class="ml-4 flex-shrink-0">
					<Badge variant={assignment.status === 'published' ? 'success' : 'default'} size="sm">
						{#snippet children()}
							{assignment.status}
						{/snippet}
					</Badge>
				</div>
			</div>
			
			{#if totalSubmissions > 0}
				<!-- Progress bars -->
				<div class="mt-4 space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Completion Progress</span>
						<span class="font-medium">{gradedSubmissions}/{totalSubmissions} graded</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div class="bg-green-600 h-2 rounded-full transition-all duration-300" 
							 style="width: {completionRate}%"></div>
					</div>
					
					{#if pendingSubmissions > 0}
						<div class="flex justify-between text-sm">
							<span class="text-orange-600">Pending Review</span>
							<span class="font-medium text-orange-600">{pendingSubmissions} pending</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div class="bg-orange-500 h-2 rounded-full transition-all duration-300" 
								 style="width: {pendingRate}%"></div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="mt-4 text-center py-4 text-gray-500 text-sm">
					No submissions yet
				</div>
			{/if}

			<!-- Action buttons -->
			<div class="mt-6 flex justify-end space-x-3">
				<Button variant="secondary" size="sm" onclick={handleView}>
					{#snippet children()}
						View Details
					{/snippet}
				</Button>
				{#if pendingSubmissions > 0}
					<Button variant="primary" size="sm" onclick={handleGrade}>
						{#snippet children()}
							Grade ({pendingSubmissions})
						{/snippet}
					</Button>
				{/if}
			</div>
		</div>
	{/snippet}
</Card>