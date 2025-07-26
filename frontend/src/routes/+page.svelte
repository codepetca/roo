<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores';

	onMount(() => {
		// Redirect authenticated users to dashboard
		if (auth.user) {
			goto('/dashboard');
		} else {
			// Redirect unauthenticated users to login
			goto('/login');
		}
	});
</script>

<svelte:head>
	<title>Roo - AI-Powered Auto-Grading System</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="text-center">
		<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
		<p class="text-gray-600">Loading Roo...</p>
	</div>
</div>
