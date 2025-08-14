<script lang="ts">
	import MainContent from '$lib/components/layout/MainContent.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<MainContent>
	{@render children?.()}
</MainContent>