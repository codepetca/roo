<script lang="ts">
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import SignupForm from '$lib/components/auth/SignupForm.svelte';
	import { Alert } from '$lib/components/ui';
	
	let showSignup = false;
	let signupSuccess = false;
	let successMessage = '';

	function handleShowSignup() {
		showSignup = true;
		signupSuccess = false;
	}

	function handleShowLogin() {
		showSignup = false;
		signupSuccess = false;
	}

	function handleSignupSuccess(event: CustomEvent) {
		const { user } = event.detail;
		signupSuccess = true;
		successMessage = `Account created successfully! You can now log in as ${user.email}.`;
		showSignup = false;
	}
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

		{#if signupSuccess}
			<Alert variant="success">
				{#snippet children()}
					{successMessage}
				{/snippet}
			</Alert>
		{/if}

		{#if showSignup}
			<SignupForm 
				on:success={handleSignupSuccess} 
				on:cancel={handleShowLogin}
			/>
		{:else}
			<div class="space-y-6">
				<LoginForm />
				
				<div class="text-center">
					<p class="text-sm text-gray-600">
						Don't have an account?
						<button 
							type="button"
							class="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors"
							on:click={handleShowSignup}
						>
							Create an account
						</button>
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>
