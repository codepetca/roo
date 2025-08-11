<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui';

	interface Props {
		isSignup?: boolean;
	}

	let { isSignup = false }: Props = $props();

	const dispatch = createEventDispatcher();

	let loading = $state(false);
	let error = $state('');

	async function handleGoogleAuth() {
		loading = true;
		error = '';

		try {
			console.log('Starting Google OAuth for teacher...', { isSignup });

			// Import Firebase auth functions
			const { signInWithGoogle } = await import('$lib/firebase');
			const { api } = await import('$lib/api');

			// Sign in with Google and get access token
			const { user, accessToken } = await signInWithGoogle();

			console.log('Google OAuth successful', {
				uid: user.uid,
				email: user.email,
				hasAccessToken: !!accessToken
			});

			// Store the access token for later use with Google APIs
			// This token will be needed for creating sheets and accessing Drive
			sessionStorage.setItem('google_access_token', accessToken);

			// Create teacher profile with role (essential for sidebar to show)
			try {
				console.log('Creating teacher profile with role...');
				const profileResult = await api.createProfile({
					uid: user.uid,
					role: 'teacher'
				});
				console.log('Teacher profile created:', profileResult);

				// Force token refresh to get updated custom claims
				console.log('Forcing token refresh to get updated role...');
				await user.getIdToken(true); // Force refresh

				// Wait a moment for claims to propagate
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (profileError) {
				console.warn('Failed to create teacher profile, but auth succeeded:', profileError);
				// Don't fail the whole auth process for this
			}

			// Get Firebase ID token for backend authentication (after refresh)
			const idToken = await user.getIdToken();

			// Set auth cookie for server-side authentication
			document.cookie = `auth-token=${idToken}; path=/; secure; samesite=strict`;

			// Dispatch success event with user data
			dispatch('success', {
				user: {
					uid: user.uid,
					email: user.email,
					displayName: user.displayName
				},
				accessToken,
				idToken,
				isSignup
			});
		} catch (err) {
			console.error('Google OAuth error:', err);
			error = err instanceof Error ? err.message : 'Authentication failed';
		} finally {
			loading = false;
		}
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

	<Button
		onclick={handleGoogleAuth}
		disabled={loading}
		class="flex w-full items-center justify-center space-x-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
	>
		{#if loading}
			<svg
				class="mr-3 -ml-1 h-5 w-5 animate-spin text-gray-700"
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
			{isSignup ? 'Creating Account...' : 'Signing In...'}
		{:else}
			<svg class="h-5 w-5" viewBox="0 0 24 24">
				<path
					fill="#4285F4"
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				/>
				<path
					fill="#34A853"
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				/>
				<path
					fill="#FBBC05"
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				/>
				<path
					fill="#EA4335"
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				/>
			</svg>
			{isSignup ? 'Create Account with Google' : 'Sign In with Google'}
		{/if}
	</Button>

	<div class="text-center text-xs text-gray-500">
		By signing in, you agree to share your Google Drive and Sheets access for managing student
		assignments and grades.
	</div>
</div>
