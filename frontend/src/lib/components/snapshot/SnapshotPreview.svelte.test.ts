/**
 * Component tests for SnapshotPreview with Svelte 5 runes
 * Location: frontend/src/lib/components/snapshot/SnapshotPreview.svelte.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@vitest/browser/context';
import {
	mockData,
	createMockClassroomSnapshot,
	createMockTeacher,
	createMockClassroom,
	createMockAssignment,
	resetAllMocks
} from '../../test-utils/mock-data';
import SnapshotPreview from './SnapshotPreview.svelte';
import type { ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';

// Mock UI components
vi.mock('$lib/components/ui', () => ({
	Card: vi.fn(({ children }: { children: any }) => `<div class="card">${children()}</div>`),
	Badge: vi.fn(({ children, variant, size }: any) => {
		return `<span class="badge badge-${variant} badge-${size}">${children()}</span>`;
	})
}));

describe('SnapshotPreview Component', () => {
	beforeEach(() => {
		resetAllMocks();
	});

	afterEach(() => {
		resetAllMocks();
	});

	describe('Rendering with No Snapshot', () => {
		it('should render empty state when snapshot is null', async () => {
			render(SnapshotPreview, { props: { snapshot: null } });

			expect(screen.getByText('No snapshot data available to preview')).toBeInTheDocument();
			expect(screen.queryByText('Snapshot Preview')).not.toBeInTheDocument();
		});

		it('should render empty state when snapshot is undefined', async () => {
			render(SnapshotPreview, { props: { snapshot: undefined } });

			expect(screen.getByText('No snapshot data available to preview')).toBeInTheDocument();
		});
	});

	describe('Rendering with Valid Snapshot', () => {
		let testSnapshot: ClassroomSnapshot;

		beforeEach(() => {
			testSnapshot = createMockClassroomSnapshot();
		});

		it('should render snapshot preview header', async () => {
			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('Snapshot Preview')).toBeInTheDocument();
			expect(screen.getByText(testSnapshot.snapshotMetadata.source)).toBeInTheDocument();
		});

		it('should render teacher information correctly', async () => {
			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('Teacher Information')).toBeInTheDocument();
			expect(screen.getByText(testSnapshot.teacher.name)).toBeInTheDocument();
			expect(screen.getByText(testSnapshot.teacher.email)).toBeInTheDocument();

			if (testSnapshot.teacher.displayName) {
				expect(screen.getByText(testSnapshot.teacher.displayName)).toBeInTheDocument();
			}
		});

		it('should render display name when available', async () => {
			const snapshotWithDisplayName = {
				...testSnapshot,
				teacher: {
					...testSnapshot.teacher,
					displayName: 'Professor Smith'
				}
			};

			render(SnapshotPreview, { props: { snapshot: snapshotWithDisplayName } });

			expect(screen.getByText('Display Name')).toBeInTheDocument();
			expect(screen.getByText('Professor Smith')).toBeInTheDocument();
		});

		it('should not render display name section when not available', async () => {
			const snapshotWithoutDisplayName = {
				...testSnapshot,
				teacher: {
					...testSnapshot.teacher,
					displayName: undefined
				}
			};

			render(SnapshotPreview, { props: { snapshot: snapshotWithoutDisplayName } });

			expect(screen.queryByText('Display Name')).not.toBeInTheDocument();
		});
	});

	describe('Global Statistics', () => {
		let testSnapshot: ClassroomSnapshot;

		beforeEach(() => {
			testSnapshot = createMockClassroomSnapshot({
				globalStats: {
					totalClassrooms: 3,
					totalStudents: 75,
					totalAssignments: 12,
					totalSubmissions: 45,
					ungradedSubmissions: 8,
					averageGrade: 87.5
				}
			});
		});

		it('should render overview statistics correctly', async () => {
			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('Overview Statistics')).toBeInTheDocument();
			expect(screen.getByText('3')).toBeInTheDocument(); // totalClassrooms
			expect(screen.getByText('75')).toBeInTheDocument(); // totalStudents
			expect(screen.getByText('12')).toBeInTheDocument(); // totalAssignments
			expect(screen.getByText('45')).toBeInTheDocument(); // totalSubmissions
			expect(screen.getByText('8')).toBeInTheDocument(); // ungradedSubmissions

			// Check labels
			expect(screen.getByText('Classrooms')).toBeInTheDocument();
			expect(screen.getByText('Students')).toBeInTheDocument();
			expect(screen.getByText('Assignments')).toBeInTheDocument();
			expect(screen.getByText('Submissions')).toBeInTheDocument();
			expect(screen.getByText('Ungraded')).toBeInTheDocument();
		});

		it('should render average grade when available', async () => {
			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('Average Grade: 87.5%')).toBeInTheDocument();
		});

		it('should not render average grade when undefined', async () => {
			const snapshotWithoutAverage = {
				...testSnapshot,
				globalStats: {
					...testSnapshot.globalStats,
					averageGrade: undefined
				}
			};

			render(SnapshotPreview, { props: { snapshot: snapshotWithoutAverage } });

			expect(screen.queryByText(/Average Grade:/)).not.toBeInTheDocument();
		});

		it('should apply correct CSS classes to statistics', async () => {
			const { container } = render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			// Check for colored text classes
			const classroomsValue = container.querySelector('.text-blue-600');
			expect(classroomsValue).toBeInTheDocument();
			expect(classroomsValue).toHaveTextContent('3');

			const studentsValue = container.querySelector('.text-green-600');
			expect(studentsValue).toBeInTheDocument();
			expect(studentsValue).toHaveTextContent('75');

			const assignmentsValue = container.querySelector('.text-purple-600');
			expect(assignmentsValue).toBeInTheDocument();
			expect(assignmentsValue).toHaveTextContent('12');

			const submissionsValue = container.querySelector('.text-orange-600');
			expect(submissionsValue).toBeInTheDocument();
			expect(submissionsValue).toHaveTextContent('45');

			const ungradedValue = container.querySelector('.text-red-600');
			expect(ungradedValue).toBeInTheDocument();
			expect(ungradedValue).toHaveTextContent('8');
		});
	});

	describe('Classrooms Preview', () => {
		it('should render classrooms list with details', async () => {
			const testSnapshot = createMockClassroomSnapshot();

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(
				screen.getByText(`Classrooms (${testSnapshot.classrooms.length})`)
			).toBeInTheDocument();

			// Check first classroom
			const firstClassroom = testSnapshot.classrooms[0];
			expect(screen.getByText(firstClassroom.name)).toBeInTheDocument();
			expect(
				screen.getByText(new RegExp(`${firstClassroom.studentCount} students`))
			).toBeInTheDocument();
			expect(
				screen.getByText(new RegExp(`${firstClassroom.assignments.length} assignments`))
			).toBeInTheDocument();
			expect(
				screen.getByText(new RegExp(`${firstClassroom.submissions.length} submissions`))
			).toBeInTheDocument();
		});

		it('should render classroom section when available', async () => {
			const classroomWithSection = createMockClassroom({
				section: 'Fall 2024 - Section A'
			});
			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [classroomWithSection]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('Section: Fall 2024 - Section A')).toBeInTheDocument();
		});

		it('should not render section when not available', async () => {
			const classroomWithoutSection = createMockClassroom({
				section: undefined
			});
			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [classroomWithoutSection]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.queryByText(/Section:/)).not.toBeInTheDocument();
		});

		it('should render classroom status badge', async () => {
			const activeClassroom = createMockClassroom({ courseState: 'ACTIVE' });
			const inactiveClassroom = createMockClassroom({ courseState: 'INACTIVE' });
			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [activeClassroom, inactiveClassroom]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('ACTIVE')).toBeInTheDocument();
			expect(screen.getByText('INACTIVE')).toBeInTheDocument();
		});

		it('should limit classroom preview to 5 items', async () => {
			const manyClassrooms = Array.from({ length: 8 }, (_, i) =>
				createMockClassroom({
					id: `classroom-${i}`,
					name: `Classroom ${i + 1}`
				})
			);
			const testSnapshot = createMockClassroomSnapshot({
				classrooms: manyClassrooms
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			// Should show first 5 classrooms
			expect(screen.getByText('Classroom 1')).toBeInTheDocument();
			expect(screen.getByText('Classroom 5')).toBeInTheDocument();

			// Should not show 6th classroom directly
			expect(screen.queryByText('Classroom 6')).not.toBeInTheDocument();

			// Should show "more" message
			expect(screen.getByText('... and 3 more classrooms')).toBeInTheDocument();
		});

		it('should not show more message when 5 or fewer classrooms', async () => {
			const fewClassrooms = Array.from({ length: 3 }, (_, i) =>
				createMockClassroom({
					id: `classroom-${i}`,
					name: `Classroom ${i + 1}`
				})
			);
			const testSnapshot = createMockClassroomSnapshot({
				classrooms: fewClassrooms
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.queryByText(/more classrooms/)).not.toBeInTheDocument();
		});
	});

	describe('Sample Assignments', () => {
		it('should render sample assignments when available', async () => {
			const assignmentWithStats = createMockAssignment({
				title: 'Python Fundamentals',
				status: 'published',
				type: 'assignment',
				maxScore: 100,
				submissionStats: {
					total: 25,
					submitted: 20,
					graded: 15,
					pending: 5
				}
			});

			const classroomWithAssignments = createMockClassroom({
				name: 'CS 101',
				assignments: [assignmentWithStats]
			});

			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [classroomWithAssignments]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('Sample Assignments')).toBeInTheDocument();
			expect(screen.getByText('Python Fundamentals')).toBeInTheDocument();
			expect(screen.getByText(new RegExp('CS 101'))).toBeInTheDocument();
			expect(screen.getByText(new RegExp('Max Score: 100'))).toBeInTheDocument();
			expect(screen.getByText(new RegExp('25 submissions'))).toBeInTheDocument();
		});

		it('should not render sample assignments section when no assignments exist', async () => {
			const classroomWithoutAssignments = createMockClassroom({
				assignments: []
			});

			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [classroomWithoutAssignments]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.queryByText('Sample Assignments')).not.toBeInTheDocument();
		});

		it('should render assignment status badges correctly', async () => {
			const publishedAssignment = createMockAssignment({
				title: 'Published Assignment',
				status: 'published',
				type: 'assignment'
			});

			const draftAssignment = createMockAssignment({
				id: 'draft-assignment',
				title: 'Draft Assignment',
				status: 'draft',
				type: 'quiz'
			});

			const classroomWithAssignments = createMockClassroom({
				assignments: [publishedAssignment, draftAssignment]
			});

			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [classroomWithAssignments]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('published')).toBeInTheDocument();
			expect(screen.getByText('draft')).toBeInTheDocument();
			expect(screen.getByText('assignment')).toBeInTheDocument();
			expect(screen.getByText('quiz')).toBeInTheDocument();
		});

		it('should handle assignments without submission stats', async () => {
			const assignmentWithoutStats = createMockAssignment({
				title: 'No Stats Assignment',
				submissionStats: undefined
			});

			const classroomWithAssignments = createMockClassroom({
				assignments: [assignmentWithoutStats]
			});

			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [classroomWithAssignments]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('No Stats Assignment')).toBeInTheDocument();
			expect(screen.getByText(new RegExp('0 submissions'))).toBeInTheDocument();
		});

		it('should limit assignments preview to 5 items', async () => {
			const manyAssignments = Array.from({ length: 8 }, (_, i) =>
				createMockAssignment({
					id: `assignment-${i}`,
					title: `Assignment ${i + 1}`
				})
			);

			const classroomWithManyAssignments = createMockClassroom({
				assignments: manyAssignments
			});

			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [classroomWithManyAssignments]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			// Should show first 5 assignments
			expect(screen.getByText('Assignment 1')).toBeInTheDocument();
			expect(screen.getByText('Assignment 5')).toBeInTheDocument();

			// Should not show 6th assignment
			expect(screen.queryByText('Assignment 6')).not.toBeInTheDocument();
		});

		it('should not render assignment type badge when type is not available', async () => {
			const assignmentWithoutType = createMockAssignment({
				title: 'No Type Assignment',
				type: undefined
			});

			const classroomWithAssignments = createMockClassroom({
				assignments: [assignmentWithoutType]
			});

			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [classroomWithAssignments]
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('No Type Assignment')).toBeInTheDocument();

			// Should only have one badge (status), not type
			const badges = screen.getAllByText(/published|draft|assignment|quiz/);
			expect(badges).toHaveLength(1); // Only status badge
		});
	});

	describe('Snapshot Metadata', () => {
		it('should render snapshot metadata correctly', async () => {
			const testSnapshot = createMockClassroomSnapshot();

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('Snapshot Metadata')).toBeInTheDocument();
			expect(screen.getByText('Fetched At')).toBeInTheDocument();
			expect(screen.getByText('Expires At')).toBeInTheDocument();
			expect(screen.getByText('Source')).toBeInTheDocument();
			expect(screen.getByText('Version')).toBeInTheDocument();

			// Check that dates are formatted
			expect(
				screen.getByText(new Date(testSnapshot.snapshotMetadata.fetchedAt).toLocaleString())
			).toBeInTheDocument();
			expect(
				screen.getByText(new Date(testSnapshot.snapshotMetadata.expiresAt).toLocaleString())
			).toBeInTheDocument();

			expect(screen.getByText(testSnapshot.snapshotMetadata.source)).toBeInTheDocument();
			expect(screen.getByText(testSnapshot.snapshotMetadata.version)).toBeInTheDocument();
		});
	});

	describe('Badge Variants', () => {
		it('should use correct badge variant for google-classroom source', async () => {
			const testSnapshot = createMockClassroomSnapshot({
				snapshotMetadata: {
					...createMockClassroomSnapshot().snapshotMetadata,
					source: 'google-classroom'
				}
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('google-classroom')).toBeInTheDocument();
		});

		it('should use correct badge variant for roo-api source', async () => {
			const testSnapshot = createMockClassroomSnapshot({
				snapshotMetadata: {
					...createMockClassroomSnapshot().snapshotMetadata,
					source: 'roo-api'
				}
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('roo-api')).toBeInTheDocument();
		});

		it('should use correct badge variant for mock source', async () => {
			const testSnapshot = createMockClassroomSnapshot({
				snapshotMetadata: {
					...createMockClassroomSnapshot().snapshotMetadata,
					source: 'mock'
				}
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('mock')).toBeInTheDocument();
		});

		it('should use default badge variant for unknown source', async () => {
			const testSnapshot = createMockClassroomSnapshot({
				snapshotMetadata: {
					...createMockClassroomSnapshot().snapshotMetadata,
					source: 'unknown-source' as any
				}
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('unknown-source')).toBeInTheDocument();
		});
	});

	describe('Date Formatting', () => {
		it('should format dates correctly', async () => {
			const testDate = '2024-01-15T10:30:00.000Z';
			const expectedFormatted = new Date(testDate).toLocaleString();

			const testSnapshot = createMockClassroomSnapshot({
				snapshotMetadata: {
					fetchedAt: testDate,
					expiresAt: testDate,
					source: 'mock',
					version: '1.0.0'
				}
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			const formattedDates = screen.getAllByText(expectedFormatted);
			expect(formattedDates).toHaveLength(2); // fetchedAt and expiresAt
		});
	});

	describe('Edge Cases', () => {
		it('should handle snapshot with empty classrooms array', async () => {
			const testSnapshot = createMockClassroomSnapshot({
				classrooms: [],
				globalStats: {
					totalClassrooms: 0,
					totalStudents: 0,
					totalAssignments: 0,
					totalSubmissions: 0,
					ungradedSubmissions: 0,
					averageGrade: 0
				}
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('Classrooms (0)')).toBeInTheDocument();
			expect(screen.getByText('0')).toBeInTheDocument(); // For all stats
			expect(screen.queryByText('Sample Assignments')).not.toBeInTheDocument();
		});

		it('should handle snapshot with malformed data gracefully', async () => {
			const testSnapshot = {
				...createMockClassroomSnapshot(),
				teacher: {
					...createMockTeacher(),
					name: undefined as any,
					email: undefined as any
				}
			};

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			// Should still render the component structure
			expect(screen.getByText('Teacher Information')).toBeInTheDocument();
			expect(screen.getByText('Overview Statistics')).toBeInTheDocument();
		});

		it('should handle very large numbers in statistics', async () => {
			const testSnapshot = createMockClassroomSnapshot({
				globalStats: {
					totalClassrooms: 9999,
					totalStudents: 1234567,
					totalAssignments: 99999,
					totalSubmissions: 5555555,
					ungradedSubmissions: 888888,
					averageGrade: 95.7
				}
			});

			render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			expect(screen.getByText('9999')).toBeInTheDocument();
			expect(screen.getByText('1234567')).toBeInTheDocument();
			expect(screen.getByText('99999')).toBeInTheDocument();
			expect(screen.getByText('5555555')).toBeInTheDocument();
			expect(screen.getByText('888888')).toBeInTheDocument();
			expect(screen.getByText('Average Grade: 95.7%')).toBeInTheDocument();
		});
	});

	describe('Component Structure', () => {
		it('should render all major sections in correct order', async () => {
			const testSnapshot = createMockClassroomSnapshot();
			const { container } = render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			const sections = container.querySelectorAll('.card');
			expect(sections).toHaveLength(5); // Teacher, Stats, Classrooms, Assignments, Metadata

			// Check the order by looking at text content
			expect(sections[0]).toHaveTextContent('Teacher Information');
			expect(sections[1]).toHaveTextContent('Overview Statistics');
			expect(sections[2]).toHaveTextContent('Classrooms');
			expect(sections[3]).toHaveTextContent('Sample Assignments');
			expect(sections[4]).toHaveTextContent('Snapshot Metadata');
		});

		it('should maintain responsive grid layouts', async () => {
			const testSnapshot = createMockClassroomSnapshot();
			const { container } = render(SnapshotPreview, { props: { snapshot: testSnapshot } });

			// Check for grid classes
			const gridElements = container.querySelectorAll('.grid');
			expect(gridElements.length).toBeGreaterThan(0);

			// Check for responsive classes
			const responsiveElements = container.querySelectorAll('.sm\\:grid-cols-2, .sm\\:grid-cols-5');
			expect(responsiveElements.length).toBeGreaterThan(0);
		});
	});
});
