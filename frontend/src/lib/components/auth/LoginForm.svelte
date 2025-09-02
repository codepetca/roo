<script lang="ts">
	import { auth } from '$lib/stores';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	// Role is determined from user's profile, not selected during login

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!email.trim() || !password.trim()) {
			return;
		}

		try {
			await auth.signIn(email, password);
		} catch (error) {
			// Error is handled by the auth store
			console.error('Login failed:', error);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit(event);
		}
	}

</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-8 shadow-md">
	<div class="mb-6 text-center">
		<h1 class="text-2xl font-bold text-gray-900">Sign In to Roo</h1>
		<p class="mt-2 text-gray-600">Access your educational dashboard</p>
	</div>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<label for="email" class="mb-1 block text-sm font-medium text-gray-700">
				Email Address
			</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				onkeydown={handleKeydown}
				class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
				placeholder="Enter your email"
				required
				disabled={auth.loading}
			/>
		</div>

		<div>
			<label for="password" class="mb-1 block text-sm font-medium text-gray-700"> Password </label>
			<div class="relative">
				<input
					id="password"
					type={showPassword ? 'text' : 'password'}
					bind:value={password}
					onkeydown={handleKeydown}
					class="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="Enter your password"
					required
					disabled={auth.loading}
				/>
				<button
					type="button"
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
					onclick={() => (showPassword = !showPassword)}
				>
					{#if showPassword}
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
							/>
						</svg>
					{:else}
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
							/>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		{#if auth.error}
			<div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{auth.error}
			</div>
		{/if}

		<button
			type="submit"
			disabled={auth.loading || !email.trim() || !password.trim()}
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if auth.loading}
				<svg
					class="mr-3 -ml-1 inline h-5 w-5 animate-spin text-white"
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
				Signing In...
			{:else}
				Sign In
			{/if}
		</button>
	</form>

</div>
