<script lang="ts">
	import { Button } from '../ui';

	interface Props {
		icon?: string;
		title: string;
		description: string;
		actionLabel?: string;
		onAction?: () => void;
		class?: string;
	}

	let {
		icon = 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
		title,
		description,
		actionLabel,
		onAction,
		class: className = ''
	}: Props = $props();
</script>

<div class="py-12 text-center {className}">
	<svg
		class="mx-auto mb-4 h-16 w-16 text-gray-400"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
	>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d={icon} />
	</svg>

	<h3 class="mb-2 text-lg font-medium text-gray-900">{title}</h3>
	<p class="mx-auto mb-6 max-w-sm text-gray-500">{description}</p>

	{#if actionLabel && onAction}
		<Button variant="primary" onclick={onAction}>
			{actionLabel}
		</Button>
	{/if}
</div>
