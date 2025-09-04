<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
	import { firebaseAuth } from '$lib/firebase';
	import { api, API_BASE_URL } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { Button, Alert, LoadingSpinner } from '$lib/components/ui';

	const dispatch = createEventDispatcher<{
		success: {
			user: { uid: string; email: string | null; displayName: string | null; role: string };
		};
		cancel: void;
	}>();

	// Form state using Svelte 5 $state runes
	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let displayName = $state('');
	let schoolEmail = $state('');
	let loading = $state(false);
	let loadingMessage = $state('');
	let error = $state('');

	// Derived state for form validation using Svelte 5 $derived
	let isFormValid = $derived.by(() => {
		const hasRequiredFields = email.trim() && password.trim();
		if (mode === 'signup') {
			return hasRequiredFields && schoolEmail.trim();
		}
		return hasRequiredFields;
	});

	async function handleSubmit() {
		console.log('🚀 TeacherEmailAuth: Form submission started', {
			mode,
			email: email.substring(0, 10) + '...',
			hasPassword: !!password
		});

		// Add alert for debugging in tests
		if (typeof window !== 'undefined') {
			window.alert('🚀 FORM SUBMIT HANDLER CALLED - CHECK CONSOLE');
		}

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
			console.log('🔐 TeacherEmailAuth: Starting Firebase authentication...', {
				mode,
				email: email.substring(0, 10) + '...'
			});

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

				console.log('🔑 TeacherEmailAuth: Attempting signInWithEmailAndPassword...');
				console.log('🔑 Firebase Auth instance:', firebaseAuth ? 'Available' : 'Missing');

				// Sign in existing account
				try {
					userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
					console.log('✅ TeacherEmailAuth: signInWithEmailAndPassword successful', {
						uid: userCredential.user.uid,
						email: userCredential.user.email
					});
				} catch (authError) {
					console.error('❌ TeacherEmailAuth: signInWithEmailAndPassword failed', {
						code: authError.code,
						message: authError.message,
						stack: authError.stack
					});
					throw authError;
				}

				// Wait for auth store to complete profile loading and navigation
				loadingMessage = 'Loading your profile...';
				
				// Enhanced waiting mechanism with better error handling
				const maxWaitTime = 15000; // 15 seconds - increased timeout
				const startTime = Date.now();
				let lastCheck = 'Starting wait for auth store...';
				
				console.log('🔄 Waiting for auth store to complete profile loading...', {
					userUid: userCredential.user.uid,
					userEmail: userCredential.user.email
				});
				
				while (Date.now() - startTime < maxWaitTime) {
					// Check if auth store has completed loading the user
					if (auth.user && auth.user.uid === userCredential.user.uid && !auth.loading) {
						console.log('✅ Auth store completed profile loading successfully');
						break;
					}
					
					// Enhanced logging for debugging
					const currentCheck = `auth.user: ${auth.user ? auth.user.uid : 'null'}, auth.loading: ${auth.loading}, expected: ${userCredential.user.uid}`;
					if (currentCheck !== lastCheck) {
						console.log('🔄 Auth store status:', {
							hasUser: !!auth.user,
							userUid: auth.user?.uid || 'none',
							loading: auth.loading,
							expected: userCredential.user.uid,
							elapsed: Date.now() - startTime
						});
						lastCheck = currentCheck;
					}
					
					// Wait 300ms before checking again - slightly longer interval
					await new Promise(resolve => setTimeout(resolve, 300));
				}
				
				if (!auth.user || auth.user.uid !== userCredential.user.uid) {
					console.error('❌ Auth store failed to complete profile loading within timeout', {
						finalAuthUser: auth.user?.uid || 'none',
						expectedUid: userCredential.user.uid,
						finalLoading: auth.loading,
						totalWaitTime: Date.now() - startTime
					});
					
					// Don't throw an error here - let the dispatch happen anyway
					// The navigation issue might be separate from profile loading
					console.log('⚠️ Proceeding with dispatch despite auth store timeout...');
				}
			}

			// Dispatch success event after auth store completes
			dispatch('success', {
				user: {
					uid: userCredential.user.uid,
					email: userCredential.user.email,
					displayName: userCredential.user.displayName || displayName,
					role: 'teacher'
				}
			});
		} catch (err) {
			console.error('❌ TeacherEmailAuth: Complete authentication error', {
				error: err,
				code: err?.code,
				message: err?.message,
				stack: err?.stack,
				mode,
				email: email.substring(0, 10) + '...'
			});

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
			} else if (authError.code === 'auth/invalid-credential') {
				error = 'Invalid email or password. Please check your credentials.';
			} else {
				error = authError.message || 'Authentication failed';
			}

			// Log the final error state
			console.error('❌ TeacherEmailAuth: Final error state set:', error);
		} finally {
			loading = false;
			loadingMessage = '';
			console.log('🏁 TeacherEmailAuth: Authentication process completed', {
				loading: false,
				hasError: !!error,
				errorMessage: error || 'none'
			});
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

	<form 
		onsubmit={(e) => {
			console.log('🔥 FORM SUBMIT EVENT TRIGGERED', e);
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-4" 
		data-testid="teacher-email-form"
	>
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
		<button
			type="submit"
			disabled={loading || !isFormValid}
			class="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
			data-testid="submit-auth-button"
			onclick={() => console.log('🔘 Native button clicked')}
		>
			{#if loading}
				<LoadingSpinner size="sm" />
				{loadingMessage || (mode === 'login' ? 'Signing In...' : 'Creating Account...')}
			{:else}
				{mode === 'login' ? 'Sign In' : 'Create Account'}
			{/if}
		</button>
	</form>

	<!-- Toggle between login/signup -->
	<div class="text-center">
		<button
			type="button"
			onclick={toggleMode}
			data-testid="toggle-auth-mode-button"
			class="text-sm text-blue-600 transition-colors hover:text-blue-500 focus:underline focus:outline-none"
			disabled={loading}
		>
			{mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
		</button>
	</div>
</div>
