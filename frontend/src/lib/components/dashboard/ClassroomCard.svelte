<script lang="ts">
	import type { Classroom } from '@shared/schemas/core';
	import { Card, Badge } from '$lib/components/ui';
	
	let { classroom, onclick }: { 
		classroom: Classroom; 
		onclick?: (classroomId: string) => void;
	} = $props();

	function handleClick() {
		if (onclick) {
			onclick(classroom.id);
		}
	}
</script>

<Card>
	{#snippet children()}
		<div class="p-6 hover:bg-gray-50 transition-colors cursor-pointer" 
			 onclick={handleClick}
			 role="button"
			 tabindex="0"
			 onkeydown={(e) => e.key === 'Enter' && handleClick()}>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<h4 class="text-lg font-semibold text-gray-900">{classroom.name}</h4>
					{#if classroom.section}
						<p class="text-sm text-gray-600">{classroom.section}</p>
					{/if}
					{#if classroom.description}
						<p class="text-sm text-gray-500 mt-1 line-clamp-2">{classroom.description}</p>
					{/if}
				</div>
				<div class="ml-4 flex-shrink-0">
					{#if classroom.ungradedSubmissions > 0}
						<Badge variant="warning" size="sm">
							{#snippet children()}
								{classroom.ungradedSubmissions} pending
							{/snippet}
						</Badge>
					{:else}
						<Badge variant="success" size="sm">
							{#snippet children()}
								Up to date
							{/snippet}
						</Badge>
					{/if}
				</div>
			</div>
			
			<div class="mt-4 grid grid-cols-3 gap-4 text-center">
				<div>
					<p class="text-2xl font-semibold text-gray-900">{classroom.studentCount}</p>
					<p class="text-xs text-gray-600">Students</p>
				</div>
				<div>
					<p class="text-2xl font-semibold text-gray-900">{classroom.assignmentCount}</p>
					<p class="text-xs text-gray-600">Assignments</p>
				</div>
				<div>
					<p class="text-2xl font-semibold text-gray-900">{classroom.activeSubmissions}</p>
					<p class="text-xs text-gray-600">Submissions</p>
				</div>
			</div>

			{#if classroom.courseState === 'ARCHIVED'}
				<div class="mt-3 flex justify-center">
					<Badge variant="default" size="sm">
						{#snippet children()}
							Archived
						{/snippet}
					</Badge>
				</div>
			{/if}
		</div>
	{/snippet}
</Card>