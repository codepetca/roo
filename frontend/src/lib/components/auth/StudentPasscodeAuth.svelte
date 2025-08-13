<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { signInWithCustomToken } from 'firebase/auth';
	import { firebaseAuth } from '$lib/firebase';
	import { api } from '$lib/api';
	import { Button, Input } from '$lib/components/ui';

	const dispatch = createEventDispatcher();

	let email = $state('');
	let passcode = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	let passcodeRequested = $state(false);

	// Enhanced debugging for Svelte 5
	$effect(() => {
		console.log('🔵 StudentPasscodeAuth - State Change:', {
			email: email,
			passcode: passcode,
			loading: loading,
			passcodeRequested: passcodeRequested,
			error: error,
			success: success
		});
	});

	async function handleRequestPasscode() {
		if (!email || !email.includes('@')) {
			error = 'Please enter a valid email address';
			return;
		}

		loading = true;
		error = '';
		success = '';

		try {
			console.log('Requesting passcode for student:', email);

			await api.studentRequestPasscode({ email });

			success = `Login code sent to ${email}. Check your email and enter the 5-character code below.`;
			passcodeRequested = true;

			console.log('Passcode request successful');

		} catch (err: any) {
			console.error('Passcode request error:', err);
			
			// Handle specific HTTP status codes
			if (err.status === 404) {
				// Student not enrolled in any classrooms
				error = err.response?.error || 'Email not found in any classroom rosters. Please contact your teacher to be added to a class first.';
			} else if (err.status === 400) {
				// Invalid email or missing data
				error = err.response?.error || 'Please check your email address and try again.';
			} else if (err.message?.includes('Teacher authentication required')) {
				error = 'A teacher must send you the login code. Please ask your teacher to send you a login code.';
			} else if (err.message?.includes('Gmail access required')) {
				error = 'Your teacher needs to sign in with Google to send login codes. Please ask your teacher to sign in first.';
			} else {
				error = err.response?.error || err.message || 'Failed to send login code. Please ask your teacher to send you a login code.';
			}
		} finally {
			loading = false;
		}
	}

	async function handleVerifyPasscode() {
		if (!passcode || passcode.length !== 5) {
			error = 'Please enter the 5-character login code';
			return;
		}

		loading = true;
		error = '';

		try {
			console.log('Verifying passcode for:', email);

			const result = await api.verifyPasscode({ email, passcode });

			if (result.valid) {
				if (result.firebaseToken) {
					// Sign in with custom token (when Firebase IAM permissions work)
					const userCredential = await signInWithCustomToken(firebaseAuth, result.firebaseToken);
					const user = userCredential.user;

					console.log('Student authentication successful with custom token:', result.userProfile);

					// Dispatch success event
					dispatch('success', {
						user: {
							uid: user.uid,
							email: user.email,
							displayName: user.displayName
						},
						isNewUser: result.isNewUser,
						profile: result.userProfile
					});
				} else if (result.requiresClientAuth) {
					// Fallback: Handle client-side auth when custom tokens can't be created
					console.log('Student authentication successful, requires client auth:', result.userProfile);
					
					// For now, we can dispatch success with the profile info we have
					// In a full implementation, you might want to handle this differently
					dispatch('success', {
						user: {
							uid: result.userProfile.uid,
							email: result.userProfile.email,
							displayName: result.userProfile.displayName
						},
						isNewUser: result.isNewUser,
						profile: result.userProfile,
						requiresClientAuth: true
					});
				} else {
					throw new Error('Invalid passcode verification response: missing token and client auth flag');
				}
			} else {
				throw new Error('Passcode verification failed');
			}

		} catch (err: any) {
			console.error('Passcode verification error:', err);
			
			if (err.message?.includes('Invalid passcode')) {
				error = 'Incorrect login code. Please check the code and try again.';
			} else if (err.message?.includes('expired')) {
				error = 'Login code has expired. Please request a new code from your teacher.';
			} else if (err.message?.includes('already used')) {
				error = 'This login code has already been used. Please request a new code from your teacher.';
			} else {
				error = err.message || 'Failed to verify login code';
			}
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		email = '';
		passcode = '';
		error = '';
		success = '';
		passcodeRequested = false;
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

	{#if success}
		<div class="rounded-md bg-green-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-green-800">Success</h3>
					<div class="mt-2 text-sm text-green-700">
						<p>{success}</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if !passcodeRequested}
		<!-- Step 1: Request Passcode -->
		<div class="space-y-4">
			<div class="text-center">
				<h3 class="text-lg font-medium text-gray-900 mb-2">Student Login</h3>
				<p class="text-sm text-gray-600">
					Enter your school email address to request a login code from your teacher.
				</p>
			</div>

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
					Your teacher will send a login code to this email address
				</p>
			</div>

			<Button onclick={handleRequestPasscode} disabled={loading || !email} class="w-full">
				{#if loading}
					<svg
						class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Requesting Login Code...
				{:else}
					Request Login Code
				{/if}
			</Button>

			<div class="text-center">
				<p class="text-xs text-gray-500">
					Note: Your teacher must be signed in to send you a login code
				</p>
			</div>
		</div>
	{:else}
		<!-- Step 2: Enter Passcode -->
		<div class="space-y-4">
			<div class="text-center">
				<h3 class="text-lg font-medium text-gray-900 mb-2">Enter Login Code</h3>
				<p class="text-sm text-gray-600">
					Check your email for a 5-character login code from your teacher.
				</p>
			</div>

			<div>
				<label for="email-display" class="mb-2 block text-sm font-medium text-gray-700">
					Email Address
				</label>
				<div class="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
					{email}
				</div>
			</div>

			<div>
				<label for="passcode" class="mb-2 block text-sm font-medium text-gray-700">
					5-Character Login Code
				</label>
				<Input
					id="passcode"
					type="text"
					bind:value={passcode}
					placeholder="ABC12"
					disabled={loading}
					maxlength="5"
					class="w-full text-center text-lg tracking-wider font-mono"
				/>
				<p class="mt-1 text-xs text-gray-500">
					Enter the 5-character code from your email
				</p>
			</div>

			<Button onclick={handleVerifyPasscode} disabled={loading || passcode.length !== 5} class="w-full">
				{#if loading}
					<svg
						class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Verifying Code...
				{:else}
					Sign In
				{/if}
			</Button>

			<div class="flex justify-between text-sm">
				<button
					type="button"
					onclick={resetForm}
					disabled={loading}
					class="text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
				>
					Use different email
				</button>
				<button
					type="button"
					onclick={handleRequestPasscode}
					disabled={loading}
					class="text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
				>
					Resend code
				</button>
			</div>
		</div>
	{/if}
</div>