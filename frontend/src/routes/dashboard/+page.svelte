<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// This page should redirect to role-specific dashboard
	// Server-side hooks handle most redirects, but this is a client-side fallback
	onMount(() => {
		if (auth.user) {
			if (auth.user.role === 'teacher') {
				goto('/dashboard/teacher', { replaceState: true });
			} else {
				goto('/dashboard/student', { replaceState: true });
			}
		} else if (!auth.loading) {
			// Not authenticated, redirect to login
			goto('/login', { replaceState: true });
		}
	});
</script>

<!-- Loading state while redirecting -->
<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		<svg
			class="mx-auto h-12 w-12 animate-spin text-blue-600"
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
		<p class="mt-4 text-gray-600">Redirecting to your dashboard...</p>
	</div>
</div>
