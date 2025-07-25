<script lang="ts">
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
</script>

<svelte:head>
	<title>Sign In - Roo</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h2 class="mb-2 text-3xl font-extrabold text-gray-900">Welcome to Roo</h2>
			<p class="text-gray-600">AI-powered auto-grading system for educational assignments</p>
		</div>

		<LoginForm />
	</div>
</div>
