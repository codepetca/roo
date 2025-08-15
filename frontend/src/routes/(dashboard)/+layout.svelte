<script lang="ts">
	import DashboardShell from '$lib/components/core/DashboardShell.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<DashboardShell>
	{@render children?.()}
</DashboardShell>
