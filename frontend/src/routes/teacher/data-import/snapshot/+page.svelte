<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { snapshotStore } from '$lib/stores';
	import { Card, Button, Alert, Badge } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/dashboard';
	import ClassroomSnapshotUploader from '$lib/components/snapshot/ClassroomSnapshotUploader.svelte';
	import SnapshotPreview from '$lib/components/snapshot/SnapshotPreview.svelte';
	import SnapshotDiffViewer from '$lib/components/snapshot/SnapshotDiffViewer.svelte';

	// Local UI state
	let currentStep = $state<'upload' | 'preview' | 'import' | 'complete'>('upload');
	let importResult = $state<any>(null);

	// Handle file upload completion
	function handleFileValidated() {
		if (snapshotStore.currentSnapshot) {
			currentStep = 'preview';
			// Generate diff if we have a previous snapshot
			snapshotStore.generateDiff();
		}
	}

	// Handle import confirmation
	async function confirmImport() {
		currentStep = 'import';

		try {
			importResult = await snapshotStore.importSnapshot();

			if (importResult.success) {
				currentStep = 'complete';
			} else {
				// Stay on preview step and show error
				currentStep = 'preview';
			}
		} catch (error) {
			console.error('Import failed:', error);
			currentStep = 'preview';
		}
	}

	// Reset the import process
	function startOver() {
		snapshotStore.clearImport();
		importResult = null;
		currentStep = 'upload';
	}

	// Go to dashboard
	function goToDashboard() {
		goto('/dashboard/teacher');
	}

	// Go back to data import options
	function goBack() {
		goto('/teacher/data-import');
	}

	// Clean up on unmount
	onMount(() => {
		return () => {
			// Clear any temporary state when leaving the page
		};
	});
</script>

<div class="space-y-6">
	<!-- Header with Back Button -->
	<div class="flex items-center space-x-4">
		<Button variant="ghost" size="sm" onclick={goBack}>
			{#snippet children()}
				<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Back to Options
			{/snippet}
		</Button>
		<PageHeader
			title="Import JSON Snapshot"
			description="Upload and validate your classroom snapshot data"
		/>
	</div>

	<!-- Progress Steps -->
	<div class="flex items-center justify-center space-x-4" data-testid="progress-steps">
		<!-- Hidden current step indicator for tests -->
		<span data-testid="current-step" class="sr-only">{currentStep}</span>
		<div class="flex items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep === 'upload'
					? 'bg-blue-600 text-white'
					: currentStep === 'preview' || currentStep === 'import' || currentStep === 'complete'
						? 'bg-green-600 text-white'
						: 'bg-gray-300 text-gray-600'}"
			>
				{#if currentStep === 'preview' || currentStep === 'import' || currentStep === 'complete'}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					1
				{/if}
			</div>
			<span
				class="ml-2 text-sm font-medium {currentStep === 'upload'
					? 'text-blue-600'
					: 'text-gray-500'}"
			>
				Upload & Validate
			</span>
		</div>
		<div class="h-0.5 w-16 bg-gray-300"></div>
		<div class="flex items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep === 'preview'
					? 'bg-blue-600 text-white'
					: currentStep === 'import' || currentStep === 'complete'
						? 'bg-green-600 text-white'
						: 'bg-gray-300 text-gray-600'}"
			>
				{#if currentStep === 'import' || currentStep === 'complete'}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					2
				{/if}
			</div>
			<span
				class="ml-2 text-sm font-medium {currentStep === 'preview'
					? 'text-blue-600'
					: 'text-gray-500'}"
			>
				Preview & Confirm
			</span>
		</div>
		<div class="h-0.5 w-16 bg-gray-300"></div>
		<div class="flex items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep === 'complete'
					? 'bg-green-600 text-white'
					: currentStep === 'import'
						? 'bg-blue-600 text-white'
						: 'bg-gray-300 text-gray-600'}"
			>
				{#if currentStep === 'complete'}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					3
				{/if}
			</div>
			<span
				class="ml-2 text-sm font-medium {currentStep === 'complete'
					? 'text-green-600'
					: currentStep === 'import'
						? 'text-blue-600'
						: 'text-gray-500'}"
			>
				Import Complete
			</span>
		</div>
	</div>

	<!-- Error Display -->
	{#if snapshotStore.error}
		<Alert variant="error" title="Import Error" dismissible onDismiss={snapshotStore.clearError} data-testid="validation-error">
			{#snippet children()}
				{snapshotStore.error}
			{/snippet}
		</Alert>
	{/if}

	<!-- Step Content -->
	{#if currentStep === 'upload'}
		<!-- Step 1: Upload & Validate -->
		<ClassroomSnapshotUploader onValidated={handleFileValidated} />
	{:else if currentStep === 'preview'}
		<!-- Step 2: Preview & Confirm -->
		<div class="space-y-6" data-testid="snapshot-preview">
			<!-- Snapshot Overview -->
			<SnapshotPreview snapshot={snapshotStore.currentSnapshot} />

			<!-- Diff Viewer (if available) -->
			{#if snapshotStore.showDiff && snapshotStore.diffData}
				<SnapshotDiffViewer diffData={snapshotStore.diffData} data-testid="diff-viewer" />
			{/if}

			<!-- Actions -->
			<div class="flex justify-between">
				<Button variant="secondary" onclick={startOver} data-testid="start-over-btn">
					{#snippet children()}
						<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Choose Different File
					{/snippet}
				</Button>

				<Button variant="primary" onclick={confirmImport} loading={snapshotStore.importing} data-testid="confirm-import-btn">
					{#snippet children()}
						{#if snapshotStore.importing}
							Importing Snapshot...
						{:else}
							<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Confirm Import
						{/if}
					{/snippet}
				</Button>
			</div>
		</div>
	{:else if currentStep === 'import'}
		<!-- Step 3: Importing -->
		<Card>
			{#snippet children()}
				<div class="space-y-4 text-center" data-testid="import-progress">
					<div
						class="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"
						data-testid="importing-spinner"
					></div>
					<h3 class="text-lg font-semibold text-gray-900">Importing Snapshot...</h3>
					<p class="text-sm text-gray-600" data-testid="import-status">Please wait while we process your classroom data.</p>
				</div>
			{/snippet}
		</Card>
	{:else if currentStep === 'complete'}
		<!-- Step 4: Complete -->
		<Card>
			{#snippet children()}
				<div class="space-y-6 text-center" data-testid="import-success">
					<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
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

					<div>
						<h3 class="text-lg font-semibold text-gray-900">Snapshot Imported Successfully!</h3>
						<p class="mt-2 text-sm text-gray-600" data-testid="import-summary">
							Your classroom data has been imported and is ready to use.
						</p>
					</div>

					{#if importResult}
						<div class="rounded-lg bg-green-50 p-4 text-left" data-testid="import-stats">
							<h4 class="font-medium text-green-900">Import Summary</h4>
							<div class="mt-2 text-sm text-green-800">
								<p>{importResult.message}</p>
								{#if importResult.snapshotId}
									<p class="mt-1 font-mono text-xs">ID: {importResult.snapshotId}</p>
								{/if}
							</div>
						</div>
					{/if}

					<div class="flex justify-center space-x-4">
						<Button variant="secondary" onclick={startOver}>
							{#snippet children()}
								Import Another
							{/snippet}
						</Button>
						<Button variant="primary" onclick={goToDashboard} data-testid="go-to-dashboard-btn">
							{#snippet children()}
								Go to Dashboard
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	{/if}
</div>
