<script lang="ts">
	interface Props {
		variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
		size?: 'sm' | 'md';
		class?: string;
		children: import('svelte').Snippet;
	}

	let { variant = 'default', size = 'md', class: className = '', children }: Props = $props();

	let badgeClasses = $derived(() => {
		const base = 'inline-flex items-center font-medium rounded-full';

		const variants = {
			default: 'bg-gray-100 text-gray-800',
			success: 'bg-green-100 text-green-800',
			warning: 'bg-yellow-100 text-yellow-800',
			error: 'bg-red-100 text-red-800',
			info: 'bg-blue-100 text-blue-800'
		};

		const sizes = {
			sm: 'px-2.5 py-0.5 text-xs',
			md: 'px-3 py-1 text-sm'
		};

		return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
	});
</script>

<span class={badgeClasses}>
	{@render children()}
</span>
