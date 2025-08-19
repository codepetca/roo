<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import Navigation from './Navigation.svelte';
	import type { Snippet } from 'svelte';

	// Accept children snippet
	let { children }: { children?: Snippet } = $props();

	// Get current page title
	let pageTitle = $derived.by(() => {
		const path = $page.url.pathname;
		if (path.includes('/onboarding')) {
			return 'Sheet Setup';
		}
		return 'Dashboard';
	});
</script>

<svelte:head>
	<title>{pageTitle} - Roo</title>
</svelte:head>

<AuthGuard>
	<div class="min-h-screen bg-gray-50">
		<Navigation />
		<main class="pt-10">
			{@render children?.()}
		</main>
	</div>
</AuthGuard>
