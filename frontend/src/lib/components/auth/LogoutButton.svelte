<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';

	interface Props {
		variant?: 'button' | 'link';
		size?: 'sm' | 'md' | 'lg';
	}

	let { variant = 'button', size = 'md' }: Props = $props();

	async function handleLogout() {
		try {
			await auth.logOut();
		} catch (error) {
			console.error('Logout failed:', error);
		}
	}

	const buttonClasses = $derived(() => {
		const baseClasses =
			'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

		const variantClasses = {
			button: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 rounded-md',
			link: 'text-red-600 hover:text-red-700 underline focus:ring-red-500'
		};

		const sizeClasses = {
			sm: 'px-3 py-1.5 text-sm',
			md: 'px-4 py-2 text-sm',
			lg: 'px-6 py-3 text-base'
		};

		return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
	});
</script>

<button
	type="button"
	onclick={handleLogout}
	disabled={auth.loading}
	class={buttonClasses()}
	title="Sign out of your account"
>
	{#if auth.loading}
		<svg
			class="mr-2 -ml-1 h-4 w-4 animate-spin"
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
		Signing out...
	{:else}
		<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
			/>
		</svg>
		Sign Out
	{/if}
</button>
