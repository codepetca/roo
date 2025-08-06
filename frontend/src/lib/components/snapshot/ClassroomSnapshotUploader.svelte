<script lang="ts">
	import { snapshotStore } from '$lib/stores';
	import { Card, Button, Badge } from '$lib/components/ui';

	// Props
	let { onValidated }: { onValidated?: () => void } = $props();

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
			snapshotStore.clearError();
			return;
		}

		// Set the file in the store
		snapshotStore.setImportFile(file);

		// Validate the file
		const isValid = await snapshotStore.validateImportFile();
		
		if (isValid) {
			onValidated?.();
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
		dragCounter = 0;
		isDragging = false;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	// Open file dialog
	function openFileDialog() {
		fileInput?.click();
	}

	// Handle keyboard events for accessibility
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openFileDialog();
		}
	}

	// Clear the current file
	function clearFile() {
		snapshotStore.clearImport();
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<Card>
	{#snippet children()}
		<div class="space-y-6">
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Upload Classroom Snapshot</h3>
				<p class="text-sm text-gray-600 mt-1">
					Select a JSON file containing your classroom snapshot data
				</p>
			</div>

			<!-- Hidden file input -->
			<input
				bind:this={fileInput}
				type="file"
				accept=".json,application/json"
				class="hidden"
				onchange={handleFileInputChange}
			/>

			<!-- Drop zone -->
			<div
				role="button"
				tabindex="0"
				class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {isDragging
					? 'border-blue-400 bg-blue-50'
					: snapshotStore.importFile
					? 'border-green-300 bg-green-50'
					: 'border-gray-300 bg-gray-50 hover:border-gray-400'}"
				ondragenter={handleDragEnter}
				ondragleave={handleDragLeave}
				ondragover={handleDragOver}
				ondrop={handleDrop}
				onclick={openFileDialog}
				onkeydown={handleKeyDown}
			>
				{#if snapshotStore.validating}
					<!-- Validating state -->
					<div class="space-y-4">
						<div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
						<div>
							<h4 class="font-medium text-gray-900">Validating File...</h4>
							<p class="text-sm text-gray-600">Checking format and structure</p>
						</div>
					</div>
				{:else if snapshotStore.importFile && snapshotStore.currentSnapshot}
					<!-- File validated successfully -->
					<div class="space-y-4">
						<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
							<svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<div>
							<h4 class="font-medium text-green-900">File Validated Successfully</h4>
							<p class="text-sm text-green-700">{snapshotStore.importFile.name}</p>
							<div class="mt-2 flex items-center justify-center space-x-4 text-xs text-green-600">
								<span>{Math.round(snapshotStore.importFile.size / 1024)} KB</span>
								<span>•</span>
								<span>{snapshotStore.currentSnapshot.classrooms.length} classrooms</span>
								<span>•</span>
								<span>{snapshotStore.currentSnapshot.globalStats.totalStudents} students</span>
							</div>
						</div>
						<Button variant="secondary" size="sm" onclick={clearFile}>
							{#snippet children()}
								Choose Different File
							{/snippet}
						</Button>
					</div>
				{:else if snapshotStore.importFile && snapshotStore.error}
					<!-- File validation failed -->
					<div class="space-y-4">
						<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
							<svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>
						<div>
							<h4 class="font-medium text-red-900">Validation Failed</h4>
							<p class="text-sm text-red-700">{snapshotStore.importFile.name}</p>
							<p class="text-sm text-red-600 mt-1">{snapshotStore.error}</p>
						</div>
						<Button variant="secondary" size="sm" onclick={clearFile}>
							{#snippet children()}
								Try Again
							{/snippet}
						</Button>
					</div>
				{:else}
					<!-- Default upload state -->
					<div class="space-y-4">
						<svg
							class="mx-auto h-12 w-12 {isDragging ? 'text-blue-600' : 'text-gray-400'}"
							stroke="currentColor"
							fill="none"
							viewBox="0 0 48 48"
							aria-hidden="true"
						>
							<path
								d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<div>
							<h4 class="font-medium text-gray-900">
								{isDragging ? 'Drop your file here' : 'Upload JSON Snapshot'}
							</h4>
							<p class="text-sm text-gray-600">
								{isDragging
									? 'Release to upload'
									: 'Drag and drop or click to select a JSON file'}
							</p>
						</div>
						<Button variant="primary" onclick={openFileDialog}>
							{#snippet children()}
								<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
								Select File
							{/snippet}
						</Button>
					</div>
				{/if}
			</div>

			<!-- File requirements -->
			<div class="rounded-lg bg-gray-50 p-4">
				<h4 class="font-medium text-gray-900 mb-2">File Requirements</h4>
				<ul class="space-y-1 text-sm text-gray-600">
					<li class="flex items-start space-x-2">
						<svg class="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
						<span>JSON format (.json file extension)</span>
					</li>
					<li class="flex items-start space-x-2">
						<svg class="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
						<span>Valid classroom snapshot schema structure</span>
					</li>
					<li class="flex items-start space-x-2">
						<svg class="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
						<span>Maximum file size: 10MB</span>
					</li>
					<li class="flex items-start space-x-2">
						<svg class="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
						<span>Contains teacher, classrooms, assignments, and student data</span>
					</li>
				</ul>
			</div>
		</div>
	{/snippet}
</Card>