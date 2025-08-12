<script lang="ts">
	import { api } from '$lib/api';
	import { Card, Button, Badge } from '$lib/components/ui';
	import type { ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';

	// Props
	let { onValidated }: { onValidated?: (snapshot: ClassroomSnapshot) => void } = $props();

	// Local state for snapshot management
	let importFile = $state<File | null>(null);
	let currentSnapshot = $state<ClassroomSnapshot | null>(null);
	let validating = $state(false);
	let error = $state<string | null>(null);
	let validationStats = $state<any>(null);

	// File input reference
	let fileInput: HTMLInputElement;

	// Drag and drop state
	let isDragging = $state(false);
	let dragCounter = $state(0);

	// Handle file selection
	async function handleFileSelect(file: File) {
		if (!file) return;

		// Validate file type
		if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
			error = 'Please select a valid JSON file';
			return;
		}

		// Set the file
		importFile = file;
		error = null;

		// Validate the file
		await validateImportFile();
	}

	// Validate the imported file
	async function validateImportFile() {
		if (!importFile) return false;

		validating = true;
		error = null;

		try {
			// Read file content
			const content = await importFile.text();
			const snapshot = JSON.parse(content) as ClassroomSnapshot;

			// Validate via API
			const result = await api.validateSnapshot(snapshot);

			if (result.isValid) {
				currentSnapshot = snapshot;
				validationStats = result.stats;
				onValidated?.(snapshot);
				return true;
			} else {
				error = 'Snapshot validation failed';
				return false;
			}
		} catch (err) {
			console.error('Validation error:', err);
			error = err instanceof Error ? err.message : 'Failed to validate snapshot';
			return false;
		} finally {
			validating = false;
		}
	}

	// Handle file input change
	function handleFileInputChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	// Handle drag events
	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragCounter++;
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragCounter--;
		if (dragCounter === 0) {
			isDragging = false;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		dragCounter = 0;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	// Clear the current file
	function clearFile() {
		importFile = null;
		currentSnapshot = null;
		validationStats = null;
		error = null;
		if (fileInput) {
			fileInput.value = '';
		}
	}

	// Get the current snapshot for import
	export function getSnapshot(): ClassroomSnapshot | null {
		return currentSnapshot;
	}
</script>

<Card>
	{#snippet children()}
		<div class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Import Classroom Snapshot</h3>

			<!-- File Upload Area -->
			<div
				ondragenter={handleDragEnter}
				ondragleave={handleDragLeave}
				ondragover={handleDragOver}
				ondrop={handleDrop}
				class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {isDragging
					? 'border-blue-400 bg-blue-50'
					: importFile
						? 'border-green-300 bg-green-50'
						: 'border-gray-300 bg-gray-50 hover:border-gray-400'}"
			>
				<input
					bind:this={fileInput}
					type="file"
					accept=".json,application/json"
					onchange={handleFileInputChange}
					class="hidden"
					data-testid="file-input"
				/>

				{#if isDragging}
					<div
						class="bg-opacity-75 absolute inset-0 rounded-lg bg-blue-100"
						data-testid="drag-overlay"
					></div>
				{/if}
				{#if validating}
					<!-- Validating state -->
					<div class="space-y-4">
						<div
							class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
						></div>
						<div>
							<h4 class="font-medium text-gray-900">Validating Snapshot...</h4>
							<p class="text-sm text-gray-600">Checking data structure and integrity</p>
						</div>
					</div>
				{:else if importFile && currentSnapshot}
					<!-- File validated successfully -->
					<div class="space-y-4" data-testid="validation-success">
						<svg
							class="mx-auto h-12 w-12 text-green-600"
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
						<div>
							<h4 class="font-medium text-green-900">File Validated Successfully</h4>
							<p class="text-sm text-green-700">{importFile.name}</p>
							<div class="mt-2 flex items-center justify-center space-x-4 text-xs text-green-600">
								<span>{Math.round(importFile.size / 1024)} KB</span>
								<span>•</span>
								<span>{currentSnapshot.classrooms.length} classrooms</span>
								<span>•</span>
								<span>{currentSnapshot.globalStats.totalStudents} students</span>
							</div>
						</div>
						<Button variant="secondary" size="sm" onclick={clearFile}>
							{#snippet children()}
								Choose Different File
							{/snippet}
						</Button>
					</div>
				{:else if importFile && error}
					<!-- File validation failed -->
					<div class="space-y-4">
						<svg
							class="mx-auto h-12 w-12 text-red-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
						<div>
							<h4 class="font-medium text-red-900">Validation Failed</h4>
							<p class="text-sm text-red-700">{importFile.name}</p>
							<p class="mt-1 text-sm text-red-600">{error}</p>
						</div>
						<Button variant="secondary" size="sm" onclick={clearFile}>
							{#snippet children()}
								Try Another File
							{/snippet}
						</Button>
					</div>
				{:else}
					<!-- Default upload state -->
					<div class="space-y-4">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
						<div>
							<h4 class="font-medium text-gray-900">Drop your snapshot file here</h4>
							<p class="text-sm text-gray-600">or click to browse</p>
							<p class="mt-2 text-xs text-gray-500">
								Accepts JSON files exported from Google Sheets
							</p>
						</div>
						<Button
							variant="primary"
							size="sm"
							onclick={() => fileInput?.click()}
							data-testid="browse-button"
						>
							{#snippet children()}
								Browse Files
							{/snippet}
						</Button>
					</div>
				{/if}
			</div>

			{#if error}
				<div class="mt-4 rounded-md bg-red-50 p-3">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}
		</div>
	{/snippet}
</Card>
