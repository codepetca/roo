<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		maxWidth = 'max-w-7xl',
		padding = 'px-4 py-8 sm:px-6 lg:px-8'
	}: {
		children?: Snippet;
		maxWidth?: string;
		padding?: string;
	} = $props();
</script>

<div class="flex-1 overflow-auto">
	<div class="mx-auto {maxWidth} {padding}">
		{@render children?.()}
	</div>
</div>
