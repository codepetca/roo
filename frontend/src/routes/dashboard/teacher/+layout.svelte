<script lang="ts">
	import HierarchicalSidebar from '$lib/components/layout/HierarchicalSidebar.svelte';
	import ContextualMainContent from '$lib/components/layout/ContextualMainContent.svelte';
	import type { Snippet } from 'svelte';
	import { dataStore } from '$lib/stores/data-store.svelte';

	let { children }: { children?: Snippet } = $props();

	// Handle classroom selection in the sidebar
	function handleClassroomSelect(classroomId: string) {
		console.log('Layout: Classroom selected:', classroomId);
		// The dataStore already handles the selection, we could add additional logic here if needed
	}

	// Handle assignment selection in the sidebar
	function handleAssignmentSelect(assignmentId: string, classroomId: string) {
		console.log('Layout: Assignment selected:', assignmentId, 'in classroom:', classroomId);
		// The dataStore already handles the selection, we could add additional logic here if needed
	}

	// Check if we're on a specific page that should override the contextual content
	let shouldShowContextualContent = $derived(() => {
		// For now, always show contextual content
		// In the future, we might want to check the current route
		return true;
	});
</script>

<div class="flex h-[calc(100vh-4rem)]">
	<HierarchicalSidebar 
		onClassroomSelect={handleClassroomSelect} 
		onAssignmentSelect={handleAssignmentSelect}
	/>
	
	{#if shouldShowContextualContent}
		<ContextualMainContent />
	{:else}
		<!-- Fallback to original layout for specific pages if needed -->
		<div class="flex-1 overflow-auto">
			<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{@render children?.()}
			</div>
		</div>
	{/if}
</div>
