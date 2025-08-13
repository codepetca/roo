<script lang="ts">
	/**
	 * Student Self-Registration Component
	 * Location: frontend/src/lib/components/auth/StudentSelfRegister.svelte
	 * 
	 * Allows students to self-register and request their own passcode
	 * Uses the new /auth/student-request-passcode endpoint (admin-only passcode generation)
	 */
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
	let registrationStep: 'email' | 'passcode' | 'completed' = $state('email');

	// Form validation
	let requestEnabled = $derived(email && email.includes('@') && !loading);
	let verifyEnabled = $derived(passcode.length === 5 && !loading); // 5-char alphanumeric

	async function handleRequestPasscode() {
		if (!email || !email.includes('@')) {
			error = 'Please enter a valid school email address';
			return;
		}

		loading = true;
		error = '';
		success = '';

		try {
			console.log('Student requesting self-registration passcode:', email);

			// Call the new student-request-passcode endpoint
			const result = await api.studentRequestPasscode({ 
				email: email.trim().toLowerCase()
			});

			success = `Registration request sent! A passcode has been generated for ${email}. Check your email for login instructions.`;
			registrationStep = 'passcode';

			console.log('Student self-registration passcode request successful');

		} catch (err: any) {
			console.error('Student self-registration error:', err);
			
			if (err.message?.includes('already enrolled')) {
				error = 'You are already enrolled in classes. Please use the regular student login instead.';
			} else if (err.message?.includes('not found in classrooms')) {
				error = 'Your email was not found in any classroom rosters. Please contact your teacher to be added to a class first.';
			} else {
				error = err.message || 'Failed to process registration request. Please try again or contact your teacher.';
			}
		} finally {
			loading = false;
		}
	}

	async function handleVerifyPasscode() {
		if (!passcode || passcode.length !== 5) {
			error = 'Please enter the 5-character passcode';
			return;
		}

		loading = true;
		error = '';

		try {
			console.log('Verifying student self-registration passcode:', email);

			const result = await api.verifyPasscode({ 
				email: email.trim().toLowerCase(), 
				passcode: passcode.trim().toUpperCase()
			});

			if (result.valid && result.firebaseToken) {
				// Sign in with custom token
				const userCredential = await signInWithCustomToken(firebaseAuth, result.firebaseToken);
				const user = userCredential.user;

				console.log('Student self-registration successful:', result.userProfile);
				
				registrationStep = 'completed';
				success = 'Registration completed successfully! Welcome to your classes.';

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
			} else {
				throw new Error('Invalid passcode verification response');
			}

		} catch (err: any) {
			console.error('Passcode verification error:', err);
			
			if (err.message?.includes('Invalid passcode')) {
				error = 'Incorrect passcode. Please check the code and try again.';
			} else if (err.message?.includes('not found')) {
				error = 'Passcode not found. Please request a new registration code.';
			} else {
				error = err.message || 'Failed to verify passcode. Please try again.';
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
		registrationStep = 'email';
	}

	function goBackToEmail() {
		registrationStep = 'email';
		error = '';
		passcode = '';
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
					<h3 class="text-sm font-medium text-red-800">Registration Error</h3>
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

	{#if registrationStep === 'email'}
		<!-- Step 1: Enter Email for Registration -->
		<div class="space-y-4">
			<div class="text-center">
				<h3 class="text-lg font-medium text-gray-900 mb-2">Student Registration</h3>
				<p class="text-sm text-gray-600">
					Enter your school email address to register for your classes. You must already be enrolled by your teacher.
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
					Use the same email address your teacher used to enroll you in class
				</p>
			</div>

			<Button onclick={handleRequestPasscode} disabled={!requestEnabled} class="w-full">
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
					Processing Registration...
				{:else}
					Register for Classes
				{/if}
			</Button>

			<div class="text-center">
				<p class="text-xs text-gray-500">
					Already have a passcode? Continue below after clicking "Register"
				</p>
			</div>
		</div>

	{:else if registrationStep === 'passcode'}
		<!-- Step 2: Enter Passcode -->
		<div class="space-y-4">
			<div class="text-center">
				<h3 class="text-lg font-medium text-gray-900 mb-2">Enter Your Passcode</h3>
				<p class="text-sm text-gray-600">
					A 5-character passcode has been generated for your account. Enter it below to complete registration.
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
					5-Character Passcode
				</label>
				<Input
					id="passcode"
					type="text"
					bind:value={passcode}
					placeholder="ABC12"
					disabled={loading}
					maxlength="5"
					class="w-full text-center text-lg tracking-wider font-mono uppercase"
					style="text-transform: uppercase;"
				/>
				<p class="mt-1 text-xs text-gray-500">
					Your permanent 5-character login passcode (letters and numbers)
				</p>
			</div>

			<Button onclick={handleVerifyPasscode} disabled={!verifyEnabled} class="w-full">
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
					Completing Registration...
				{:else}
					Complete Registration
				{/if}
			</Button>

			<div class="flex justify-between text-sm">
				<button
					type="button"
					onclick={goBackToEmail}
					disabled={loading}
					class="text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
				>
					← Different email
				</button>
				<button
					type="button"
					onclick={handleRequestPasscode}
					disabled={loading}
					class="text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
				>
					Request new code
				</button>
			</div>
		</div>

	{:else if registrationStep === 'completed'}
		<!-- Step 3: Registration Complete -->
		<div class="space-y-4 text-center">
			<div class="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
				<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
				</svg>
			</div>
			
			<h3 class="text-lg font-medium text-gray-900">Registration Complete!</h3>
			<p class="text-sm text-gray-600">
				You are now registered and logged into your classes. Your passcode will remain the same for future logins.
			</p>

			<div class="bg-blue-50 border border-blue-200 rounded-md p-3 text-left">
				<h4 class="text-sm font-medium text-blue-900 mb-1">Remember:</h4>
				<ul class="text-xs text-blue-800 space-y-1">
					<li>• Your passcode is: <strong class="font-mono">{passcode}</strong></li>
					<li>• This passcode will never expire</li>
					<li>• Use it to log in anytime with your email</li>
					<li>• Only admins can generate new passcodes (not teachers)</li>
				</ul>
			</div>
		</div>
	{/if}

	{#if registrationStep !== 'completed'}
		<div class="mt-6 text-center border-t pt-4">
			<p class="text-xs text-gray-500 mb-2">
				Need help? Contact your teacher or administrator.
			</p>
			<button
				type="button"
				onclick={resetForm}
				class="text-xs text-gray-400 hover:text-gray-600 focus:underline focus:outline-none"
			>
				Start over
			</button>
		</div>
	{/if}
</div>