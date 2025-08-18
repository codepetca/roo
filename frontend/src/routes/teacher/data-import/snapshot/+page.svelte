<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { appState } from '$lib/stores';
	import { api } from '$lib/api';
	import { Card, Button, Alert } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/dashboard';
	import ClassroomSnapshotUploader from '$lib/components/snapshot/ClassroomSnapshotUploader.svelte';
	import SnapshotPreview from '$lib/components/snapshot/SnapshotPreview.svelte';
	import SnapshotDiffViewer from '$lib/components/snapshot/SnapshotDiffViewer.svelte';
	import type { ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';

	// Local state for snapshot import
	let currentStep = $state<'upload' | 'preview' | 'import' | 'complete'>('upload');
	let importResult = $state<any>(null);
	let currentSnapshot = $state<ClassroomSnapshot | null>(null);
	let diffData = $state<any>(null);
	let importing = $state(false);
	let error = $state<string | null>(null);
	let uploader: ClassroomSnapshotUploader;

	// Handle file upload completion
	async function handleFileValidated(snapshot: ClassroomSnapshot) {
		currentSnapshot = snapshot;
		currentStep = 'preview';

		// Generate diff if we have existing data
		try {
			diffData = await api.generateSnapshotDiff(snapshot);
		} catch (err) {
			console.error('Failed to generate diff:', err);
			// Non-critical error, continue without diff
		}
	}

	// Handle import confirmation
	async function confirmImport() {
		if (!currentSnapshot) return;

		currentStep = 'import';
		importing = true;
		error = null;

		try {
			importResult = await api.importSnapshot(currentSnapshot);
			currentStep = 'complete';

			// Refresh the dashboard data after successful import
			await appState.loadDashboard();
		} catch (err) {
			console.error('Import failed:', err);
			error = err instanceof Error ? err.message : 'Import failed';
			currentStep = 'preview';
		} finally {
			importing = false;
		}
	}

	// Reset the import process
	function startOver() {
		currentSnapshot = null;
		diffData = null;
		importResult = null;
		error = null;
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

	// Clear error
	function clearError() {
		error = null;
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
				1
			</div>
			<span class="ml-2 text-sm font-medium text-gray-900">Upload</span>
		</div>
		<div class="h-px w-8 bg-gray-300"></div>
		<div class="flex items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep === 'preview'
					? 'bg-blue-600 text-white'
					: currentStep === 'import' || currentStep === 'complete'
						? 'bg-green-600 text-white'
						: 'bg-gray-300 text-gray-600'}"
			>
				2
			</div>
			<span class="ml-2 text-sm font-medium text-gray-900">Preview</span>
		</div>
		<div class="h-px w-8 bg-gray-300"></div>
		<div class="flex items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep === 'import'
					? 'bg-blue-600 text-white'
					: currentStep === 'complete'
						? 'bg-green-600 text-white'
						: 'bg-gray-300 text-gray-600'}"
			>
				3
			</div>
			<span class="ml-2 text-sm font-medium text-gray-900">Import</span>
		</div>
		<div class="h-px w-8 bg-gray-300"></div>
		<div class="flex items-center">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full {currentStep === 'complete'
					? 'bg-green-600 text-white'
					: 'bg-gray-300 text-gray-600'}"
			>
				4
			</div>
			<span class="ml-2 text-sm font-medium text-gray-900">Complete</span>
		</div>
	</div>

	<!-- Step Content -->
	{#if currentStep === 'upload'}
		<ClassroomSnapshotUploader bind:this={uploader} onValidated={handleFileValidated} />
	{:else if currentStep === 'preview'}
		<!-- Preview Step -->
		{#if error}
			<Alert
				variant="error"
				title="Import Error"
				dismissible
				onDismiss={clearError}
				data-testid="validation-error"
			>
				{#snippet children()}
					{error}
				{/snippet}
			</Alert>
		{/if}

		<Card>
			{#snippet children()}
				<div class="p-6">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Review Import Data</h3>
					<p class="mb-6 text-sm text-gray-600">
						Please review the data below before confirming the import. This will update your
						existing classroom data.
					</p>

					{#if currentSnapshot}
						<SnapshotPreview snapshot={currentSnapshot} />
					{/if}

					{#if diffData}
						<SnapshotDiffViewer {diffData} data-testid="diff-viewer" />
					{/if}

					<!-- Actions -->
					<div class="mt-6 flex items-center justify-between">
						<Button variant="secondary" onclick={startOver} data-testid="change-file-btn">
							{#snippet children()}
								<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
								Choose Different File
							{/snippet}
						</Button>
						<Button
							variant="primary"
							onclick={confirmImport}
							loading={importing}
							data-testid="confirm-import-btn"
						>
							{#snippet children()}
								{#if importing}
									Importing...
								{:else}
									<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
										/>
									</svg>
									Confirm Import
								{/if}
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	{:else if currentStep === 'import'}
		<!-- Import In Progress -->
		<Card>
			{#snippet children()}
				<div class="p-12 text-center">
					<div
						class="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<h3 class="mt-4 text-lg font-semibold text-gray-900">Importing Data...</h3>
					<p class="mt-2 text-sm text-gray-600">
						This may take a few moments depending on the size of your data.
					</p>
				</div>
			{/snippet}
		</Card>
	{:else if currentStep === 'complete'}
		<!-- Import Complete -->
		<Card>
			{#snippet children()}
				<div class="p-12 text-center" data-testid="import-complete">
					<svg
						class="mx-auto h-16 w-16 text-green-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h3 class="mt-4 text-lg font-semibold text-gray-900">Import Successful!</h3>
					<p class="mt-2 text-sm text-gray-600">
						Your classroom data has been successfully imported.
					</p>

					{#if importResult}
						<div class="mt-6 rounded-lg bg-gray-50 p-4 text-left">
							<h4 class="font-medium text-gray-900">Import Summary</h4>
							<div class="mt-2 space-y-1 text-sm text-gray-600">
								{#if importResult.stats}
									<p>• {importResult.stats.classroomsCreated} classrooms created</p>
									<p>• {importResult.stats.assignmentsCreated} assignments created</p>
									<p>• {importResult.stats.submissionsCreated} submissions created</p>
									{#if importResult.stats.gradesPreserved > 0}
										<p>• {importResult.stats.gradesPreserved} grades preserved</p>
									{/if}
								{/if}
								{#if importResult.processingTime}
									<p class="mt-2 text-xs text-gray-500">
										Processing time: {(importResult.processingTime / 1000).toFixed(2)}s
									</p>
								{/if}
							</div>
						</div>
					{/if}

					<div class="mt-8 flex items-center justify-center space-x-4">
						<Button variant="secondary" onclick={startOver} data-testid="import-another-btn">
							{#snippet children()}
								Import Another File
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
