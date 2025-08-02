<script lang="ts">
	import { api } from '$lib/api';
	import { Card, Button, Alert, Badge } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/dashboard';
	import { auth } from '$lib/stores';

	// State using Svelte 5 runes
	let boardAccountEmail = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let currentStep = $state<'input' | 'complete'>('input');
	let useOAuth = $state(true); // Default to OAuth approach

	// Initialize board account email with logged-in user's email
	$effect(() => {
		if (auth.user?.email && !boardAccountEmail) {
			boardAccountEmail = auth.user.email;
		}
	});

	// Results from sheet creation
	let onboardingResult = $state<{
		success: boolean;
		sheetId: string;
		message: string;
		appScriptCode: string;
		boardAccountEmail?: string;
		alreadyConfigured?: boolean;
		method?: string;
		teacherEmail?: string;
		spreadsheetUrl?: string;
		nextSteps?: string[];
	} | null>(null);

	async function createSheet() {
		if (!boardAccountEmail?.trim()) {
			error = 'Please enter your board account email';
			return;
		}

		try {
			loading = true;
			error = null;

			let result;

			if (useOAuth) {
				// Get the Google access token from sessionStorage (stored during login)
				const googleAccessToken = sessionStorage.getItem('google_access_token');

				if (!googleAccessToken) {
					error =
						'No Google access token found. Please sign out and sign in again to grant Google Drive access.';
					return;
				}

				result = await api.createTeacherSheetOAuth({
					teacherName: auth.user?.displayName || auth.user?.email || boardAccountEmail,
					accessToken: googleAccessToken
				});
			} else {
				// Fall back to service account approach
				result = await api.createTeacherSheet({
					boardAccountEmail,
					teacherName: auth.user?.displayName || auth.user?.email || boardAccountEmail
				});
			}

			onboardingResult = result;
			currentStep = 'complete';

			if (result.alreadyConfigured) {
				success = 'Board account already has a Google Sheet configured!';
			} else {
				success = useOAuth
					? 'Google Sheet created successfully in your personal Drive!'
					: 'Google Sheet created successfully!';
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to create Google Sheet';
		} finally {
			loading = false;
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			success = 'Copied to clipboard!';
			setTimeout(() => (success = null), 2000);
		});
	}

	function resetOnboarding() {
		currentStep = 'input';
		boardAccountEmail = auth.user?.email || '';
		onboardingResult = null;
		error = null;
		success = null;
	}
</script>

<div class="space-y-6">
	<PageHeader
		title="Sheet Setup"
		description="Create a Google Sheet for your account to sync assignment data"
	/>

	<!-- Progress indicator -->
	<div class="mb-8 flex items-center justify-center space-x-4">
		<div class="flex items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep === 'input'
					? 'bg-blue-600 text-white'
					: 'bg-gray-300 text-gray-600'}"
			>
				1
			</div>
			<span
				class="ml-2 text-sm font-medium {currentStep === 'input'
					? 'text-blue-600'
					: 'text-gray-500'}">Sheet Setup</span
			>
		</div>
		<div class="h-0.5 w-16 bg-gray-300"></div>
		<div class="flex items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep === 'complete'
					? 'bg-green-600 text-white'
					: 'bg-gray-300 text-gray-600'}"
			>
				2
			</div>
			<span
				class="ml-2 text-sm font-medium {currentStep === 'complete'
					? 'text-green-600'
					: 'text-gray-500'}">Sheet Created</span
			>
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
						<h3 class="mb-4 text-lg font-semibold text-gray-900">Board Account Configuration</h3>
						<p class="mb-6 text-sm text-gray-600">
							Configure which board account will receive the Google Sheet and run the AppScript.
						</p>
					</div>

					<div class="grid grid-cols-1 gap-6">
						<div>
							<label for="boardAccountEmail" class="mb-2 block text-sm font-medium text-gray-700">
								Board Account Email *
							</label>
							<input
								id="boardAccountEmail"
								type="email"
								bind:value={boardAccountEmail}
								required
								class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
								placeholder="your.board@schooldistrict.edu"
							/>
							<div class="mt-2 text-xs text-gray-600">
								{#if auth.user?.email && boardAccountEmail === auth.user.email}
									<span class="text-green-600">✓ Using your login email ({auth.user.email})</span>
								{:else if auth.user?.email}
									<span class="text-amber-600"
										>⚠ Different from your login email ({auth.user.email})</span
									>
								{/if}
							</div>
							<p class="mt-1 text-xs text-gray-500">
								The institutional account that will run the AppScript and access the shared sheet
							</p>
						</div>
					</div>

					{#if auth.user?.email && boardAccountEmail && boardAccountEmail !== auth.user.email}
						<div class="rounded-md border border-amber-200 bg-amber-50 p-4">
							<h4 class="mb-2 text-sm font-medium text-amber-900">⚠ Different Email Detected</h4>
							<p class="mb-2 text-sm text-amber-800">
								You're logged in as <strong>{auth.user.email}</strong> but specified
								<strong>{boardAccountEmail}</strong> as your board account.
							</p>
							<p class="text-xs text-amber-700">
								Make sure <strong>{boardAccountEmail}</strong> is the correct institutional account that
								will run the AppScript.
							</p>
						</div>
					{/if}

					<div class="rounded-md border border-blue-200 bg-blue-50 p-4">
						<h4 class="mb-2 text-sm font-medium text-blue-900">What will happen:</h4>
						{#if useOAuth}
							<ul class="space-y-1 text-sm text-blue-800">
								<li>• We'll create a new Google Sheet in your personal Google Drive</li>
								<li>
									• The sheet will be shared with <strong
										>{boardAccountEmail || 'your board account'}</strong
									>
								</li>
								<li>• You'll get custom AppScript code for that board account</li>
								<li>• Run the AppScript in the board account to sync data</li>
								<li>• Your personal Google account maintains ownership of the sheet</li>
							</ul>
						{:else}
							<ul class="space-y-1 text-sm text-blue-800">
								<li>• We'll create a new Google Sheet in our system</li>
								<li>
									• The sheet will be shared with <strong
										>{boardAccountEmail || 'your board account'}</strong
									>
								</li>
								<li>• You'll get custom AppScript code for that account</li>
								<li>• Run the AppScript in the board account to sync data</li>
							</ul>
						{/if}
					</div>

					<div class="flex justify-end">
						<Button variant="primary" onclick={createSheet} {loading}>
							{#snippet children()}
								{#if loading}
									{useOAuth ? 'Creating Sheet in Your Drive...' : 'Creating & Sharing Sheet...'}
								{:else}
									{useOAuth ? 'Create Sheet in My Drive' : 'Create & Share Sheet'}
								{/if}
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	{/if}

	<!-- Step 2: Sheet Creation Complete -->
	{#if currentStep === 'complete' && onboardingResult}
		<Card>
			{#snippet children()}
				<div class="space-y-6">
					<div class="text-center">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
						>
							<svg
								class="h-8 w-8 text-green-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<h3 class="mb-2 text-lg font-semibold text-gray-900">
							Google Sheet Created Successfully!
						</h3>
						<p class="text-sm text-gray-600">
							Your sheet has been created in our system. Complete the final step below.
						</p>
					</div>

					<!-- Sheet information -->
					<div class="space-y-4 rounded-lg bg-gray-50 p-4">
						<div>
							<h4 class="text-sm font-medium text-gray-900">Sheet Details:</h4>
							<p class="text-sm text-gray-600">Title: _roo_data</p>
							{#if onboardingResult.method === 'oauth' && onboardingResult.teacherEmail}
								<p class="text-sm text-gray-600">
									Owner: {onboardingResult.teacherEmail} (your personal Drive)
								</p>
							{/if}
							<div class="mt-2 flex items-center space-x-2">
								<a
									href={onboardingResult.spreadsheetUrl}
									target="_blank"
									class="text-sm text-blue-600 hover:text-blue-800"
								>
									Open Google Sheet →
								</a>
								<Badge variant="success" size="sm">
									{#snippet children()}
										Ready
									{/snippet}
								</Badge>
								{#if onboardingResult.method === 'oauth'}
									<Badge variant="info" size="sm">
										{#snippet children()}
											OAuth
										{/snippet}
									</Badge>
								{/if}
							</div>
						</div>
					</div>

					<!-- Next steps -->
					<div>
						<h4 class="mb-3 text-sm font-medium text-gray-900">Next Steps:</h4>
						<ol class="space-y-3">
							{#each onboardingResult.nextSteps as step, index (index)}
								<li class="flex items-start space-x-3">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600"
									>
										{index + 1}
									</span>
									<span class="text-sm text-gray-700">{step}</span>
								</li>
							{/each}
						</ol>
					</div>

					<!-- AppScript code -->
					<div>
						<div class="mb-3 flex items-center justify-between">
							<h4 class="text-sm font-medium text-gray-900">AppScript Code:</h4>
							<Button
								variant="secondary"
								size="sm"
								onclick={() => copyToClipboard(onboardingResult?.appScriptCode || '')}
							>
								{#snippet children()}
									Copy Code
								{/snippet}
							</Button>
						</div>
						<div
							class="max-h-64 overflow-x-auto rounded-lg bg-gray-900 p-4 font-mono text-xs text-green-400"
						>
							<pre>{onboardingResult?.appScriptCode || ''}</pre>
						</div>
					</div>

					<div class="flex justify-center space-x-4">
						<Button variant="primary" onclick={() => (window.location.href = '/dashboard/teacher')}>
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
