<script lang="ts">
	import { Card } from '../ui';

	interface Props {
		title: string;
		description?: string;
		badge?: {
			text: string;
			variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
		};
		actions?: import('svelte').Snippet;
		class?: string;
	}

	let { title, description, badge, actions, class: className = '' }: Props = $props();
</script>

<Card class="mb-6 {className}">
	<div class="flex items-center justify-between">
		<div class="flex-1">
			<div class="mb-2 flex items-center gap-3">
				<h1 class="text-2xl font-bold text-gray-900">{title}</h1>
				{#if badge}
					<span
						class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
						{badge.variant === 'success'
							? 'bg-green-100 text-green-800'
							: badge.variant === 'warning'
								? 'bg-yellow-100 text-yellow-800'
								: badge.variant === 'error'
									? 'bg-red-100 text-red-800'
									: badge.variant === 'info'
										? 'bg-blue-100 text-blue-800'
										: 'bg-gray-100 text-gray-800'}"
					>
						{badge.text}
					</span>
				{/if}
			</div>
			{#if description}
				<p class="text-gray-600">{description}</p>
			{/if}
		</div>

		{#if actions}
			<div class="flex items-center gap-3">
				{@render actions()}
			</div>
		{/if}
	</div>
</Card>
