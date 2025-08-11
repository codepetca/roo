<script lang="ts">
	import SignupForm from '$lib/components/auth/SignupForm.svelte';
	import TeacherGoogleAuth from '$lib/components/auth/TeacherGoogleAuth.svelte';
	import TeacherEmailAuth from '$lib/components/auth/TeacherEmailAuth.svelte';
	import StudentAuth from '$lib/components/auth/StudentAuth.svelte';
	import { Alert } from '$lib/components/ui';

	let authMode:
		| 'select'
		| 'teacher-select'
		| 'teacher-google'
		| 'teacher-email'
		| 'student-login'
		| 'teacher-signup'
		| 'student-signup' = 'select';
	let signupSuccess = false;
	let successMessage = '';

	function selectTeacher() {
		authMode = 'teacher-select';
	}

	function selectStudent() {
		authMode = 'student-login';
	}

	function selectTeacherGoogle() {
		authMode = 'teacher-google';
	}

	function selectTeacherEmail() {
		authMode = 'teacher-email';
	}

	function showTeacherSignup() {
		authMode = 'teacher-signup';
	}

	function showStudentSignup() {
		authMode = 'student-signup';
	}

	function backToSelect() {
		authMode = 'select';
		signupSuccess = false;
	}

	function handleSignupSuccess(event: CustomEvent) {
		const { user } = event.detail;
		signupSuccess = true;
		successMessage = `Account created successfully! You can now log in as ${user.email}.`;
		authMode = 'select';
	}

	async function handleTeacherGoogleAuthSuccess(event: CustomEvent) {
		const { user, accessToken, isSignup } = event.detail;

		try {
			// Store access token for later use with Google APIs
			if (accessToken) {
				sessionStorage.setItem('google_access_token', accessToken);
			}

			// Create teacher profile with role using callable function (consistent with other auth flows)
			try {
				console.log('Creating teacher profile with role...');
				const { httpsCallable } = await import('firebase/functions');
				const { firebaseFunctions } = await import('$lib/firebase');

				const createProfile = httpsCallable(firebaseFunctions, 'createProfileForExistingUser');
				const profileResult = await createProfile({
					uid: user.uid,
					role: 'teacher'
				});
				console.log('Teacher profile created:', profileResult.data);
			} catch (error) {
				console.error('Profile creation failed:', error);
				throw error;
			}

			// Import auth store to trigger refresh
			const { auth } = await import('$lib/stores/auth.svelte');
			// Note: refresh method may not exist in new auth structure

			// Import goto for navigation
			const { goto } = await import('$app/navigation');

			// Navigate to teacher dashboard
			await goto('/dashboard/teacher');
		} catch (error) {
			console.error('Profile creation failed:', error);
			// Show error message but stay on login page
			signupSuccess = false;
			successMessage = 'Authentication successful but profile creation failed. Please try again.';
		}
	}

	async function handleTeacherEmailAuthSuccess(event: CustomEvent) {
		const { user } = event.detail;

		try {
			// Import goto for navigation
			const { goto } = await import('$app/navigation');

			// Navigate to teacher dashboard (user profile already created in TeacherEmailAuth)
			await goto('/dashboard/teacher');
		} catch (error) {
			console.error('Navigation failed:', error);
			signupSuccess = false;
			successMessage = 'Authentication successful but navigation failed. Please try again.';
		}
	}

	async function handleStudentAuthSuccess(event: CustomEvent) {
		const { user, isNewUser } = event.detail;

		console.log('Student authentication successful', { user, isNewUser });

		// Import auth store to trigger refresh
		const { auth } = await import('$lib/stores/auth.svelte');
		// Note: refresh method may not exist in new auth structure

		// Import goto for navigation
		const { goto } = await import('$app/navigation');

		// Navigate to student dashboard
		await goto('/dashboard/student');
	}
</script>

<svelte:head>
	<title>Sign In - Roo</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h2 class="mb-2 text-3xl font-extrabold text-gray-900">Welcome to Roo</h2>
			<p class="text-gray-600">AI-powered auto-grading system for educational assignments</p>
		</div>

		{#if signupSuccess}
			<Alert variant="success">
				{#snippet children()}
					{successMessage}
				{/snippet}
			</Alert>
		{/if}

		{#if authMode === 'select'}
			<!-- Role Selection -->
			<div class="space-y-6" data-testid="role-selection">
				<div class="text-center">
					<h3 class="mb-4 text-lg font-medium text-gray-900" data-testid="role-selection-title">How would you like to sign in?</h3>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Teacher Option -->
					<button
						type="button"
						onclick={selectTeacher}
						data-testid="select-teacher-button"
						class="group relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm transition-all hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
									<svg
										class="h-6 w-6 text-white"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-1.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443a55.381 55.381 0 015.25 2.882V15"
										/>
									</svg>
								</div>
							</div>
							<div class="ml-4 text-left">
								<h4 class="text-sm font-medium text-gray-900">Teacher</h4>
								<p class="text-sm text-gray-500">Google account sign-in</p>
							</div>
						</div>
					</button>

					<!-- Student Option -->
					<button
						type="button"
						onclick={selectStudent}
						data-testid="select-student-button"
						class="group relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm transition-all hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
									<svg
										class="h-6 w-6 text-white"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
										/>
									</svg>
								</div>
							</div>
							<div class="ml-4 text-left">
								<h4 class="text-sm font-medium text-gray-900">Student</h4>
								<p class="text-sm text-gray-500">Email and passcode</p>
							</div>
						</div>
					</button>
				</div>
			</div>
		{:else if authMode === 'teacher-select'}
			<!-- Teacher Authentication Method Selection -->
			<div class="space-y-6" data-testid="teacher-auth-selection">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900" data-testid="teacher-signin-title">Teacher Sign In</h3>
					<button
						type="button"
						onclick={backToSelect}
						data-testid="back-to-role-selection-button"
						class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
					>
						Back
					</button>
				</div>

				<div class="text-center">
					<p class="mb-4 text-sm text-gray-600" data-testid="auth-method-prompt">Choose your preferred sign-in method:</p>
				</div>

				<div class="space-y-3">
					<!-- Google OAuth Option -->
					<button
						type="button"
						onclick={selectTeacherGoogle}
						data-testid="select-google-auth-button"
						class="w-full rounded-lg border border-gray-300 bg-white px-6 py-4 text-left transition-all hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
									<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
										<path
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
										/>
										<path
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										/>
										<path
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
										/>
										<path
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
										/>
									</svg>
								</div>
							</div>
							<div class="ml-4">
								<h4 class="text-sm font-medium text-gray-900">Google Account</h4>
								<p class="text-sm text-gray-500">Sign in with your Google account</p>
							</div>
						</div>
					</button>

					<!-- Email/Password Option -->
					<button
						type="button"
						onclick={selectTeacherEmail}
						data-testid="select-email-auth-button"
						class="w-full rounded-lg border border-gray-300 bg-white px-6 py-4 text-left transition-all hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
									<svg
										class="h-5 w-5 text-white"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
										/>
									</svg>
								</div>
							</div>
							<div class="ml-4">
								<h4 class="text-sm font-medium text-gray-900">Email & Password</h4>
								<p class="text-sm text-gray-500">
									Sign in with email and password (ideal for E2E testing)
								</p>
							</div>
						</div>
					</button>
				</div>
			</div>
		{:else if authMode === 'teacher-google'}
			<!-- Teacher Google OAuth Login -->
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900">Sign In with Google</h3>
					<button
						type="button"
						onclick={() => (authMode = 'teacher-select')}
						class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
					>
						Back
					</button>
				</div>
				<TeacherGoogleAuth on:success={handleTeacherGoogleAuthSuccess} />
				<div class="text-center">
					<p class="text-sm text-gray-600">
						Need an account?
						<button
							type="button"
							class="font-medium text-blue-600 transition-colors hover:text-blue-500 focus:underline focus:outline-none"
							onclick={showTeacherSignup}
						>
							Create teacher account
						</button>
					</p>
				</div>
			</div>
		{:else if authMode === 'teacher-email'}
			<!-- Teacher Email/Password Login -->
			<div class="space-y-6" data-testid="teacher-email-auth">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900" data-testid="teacher-email-signin-title">Teacher Email Sign In</h3>
					<button
						type="button"
						onclick={() => (authMode = 'teacher-select')}
						data-testid="back-to-auth-selection-button"
						class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
					>
						Back
					</button>
				</div>
				<TeacherEmailAuth
					on:success={handleTeacherEmailAuthSuccess}
					on:cancel={() => (authMode = 'teacher-select')}
				/>
			</div>
		{:else if authMode === 'student-login'}
			<!-- Student Login -->
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900">Student Sign In</h3>
					<button
						type="button"
						onclick={backToSelect}
						class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
					>
						Back
					</button>
				</div>
				<StudentAuth on:success={handleStudentAuthSuccess} />
				<div class="text-center">
					<p class="text-sm text-gray-600">
						Need an account?
						<button
							type="button"
							class="font-medium text-blue-600 transition-colors hover:text-blue-500 focus:underline focus:outline-none"
							onclick={showStudentSignup}
						>
							Create student account
						</button>
					</p>
				</div>
			</div>
		{:else if authMode === 'teacher-signup'}
			<!-- Teacher Signup -->
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900">Create Teacher Account</h3>
					<button
						type="button"
						onclick={backToSelect}
						class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
					>
						Back
					</button>
				</div>
				<TeacherGoogleAuth isSignup={true} on:success={handleTeacherGoogleAuthSuccess} />
			</div>
		{:else if authMode === 'student-signup'}
			<!-- Student Signup -->
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900">Create Student Account</h3>
					<button
						type="button"
						onclick={backToSelect}
						class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
					>
						Back
					</button>
				</div>
				<SignupForm on:success={handleSignupSuccess} on:cancel={backToSelect} userRole="student" />
			</div>
		{/if}
	</div>
</div>
