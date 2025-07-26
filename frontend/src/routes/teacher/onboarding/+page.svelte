<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { Card, Button, Alert, Badge } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/dashboard';

	// State using Svelte 5 runes
	let teacherEmail = $state('');
	let teacherName = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let currentStep = $state<'input' | 'auth' | 'complete'>('input');
	
	// Results from onboarding process
	let authUrl = $state<string | null>(null);
	let onboardingResult = $state<any>(null);

	// URL parameters (for OAuth callback)
	let urlParams = $state<URLSearchParams | null>(null);

	onMount(() => {
		urlParams = new URLSearchParams(window.location.search);
		const authCode = urlParams.get('code');
		const state = urlParams.get('state');

		if (authCode && state) {
			// We're returning from OAuth - complete the onboarding
			try {
				const stateData = JSON.parse(state);
				teacherEmail = stateData.teacherEmail;
				teacherName = stateData.teacherName || '';
				completeOnboarding(authCode);
			} catch (e) {
				error = 'Invalid OAuth response. Please try again.';
			}
		}
	});

	async function startOnboarding() {
		if (!teacherEmail) {
			error = 'Please enter your email address';
			return;
		}

		try {
			loading = true;
			error = null;

			const result = await api.startTeacherOnboarding({
				teacherEmail,
				teacherName: teacherName || undefined,
				redirectUri: `${window.location.origin}/teacher/onboarding`
			});

			authUrl = result.authUrl;
			currentStep = 'auth';
			success = 'Authorization URL generated! Click the button below to continue.';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to start onboarding';
		} finally {
			loading = false;
		}
	}

	async function completeOnboarding(authCode: string) {
		try {
			loading = true;
			error = null;
			currentStep = 'complete';

			const result = await api.completeTeacherOnboarding({
				teacherEmail,
				authCode,
				sheetTitle: `Roo Auto-Grading - ${teacherName || teacherEmail.split('@')[0]}`
			});

			onboardingResult = result;
			success = 'Google Sheet created successfully! Follow the instructions below to complete setup.';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to complete onboarding';
			currentStep = 'input';
		} finally {
			loading = false;
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			success = 'Copied to clipboard!';
			setTimeout(() => success = null, 2000);
		});
	}

	function resetOnboarding() {
		currentStep = 'input';
		teacherEmail = '';
		teacherName = '';
		authUrl = null;
		onboardingResult = null;
		error = null;
		success = null;
		// Clear URL parameters
		window.history.replaceState({}, document.title, window.location.pathname);
	}
</script>

<div class="space-y-6">
	<PageHeader
		title="Teacher Onboarding"
		description="Set up your Google Sheets integration for automated assignment syncing"
	/>

	<!-- Progress indicator -->
	<div class="flex items-center justify-center space-x-4 mb-8">
		<div class="flex items-center">
			<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep === 'input' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}">
				1
			</div>
			<span class="ml-2 text-sm font-medium {currentStep === 'input' ? 'text-blue-600' : 'text-gray-500'}">Enter Details</span>
		</div>
		<div class="w-16 h-0.5 bg-gray-300"></div>
		<div class="flex items-center">
			<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep === 'auth' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}">
				2
			</div>
			<span class="ml-2 text-sm font-medium {currentStep === 'auth' ? 'text-blue-600' : 'text-gray-500'}">Authorize Google</span>
		</div>
		<div class="w-16 h-0.5 bg-gray-300"></div>
		<div class="flex items-center">
			<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}">
				3
			</div>
			<span class="ml-2 text-sm font-medium {currentStep === 'complete' ? 'text-green-600' : 'text-gray-500'}">Complete Setup</span>
		</div>
	</div>

	<!-- Success/Error messages -->
	{#if success}
		<Alert variant="success" title="Success" dismissible onDismiss={() => (success = null)}>
			{#snippet children()}
				{success}
			{/snippet}
		</Alert>
	{/if}

	{#if error}
		<Alert variant="error" title="Error" dismissible onDismiss={() => (error = null)}>
			{#snippet children()}
				{error}
			{/snippet}
		</Alert>
	{/if}

	<!-- Step 1: Enter teacher details -->
	{#if currentStep === 'input'}
		<Card>
			{#snippet children()}
				<div class="space-y-6">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Teacher Information</h3>
						<p class="text-sm text-gray-600 mb-6">
							We'll create a Google Sheet in your account and configure it for automatic syncing with the Roo system.
						</p>
					</div>

					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<label for="teacherEmail" class="block text-sm font-medium text-gray-700 mb-2">
								Email Address *
							</label>
							<input
								id="teacherEmail"
								type="email"
								bind:value={teacherEmail}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="your.email@school.com"
							/>
						</div>

						<div>
							<label for="teacherName" class="block text-sm font-medium text-gray-700 mb-2">
								Name (Optional)
							</label>
							<input
								id="teacherName"
								type="text"
								bind:value={teacherName}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="Your Name"
							/>
						</div>
					</div>

					<div class="bg-blue-50 border border-blue-200 rounded-md p-4">
						<h4 class="text-sm font-medium text-blue-900 mb-2">What will happen:</h4>
						<ul class="text-sm text-blue-800 space-y-1">
							<li>• We'll create a new Google Sheet in your Drive</li>
							<li>• The sheet will be automatically shared with our system</li>
							<li>• You'll get custom AppScript code for your board account</li>
							<li>• Your data stays private and under your control</li>
						</ul>
					</div>

					<div class="flex justify-end">
						<Button variant="primary" onclick={startOnboarding} {loading}>
							{#snippet children()}
								{loading ? 'Starting...' : 'Start Setup'}
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	{/if}

	<!-- Step 2: Google OAuth authorization -->
	{#if currentStep === 'auth' && authUrl}
		<Card>
			{#snippet children()}
				<div class="text-center space-y-6">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Authorize Google Access</h3>
						<p class="text-sm text-gray-600 mb-6">
							Click the button below to grant permission for us to create a Google Sheet in your account.
							You'll be redirected to Google to sign in and authorize the required permissions.
						</p>
					</div>

					<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
						<h4 class="text-sm font-medium text-yellow-900 mb-2">Required Permissions:</h4>
						<ul class="text-sm text-yellow-800 space-y-1">
							<li>• Create and edit Google Sheets</li>
							<li>• Create files in your Google Drive</li>
							<li>• Access your basic profile information</li>
						</ul>
					</div>

					<div class="space-y-4">
						<Button variant="primary" onclick={() => window.location.href = authUrl!}>
							{#snippet children()}
								Continue to Google Authorization
							{/snippet}
						</Button>

						<Button variant="secondary" onclick={resetOnboarding}>
							{#snippet children()}
								Cancel
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	{/if}

	<!-- Step 3: Onboarding complete -->
	{#if currentStep === 'complete' && onboardingResult}
		<Card>
			{#snippet children()}
				<div class="space-y-6">
					<div class="text-center">
						<div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
							<svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<h3 class="text-lg font-semibold text-gray-900 mb-2">Google Sheet Created Successfully!</h3>
						<p class="text-sm text-gray-600">
							Your sheet has been created and configured. Complete the final steps below.
						</p>
					</div>

					<!-- Sheet information -->
					<div class="bg-gray-50 rounded-lg p-4 space-y-4">
						<div>
							<h4 class="text-sm font-medium text-gray-900">Sheet Details:</h4>
							<p class="text-sm text-gray-600">Title: {onboardingResult.sheetTitle}</p>
							<div class="flex items-center space-x-2 mt-2">
								<a 
									href={onboardingResult.spreadsheetUrl} 
									target="_blank" 
									class="text-blue-600 hover:text-blue-800 text-sm"
								>
									Open Google Sheet →
								</a>
								<Badge variant="success" size="sm">
									{#snippet children()}
										Ready
									{/snippet}
								</Badge>
							</div>
						</div>
					</div>

					<!-- Next steps -->
					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-3">Next Steps:</h4>
						<ol class="space-y-3">
							{#each onboardingResult.nextSteps as step, index}
								<li class="flex items-start space-x-3">
									<span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
										{index + 1}
									</span>
									<span class="text-sm text-gray-700">{step}</span>
								</li>
							{/each}
						</ol>
					</div>

					<!-- AppScript code -->
					<div>
						<div class="flex items-center justify-between mb-3">
							<h4 class="text-sm font-medium text-gray-900">AppScript Code:</h4>
							<Button 
								variant="secondary" 
								size="sm" 
								onclick={() => copyToClipboard(onboardingResult.appScriptCode)}
							>
								{#snippet children()}
									Copy Code
								{/snippet}
							</Button>
						</div>
						<div class="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-64">
							<pre>{onboardingResult.appScriptCode}</pre>
						</div>
					</div>

					<div class="flex justify-center space-x-4">
						<Button variant="primary" onclick={() => window.location.href = '/dashboard/teacher'}>
							{#snippet children()}
								Go to Dashboard
							{/snippet}
						</Button>
						
						<Button variant="secondary" onclick={resetOnboarding}>
							{#snippet children()}
								Set Up Another Teacher
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	{/if}
</div>