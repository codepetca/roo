<script lang="ts">
	interface StatItem {
		title: string;
		value: string | number;
		icon: string;
		color: string;
		description?: string;
	}

	let { stats }: { stats: StatItem[] } = $props();
</script>

<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	{#each stats as stat (stat.title)}
		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium text-gray-600">{stat.title}</p>
					<p class="text-2xl font-semibold text-gray-900">{stat.value}</p>
					{#if stat.description}
						<p class="mt-1 text-xs text-gray-500">{stat.description}</p>
					{/if}
				</div>
				<div class="ml-4 flex-shrink-0">
					<div class="rounded-lg p-3 {stat.color}">
						<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={stat.icon} />
						</svg>
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>
