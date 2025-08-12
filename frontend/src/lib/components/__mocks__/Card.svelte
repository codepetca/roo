<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="mock-card" data-testid="card">
	{@render children()}
</div>
