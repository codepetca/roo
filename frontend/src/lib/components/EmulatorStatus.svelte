<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { PUBLIC_USE_EMULATORS } from '$env/static/public';

	let status = $state<'checking' | 'connected' | 'error'>('checking');
	let apiVersion = $state<string>('');
	let errorMessage = $state<string>('');

	onMount(async () => {
		if (PUBLIC_USE_EMULATORS !== 'true') {
			status = 'connected';
			return;
		}

		try {
			const result = await api.getStatus();
			status = 'connected';
			apiVersion = result.version || '1.0.0';
		} catch (error) {
			status = 'error';
			errorMessage = error instanceof Error ? error.message : 'Unknown error';
		}
	});
</script>

{#if PUBLIC_USE_EMULATORS === 'true'}
	<div
		class="fixed right-4 bottom-4 rounded-lg p-4 shadow-lg
    {status === 'connected'
			? 'bg-green-100 text-green-800'
			: status === 'error'
				? 'bg-red-100 text-red-800'
				: 'bg-yellow-100 text-yellow-800'}"
	>
		<div class="flex items-center space-x-2">
			{#if status === 'checking'}
				<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
						fill="none"
					/>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
				</svg>
				<span>Connecting to emulators...</span>
			{:else if status === 'connected'}
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>Emulators connected (v{apiVersion})</span>
			{:else}
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>Emulator error: {errorMessage}</span>
			{/if}
		</div>
		{#if status === 'connected'}
			<div class="mt-2 text-xs">
				<a href="http://localhost:4000" target="_blank" class="underline"> Open Emulator UI → </a>
			</div>
		{/if}
	</div>
{/if}
