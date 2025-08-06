<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { teacherDashboardStore } from '$lib/stores';
	import { Button, Alert, Card } from '$lib/components/ui';
	import {
		PageHeader,
		LoadingSkeleton
	} from '$lib/components/dashboard';
	import StudentResetManager from '$lib/components/auth/StudentResetManager.svelte';

	// Handle classroom selection
	function handleClassroomSelect(classroomId: string) {
		teacherDashboardStore.selectClassroom(classroomId);
	}

	// Handle assignment view
	function handleViewAssignment(assignmentId: string) {
		window.location.href = `/dashboard/teacher/assignments/${assignmentId}`;
	}

	// Navigate to data import
	function goToDataImport() {
		goto('/teacher/data-import');
	}

	// Load dashboard data on mount
	onMount(async () => {
		console.log('🚀 Teacher dashboard mounted');
		await teacherDashboardStore.loadDashboard();
	});
</script>

{#snippet actions()}
	<div class="flex gap-2">
		<Button variant="secondary" onclick={goToDataImport}>
			{#snippet children()}
				Import Data
			{/snippet}
		</Button>
		<Button variant="primary" onclick={teacherDashboardStore.refresh} loading={teacherDashboardStore.loading}>
			{#snippet children()}
				Refresh
			{/snippet}
		</Button>
	</div>
{/snippet}

<div class="space-y-6">
	<!-- Page Header -->
	<PageHeader
		title="Teacher Dashboard"
		description="Manage assignments, review submissions, and track student progress with AI-powered grading."
		{actions}
	/>

	<!-- Error State -->
	{#if teacherDashboardStore.error}
		<Alert
			variant="error"
			title="Error loading dashboard"
			dismissible
			onDismiss={teacherDashboardStore.clearError}
		>
			{#snippet children()}
				{teacherDashboardStore.error}
				<div class="mt-3">
					<Button variant="secondary" size="sm" onclick={teacherDashboardStore.refresh}>
						{#snippet children()}
							Try Again
						{/snippet}
					</Button>
				</div>
			{/snippet}
		</Alert>
	{/if}

	<!-- Loading State -->
	{#if teacherDashboardStore.loading}
		<LoadingSkeleton type="card" rows={3} />
	{:else if !teacherDashboardStore.dashboardData}
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
					<h3 class="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
					<p class="mt-1 text-sm text-gray-500">
						Import your classroom data to get started with the dashboard.
					</p>
					<div class="mt-4">
						<Button variant="primary" onclick={goToDataImport}>
							{#snippet children()}
								Import Classroom Data
							{/snippet}
						</Button>
					</div>
				</div>
			{/snippet}
		</Card>
	{:else}
		<!-- Dashboard with data -->
		{@const stats = teacherDashboardStore.quickStats}
		
		<!-- Quick Stats -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg
							class="h-8 w-8 text-blue-600"
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
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Assignments</p>
						<p class="text-2xl font-semibold text-gray-900">{stats?.totalAssignments || 0}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
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
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Students</p>
						<p class="text-2xl font-semibold text-gray-900">{stats?.totalStudents || 0}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg
							class="h-8 w-8 text-orange-600"
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
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Pending Review</p>
						<p class="text-2xl font-semibold text-gray-900">{stats?.ungradedSubmissions || 0}</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg
							class="h-8 w-8 text-purple-600"
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
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Average Grade</p>
						<p class="text-2xl font-semibold text-gray-900">
							{stats?.averageGrade ? `${stats.averageGrade.toFixed(1)}%` : 'N/A'}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Classrooms Grid -->
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="border-b border-gray-200 px-6 py-4">
				<h3 class="text-lg font-semibold text-gray-900">Your Classrooms</h3>
				<p class="text-sm text-gray-600">Manage assignments and track progress across your classes</p>
			</div>
			<div class="p-6">
				{#if teacherDashboardStore.classrooms.length === 0}
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
						<h3 class="mt-2 text-sm font-medium text-gray-900">No classrooms found</h3>
						<p class="mt-1 text-sm text-gray-500">
							Import your classroom data to see your classes here.
						</p>
						<div class="mt-4">
							<Button variant="primary" onclick={goToDataImport}>
								{#snippet children()}
									Import Data
								{/snippet}
							</Button>
						</div>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
						{#each teacherDashboardStore.classrooms as classroom (classroom.id)}
							<div class="rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors cursor-pointer"
								 onclick={() => handleClassroomSelect(classroom.id)}>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<h4 class="text-lg font-semibold text-gray-900">{classroom.name}</h4>
										{#if classroom.section}
											<p class="text-sm text-gray-600">{classroom.section}</p>
										{/if}
									</div>
									<div class="ml-4 flex-shrink-0">
										{#if classroom.ungradedSubmissions > 0}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
												{classroom.ungradedSubmissions} pending
											</span>
										{:else}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
												Up to date
											</span>
										{/if}
									</div>
								</div>
								
								<div class="mt-4 grid grid-cols-3 gap-4 text-center">
									<div>
										<p class="text-2xl font-semibold text-gray-900">{classroom.studentCount}</p>
										<p class="text-xs text-gray-600">Students</p>
									</div>
									<div>
										<p class="text-2xl font-semibold text-gray-900">{classroom.assignmentCount}</p>
										<p class="text-xs text-gray-600">Assignments</p>
									</div>
									<div>
										<p class="text-2xl font-semibold text-gray-900">{classroom.activeSubmissions}</p>
										<p class="text-xs text-gray-600">Submissions</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="border-b border-gray-200 px-6 py-4">
				<h3 class="text-lg font-semibold text-gray-900">Recent Activity</h3>
				<p class="text-sm text-gray-600">Latest submissions and grades across all your classes</p>
			</div>
			<div class="p-6">
				{#if teacherDashboardStore.recentActivity.length === 0}
					<p class="text-sm text-gray-500 text-center py-8">No recent activity</p>
				{:else}
					<div class="space-y-4">
						{#each teacherDashboardStore.recentActivity.slice(0, 10) as activity (activity.timestamp)}
							<div class="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
								{#if activity.type === 'submission'}
									<div class="flex-shrink-0">
										<svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
											<path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
											<path d="M6 8h8M6 10h4"/>
										</svg>
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-900">
											New submission from {activity.details.studentName}
										</p>
										<p class="text-sm text-gray-500">
											{activity.details.classroomName}
										</p>
									</div>
								{:else if activity.type === 'grade'}
									<div class="flex-shrink-0">
										<svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
											<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
										</svg>
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-900">
											Assignment graded: {activity.details.score}/{activity.details.maxScore}
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
		</div>

		<!-- Student Management -->
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="border-b border-gray-200 px-6 py-4">
				<h3 class="text-lg font-semibold text-gray-900">Student Management</h3>
				<p class="text-sm text-gray-600">Help students with login issues and account access</p>
			</div>
			<div class="p-6">
				<StudentResetManager />
			</div>
		</div>
	{/if}
</div>
