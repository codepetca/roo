<script lang="ts">
	interface Props {
		rows?: number;
		type?: 'card' | 'list' | 'stats';
		class?: string;
	}

	let { rows = 3, type = 'card', class: className = '' }: Props = $props();
</script>

{#if type === 'stats'}
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 {className}">
		{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
			<div class="animate-pulse rounded-lg bg-white p-6 shadow">
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<div class="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
						<div class="h-8 w-1/2 rounded bg-gray-200"></div>
					</div>
					<div class="h-12 w-12 rounded-lg bg-gray-200"></div>
				</div>
			</div>
		{/each}
	</div>
{:else if type === 'list'}
	<div class="space-y-4 {className}">
		{#each Array.from({ length: rows }, (_, i) => i) as i (i)}
			<div class="animate-pulse rounded-lg bg-gray-50 p-3">
				<div class="flex items-center space-x-3">
					<div class="h-10 w-10 rounded-lg bg-gray-200"></div>
					<div class="flex-1">
						<div class="mb-1 h-4 w-3/4 rounded bg-gray-200"></div>
						<div class="h-3 w-1/2 rounded bg-gray-200"></div>
					</div>
					<div class="h-6 w-12 rounded bg-gray-200"></div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="space-y-6 {className}">
		{#each Array.from({ length: rows }, (_, i) => i) as i (i)}
			<div class="animate-pulse rounded-lg bg-white p-6 shadow">
				<div class="mb-4 h-6 w-1/3 rounded bg-gray-200"></div>
				<div class="space-y-2">
					<div class="h-4 w-full rounded bg-gray-200"></div>
					<div class="h-4 w-5/6 rounded bg-gray-200"></div>
					<div class="h-4 w-3/4 rounded bg-gray-200"></div>
				</div>
			</div>
		{/each}
	</div>
{/if}
