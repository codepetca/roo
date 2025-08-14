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
	let showRequestHelp = $state(false);

	// Enhanced debugging for Svelte 5
	$effect(() => {
		console.log('🔵 StudentPasscodeAuth - State Change:', {
			email: email,
			passcode: passcode,
			loading: loading,
			showRequestHelp: showRequestHelp,
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

			success = `A new login code has been sent to ${email}. Check your email for your permanent 5-character code.`;
			showRequestHelp = false;

			console.log('Passcode request successful');
		} catch (err: any) {
			console.error('Passcode request error:', err);

			// Handle specific HTTP status codes
			if (err.status === 404) {
				// Student not enrolled in any classrooms
				error =
					err.response?.error ||
					'Email not found in any classroom rosters. Please contact your teacher to be added to a class first.';
			} else if (err.status === 400) {
				// Invalid email or missing data
				error = err.response?.error || 'Please check your email address and try again.';
			} else if (err.message?.includes('Teacher authentication required')) {
				error =
					'A teacher must send you the login code. Please ask your teacher to send you a login code.';
			} else if (err.message?.includes('Gmail access required')) {
				error =
					'Your teacher needs to sign in with Google to send login codes. Please ask your teacher to sign in first.';
			} else {
				error =
					err.response?.error ||
					err.message ||
					'Failed to send login code. Please ask your teacher to send you a login code.';
			}
		} finally {
			loading = false;
		}
	}

	async function handleSignIn() {
		if (!email || !email.includes('@')) {
			error = 'Please enter a valid email address';
			return;
		}

		if (!passcode || passcode.length !== 5) {
			error = 'Please enter your 5-character login code';
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
					console.log(
						'Student authentication successful, requires client auth:',
						result.userProfile
					);

					// Clear any existing Firebase Auth user first
					const { signOut } = await import('firebase/auth');
					try {
						await signOut(firebaseAuth);
						console.log('Previous Firebase Auth user signed out');
					} catch (err) {
						console.log('No previous Firebase Auth user to sign out');
					}

					// Update auth store manually since we can't use Firebase custom tokens
					const { auth } = await import('$lib/stores/auth.svelte');

					// Create an AuthUser object for the auth store
					const studentUser = {
						uid: result.userProfile.uid,
						email: result.userProfile.email,
						displayName: result.userProfile.displayName,
						role: 'student' as const,
						schoolEmail: result.userProfile.schoolEmail || null
					};

					// Store user data in auth store (this is a workaround for the custom token limitation)
					// Note: This bypasses Firebase Auth but updates our app's auth state
					console.log('Manually updating auth store with student profile:', studentUser);
					auth.setUser(studentUser);

					dispatch('success', {
						user: studentUser,
						isNewUser: result.isNewUser,
						profile: result.userProfile,
						requiresClientAuth: true
					});
				} else {
					throw new Error(
						'Invalid passcode verification response: missing token and client auth flag'
					);
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
				error =
					'This login code has already been used. Please request a new code from your teacher.';
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
		showRequestHelp = false;
	}

	function toggleRequestHelp() {
		showRequestHelp = !showRequestHelp;
		error = '';
	}
</script>

<div class="space-y-4" data-testid="student-passcode-auth-form">
	{#if error}
		<div class="rounded-md bg-red-50 p-4" data-testid="auth-error-message">
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
		<div class="rounded-md bg-green-50 p-4" data-testid="auth-success-message">
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

	<!-- Main Login Form - Always Visible -->
	<div class="space-y-4" data-testid="student-login-form">
		<div class="text-center">
			<h3 class="mb-2 text-lg font-medium text-gray-900">Student Login</h3>
			<p class="text-sm text-gray-600">Enter your email and permanent login code</p>
		</div>

		<div>
			<label for="email" class="mb-2 block text-sm font-medium text-gray-700">
				School Email Address
			</label>
			<Input
				id="email"
				type="email"
				bind:value={email}
				data-testid="email-input"
				placeholder="your.name@schooldomain.edu"
				disabled={loading}
				class="w-full"
			/>
			<p class="mt-1 text-xs text-gray-500">The email address registered with your classroom</p>
		</div>

		<div>
			<label for="passcode" class="mb-2 block text-sm font-medium text-gray-700">
				5-Character Login Code
			</label>
			<Input
				id="passcode"
				type="text"
				bind:value={passcode}
				data-testid="passcode-input"
				placeholder="ABC12"
				disabled={loading}
				maxlength="5"
				class="w-full text-center font-mono text-lg tracking-wider uppercase"
				oninput={(e) => (passcode = e.currentTarget.value.toUpperCase())}
			/>
			<p class="mt-1 text-xs text-gray-500">Your permanent login code (like a password)</p>
		</div>

		<Button
			onclick={handleSignIn}
			disabled={loading || !email || passcode.length !== 5}
			data-testid="submit-auth-button"
			class="w-full"
		>
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
				Signing In...
			{:else}
				Sign In
			{/if}
		</Button>

		<!-- Help Section -->
		<div class="border-t pt-4">
			<div class="text-center text-sm">
				<p class="mb-2 text-gray-600">Don't have a login code or forgot it?</p>
				{#if !showRequestHelp}
					<button
						type="button"
						onclick={toggleRequestHelp}
						data-testid="request-passcode-button"
						disabled={loading}
						class="font-medium text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
					>
						Request a Login Code
					</button>
				{:else}
					<div class="mt-3 space-y-3">
						<p class="text-xs text-gray-500">
							Enter your email above and click below to receive your permanent login code
						</p>
						<Button
							onclick={handleRequestPasscode}
							disabled={loading || !email}
							data-testid="send-passcode-button"
							variant="secondary"
							class="w-full"
						>
							Send Login Code to Email
						</Button>
						<button
							type="button"
							onclick={toggleRequestHelp}
							data-testid="cancel-request-button"
							disabled={loading}
							class="text-sm text-gray-600 hover:text-gray-800"
						>
							Cancel
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
