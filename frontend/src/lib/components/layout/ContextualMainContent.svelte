<script lang="ts">
	import { dataStore } from '$lib/stores/data-store.svelte';
	import { Button, Alert, Card, Badge } from '$lib/components/ui';
	import { LoadingSkeleton, PageHeader } from '$lib/components/dashboard';
	import StudentStatusTable from '$lib/components/dashboard/StudentStatusTable.svelte';
	import StatsGrid from '$lib/components/core/StatsGrid.svelte';
	import type { Classroom, Assignment } from '@shared/schemas/core';

	// Reactive data from store
	let selectedClassroom = $derived(dataStore.selectedClassroom);
	let selectedAssignment = $derived(dataStore.selectedAssignment);
	let classrooms = $derived(dataStore.classrooms);
	let assignments = $derived(dataStore.assignments);
	let currentUser = $derived(dataStore.currentUser);
	let dashboardStats = $derived(dataStore.dashboardStats);
	let recentActivity = $derived(dataStore.recentActivity);
	let loading = $derived(dataStore.loading);
	let error = $derived(dataStore.error);
	let hasData = $derived(dataStore.hasData);

	// Computed: Assignments for selected classroom
	let classroomAssignments = $derived(() => {
		if (!selectedClassroom || !assignments) return [];
		return assignments.filter((a) => a.classroomId === selectedClassroom.id);
	});

	// Student status data is now handled by the StudentStatusTable component via dataStore.assignmentStudentStatus

	// Transform dashboard stats for StatsGrid
	let statsData = $derived(() => {
		if (!dashboardStats) return [];
		return [
			{
				title: 'Total Assignments',
				value: dashboardStats.totalAssignments || 0,
				icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
				color: 'bg-blue-500'
			},
			{
				title: 'Total Students',
				value: dashboardStats.totalStudents || 0,
				icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
				color: 'bg-green-500'
			},
			{
				title: 'Pending Review',
				value: dashboardStats.ungradedSubmissions || 0,
				icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z',
				color: 'bg-orange-500'
			},
			{
				title: 'Average Grade',
				value: dashboardStats.averageGrade ? `${dashboardStats.averageGrade.toFixed(1)}%` : 'N/A',
				icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
				color: 'bg-purple-500'
			}
		];
	});

	// Navigate to data import
	function goToDataImport() {
		window.location.href = '/teacher/data-import';
	}

	// Get assignment type icon path
	function getAssignmentIcon(assignment: Assignment): string {
		if (assignment.classification?.platform === 'google_form') {
			return 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2M9 5a2 2 0 012 2v6a2 2 0 01-2 2M9 5V3a2 2 0 012-2h4a2 2 0 012 2v2M9 13h6m-3-3v3';
		}
		return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
	}
</script>

<div class="flex-1 overflow-auto">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Error State -->
		{#if error}
			<Alert
				variant="error"
				title="Error loading data"
				dismissible
				onDismiss={dataStore.clearError}
			>
				{#snippet children()}
					{error}
					<div class="mt-3">
						<Button variant="secondary" size="sm" onclick={dataStore.refresh}>
							{#snippet children()}
								Try Again
							{/snippet}
						</Button>
					</div>
				{/snippet}
			</Alert>
		{/if}

		<!-- Content based on selection state -->
		{#if selectedAssignment && selectedClassroom}
			<!-- Assignment Detail View -->
			{#snippet actions()}
				<div class="flex gap-2">
					<Button variant="outline" onclick={dataStore.refresh} disabled={loading}>
						{#snippet children()}
							{#if loading}
								<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
								Refreshing...
							{:else}
								<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								Refresh
							{/if}
						{/snippet}
					</Button>
				</div>
			{/snippet}

			<div class="space-y-6">
				<PageHeader
					title={dataStore.getAssignmentDisplayTitle(selectedAssignment)}
					description="Assignment details and student submissions"
					{actions}
				/>

				<!-- Assignment Info Card -->
				<Card>
					{#snippet children()}
						<div class="p-6">
							<div class="flex items-start space-x-4">
								<!-- Assignment Icon -->
								<div
									class="flex-shrink-0 p-3 {selectedAssignment.classification?.platform === 'google_form'
										? 'bg-green-100 text-green-600'
										: 'bg-blue-100 text-blue-600'} rounded-lg"
								>
									<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d={getAssignmentIcon(selectedAssignment)}
										/>
									</svg>
								</div>

								<div class="flex-1">
									<div class="mb-2 flex items-center space-x-3">
										<h3 class="text-lg font-semibold text-gray-900">
											{dataStore.getAssignmentDisplayTitle(selectedAssignment)}
										</h3>
										<Badge variant={selectedAssignment.classification?.platform === 'google_form' ? 'success' : 'info'}>
											{#snippet children()}
												{dataStore.getAssignmentTypeLabel(selectedAssignment)}
											{/snippet}
										</Badge>
									</div>

									<p class="mb-4 text-gray-600">
										{selectedAssignment.description || 'No description available'}
									</p>

									<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
										<div>
											<span class="font-medium text-gray-700">Classroom:</span>
											<p class="text-gray-600">{selectedClassroom.name}</p>
										</div>
										<div>
											<span class="font-medium text-gray-700">Due Date:</span>
											<p class="text-gray-600">
												{dataStore.formatDate(selectedAssignment.dueDate)}
											</p>
										</div>
										<div>
											<span class="font-medium text-gray-700">Max Points:</span>
											<p class="text-gray-600">
												{selectedAssignment.maxScore || selectedAssignment.maxPoints || 0}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/snippet}
				</Card>

				<!-- Student Status Table -->
				<StudentStatusTable
					assignment={selectedAssignment}
					onViewSubmission={(studentId, submissionId) => {
						console.log('View submission for student:', studentId, 'submission:', submissionId);
						// TODO: Implement submission viewer
					}}
					onGradeSubmission={(studentId, submissionId) => {
						console.log('Grade submission for student:', studentId, 'submission:', submissionId);
						// TODO: Implement grading interface
					}}
				/>
			</div>
		{:else if selectedClassroom}
			<!-- Classroom Detail View -->
			{#snippet actions()}
				<div class="flex gap-2">
					<Button variant="secondary" onclick={goToDataImport}>
						{#snippet children()}
							Import Data
						{/snippet}
					</Button>
					<Button variant="primary" onclick={dataStore.refresh} disabled={loading}>
						{#snippet children()}
							Refresh
						{/snippet}
					</Button>
				</div>
			{/snippet}

			<div class="space-y-6">
				<PageHeader
					title={selectedClassroom.name}
					description="Classroom overview and assignments"
					{actions}
				/>

				<!-- Classroom Stats -->
				<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
					<Card>
						{#snippet children()}
							<div class="p-6">
								<div class="flex items-center">
									<div class="rounded-lg bg-blue-100 p-2 text-blue-600">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
											/>
										</svg>
									</div>
									<div class="ml-4">
										<p class="text-sm font-medium text-gray-600">Students</p>
										<p class="text-2xl font-bold text-gray-900">{selectedClassroom.studentCount}</p>
									</div>
								</div>
							</div>
						{/snippet}
					</Card>

					<Card>
						{#snippet children()}
							<div class="p-6">
								<div class="flex items-center">
									<div class="rounded-lg bg-green-100 p-2 text-green-600">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
									</div>
									<div class="ml-4">
										<p class="text-sm font-medium text-gray-600">Assignments</p>
										<p class="text-2xl font-bold text-gray-900">{classroomAssignments.length}</p>
									</div>
								</div>
							</div>
						{/snippet}
					</Card>

					<Card>
						{#snippet children()}
							<div class="p-6">
								<div class="flex items-center">
									<div class="rounded-lg bg-yellow-100 p-2 text-yellow-600">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<div class="ml-4">
										<p class="text-sm font-medium text-gray-600">Pending</p>
										<p class="text-2xl font-bold text-gray-900">
											{selectedClassroom.ungradedSubmissions || 0}
										</p>
									</div>
								</div>
							</div>
						{/snippet}
					</Card>

					<Card>
						{#snippet children()}
							<div class="p-6">
								<div class="flex items-center">
									<div class="rounded-lg bg-purple-100 p-2 text-purple-600">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
											/>
										</svg>
									</div>
									<div class="ml-4">
										<p class="text-sm font-medium text-gray-600">Active</p>
										<p class="text-2xl font-bold text-gray-900">
											{selectedClassroom.activeSubmissions || 0}
										</p>
									</div>
								</div>
							</div>
						{/snippet}
					</Card>
				</div>

				<!-- Assignments List -->
				<Card>
					{#snippet children()}
						<div class="p-6">
							<h3 class="mb-4 text-lg font-semibold text-gray-900">
								Assignments in this Classroom
							</h3>

							{#if classroomAssignments.length === 0}
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
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
									<h4 class="mt-2 text-sm font-medium text-gray-900">No assignments yet</h4>
									<p class="mt-1 text-sm text-gray-500">
										Create assignments to see them listed here.
									</p>
								</div>
							{:else}
								<div class="space-y-4">
									{#each classroomAssignments as assignment (assignment.id)}
										<div
											class="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
										>
											<div class="flex items-center justify-between">
												<div class="flex items-center space-x-3">
													<!-- Assignment Icon -->
													<div
														class="flex-shrink-0 p-2 {assignment.classification?.platform === 'google_form'
															? 'bg-green-100 text-green-600'
															: 'bg-blue-100 text-blue-600'} rounded-lg"
													>
														<svg
															class="h-5 w-5"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d={getAssignmentIcon(assignment)}
															/>
														</svg>
													</div>

													<div>
														<h4 class="font-medium text-gray-900">
															{dataStore.getAssignmentDisplayTitle(assignment)}
														</h4>
														<div class="flex items-center space-x-4 text-sm text-gray-500">
															<span>{dataStore.getAssignmentTypeLabel(assignment)}</span>
															<span>•</span>
															<span>{assignment.maxScore || assignment.maxPoints || 0} points</span>
															<span>•</span>
															<span>Due {dataStore.formatDate(assignment.dueDate)}</span>
														</div>
													</div>
												</div>

												<Button
													variant="outline"
													size="sm"
													onclick={() => dataStore.selectAssignment(assignment.id)}
												>
													{#snippet children()}
														View Details
													{/snippet}
												</Button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/snippet}
				</Card>
			</div>
		{:else}
			<!-- Dashboard Overview (No Selection) -->
			{#snippet actions()}
				<div class="flex gap-2">
					<Button variant="secondary" onclick={goToDataImport}>
						{#snippet children()}
							Import Data
						{/snippet}
					</Button>
					<Button variant="primary" onclick={dataStore.refresh} disabled={loading}>
						{#snippet children()}
							Refresh
						{/snippet}
					</Button>
				</div>
			{/snippet}

			<div class="space-y-6">
				<PageHeader
					title="Teacher Dashboard"
					description="Manage assignments, review submissions, and track student progress with AI-powered grading."
					{actions}
				/>

				<!-- Real-time Status Indicator -->
				{#if dataStore.initialized && !loading}
					<div class="rounded-md bg-green-50 p-2">
						<p class="text-sm text-green-700">
							🔄 Real-time updates active • Select a classroom from the sidebar to get started
						</p>
					</div>
				{/if}

				{#if loading && !hasData}
					<LoadingSkeleton type="card" rows={3} />
				{:else if !hasData}
					<!-- No data state -->
					<Card>
						{#snippet children()}
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
										d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
									/>
								</svg>

								<h3 class="mt-2 text-sm font-medium text-gray-900">No Classroom Data Found</h3>
								<p class="mt-1 text-sm text-gray-500">
									{#if currentUser?.email}
										No classrooms found for {currentUser.email}. Import your classroom data to get
										started.
									{:else}
										Import your classroom data to get started with the dashboard.
									{/if}
								</p>
								<div class="mt-4 space-y-2">
									<Button variant="primary" onclick={dataStore.refresh}>
										{#snippet children()}
											Refresh Data
										{/snippet}
									</Button>
									<div>
										<Button variant="secondary" onclick={goToDataImport}>
											{#snippet children()}
												Import Classroom Data
											{/snippet}
										</Button>
									</div>
								</div>
							</div>
						{/snippet}
					</Card>
				{:else}
					<!-- Dashboard with data -->
					<!-- Quick Stats -->
					<StatsGrid stats={statsData} />

					<!-- Recent Activity -->
					<Card>
						{#snippet children()}
							<div class="p-6">
								<h3 class="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h3>

								{#if !recentActivity || recentActivity.length === 0}
									<p class="py-8 text-center text-sm text-gray-500">No recent activity</p>
								{:else}
									<div class="space-y-4">
										{#each recentActivity.slice(0, 10) as activity, index (index)}
											<div class="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
												{#if activity.type === 'submission'}
													<div class="flex-shrink-0">
														<svg
															class="h-5 w-5 text-blue-500"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path
																d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"
															/>
															<path d="M6 8h8M6 10h4" />
														</svg>
													</div>
													<div class="min-w-0 flex-1">
														<p class="text-sm font-medium text-gray-900">
															New submission from {activity.details.studentName}
														</p>
														<p class="text-sm text-gray-500">
															{activity.details.classroomName}
														</p>
													</div>
												{:else if activity.type === 'grade'}
													<div class="flex-shrink-0">
														<svg
															class="h-5 w-5 text-green-500"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
													</div>
													<div class="min-w-0 flex-1">
														<p class="text-sm font-medium text-gray-900">
															Assignment graded: {activity.details.score}/{activity.details
																.maxScore}
														</p>
														<p class="text-sm text-gray-500">
															{activity.details.classroomName}
														</p>
													</div>
												{/if}
												<div class="flex-shrink-0">
													<p class="text-xs text-gray-400">
														{new Date(activity.timestamp).toLocaleString()}
													</p>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/snippet}
					</Card>

					<!-- Quick Actions -->
					<Card>
						{#snippet children()}
							<div class="p-6">
								<h3 class="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
								<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
									<Button variant="outline" onclick={goToDataImport} class="justify-start">
										{#snippet children()}
											<svg
												class="mr-2 h-5 w-5"
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
											Import More Data
										{/snippet}
									</Button>
									<Button variant="outline" onclick={dataStore.refresh} class="justify-start">
										{#snippet children()}
											<svg
												class="mr-2 h-5 w-5"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
												/>
											</svg>
											Refresh All Data
										{/snippet}
									</Button>
								</div>
							</div>
						{/snippet}
					</Card>
				{/if}
			</div>
		{/if}
	</div>
</div>
