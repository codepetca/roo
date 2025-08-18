<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores';

	onMount(() => {
		// Redirect authenticated users to appropriate dashboard
		if (auth.user) {
			if (auth.user.role === 'teacher') {
				goto('/dashboard/teacher');
			} else {
				goto('/dashboard/student');
			}
		} else {
			// Redirect unauthenticated users to login
			goto('/login');
		}
	});
</script>

<svelte:head>
	<title>Roo - AI Grading System</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="text-center">
		<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
		<p class="text-gray-600">Loading Roo...</p>
	</div>
</div>
