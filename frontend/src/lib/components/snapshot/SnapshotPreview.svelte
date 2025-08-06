<script lang="ts">
	import type { ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';
	import { Card, Badge } from '$lib/components/ui';

	// Props
	let { snapshot }: { snapshot: ClassroomSnapshot | null } = $props();

	// Helper function to format date
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString();
	}

	// Helper function to get source badge variant
	function getSourceVariant(source: string) {
		switch (source) {
			case 'google-classroom':
				return 'info';
			case 'roo-api':
				return 'success';
			case 'mock':
				return 'warning';
			default:
				return 'default';
		}
	}
</script>

{#if snapshot}
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900">Snapshot Preview</h3>
			<Badge variant={getSourceVariant(snapshot.snapshotMetadata.source)} size="sm">
				{#snippet children()}
					{snapshot.snapshotMetadata.source}
				{/snippet}
			</Badge>
		</div>

		<!-- Teacher Information -->
		<Card>
			{#snippet children()}
				<div class="space-y-4">
					<h4 class="font-medium text-gray-900">Teacher Information</h4>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<dt class="text-sm font-medium text-gray-500">Name</dt>
							<dd class="mt-1 text-sm text-gray-900">{snapshot.teacher.name}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500">Email</dt>
							<dd class="mt-1 text-sm text-gray-900">{snapshot.teacher.email}</dd>
						</div>
						{#if snapshot.teacher.displayName}
							<div>
								<dt class="text-sm font-medium text-gray-500">Display Name</dt>
								<dd class="mt-1 text-sm text-gray-900">{snapshot.teacher.displayName}</dd>
							</div>
						{/if}
					</div>
				</div>
			{/snippet}
		</Card>

		<!-- Global Statistics -->
		<Card>
			{#snippet children()}
				<div class="space-y-4">
					<h4 class="font-medium text-gray-900">Overview Statistics</h4>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
						<div class="text-center">
							<div class="text-2xl font-semibold text-blue-600">
								{snapshot.globalStats.totalClassrooms}
							</div>
							<div class="text-sm text-gray-500">Classrooms</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-semibold text-green-600">
								{snapshot.globalStats.totalStudents}
							</div>
							<div class="text-sm text-gray-500">Students</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-semibold text-purple-600">
								{snapshot.globalStats.totalAssignments}
							</div>
							<div class="text-sm text-gray-500">Assignments</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-semibold text-orange-600">
								{snapshot.globalStats.totalSubmissions}
							</div>
							<div class="text-sm text-gray-500">Submissions</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-semibold text-red-600">
								{snapshot.globalStats.ungradedSubmissions}
							</div>
							<div class="text-sm text-gray-500">Ungraded</div>
						</div>
					</div>
					{#if snapshot.globalStats.averageGrade !== undefined}
						<div class="text-center">
							<div class="text-lg font-medium text-gray-900">
								Average Grade: {snapshot.globalStats.averageGrade.toFixed(1)}%
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
		</Card>

		<!-- Classrooms Preview -->
		<Card>
			{#snippet children()}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h4 class="font-medium text-gray-900">Classrooms ({snapshot.classrooms.length})</h4>
					</div>
					<div class="space-y-3">
						{#each snapshot.classrooms.slice(0, 5) as classroom (classroom.id)}
							<div
								class="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
							>
								<div class="flex-1">
									<div class="font-medium text-gray-900">{classroom.name}</div>
									<div class="text-sm text-gray-500">
										{classroom.studentCount} students •
										{classroom.assignments.length} assignments •
										{classroom.submissions.length} submissions
									</div>
									{#if classroom.section}
										<div class="text-xs text-gray-400">Section: {classroom.section}</div>
									{/if}
								</div>
								<div class="flex items-center space-x-2">
									<Badge
										variant={classroom.courseState === 'ACTIVE' ? 'success' : 'default'}
										size="sm"
									>
										{#snippet children()}
											{classroom.courseState}
										{/snippet}
									</Badge>
								</div>
							</div>
						{/each}
						{#if snapshot.classrooms.length > 5}
							<div class="text-center text-sm text-gray-500">
								... and {snapshot.classrooms.length - 5} more classrooms
							</div>
						{/if}
					</div>
				</div>
			{/snippet}
		</Card>

		<!-- Sample Assignments -->
		{#if snapshot.classrooms.some((c) => c.assignments.length > 0)}
			<Card>
				{#snippet children()}
					<div class="space-y-4">
						<h4 class="font-medium text-gray-900">Sample Assignments</h4>
						<div class="space-y-3">
							{#each snapshot.classrooms
								.flatMap((c) => c.assignments.map((a) => ({ ...a, classroomName: c.name })))
								.slice(0, 5) as assignment}
								<div
									class="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
								>
									<div class="flex-1">
										<div class="font-medium text-gray-900">{assignment.title}</div>
										<div class="text-sm text-gray-500">
											{assignment.classroomName} • Max Score: {assignment.maxScore} •
											{assignment.submissionStats?.total || 0} submissions
										</div>
									</div>
									<div class="flex items-center space-x-2">
										<Badge
											variant={assignment.status === 'published'
												? 'success'
												: assignment.status === 'draft'
													? 'warning'
													: 'default'}
											size="sm"
										>
											{#snippet children()}
												{assignment.status}
											{/snippet}
										</Badge>
										{#if assignment.type}
											<Badge variant="info" size="sm">
												{#snippet children()}
													{assignment.type}
												{/snippet}
											</Badge>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/snippet}
			</Card>
		{/if}

		<!-- Snapshot Metadata -->
		<Card>
			{#snippet children()}
				<div class="space-y-4">
					<h4 class="font-medium text-gray-900">Snapshot Metadata</h4>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<dt class="text-sm font-medium text-gray-500">Fetched At</dt>
							<dd class="mt-1 text-sm text-gray-900">
								{formatDate(snapshot.snapshotMetadata.fetchedAt)}
							</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500">Expires At</dt>
							<dd class="mt-1 text-sm text-gray-900">
								{formatDate(snapshot.snapshotMetadata.expiresAt)}
							</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500">Source</dt>
							<dd class="mt-1 text-sm text-gray-900">{snapshot.snapshotMetadata.source}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-gray-500">Version</dt>
							<dd class="mt-1 text-sm text-gray-900">{snapshot.snapshotMetadata.version}</dd>
						</div>
					</div>
				</div>
			{/snippet}
		</Card>
	</div>
{:else}
	<Card>
		{#snippet children()}
			<div class="py-8 text-center">
				<div class="text-sm text-gray-400">No snapshot data available to preview</div>
			</div>
		{/snippet}
	</Card>
{/if}
