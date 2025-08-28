<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		topComponent,
		sidebarComponent,
		mainComponent,
		viewMode = 'assignment',
		error = null
	}: {
		topComponent?: Snippet;
		sidebarComponent?: Snippet;
		mainComponent?: Snippet;
		viewMode?: 'assignment' | 'grid';
		error?: string | null;
	} = $props();
</script>

<!-- Dynamic layout structure based on view mode -->
<div class="flex h-full flex-col">
	<!-- Top: Component like ClassroomSelector (always visible) -->
	{#if topComponent}
		{@render topComponent()}
	{/if}

	<!-- Main Content Area - Different layouts based on view mode -->
	{#if viewMode === 'grid'}
		<!-- Two-panel layout for Grid View -->
		<div class="flex-1 overflow-hidden">
			{#if mainComponent}
				{@render mainComponent()}
			{/if}
		</div>
	{:else}
		<!-- Three-panel layout for Assignment View -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Left: Sidebar Component -->
			{#if sidebarComponent}
				{@render sidebarComponent()}
			{/if}

			<!-- Right: Main Component -->
			<div class="flex-1 overflow-hidden">
				{#if mainComponent}
					{@render mainComponent()}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Error Display (floating) -->
	{#if error}
		<div
			class="absolute right-4 bottom-4 z-50 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg"
		>
			<div class="flex items-start">
				<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Error loading data</h3>
					<p class="mt-1 text-sm text-red-700">{error}</p>
					<button
						class="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
						onclick={() => (error = null)}
					>
						Dismiss
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
