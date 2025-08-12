/**
 * Fixed component tests for SnapshotPreview with Svelte 5 runes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SnapshotPreview from './SnapshotPreview.svelte';
import type { ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';

// Mock UI components with actual Svelte components
vi.mock('$lib/components/ui', async () => {
	const Card = await import('../__mocks__/Card.svelte');
	const Badge = await import('../__mocks__/Badge.svelte');

	return {
		Card: Card.default,
		Badge: Badge.default
	};
});

// Create a simple mock snapshot that matches the actual ClassroomSnapshot schema
const createMockSnapshot = (): ClassroomSnapshot => ({
	teacher: {
		name: 'John Doe',
		email: 'john@example.com'
	},
	classrooms: [
		{
			id: 'class-1',
			name: 'CS 101',
			enrollmentCode: 'ABC123',
			courseState: 'ACTIVE' as const,
			creationTime: '2024-01-01T00:00:00Z',
			updateTime: '2024-01-01T00:00:00Z',
			alternateLink: 'https://classroom.google.com/c/123',
			studentCount: 2,
			assignmentCount: 1,
			totalSubmissions: 0,
			ungradedSubmissions: 0,
			ownerId: 'teacher-1',
			students: [],
			assignments: [],
			submissions: []
		}
	],
	globalStats: {
		totalClassrooms: 1,
		totalStudents: 2,
		totalAssignments: 1,
		totalSubmissions: 0,
		ungradedSubmissions: 0
	},
	snapshotMetadata: {
		fetchedAt: '2024-01-01T00:00:00Z',
		expiresAt: '2024-01-01T01:00:00Z',
		source: 'mock',
		version: '1.0.0'
	}
});

describe('SnapshotPreview Component (Fixed)', () => {
	let mockSnapshot: ClassroomSnapshot;

	beforeEach(() => {
		mockSnapshot = createMockSnapshot();
	});

	describe('Basic Rendering', () => {
		it('should render with valid snapshot data', async () => {
			const screen = render(SnapshotPreview, {
				props: { snapshot: mockSnapshot }
			});

			// Should render title header
			expect(screen.getByText('Snapshot Preview')).toBeInTheDocument();
		});

		it('should display teacher information', async () => {
			const screen = render(SnapshotPreview, {
				props: { snapshot: mockSnapshot }
			});

			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('john@example.com')).toBeInTheDocument();
		});

		it('should display classroom information', async () => {
			const screen = render(SnapshotPreview, {
				props: { snapshot: mockSnapshot }
			});

			expect(screen.getByText('CS 101')).toBeInTheDocument();
		});

		it('should display overview statistics', async () => {
			const screen = render(SnapshotPreview, {
				props: { snapshot: mockSnapshot }
			});

			// Look for the actual section title from the DOM output
			expect(screen.getByText('Overview Statistics')).toBeInTheDocument();
			// Check for specific content that is less ambiguous
			expect(screen.getByText('Teacher Information')).toBeInTheDocument();
			expect(screen.getByText('Snapshot Metadata')).toBeInTheDocument();
		});

		it('should handle component without snapshot prop', async () => {
			// Should not throw error when snapshot is undefined
			const screen = render(SnapshotPreview, { props: {} });
			expect(screen.getByTestId('card')).toBeInTheDocument();
		});
	});
});
