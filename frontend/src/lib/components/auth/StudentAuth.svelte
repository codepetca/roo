<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
	import { firebaseAuth } from '$lib/firebase';
	import { api } from '$lib/api';
	import { Button, Input } from '$lib/components/ui';

	const dispatch = createEventDispatcher();

	let email = $state('');
	let password = $state('');
	let displayName = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	let authMode: 'signin' | 'signup' | 'reset' = $state('signin');

	// Test reactivity with manual state updates
	let testCounter = $state(0);
	let testString = $state('initial');
	let useNativeInputs = $state(false);

	// Native input fallback state
	let nativeEmail = $state('');
	let nativePassword = $state('');

	// Environment verification test
	function testReactivity() {
		console.log('🧪 Testing Svelte 5 reactivity...');
		testCounter++;
		testString = `updated-${testCounter}`;
		email = `test-${testCounter}@example.com`;
		password = `password-${testCounter}`;
		console.log('🧪 Manual update complete:', { testCounter, testString, email, password });
	}

	// Toggle between custom and native inputs
	function toggleInputType() {
		useNativeInputs = !useNativeInputs;
		console.log('🔄 Switching to:', useNativeInputs ? 'Native inputs' : 'Custom Input component');
		
		if (useNativeInputs) {
			nativeEmail = email;
			nativePassword = password;
		} else {
			email = nativeEmail;
			password = nativePassword;
		}
	}

	// Handle native input changes
	function handleNativeEmailChange(event: Event) {
		const target = event.target as HTMLInputElement;
		nativeEmail = target.value;
		email = target.value; // Sync with main state
		console.log('🟨 Native email changed:', nativeEmail);
	}

	function handleNativePasswordChange(event: Event) {
		const target = event.target as HTMLInputElement;
		nativePassword = target.value;
		password = target.value; // Sync with main state
		console.log('🟨 Native password changed:', nativePassword);
	}

	// Enhanced debugging for state changes
	$effect(() => {
		console.log('🔴 StudentAuth - State Change Detected');
		console.log('🔴 StudentAuth - Email:', JSON.stringify(email), 'Type:', typeof email, 'Length:', email.length);
		console.log('🔴 StudentAuth - Password:', JSON.stringify(password), 'Type:', typeof password, 'Length:', password.length);
		console.log('🔴 StudentAuth - DisplayName:', JSON.stringify(displayName), 'Type:', typeof displayName);
		console.log('🔴 StudentAuth - Loading:', loading, 'Type:', typeof loading);
		console.log('🔴 StudentAuth - AuthMode:', authMode);
		console.log('🔴 StudentAuth - Button should be enabled:', !!(email && password && !loading));
		console.log('🔴 StudentAuth - Email truthy:', !!email, 'Password truthy:', !!password);
	});

	// Separate effect to track when component mounts
	$effect(() => {
		console.log('🟣 StudentAuth - Component Effect Running');
		console.log('🟣 StudentAuth - Initial Email:', email);
		console.log('🟣 StudentAuth - Initial Password:', password);
		return () => {
			console.log('🟣 StudentAuth - Effect Cleanup');
		};
	});

	async function handleSignIn() {
		if (!email || !password) {
			error = 'Please enter both email and password';
			return;
		}

		loading = true;
		error = '';

		try {
			console.log('Signing in with email/password:', email);

			const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
			const user = userCredential.user;

			// Set auth cookie for server-side authentication
			const idToken = await user.getIdToken();
			if (idToken) {
				document.cookie = `auth-token=${idToken}; path=/; secure; samesite=strict`;
			}

			console.log('Sign-in successful');

			// Dispatch success event
			dispatch('success', {
				user: {
					uid: user.uid,
					email: user.email,
					displayName: user.displayName
				},
				isNewUser: false
			});
		} catch (err: any) {
			console.error('Sign-in error:', err);
			
			if (err.code === 'auth/user-not-found') {
				error = 'No account found with this email. Please create an account first.';
			} else if (err.code === 'auth/wrong-password') {
				error = 'Incorrect password. Try again or reset your password.';
			} else if (err.code === 'auth/invalid-email') {
				error = 'Please enter a valid email address';
			} else if (err.code === 'auth/too-many-requests') {
				error = 'Too many failed attempts. Please try again later or reset your password.';
			} else {
				error = err.message || 'Failed to sign in';
			}
		} finally {
			loading = false;
		}
	}

	async function handleSignUp() {
		if (!email || !password) {
			error = 'Please enter both email and password';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		loading = true;
		error = '';

		try {
			console.log('Creating new student account:', email);

			// Create user with Firebase Auth SDK
			const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
			const user = userCredential.user;

			// Update display name if provided
			if (displayName.trim()) {
				await updateProfile(user, { displayName: displayName.trim() });
			}

			// Create user profile with student role
			try {
				await api.createProfile({
					uid: user.uid,
					role: 'student',
					displayName: displayName.trim() || undefined
				});
				console.log('Student profile created successfully');
			} catch (roleError) {
				console.warn('Failed to set student role, but account was created:', roleError);
			}

			// Set auth cookie for server-side authentication
			const idToken = await user.getIdToken();
			if (idToken) {
				document.cookie = `auth-token=${idToken}; path=/; secure; samesite=strict`;
			}

			console.log('Student account created successfully');

			// Dispatch success event
			dispatch('success', {
				user: {
					uid: user.uid,
					email: user.email,
					displayName: user.displayName
				},
				isNewUser: true
			});
		} catch (err: any) {
			console.error('Sign-up error:', err);
			
			if (err.code === 'auth/email-already-in-use') {
				error = 'An account with this email already exists. Try signing in instead.';
			} else if (err.code === 'auth/invalid-email') {
				error = 'Please enter a valid email address';
			} else if (err.code === 'auth/weak-password') {
				error = 'Password is too weak. Please choose a stronger password';
			} else {
				error = err.message || 'Failed to create account';
			}
		} finally {
			loading = false;
		}
	}

	async function handlePasswordReset() {
		if (!email) {
			error = 'Please enter your email address';
			return;
		}

		loading = true;
		error = '';
		success = '';

		try {
			console.log('Sending password reset email to:', email);

			await sendPasswordResetEmail(firebaseAuth, email);

			success = `Password reset email sent to ${email}. Check your inbox and follow the link to reset your password.`;
			console.log('Password reset email sent successfully');

		} catch (err: any) {
			console.error('Password reset error:', err);
			
			if (err.code === 'auth/user-not-found') {
				error = 'No account found with this email address';
			} else if (err.code === 'auth/invalid-email') {
				error = 'Please enter a valid email address';
			} else {
				error = err.message || 'Failed to send password reset email';
			}
		} finally {
			loading = false;
		}
	}

	function switchMode(newMode: 'signin' | 'signup' | 'reset') {
		authMode = newMode;
		error = '';
		success = '';
		password = '';
		if (newMode !== 'signup') {
			displayName = '';
		}
	}
</script>

<div class="space-y-4">
	<!-- Environment Verification Panel (DEBUG ONLY) -->
	<div class="rounded bg-yellow-50 border border-yellow-200 p-3">
		<h4 class="font-semibold text-yellow-800 mb-2">🧪 Svelte 5 Environment Test</h4>
		<div class="text-sm space-y-1">
			<div>Test Counter: <strong>{testCounter}</strong></div>
			<div>Test String: <strong>"{testString}"</strong></div>
			<div>Email: <strong>"{email}"</strong> (length: {email.length})</div>
			<div>Password: <strong>"{password}"</strong> (length: {password.length})</div>
			<div>Input Type: <strong>{useNativeInputs ? 'Native HTML' : 'Custom Component'}</strong></div>
			{#if useNativeInputs}
				<div>Native Email: <strong>"{nativeEmail}"</strong></div>
				<div>Native Password: <strong>"{nativePassword}"</strong></div>
			{/if}
			<div class="flex gap-2 mt-2">
				<button 
					type="button"
					onclick={testReactivity}
					class="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
				>
					Test Manual Update
				</button>
				<button 
					type="button"
					onclick={toggleInputType}
					class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
				>
					Toggle Input Type
				</button>
			</div>
		</div>
	</div>

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

	{#if authMode === 'signin'}
		<!-- Sign In Form -->
		<div class="space-y-4">
			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-gray-700">
					Email Address
				</label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					placeholder="your.name@schooldomain.edu"
					disabled={loading}
					class="w-full"
				/>
			</div>

			<div>
				<label for="password" class="mb-2 block text-sm font-medium text-gray-700">
					Password
				</label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter your password"
					disabled={loading}
					class="w-full"
				/>
			</div>

			<Button onclick={handleSignIn} disabled={loading || !email || !password} class="w-full">
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
					Signing In...
				{:else}
					Sign In
				{/if}
			</Button>

			<div class="flex justify-between text-sm">
				<button
					type="button"
					onclick={() => switchMode('reset')}
					disabled={loading}
					class="text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
				>
					Forgot your password?
				</button>
				<button
					type="button"
					onclick={() => switchMode('signup')}
					disabled={loading}
					class="text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
				>
					Create account
				</button>
			</div>
		</div>

	{:else if authMode === 'signup'}
		<!-- Sign Up Form -->
		<div class="space-y-4">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Create Student Account</h3>
				<button
					type="button"
					onclick={() => switchMode('signin')}
					class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
				>
					Back to sign in
				</button>
			</div>

			<div>
				<label for="displayName" class="mb-2 block text-sm font-medium text-gray-700">
					Full Name (Optional)
				</label>
				<Input
					id="displayName"
					type="text"
					bind:value={displayName}
					placeholder="Your full name"
					disabled={loading}
					class="w-full"
				/>
			</div>

			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-gray-700">
					School Email Address
				</label>
				{#if useNativeInputs}
					<input
						id="email"
						type="email"
						bind:value={nativeEmail}
						oninput={handleNativeEmailChange}
						placeholder="your.name@schooldomain.edu"
						disabled={loading}
						class="w-full block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
					/>
				{:else}
					<Input
						id="email"
						type="email"
						bind:value={email}
						placeholder="your.name@schooldomain.edu"
						disabled={loading}
						class="w-full"
					/>
				{/if}
			</div>

			<div>
				<label for="password" class="mb-2 block text-sm font-medium text-gray-700">
					Password
				</label>
				{#if useNativeInputs}
					<input
						id="password"
						type="password"
						bind:value={nativePassword}
						oninput={handleNativePasswordChange}
						placeholder="Choose a secure password (minimum 6 characters)"
						disabled={loading}
						class="w-full block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6"
					/>
				{:else}
					<Input
						id="password"
						type="password"
						bind:value={password}
						placeholder="Choose a secure password (minimum 6 characters)"
						disabled={loading}
						class="w-full"
					/>
				{/if}
				<p class="mt-1 text-xs text-gray-500">Password must be at least 6 characters</p>
			</div>

			<!-- Debug Panel -->
			<div class="rounded bg-gray-100 p-2 text-xs">
				<strong>🐛 Debug:</strong><br>
				Email: "{email}" (length: {email.length})<br>
				Password: "{password}" (length: {password.length})<br>
				Loading: {loading}<br>
				UseNativeInputs: {useNativeInputs}<br>
				NativeEmail: "{nativeEmail}" (length: {nativeEmail.length})<br>
				NativePassword: "{nativePassword}" (length: {nativePassword.length})<br>
				Email truthy: {!!email}<br>
				Password truthy: {!!password}<br>
				Button disabled condition: {loading || !email || !password}<br>
				Button enabled: {!!(email && password && !loading)}
				<br><br>
				<button 
					type="button" 
					onclick={() => { email = 'test@example.com'; password = 'testpass123'; }}
					class="px-2 py-1 bg-red-500 text-white text-xs rounded"
				>
					Force Update Values
				</button>
			</div>

			<Button onclick={handleSignUp} disabled={loading || !email || !password} class="w-full">
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
					Creating Account...
				{:else}
					Create Account
				{/if}
			</Button>
		</div>

	{:else if authMode === 'reset'}
		<!-- Password Reset Form -->
		<div class="space-y-4">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Reset Password</h3>
				<button
					type="button"
					onclick={() => switchMode('signin')}
					class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
				>
					Back to sign in
				</button>
			</div>

			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-gray-700">
					Email Address
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
					We'll send a password reset link to this email address
				</p>
			</div>

			<Button onclick={handlePasswordReset} disabled={loading || !email} class="w-full">
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
					Sending Reset Email...
				{:else}
					Send Password Reset Email
				{/if}
			</Button>

			{#if success}
				<div class="text-center">
					<button
						type="button"
						onclick={() => switchMode('signin')}
						class="text-sm text-blue-600 hover:text-blue-500 focus:underline focus:outline-none"
					>
						Return to sign in
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>