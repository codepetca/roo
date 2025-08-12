<script lang="ts">
	let {
		title,
		value,
		icon,
		color = 'blue',
		change,
		onclick
	}: {
		title: string;
		value: string | number;
		icon: string;
		color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'gray';
		change?: { value: number; direction: 'up' | 'down'; period: string };
		onclick?: () => void;
	} = $props();

	const colorClasses = {
		blue: 'text-blue-600',
		green: 'text-green-600',
		orange: 'text-orange-600',
		purple: 'text-purple-600',
		teal: 'text-teal-600',
		gray: 'text-gray-600'
	};

	const colorClass = colorClasses[color];
	const hasAction = onclick !== undefined;
</script>

<div
	class="rounded-lg border border-gray-200 bg-white p-6 transition-colors"
	class:cursor-pointer={hasAction}
	class:hover:border-gray-300={hasAction}
	onclick={hasAction ? onclick : undefined}
	role={hasAction ? 'button' : undefined}
	tabindex={hasAction ? 0 : undefined}
>
	<div class="flex items-center">
		<div class="flex-shrink-0">
			<svg class="h-8 w-8 {colorClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				{@html icon}
			</svg>
		</div>
		<div class="ml-4 flex-1">
			<p class="text-sm font-medium text-gray-600">{title}</p>
			<div class="flex items-baseline">
				<p class="text-2xl font-semibold text-gray-900">{value}</p>
				{#if change}
					<div
						class="ml-2 flex items-center text-sm"
						class:text-green-600={change.direction === 'up'}
						class:text-red-600={change.direction === 'down'}
					>
						{#if change.direction === 'up'}
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 15.586l5.293-5.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
						<span class="ml-1">
							{change.value}% {change.period}
						</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
