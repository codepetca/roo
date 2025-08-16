<script lang="ts">
	import { Button, Card } from '$lib/components/ui';
	import { goto } from '$app/navigation';

	// Redirect to main dashboard - this page is now handled by the hierarchical sidebar
	function goToDashboard() {
		goto('/dashboard/teacher');
	}
</script>

<svelte:head>
	<title>Assignments - Roo</title>
	<meta http-equiv="refresh" content="0; url=/dashboard/teacher" />
</svelte:head>

<div class="flex h-full items-center justify-center">
	<Card>
		{#snippet children()}
			<div class="p-8 text-center">
				<svg class="mx-auto h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
				</svg>
				
				<h2 class="mt-4 text-xl font-semibold text-gray-900">Assignment Management Moved</h2>
				<p class="mt-2 text-gray-600">
					Assignment and classroom management is now handled through the sidebar on the main dashboard.
				</p>
				
				<Button variant="primary" onclick={goToDashboard} class="mt-6">
					{#snippet children()}
						Go to Dashboard
					{/snippet}
				</Button>
				
				<p class="mt-4 text-sm text-gray-500">
					Select a classroom from the sidebar, then choose assignments to view details and manage submissions.
				</p>
			</div>
		{/snippet}
	</Card>
</div>