<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';

	// Props
	let { diffData }: { diffData: any } = $props();

	// Helper to determine if there are changes
	let hasChanges = $derived(() => {
		return diffData && Object.keys(diffData).length > 0;
	});

	// Helper to format diff keys into readable labels
	function formatDiffKey(key: string): string {
		const keyMap: Record<string, string> = {
			'classrooms': 'Classrooms',
			'globalStats': 'Statistics',
			'teacher': 'Teacher Info',
			'snapshotMetadata': 'Metadata'
		};
		return keyMap[key] || key;
	}

	// Helper to get change type
	function getChangeType(change: any): 'added' | 'modified' | 'removed' | 'moved' {
		if (Array.isArray(change)) {
			if (change.length === 1) return 'added';
			if (change.length === 2) return 'modified';
			if (change.length === 3) return 'removed';
		}
		if (change._t === 'a') return 'moved';
		return 'modified';
	}

	// Helper to get change summary
	function getChangeSummary(key: string, change: any): string {
		const changeType = getChangeType(change);
		
		switch (changeType) {
			case 'added':
				return `Added new ${formatDiffKey(key).toLowerCase()}`;
			case 'removed':
				return `Removed ${formatDiffKey(key).toLowerCase()}`;
			case 'modified':
				if (key === 'globalStats') {
					return 'Updated statistics';
				}
				return `Modified ${formatDiffKey(key).toLowerCase()}`;
			case 'moved':
				return `Reordered ${formatDiffKey(key).toLowerCase()}`;
			default:
				return `Changed ${formatDiffKey(key).toLowerCase()}`;
		}
	}

	// Helper to get change badge variant
	function getChangeBadgeVariant(changeType: string) {
		switch (changeType) {
			case 'added':
				return 'success';
			case 'removed':
				return 'error';
			case 'modified':
				return 'warning';
			case 'moved':
				return 'info';
			default:
				return 'default';
		}
	}

	// Helper to count deep changes
	function countChanges(obj: any): number {
		if (!obj || typeof obj !== 'object') return 0;
		
		let count = 0;
		for (const [key, value] of Object.entries(obj)) {
			if (Array.isArray(value)) {
				count++; // Each array change counts as one
			} else if (typeof value === 'object' && value !== null) {
				count += countChanges(value);
			} else {
				count++;
			}
		}
		return count;
	}

	// Helper to render diff value
	function renderDiffValue(change: any): string {
		if (Array.isArray(change)) {
			const changeType = getChangeType(change);
			if (changeType === 'added') {
				return `+ ${JSON.stringify(change[0])}`.slice(0, 100) + (JSON.stringify(change[0]).length > 100 ? '...' : '');
			} else if (changeType === 'removed') {
				return `- ${JSON.stringify(change[0])}`.slice(0, 100) + (JSON.stringify(change[0]).length > 100 ? '...' : '');
			} else if (changeType === 'modified') {
				return `${JSON.stringify(change[0])} → ${JSON.stringify(change[1])}`.slice(0, 100) + '...';
			}
		}
		return JSON.stringify(change).slice(0, 100) + '...';
	}
</script>

<Card>
	{#snippet children()}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h4 class="font-medium text-gray-900">Changes from Previous Import</h4>
				{#if hasChanges}
					<Badge variant="warning" size="sm">
						{#snippet children()}
							{countChanges(diffData)} changes detected
						{/snippet}
					</Badge>
				{:else}
					<Badge variant="success" size="sm">
						{#snippet children()}
							No changes
						{/snippet}
					</Badge>
				{/if}
			</div>

			{#if hasChanges}
				<div class="space-y-3">
					{#each Object.entries(diffData) as [key, change]}
						{@const changeType = getChangeType(change)}
						<div class="rounded-lg border border-gray-200 p-4">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center space-x-2">
										<h5 class="font-medium text-gray-900">{formatDiffKey(key)}</h5>
										<Badge variant={getChangeBadgeVariant(changeType)} size="sm">
											{#snippet children()}
												{changeType}
											{/snippet}
										</Badge>
									</div>
									<p class="text-sm text-gray-600 mt-1">
										{getChangeSummary(key, change)}
									</p>
								</div>
							</div>

							<!-- Detailed change preview -->
							{#if changeType !== 'moved'}
								<div class="mt-3 rounded bg-gray-50 p-3 font-mono text-xs">
									{#if Array.isArray(change)}
										{#if changeType === 'added'}
											<div class="text-green-600">+ {renderDiffValue(change)}</div>
										{:else if changeType === 'removed'}
											<div class="text-red-600">- {renderDiffValue(change)}</div>
										{:else if changeType === 'modified'}
											<div class="text-red-600">- {JSON.stringify(change[0]).slice(0, 100)}...</div>
											<div class="text-green-600">+ {JSON.stringify(change[1]).slice(0, 100)}...</div>
										{/if}
									{:else}
										<div class="text-gray-600">{JSON.stringify(change, null, 2).slice(0, 200)}...</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Summary -->
				<div class="rounded-lg bg-yellow-50 p-4">
					<div class="flex">
						<svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
						<div class="ml-3">
							<h5 class="font-medium text-yellow-800">Review Changes Carefully</h5>
							<p class="text-sm text-yellow-700 mt-1">
								These changes will be applied to your classroom data. Make sure everything looks correct before proceeding with the import.
							</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="rounded-lg bg-green-50 p-6 text-center">
					<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
						<svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h5 class="mt-3 font-medium text-green-900">No Changes Detected</h5>
					<p class="text-sm text-green-700 mt-1">
						This snapshot contains the same data as your previous import.
					</p>
				</div>
			{/if}
		</div>
	{/snippet}
</Card>