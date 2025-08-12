<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<span class="mock-badge" data-testid="badge">
	{@render children()}
</span>
