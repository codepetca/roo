<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { Card, Button, Badge, Alert } from '$lib/components/ui';
	import { PageHeader, LoadingSkeleton } from '$lib/components/dashboard';

	// State using Svelte 5 runes
	let teachers = $state<
		Array<{
			email: string;
			spreadsheetId: string;
			isConfigured: boolean;
		}>
	>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedTeacher = $state<string | null>(null);
	let appScriptCode = $state<string | null>(null);
	let loadingAppScript = $state(false);

	// Stats
	let totalTeachers = $derived(teachers.length);
	let configuredTeachers = $derived(teachers.filter((t) => t.isConfigured).length);

	async function loadTeachers() {
		try {
			loading = true;
			error = null;

			const result = await api.listConfiguredTeachers();
			teachers = result.teachers;
		} catch (err: unknown) {
			console.error('Failed to load teachers:', err);
			error = err instanceof Error ? err.message : 'Failed to load teachers';
		} finally {
			loading = false;
		}
	}

	async function generateAppScript(teacherEmail: string) {
		try {
			loadingAppScript = true;
			selectedTeacher = teacherEmail;
			appScriptCode = null;

			const result = await api.generateAppScriptForTeacher(teacherEmail);
			appScriptCode = result.appScriptCode;
		} catch (err: unknown) {
			console.error('Failed to generate AppScript:', err);
			error = err instanceof Error ? err.message : 'Failed to generate AppScript code';
		} finally {
			loadingAppScript = false;
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			// Could add a toast notification here
			console.log('Copied to clipboard');
		});
	}

	function closeAppScriptModal() {
		selectedTeacher = null;
		appScriptCode = null;
	}

	onMount(() => {
		loadTeachers();
	});
</script>

<div class="space-y-6">
	<PageHeader
		title="Teacher Management"
		description="Manage teacher Google Sheets configurations and generate AppScript codes"
	/>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<Card>
			{#snippet children()}
				<div class="flex items-center">
					<div class="rounded-lg bg-blue-100 p-2">
						<svg
							class="h-6 w-6 text-blue-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a6 6 0 01-6.99 5.197"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-2xl font-semibold text-gray-900">{totalTeachers}</p>
						<p class="text-sm text-gray-600">Total Teachers</p>
					</div>
				</div>
			{/snippet}
		</Card>

		<Card>
			{#snippet children()}
				<div class="flex items-center">
					<div class="rounded-lg bg-green-100 p-2">
						<svg
							class="h-6 w-6 text-green-600"
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
					</div>
					<div class="ml-4">
						<p class="text-2xl font-semibold text-gray-900">{configuredTeachers}</p>
						<p class="text-sm text-gray-600">Configured</p>
					</div>
				</div>
			{/snippet}
		</Card>

		<Card>
			{#snippet children()}
				<div class="flex items-center">
					<div class="rounded-lg bg-indigo-100 p-2">
						<svg
							class="h-6 w-6 text-indigo-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-2xl font-semibold text-gray-900">
							{Math.round((configuredTeachers / Math.max(totalTeachers, 1)) * 100)}%
						</p>
						<p class="text-sm text-gray-600">Setup Rate</p>
					</div>
				</div>
			{/snippet}
		</Card>
	</div>

	<!-- Error Display -->
	{#if error}
		<Alert variant="error" title="Error" dismissible onDismiss={() => (error = null)}>
			{#snippet children()}
				{error}
			{/snippet}
		</Alert>
	{/if}

	<!-- Teachers List -->
	<Card>
		{#snippet children()}
			<div class="mb-6 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">Configured Teachers</h3>
				<Button variant="secondary" onclick={loadTeachers} {loading}>
					{#snippet children()}
						Refresh
					{/snippet}
				</Button>
			</div>

			{#if loading}
				<LoadingSkeleton type="card" rows={3} />
			{:else if teachers.length === 0}
				<div class="py-12 text-center">
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
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a6 6 0 01-6.99 5.197"
						/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">No teachers configured</h3>
					<p class="mt-1 text-sm text-gray-500">
						Teachers need to complete the onboarding process first.
					</p>
				</div>
			{:else}
				<div class="overflow-hidden">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Teacher
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Status
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Sheet ID
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each teachers as teacher (teacher.email)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center">
											<div class="h-8 w-8 flex-shrink-0">
												<div
													class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100"
												>
													<span class="text-sm font-medium text-indigo-600">
														{teacher.email.charAt(0).toUpperCase()}
													</span>
												</div>
											</div>
											<div class="ml-4">
												<div class="text-sm font-medium text-gray-900">
													{teacher.email}
												</div>
											</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<Badge variant={teacher.isConfigured ? 'success' : 'warning'}>
											{#snippet children()}
												{teacher.isConfigured ? 'Configured' : 'Pending'}
											{/snippet}
										</Badge>
									</td>
									<td class="px-6 py-4 font-mono text-sm whitespace-nowrap text-gray-500">
										{teacher.spreadsheetId}
									</td>
									<td class="space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap">
										<Button
											variant="secondary"
											size="sm"
											onclick={() => generateAppScript(teacher.email)}
											loading={loadingAppScript && selectedTeacher === teacher.email}
										>
											{#snippet children()}
												Generate AppScript
											{/snippet}
										</Button>

										<a
											href={`https://docs.google.com/spreadsheets/d/${teacher.spreadsheetId}/edit`}
											target="_blank"
											class="text-blue-600 hover:text-blue-800"
										>
											View Sheet →
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/snippet}
	</Card>

	<!-- AppScript Modal -->
	{#if selectedTeacher && appScriptCode}
		<div class="bg-opacity-50 fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600">
			<div
				class="relative top-20 mx-auto w-11/12 rounded-md border bg-white p-5 shadow-lg md:w-3/4 lg:w-1/2"
			>
				<div class="mt-3">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-lg font-medium text-gray-900">
							AppScript Code for {selectedTeacher}
						</h3>
						<button onclick={closeAppScriptModal} class="text-gray-400 hover:text-gray-600">
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<div class="mb-4">
						<p class="mb-3 text-sm text-gray-600">
							Copy this code to the teacher's board Google Apps Script project:
						</p>

						<div class="mb-2 flex justify-end">
							<Button variant="secondary" size="sm" onclick={() => copyToClipboard(appScriptCode!)}>
								{#snippet children()}
									Copy Code
								{/snippet}
							</Button>
						</div>

						<div
							class="max-h-96 overflow-x-auto rounded-lg bg-gray-900 p-4 font-mono text-xs text-green-400"
						>
							<pre>{appScriptCode}</pre>
						</div>
					</div>

					<div class="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
						<h4 class="mb-2 text-sm font-medium text-blue-900">Instructions for Teacher:</h4>
						<ol class="list-inside list-decimal space-y-1 text-sm text-blue-800">
							<li>Open Google Apps Script in your board account</li>
							<li>Create a new project</li>
							<li>Replace the default code with the code above</li>
							<li>Run the 'setupTriggers' function once</li>
							<li>Test with the 'processAllSubmissions' function</li>
						</ol>
					</div>

					<div class="flex justify-end">
						<Button variant="primary" onclick={closeAppScriptModal}>
							{#snippet children()}
								Close
							{/snippet}
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
