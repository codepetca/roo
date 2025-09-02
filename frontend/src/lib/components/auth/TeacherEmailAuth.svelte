<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
	import { firebaseAuth } from '$lib/firebase';
	import { api, API_BASE_URL } from '$lib/api';
	import { Button, Alert, LoadingSpinner } from '$lib/components/ui';

	const dispatch = createEventDispatcher<{
		success: {
			user: { uid: string; email: string | null; displayName: string | null; role: string };
		};
		cancel: void;
	}>();

	// Form state
	let mode: 'login' | 'signup' = 'login';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let displayName = '';
	let schoolEmail = '';
	let loading = false;
	let loadingMessage = '';
	let error = '';


	async function handleSubmit() {
		if (mode === 'signup' && password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		if (mode === 'signup' && !schoolEmail.trim()) {
			error = 'School email is required for teachers';
			return;
		}

		loading = true;
		error = '';

		try {
			let userCredential;

			if (mode === 'signup') {
				loadingMessage = 'Creating your account...';

				// Create new account
				userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

				loadingMessage = 'Updating your profile...';

				// Update display name if provided
				if (displayName) {
					const { updateProfile } = await import('firebase/auth');
					await updateProfile(userCredential.user, { displayName });
				}

				loadingMessage = 'Setting up your teacher profile...';

				// Create teacher profile with school email - wait for it to complete
				const profileResult = await api.createProfile({
					uid: userCredential.user.uid,
					role: 'teacher',
					schoolEmail: schoolEmail.trim(),
					displayName: displayName || undefined
				});

				if (!profileResult.success) {
					throw new Error(profileResult.message || 'Failed to create teacher profile');
				}

				loadingMessage = 'Verifying profile setup...';

				// Verify profile exists by attempting to fetch it with retry logic
				let profileVerified = false;
				const maxRetries = 5;
				const retryDelay = 1000; // 1 second between retries

				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					try {
						// Get fresh token to ensure auth state is updated
						const freshToken = await userCredential.user.getIdToken(true);

						// Try to fetch the profile
						const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
							headers: {
								Authorization: `Bearer ${freshToken}`,
								'Content-Type': 'application/json'
							}
						});

						if (response.ok) {
							const profileData = await response.json();
							if (profileData.success && profileData.data) {
								profileVerified = true;
								console.log('✅ Profile verified successfully:', profileData.data);
								break;
							}
						}

						if (attempt < maxRetries) {
							console.log(
								`⏳ Profile verification attempt ${attempt} failed, retrying in ${retryDelay}ms...`
							);
							await new Promise((resolve) => setTimeout(resolve, retryDelay));
						}
					} catch (verifyError) {
						console.warn(`Profile verification attempt ${attempt} failed:`, verifyError);
						if (attempt < maxRetries) {
							await new Promise((resolve) => setTimeout(resolve, retryDelay));
						}
					}
				}

				if (!profileVerified) {
					console.warn('⚠️ Profile verification failed after all retries, proceeding anyway');
				}

				loadingMessage = 'Profile setup complete!';
			} else {
				loadingMessage = 'Signing you in...';

				// Sign in existing account
				userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
			}

			// Dispatch success event
			dispatch('success', {
				user: {
					uid: userCredential.user.uid,
					email: userCredential.user.email,
					displayName: userCredential.user.displayName || displayName,
					role: 'teacher'
				}
			});
		} catch (err) {
			console.error('Teacher auth error:', err);

			// Handle specific Firebase Auth errors
			const authError = err as { code?: string; message?: string };
			if (authError.code === 'auth/email-already-in-use') {
				error = 'An account with this email already exists. Try signing in instead.';
			} else if (authError.code === 'auth/user-not-found') {
				error = 'No account found with this email. Try creating an account instead.';
			} else if (authError.code === 'auth/wrong-password') {
				error = 'Incorrect password';
			} else if (authError.code === 'auth/invalid-email') {
				error = 'Please enter a valid email address';
			} else if (authError.code === 'auth/weak-password') {
				error = 'Password is too weak. Please choose a stronger password';
			} else {
				error = authError.message || 'Authentication failed';
			}
		} finally {
			loading = false;
			loadingMessage = '';
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function toggleMode() {
		mode = mode === 'login' ? 'signup' : 'login';
		error = '';
		// Clear form but keep email
		password = '';
		confirmPassword = '';
		displayName = '';
		schoolEmail = '';
	}
</script>

<div class="space-y-6" data-testid="teacher-email-auth-form">
	<div>
		<h2 class="text-center text-2xl font-bold text-gray-900" data-testid="teacher-email-form-title">
			{mode === 'login' ? 'Teacher Sign In' : 'Create Teacher Account'}
		</h2>
	</div>

	{#if error}
		<Alert variant="error" data-testid="auth-error-message">
			{#snippet children()}
				{error}
			{/snippet}
		</Alert>
	{/if}

	<form on:submit|preventDefault={handleSubmit} class="space-y-4" data-testid="teacher-email-form">
		<!-- Email -->
		<div>
			<label for="email" class="mb-1 block text-sm font-medium text-gray-700">
				Email Address
			</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				data-testid="email-input"
				class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
				placeholder="teacher@school.com"
				required
				disabled={loading}
			/>
		</div>

		{#if mode === 'signup'}
			<!-- Display Name (Signup only) -->
			<div>
				<label for="displayName" class="mb-1 block text-sm font-medium text-gray-700">
					Display Name
				</label>
				<input
					id="displayName"
					type="text"
					bind:value={displayName}
					data-testid="display-name-input"
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="Your full name"
					disabled={loading}
				/>
			</div>

			<!-- School Email (Signup only) -->
			<div>
				<label for="schoolEmail" class="mb-1 block text-sm font-medium text-gray-700">
					School Email <span class="text-red-500">*</span>
				</label>
				<input
					id="schoolEmail"
					type="email"
					bind:value={schoolEmail}
					data-testid="school-email-input"
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="your.name@school.edu"
					required
					disabled={loading}
				/>
				<p class="mt-1 text-xs text-gray-500">
					This should be your official school/institution email address
				</p>
			</div>
		{/if}

		<!-- Password -->
		<div>
			<label for="password" class="mb-1 block text-sm font-medium text-gray-700"> Password </label>
			<input
				id="password"
				type="password"
				bind:value={password}
				data-testid="password-input"
				class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
				placeholder="Enter your password"
				required
				disabled={loading}
			/>
		</div>

		{#if mode === 'signup'}
			<!-- Confirm Password (Signup only) -->
			<div>
				<label for="confirmPassword" class="mb-1 block text-sm font-medium text-gray-700">
					Confirm Password
				</label>
				<input
					id="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					data-testid="confirm-password-input"
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="Confirm your password"
					required
					disabled={loading}
				/>
			</div>
		{/if}

		<!-- Submit Button -->
		<Button
			type="submit"
			disabled={loading || !email.trim() || !password.trim()}
			class="w-full"
			data-testid="submit-auth-button"
		>
			{#if loading}
				<LoadingSpinner size="sm" />
				{loadingMessage || (mode === 'login' ? 'Signing In...' : 'Creating Account...')}
			{:else}
				{mode === 'login' ? 'Sign In' : 'Create Account'}
			{/if}
		</Button>
	</form>

	<!-- Toggle between login/signup -->
	<div class="text-center">
		<button
			type="button"
			on:click={toggleMode}
			data-testid="toggle-auth-mode-button"
			class="text-sm text-blue-600 transition-colors hover:text-blue-500 focus:underline focus:outline-none"
			disabled={loading}
		>
			{mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
		</button>
	</div>


	
</div>
