<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button, Input, Alert } from '$lib/components/ui';

	const dispatch = createEventDispatcher();

	let studentEmail = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	let sendResult = $state<{
		success: boolean;
		message: string;
		sentTo: string;
	} | null>(null);

	async function sendPasscode() {
		if (!studentEmail || !studentEmail.includes('@')) {
			error = 'Please enter a valid student email address';
			return;
		}

		loading = true;
		error = '';
		success = '';
		sendResult = null;

		try {
			console.log('Sending passcode to student via Brevo:', studentEmail);

			// Import the API client
			const { api } = await import('$lib/api');

			// Single API call that does everything: generate, store, and send
			const result = await api.generateAndSendPasscode({
				email: studentEmail
			});

			sendResult = result;
			success = result.message;

			console.log('Passcode sent successfully via Brevo', result);

			// Dispatch success event
			dispatch('passcodesent', {
				studentEmail: result.sentTo,
				sent: true,
				message: result.message
			});
		} catch (err: any) {
			console.error('Send passcode error:', err);

			// Handle specific errors
			if (err.message?.includes('Teacher authentication required')) {
				error = 'You must be signed in as a teacher to send login codes.';
			} else if (err.message?.includes('Email service')) {
				error = 'Email service temporarily unavailable. Please try again in a few minutes.';
			} else if (err.message?.includes('Invalid email')) {
				error = 'Invalid email address. Please check and try again.';
			} else {
				error = err.message || 'Failed to send login code. Please try again.';
			}
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		studentEmail = '';
		sendResult = null;
		error = '';
		success = '';
	}

	function sendAnother() {
		sendResult = null;
		error = '';
		success = '';
		// Keep the email for easy resending
	}
</script>

<div class="space-y-6">
	<div>
		<h3 class="mb-2 text-lg font-medium text-gray-900">Send Student Login Code</h3>
		<p class="text-sm text-gray-600">
			Send a 6-digit login code to a student's email address. The code is sent via our secure email
			service.
		</p>
	</div>

	{#if error}
		<Alert variant="error" title="Error" dismissible onDismiss={() => (error = '')}>
			{#snippet children()}
				{error}
			{/snippet}
		</Alert>
	{/if}

	{#if success && !sendResult}
		<Alert variant="success" title="Success" dismissible onDismiss={() => (success = '')}>
			{#snippet children()}
				{success}
			{/snippet}
		</Alert>
	{/if}

	{#if !sendResult}
		<!-- Send passcode form -->
		<div class="space-y-4">
			<div>
				<label for="studentEmail" class="mb-2 block text-sm font-medium text-gray-700">
					Student Email Address
				</label>
				<Input
					id="studentEmail"
					type="email"
					bind:value={studentEmail}
					placeholder="student.name@schooldomain.edu"
					disabled={loading}
					class="w-full"
				/>
				<p class="mt-1 text-xs text-gray-500">
					A 6-digit login code will be sent to this email address
				</p>
			</div>

			<div class="flex justify-start gap-2">
				<Button onclick={sendPasscode} disabled={loading || !studentEmail} variant="primary">
					{#snippet children()}
						{#if loading}
							<svg
								class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Sending Login Code...
						{:else}
							Send Login Code
						{/if}
					{/snippet}
				</Button>

				{#if studentEmail}
					<Button onclick={resetForm} disabled={loading} variant="secondary">
						{#snippet children()}
							Clear
						{/snippet}
					</Button>
				{/if}
			</div>

			<!-- Quick test emails -->
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<h4 class="mb-2 text-sm font-medium text-blue-900">Quick Test</h4>
				<p class="mb-3 text-xs text-blue-700">Click to populate with test email addresses:</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						onclick={() => (studentEmail = 'stewart.chan@gapps.yrdsb.ca')}
						disabled={loading}
						class="rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200"
					>
						stewart.chan@gapps.yrdsb.ca
					</button>
					<button
						type="button"
						onclick={() => (studentEmail = 'test.student@example.com')}
						disabled={loading}
						class="rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200"
					>
						test.student@example.com
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Send result -->
		<div class="space-y-6">
			<Alert variant="success" title="Login Code Sent!">
				{#snippet children()}
					The login code has been sent successfully via email. The student should check their email.
				{/snippet}
			</Alert>

			<!-- Send details -->
			<div class="rounded-lg bg-gray-50 p-4">
				<h4 class="mb-2 text-sm font-medium text-gray-900">Send Details:</h4>
				<div class="space-y-2 text-sm text-gray-600">
					<p><strong>Sent to:</strong> {sendResult.sentTo}</p>
					<p><strong>Status:</strong> Successfully sent</p>
					<p><strong>Message:</strong> {sendResult.message}</p>
				</div>
			</div>

			<!-- Instructions -->
			<div class="rounded-lg border border-green-200 bg-green-50 p-4">
				<h4 class="mb-2 text-sm font-medium text-green-900">Next Steps:</h4>
				<ol class="space-y-1 text-sm text-green-800">
					<li class="flex items-start">
						<span
							class="mt-0.5 mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-200 text-xs text-green-800"
						>
							1
						</span>
						Student checks email for 6-digit login code
					</li>
					<li class="flex items-start">
						<span
							class="mt-0.5 mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-200 text-xs text-green-800"
						>
							2
						</span>
						Student goes to login page and selects "Student"
					</li>
					<li class="flex items-start">
						<span
							class="mt-0.5 mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-200 text-xs text-green-800"
						>
							3
						</span>
						Student enters their email and the 6-digit code
					</li>
					<li class="flex items-start">
						<span
							class="mt-0.5 mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-200 text-xs text-green-800"
						>
							4
						</span>
						Student is automatically signed in to their dashboard
					</li>
				</ol>
			</div>

			<!-- Actions -->
			<div class="flex justify-between">
				<Button variant="secondary" onclick={sendAnother}>
					{#snippet children()}
						Send to Another Student
					{/snippet}
				</Button>

				<div class="flex gap-2">
					<Button variant="outline" onclick={() => window.open('/login', '_blank')}>
						{#snippet children()}
							Open Student Login Page
						{/snippet}
					</Button>
					<Button variant="primary" onclick={resetForm}>
						{#snippet children()}
							New Email
						{/snippet}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
