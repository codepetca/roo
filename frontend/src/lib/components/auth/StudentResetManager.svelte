<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button, Input, Alert } from '$lib/components/ui';

	const dispatch = createEventDispatcher();

	let studentEmail = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	let resetResult = $state<{
		studentEmail: string;
		studentAccountExists: boolean;
		newPasscode: string;
		expiresAt: string;
		instructions: string[];
	} | null>(null);

	async function resetStudentAuth() {
		if (!studentEmail || !studentEmail.includes('@')) {
			error = 'Please enter a valid student email address';
			return;
		}

		loading = true;
		error = '';
		success = '';
		resetResult = null;

		try {
			console.log('Resetting student authentication for:', studentEmail);

			// Import the API client
			const { api } = await import('$lib/api');

			const result = await api.resetStudentAuth({ studentEmail });

			resetResult = result;
			success = 'Student authentication reset successfully!';

			console.log('Student reset successful', result);

			// Dispatch success event with result
			dispatch('resetComplete', {
				studentEmail,
				newPasscode: result.newPasscode,
				expiresAt: result.expiresAt
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to reset student authentication';
		} finally {
			loading = false;
		}
	}

	function copyPasscode() {
		if (resetResult?.newPasscode) {
			navigator.clipboard.writeText(resetResult.newPasscode).then(() => {
				success = 'Passcode copied to clipboard!';
				setTimeout(() => (success = ''), 2000);
			});
		}
	}

	function resetForm() {
		studentEmail = '';
		resetResult = null;
		error = '';
		success = '';
	}
</script>

<div class="space-y-6">
	<div>
		<h3 class="mb-2 text-lg font-medium text-gray-900">Student Authentication Reset</h3>
		<p class="text-sm text-gray-600">
			Reset a student's login passcode if they're having trouble accessing their account.
		</p>
	</div>

	{#if error}
		<Alert variant="error" title="Error" dismissible onDismiss={() => (error = '')}>
			{#snippet children()}
				{error}
			{/snippet}
		</Alert>
	{/if}

	{#if success && !resetResult}
		<Alert variant="success" title="Success" dismissible onDismiss={() => (success = '')}>
			{#snippet children()}
				{success}
			{/snippet}
		</Alert>
	{/if}

	{#if !resetResult}
		<!-- Input form -->
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
				<p class="mt-1 text-xs text-gray-500">Enter the student's school email address</p>
			</div>

			<div class="flex justify-start">
				<Button onclick={resetStudentAuth} disabled={loading || !studentEmail} variant="primary">
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
							Resetting...
						{:else}
							Reset Student Access
						{/if}
					{/snippet}
				</Button>
			</div>
		</div>
	{:else}
		<!-- Reset result -->
		<div class="space-y-6">
			<Alert variant="success" title="Reset Complete">
				{#snippet children()}
					Student authentication has been reset successfully. Share the temporary passcode below
					with the student.
				{/snippet}
			</Alert>

			<!-- Student info -->
			<div class="rounded-lg bg-gray-50 p-4">
				<h4 class="mb-2 text-sm font-medium text-gray-900">Reset Details:</h4>
				<div class="space-y-2 text-sm text-gray-600">
					<p><strong>Student:</strong> {resetResult.studentEmail}</p>
					<p>
						<strong>Account Status:</strong>
						{resetResult.studentAccountExists ? 'Existing account' : 'New account will be created'}
					</p>
					<p><strong>Expires:</strong> {new Date(resetResult.expiresAt).toLocaleString()}</p>
				</div>
			</div>

			<!-- Temporary passcode -->
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<h4 class="text-sm font-medium text-blue-900">Temporary Passcode</h4>
					<Button variant="secondary" size="sm" onclick={copyPasscode}>
						{#snippet children()}
							Copy
						{/snippet}
					</Button>
				</div>
				<div class="rounded border bg-white py-2 text-center font-mono text-2xl text-blue-800">
					{resetResult.newPasscode}
				</div>
				<p class="mt-2 text-xs text-blue-700">
					This passcode expires in 30 minutes. The student should log in promptly.
				</p>
			</div>

			<!-- Instructions -->
			<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
				<h4 class="mb-2 text-sm font-medium text-amber-900">Instructions for Student:</h4>
				<ol class="space-y-1 text-sm text-amber-800">
					{#each resetResult.instructions as instruction, index (index)}
						<li class="flex items-start">
							<span
								class="mt-0.5 mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs text-amber-800"
							>
								{index + 1}
							</span>
							{instruction}
						</li>
					{/each}
				</ol>
			</div>

			<!-- Actions -->
			<div class="flex justify-between">
				<Button variant="secondary" onclick={resetForm}>
					{#snippet children()}
						Reset Another Student
					{/snippet}
				</Button>

				<Button variant="primary" onclick={() => window.open('/login', '_blank')}>
					{#snippet children()}
						Open Student Login Page
					{/snippet}
				</Button>
			</div>
		</div>
	{/if}
</div>
