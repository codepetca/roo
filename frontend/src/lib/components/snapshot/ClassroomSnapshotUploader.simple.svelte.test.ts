/**
 * Simplified component tests for ClassroomSnapshotUploader with Svelte 5 runes
 * This is a working version to demonstrate the pattern for other component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ClassroomSnapshotUploader from './ClassroomSnapshotUploader.svelte';

// Mock UI components with actual Svelte components
vi.mock('$lib/components/ui', async () => {
	const Card = await import('../__mocks__/Card.svelte');
	const Button = await import('../__mocks__/Button.svelte');
	const Badge = await import('../__mocks__/Badge.svelte');

	return {
		Card: Card.default,
		Button: Button.default,
		Badge: Badge.default
	};
});

describe('ClassroomSnapshotUploader Component (Simplified)', () => {
	let mockOnValidated: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnValidated = vi.fn();
	});

	describe('Basic Rendering', () => {
		it('should render the component with default upload state', async () => {
			const screen = render(ClassroomSnapshotUploader, {
				props: { onValidated: mockOnValidated }
			});

			// Test that key elements are present
			expect(screen.getByText('Import Classroom Snapshot')).toBeInTheDocument();
			expect(screen.getByText('Drop your snapshot file here')).toBeInTheDocument();
			expect(screen.getByText('or click to browse')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument();
		});

		it('should render helper text', async () => {
			const screen = render(ClassroomSnapshotUploader, {
				props: { onValidated: mockOnValidated }
			});

			expect(
				screen.getByText('Accepts JSON files exported from Google Sheets')
			).toBeInTheDocument();
		});

		it('should render hidden file input with correct attributes', async () => {
			const screen = render(ClassroomSnapshotUploader, {
				props: { onValidated: mockOnValidated }
			});

			const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
			expect(fileInput).toHaveAttribute('type', 'file');
			expect(fileInput).toHaveAttribute('accept', '.json,application/json');
			expect(fileInput).toHaveClass('hidden');
		});

		it('should handle component without onValidated callback', async () => {
			// Should not throw error when onValidated is undefined
			const screen = render(ClassroomSnapshotUploader, { props: {} });
			expect(screen.getByText('Import Classroom Snapshot')).toBeInTheDocument();
		});
	});

	describe('Component Structure', () => {
		it('should render within Card component', async () => {
			const screen = render(ClassroomSnapshotUploader, {
				props: { onValidated: mockOnValidated }
			});

			// Check that the mock card is rendered
			expect(screen.getByTestId('card')).toBeInTheDocument();
		});

		it('should render browse button with correct attributes', async () => {
			const screen = render(ClassroomSnapshotUploader, {
				props: { onValidated: mockOnValidated }
			});

			// The mock button renders with data-testid="button"
			const button = screen.getByTestId('button');
			expect(button).toBeInTheDocument();
			expect(button).toHaveTextContent('Browse Files');
		});
	});
});
