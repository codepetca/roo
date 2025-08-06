<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button, Input } from '$lib/components/ui';

	const dispatch = createEventDispatcher();

	let email = $state('');
	let passcode = $state('');
	let loading = $state(false);
	let error = $state('');
	let passcodeStep = $state(false);

	async function handleSendPasscode() {
		if (!email || !email.includes('@')) {
			error = 'Please enter a valid email address';
			return;
		}

		loading = true;
		error = '';

		try {
			console.log('Sending passcode to:', email);

			// Import the API client
			const { api } = await import('$lib/api');

			const result = await api.sendPasscode({ email });

			// Successfully sent passcode
			passcodeStep = true;
			console.log('Passcode sent successfully', result);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send passcode';
		} finally {
			loading = false;
		}
	}

	async function handleVerifyPasscode() {
		if (!passcode || passcode.length !== 6) {
			error = 'Please enter a valid 6-digit passcode';
			return;
		}

		loading = true;
		error = '';

		try {
			console.log('Verifying passcode for email:', email);

			// Import the API client
			const { api } = await import('$lib/api');

			const result = await api.verifyPasscode({ email, passcode });

			console.log('Passcode verification successful', result);

			// Sign in with the custom token
			const { signInWithCustomToken } = await import('firebase/auth');
			const { firebaseAuth } = await import('$lib/firebase');

			await signInWithCustomToken(firebaseAuth, result.firebaseToken);

			// Set auth cookie for server-side authentication
			const idToken = await firebaseAuth.currentUser?.getIdToken();
			if (idToken) {
				document.cookie = `auth-token=${idToken}; path=/; secure; samesite=strict`;
			}

			// Dispatch success event
			dispatch('success', {
				user: result.userProfile,
				isNewUser: result.isNewUser
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Authentication failed';
		} finally {
			loading = false;
		}
	}

	function goBackToEmail() {
		passcodeStep = false;
		passcode = '';
		error = '';
	}
</script>

<div class="space-y-4">
	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Authentication Error</h3>
					<div class="mt-2 text-sm text-red-700">
						<p>{error}</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if !passcodeStep}
		<!-- Email Step -->
		<div class="space-y-4">
			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-gray-700">
					School Email Address
				</label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					placeholder="your.name@schooldomain.edu"
					disabled={loading}
					class="w-full"
				/>
				<p class="mt-1 text-xs text-gray-500">
					Enter your school email address to receive a login passcode
				</p>
			</div>

			<Button onclick={handleSendPasscode} disabled={loading || !email} class="w-full">
				{#if loading}
					<svg
						class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
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
					Sending Passcode...
				{:else}
					Send Login Passcode
				{/if}
			</Button>
		</div>
	{:else}
		<!-- Passcode Step -->
		<div class="space-y-4">
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label for="passcode" class="block text-sm font-medium text-gray-700">
						Enter Passcode
					</label>
					<button
						type="button"
						onclick={goBackToEmail}
						class="text-sm text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
					>
						Change Email
					</button>
				</div>
				<Input
					id="passcode"
					type="text"
					bind:value={passcode}
					placeholder="Enter 6-digit passcode"
					disabled={loading}
					class="w-full text-center text-lg tracking-widest"
					maxlength="6"
				/>
				<p class="mt-1 text-xs text-gray-500">
					Check your email ({email}) for the login passcode
				</p>
			</div>

			<Button onclick={handleVerifyPasscode} disabled={loading || !passcode} class="w-full">
				{#if loading}
					<svg
						class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
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
					Verifying...
				{:else}
					Sign In
				{/if}
			</Button>

			<div class="text-center">
				<button
					type="button"
					onclick={handleSendPasscode}
					disabled={loading}
					class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
				>
					Didn't receive a passcode? Send again
				</button>
			</div>
		</div>
	{/if}
</div>
