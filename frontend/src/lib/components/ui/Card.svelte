<script lang="ts">
	interface Props {
		variant?: 'default' | 'bordered' | 'elevated';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { variant = 'default', padding = 'md', class: className = '', children }: Props = $props();

	let cardClasses = $derived(() => {
		const base = 'bg-white rounded-lg';

		const variants = {
			default: 'shadow-md',
			bordered: 'border border-gray-200',
			elevated: 'shadow-lg'
		};

		const paddings = {
			none: '',
			sm: 'p-4',
			md: 'p-6',
			lg: 'p-8'
		};

		return `${base} ${variants[variant]} ${paddings[padding]} ${className}`;
	});
</script>

<div class={cardClasses}>
	{#if children}
		{@render children()}
	{/if}
</div>
