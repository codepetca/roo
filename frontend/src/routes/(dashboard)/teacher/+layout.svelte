<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MainContent from '$lib/components/layout/MainContent.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();

	// Handle classroom selection in the sidebar
	function handleClassroomSelect(classroomId: string) {
		// This can be used to perform additional logic when a classroom is selected
		console.log('Selected classroom:', classroomId);
	}
</script>

<div class="flex h-[calc(100vh-4rem)]">
	<Sidebar onClassroomSelect={handleClassroomSelect} />
	<MainContent>
		{@render children?.()}
	</MainContent>
</div>
