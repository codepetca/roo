<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
	import { firebaseAuth } from '$lib/firebase';
	import { api } from '$lib/api';
	import { Button, Alert, LoadingSpinner } from '$lib/components/ui';

	interface Props {
		userRole?: 'teacher' | 'student';
	}

	let { userRole = 'student' }: Props = $props();

	const dispatch = createEventDispatcher<{
		success: {
			user: { uid: string; email: string | null; displayName: string | null; role: string };
		};
		cancel: void;
	}>();

	let email = '';
	let password = '';
	let confirmPassword = '';
	let displayName = '';
	let schoolEmail = '';
	let role: 'teacher' | 'student' = userRole;
	let loading = false;
	let error = '';

	async function handleSubmit() {
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		if (role === 'teacher' && !schoolEmail.trim()) {
			error = 'School email is required for teachers';
			return;
		}

		loading = true;
		error = '';

		try {
			// Create user with Firebase Auth SDK
			const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
			const user = userCredential.user;

			// Update display name if provided
			if (displayName) {
				await updateProfile(user, { displayName });
			}

			// Create user profile with the specified role using callable function
			try {
				await api.createProfile({
					uid: user.uid,
					role: role,
					schoolEmail: role === 'teacher' ? schoolEmail.trim() : undefined,
					displayName: displayName || undefined
				});
				console.log('User profile created with role:', role);
			} catch (roleError) {
				console.warn('Failed to set user role, but account was created successfully:', roleError);
				// Don't fail the whole signup for this
			}

			// Dispatch success event
			dispatch('success', {
				user: {
					uid: user.uid,
					email: user.email,
					displayName: user.displayName,
					role: role
				}
			});
		} catch (err) {
			console.error('Signup error:', err);

			// Handle specific Firebase Auth errors
			const authError = err as { code?: string; message?: string };
			if (authError.code === 'auth/email-already-in-use') {
				error = 'An account with this email already exists';
			} else if (authError.code === 'auth/invalid-email') {
				error = 'Please enter a valid email address';
			} else if (authError.code === 'auth/weak-password') {
				error = 'Password is too weak. Please choose a stronger password';
			} else {
				error = authError.message || 'Failed to create account';
			}
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-center text-2xl font-bold text-gray-900">Create Account</h2>
		<p class="mt-2 text-center text-sm text-gray-600">Join Roo to start auto-grading assignments</p>
	</div>

	{#if error}
		<Alert variant="error">
			{#snippet children()}
				{error}
			{/snippet}
		</Alert>
	{/if}

	<form on:submit|preventDefault={handleSubmit} class="space-y-4">
		<!-- Role Selection (only if userRole prop is not set) -->
		{#if !userRole || userRole === undefined}
			<div>
				<label class="mb-3 block text-sm font-medium text-gray-700"> I am a: </label>
				<div class="grid grid-cols-2 gap-3">
					<label class="relative">
						<input
							type="radio"
							bind:group={role}
							value="teacher"
							name="role"
							class="sr-only"
							disabled={loading}
						/>
						<div
							class="flex cursor-pointer items-center rounded-lg border-2 p-4 transition-colors"
							class:border-blue-500={role === 'teacher'}
							class:bg-blue-50={role === 'teacher'}
							class:border-gray-300={role !== 'teacher'}
							class:hover:border-gray-400={role !== 'teacher' && !loading}
						>
							<div class="flex-1 text-center">
								<div class="text-lg font-medium text-gray-900">Teacher</div>
								<div class="text-sm text-gray-500">Create and grade assignments</div>
							</div>
						</div>
					</label>

					<label class="relative">
						<input
							type="radio"
							bind:group={role}
							value="student"
							name="role"
							class="sr-only"
							disabled={loading}
						/>
						<div
							class="flex cursor-pointer items-center rounded-lg border-2 p-4 transition-colors"
							class:border-blue-500={role === 'student'}
							class:bg-blue-50={role === 'student'}
							class:border-gray-300={role !== 'student'}
							class:hover:border-gray-400={role !== 'student' && !loading}
						>
							<div class="flex-1 text-center">
								<div class="text-lg font-medium text-gray-900">Student</div>
								<div class="text-sm text-gray-500">Submit assignments for grading</div>
							</div>
						</div>
					</label>
				</div>
			</div>
		{/if}

		<!-- Email -->
		<div>
			<label for="signup-email" class="block text-sm font-medium text-gray-700">
				Email address
			</label>
			<input
				id="signup-email"
				type="email"
				bind:value={email}
				required
				disabled={loading}
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
				placeholder="Enter your email address"
			/>
		</div>

		<!-- Display Name (Optional) -->
		<div>
			<label for="signup-displayName" class="block text-sm font-medium text-gray-700">
				Display Name (Optional)
			</label>
			<input
				id="signup-displayName"
				type="text"
				bind:value={displayName}
				disabled={loading}
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
				placeholder="How should we address you?"
			/>
		</div>

		<!-- School Email (Teachers only) -->
		{#if role === 'teacher'}
			<div>
				<label for="signup-schoolEmail" class="block text-sm font-medium text-gray-700">
					School Email <span class="text-red-500">*</span>
				</label>
				<input
					id="signup-schoolEmail"
					type="email"
					bind:value={schoolEmail}
					required
					disabled={loading}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
					placeholder="your.name@school.edu"
				/>
				<p class="mt-1 text-sm text-gray-500">Your official school/institution email address</p>
			</div>
		{/if}

		<!-- Password -->
		<div>
			<label for="signup-password" class="block text-sm font-medium text-gray-700">
				Password
			</label>
			<input
				id="signup-password"
				type="password"
				bind:value={password}
				required
				disabled={loading}
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
				placeholder="Enter your password (6+ characters)"
			/>
		</div>

		<!-- Confirm Password -->
		<div>
			<label for="signup-confirm-password" class="block text-sm font-medium text-gray-700">
				Confirm Password
			</label>
			<input
				id="signup-confirm-password"
				type="password"
				bind:value={confirmPassword}
				required
				disabled={loading}
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
				placeholder="Confirm your password"
			/>
		</div>

		<!-- Action Buttons -->
		<div class="flex space-x-3">
			<Button
				type="button"
				variant="secondary"
				class="flex-1"
				disabled={loading}
				on:click={handleCancel}
			>
				Cancel
			</Button>

			<Button
				type="submit"
				class="flex-1"
				disabled={loading || !email || !password || password !== confirmPassword}
			>
				{#if loading}
					<LoadingSpinner size="sm" class="mr-2" />
					Creating Account...
				{:else}
					Create Account
				{/if}
			</Button>
		</div>
	</form>
</div>
