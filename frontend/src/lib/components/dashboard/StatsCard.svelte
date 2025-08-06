<script lang="ts">
	import { Card } from '../ui';

	interface Props {
		title: string;
		value: number | string;
		icon: string;
		color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
		trend?: {
			value: number;
			isPositive: boolean;
		};
		class?: string;
	}

	let { title, value, icon, color = 'blue', trend, class: className = '' }: Props = $props();

	let colorClasses = $derived(() => {
		const colors = {
			blue: 'bg-blue-500',
			green: 'bg-green-500',
			purple: 'bg-purple-500',
			orange: 'bg-orange-500',
			red: 'bg-red-500'
		};
		return colors[color];
	});
</script>

<Card variant="elevated" class={className}>
	<div class="flex items-center justify-between">
		<div class="flex-1">
			<p class="mb-1 text-sm font-medium text-gray-600">{title}</p>
			<div class="flex items-baseline">
				<p class="text-3xl font-bold text-gray-900">{value}</p>
				{#if trend}
					<span
						class="ml-2 flex items-center text-sm {trend.isPositive
							? 'text-green-600'
							: 'text-red-600'}"
					>
						<svg class="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							{#if trend.isPositive}
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 17l9.2-9.2M17 7v10M17 7H7"
								/>
							{:else}
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 7l9.2 9.2M17 17V7M17 17H7"
								/>
							{/if}
						</svg>
						{Math.abs(trend.value)}%
					</span>
				{/if}
			</div>
		</div>

		<div class="rounded-lg p-3 {colorClasses}">
			<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon} />
			</svg>
		</div>
	</div>
</Card>
