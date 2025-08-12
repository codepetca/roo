<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		variant = 'primary',
		size = 'md',
		onclick
	}: {
		children: Snippet;
		variant?: string;
		size?: string;
		onclick?: () => void;
	} = $props();
</script>

<button class="mock-button" data-testid="button" data-variant={variant} data-size={size} {onclick}>
	{@render children()}
</button>
