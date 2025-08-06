<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: () => void;
		children: import('svelte').Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		class: className = '',
		onclick,
		children
	}: Props = $props();

	let buttonClasses = $derived(() => {
		const base =
			'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-md';

		const variants = {
			primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
			secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
			ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
			danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
		};

		const sizes = {
			sm: 'px-3 py-1.5 text-sm',
			md: 'px-4 py-2 text-sm',
			lg: 'px-6 py-3 text-base'
		};

		return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
	});

	function handleClick() {
		if (!disabled && !loading && onclick) {
			onclick();
		}
	}
</script>

<button {type} class={buttonClasses()} {disabled} onclick={handleClick}>
	{#if loading}
		<svg
			class="mr-2 h-4 w-4 animate-spin"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{/if}
	{@render children()}
</button>
