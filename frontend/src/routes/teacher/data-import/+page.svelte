<script lang="ts">
	import { Card, Button, Badge } from '$lib/components/ui';
	import { PageHeader } from '$lib/components/dashboard';

	// Navigation actions
	function goToSnapshotImport() {
		window.location.href = '/teacher/data-import/snapshot';
	}

	function goToGoogleClassroomSetup() {
		// Future: redirect to Google Classroom API setup
		window.location.href = '/teacher/onboarding';
	}

	function goToSheetsSetup() {
		window.location.href = '/teacher/onboarding';
	}
</script>

<div class="space-y-8">
	<PageHeader
		title="Import Classroom Data"
		description="Choose how you'd like to get your classroom data into Roo"
	/>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Manual JSON Import -->
		<Card>
			{#snippet children()}
				<div class="space-y-4">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg
								class="h-10 w-10 text-blue-600"
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
						</div>
						<div class="ml-4 flex-1">
							<div class="flex items-center space-x-2">
								<h3 class="text-lg font-semibold text-gray-900">Import JSON Snapshot</h3>
								<Badge variant="success" size="sm">
									{#snippet children()}
										Recommended
									{/snippet}
								</Badge>
							</div>
							<p class="mt-1 text-sm text-gray-600">Upload a classroom snapshot JSON file</p>
						</div>
					</div>

					<div class="space-y-3 text-sm text-gray-600">
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>Complete control over your data</span>
						</div>
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>View changes before import</span>
						</div>
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>Track import history & diffs</span>
						</div>
					</div>

					<div class="flex justify-end space-x-2">
						<Button variant="primary" onclick={goToSnapshotImport}>
							{#snippet children()}
								<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
								Import JSON
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>

		<!-- Google Classroom API (Future) -->
		<Card>
			{#snippet children()}
				<div class="space-y-4">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg
								class="h-10 w-10 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
								/>
							</svg>
						</div>
						<div class="ml-4 flex-1">
							<div class="flex items-center space-x-2">
								<h3 class="text-lg font-semibold text-gray-400">Google Classroom API</h3>
								<Badge variant="default" size="sm">
									{#snippet children()}
										Coming Soon
									{/snippet}
								</Badge>
							</div>
							<p class="mt-1 text-sm text-gray-500">Direct integration with Google Classroom</p>
						</div>
					</div>

					<div class="space-y-3 text-sm text-gray-500">
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span>Automatic synchronization</span>
						</div>
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span>Real-time updates</span>
						</div>
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span>No manual exports needed</span>
						</div>
					</div>

					<div class="flex justify-end space-x-2">
						<Button variant="secondary" disabled>
							{#snippet children()}
								<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
									/>
								</svg>
								Coming Soon
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>

		<!-- Google Sheets Integration (Existing) -->
		<Card>
			{#snippet children()}
				<div class="space-y-4">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg
								class="h-10 w-10 text-green-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
						</div>
						<div class="ml-4 flex-1">
							<div class="flex items-center space-x-2">
								<h3 class="text-lg font-semibold text-gray-900">Google Sheets Integration</h3>
								<Badge variant="info" size="sm">
									{#snippet children()}
										Legacy
									{/snippet}
								</Badge>
							</div>
							<p class="mt-1 text-sm text-gray-600">Traditional sheets-based workflow</p>
						</div>
					</div>

					<div class="space-y-3 text-sm text-gray-600">
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>Requires AppScript setup</span>
						</div>
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>Manual sync process</span>
						</div>
						<div class="flex items-start space-x-2">
							<svg
								class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>Board account needed</span>
						</div>
					</div>

					<div class="flex justify-end space-x-2">
						<Button variant="secondary" onclick={goToSheetsSetup}>
							{#snippet children()}
								<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
								Setup Sheets
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	</div>

	<!-- Help Section -->
	<Card>
		{#snippet children()}
			<div class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Need Help Choosing?</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<h4 class="font-medium text-gray-900">Choose JSON Import if:</h4>
						<ul class="space-y-1 text-sm text-gray-600">
							<li>• You want full control over your data</li>
							<li>• You have classroom data in JSON format</li>
							<li>• You want to track changes over time</li>
							<li>• You prefer manual imports</li>
						</ul>
					</div>
					<div class="space-y-2">
						<h4 class="font-medium text-gray-900">Choose Google Sheets if:</h4>
						<ul class="space-y-1 text-sm text-gray-600">
							<li>• You're already using the legacy system</li>
							<li>• You have existing AppScript setup</li>
							<li>• You need board account integration</li>
							<li>• You prefer the sheets workflow</li>
						</ul>
					</div>
				</div>
			</div>
		{/snippet}
	</Card>
</div>
