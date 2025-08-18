/**
 * Unit tests for snapshot store using Svelte 5 runes
 * Location: frontend/src/lib/stores/snapshot.svelte.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	mockData,
	createMockClassroomSnapshot,
	createMockFile,
	resetAllMocks
} from '../test-utils/mock-data';
import type { ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';

// Mock jsondiffpatch
const mockDiffer = {
	diff: vi.fn()
};

const mockCreate = vi.fn(() => mockDiffer);

vi.mock('jsondiffpatch', () => ({
	create: mockCreate
}));

// Mock classroom snapshot schema
const mockClassroomSnapshotSchema = {
	safeParse: vi.fn()
};

vi.mock('@shared/schemas/classroom-snapshot', () => ({
	classroomSnapshotSchema: mockClassroomSnapshotSchema
}));

describe('Snapshot Store', () => {
	let snapshotStore: (typeof import('./snapshot.svelte'))['snapshotStore'];

	beforeEach(async () => {
		vi.clearAllMocks();
		resetAllMocks();

		// Reset schema mock to successful validation by default
		mockClassroomSnapshotSchema.safeParse.mockReturnValue({
			success: true,
			data: createMockClassroomSnapshot()
		});

		// Import store after mocks are set up
		const storeModule = await import('./snapshot.svelte');
		snapshotStore = storeModule.snapshotStore;

		// Reset store state
		snapshotStore.resetAll();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Initial State', () => {
		it('should have correct initial state', () => {
			expect(snapshotStore.currentSnapshot).toBeNull();
			expect(snapshotStore.previousSnapshot).toBeNull();
			expect(snapshotStore.diffData).toBeNull();
			expect(snapshotStore.loading).toBe(false);
			expect(snapshotStore.error).toBeNull();
			expect(snapshotStore.uploadProgress).toBe(0);
		});
	});

	describe('File Loading', () => {
		it('should load valid snapshot file successfully', async () => {
			const mockSnapshot = createMockClassroomSnapshot();
			const testFile = createMockFile(JSON.stringify(mockSnapshot));

			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: true,
				data: mockSnapshot
			});

			await snapshotStore.loadFromFile(testFile);

			expect(snapshotStore.currentSnapshot).toEqual(mockSnapshot);
			expect(snapshotStore.error).toBeNull();
			expect(snapshotStore.loading).toBe(false);
			expect(snapshotStore.uploadProgress).toBe(100);
		});

		it('should handle invalid JSON format', async () => {
			const invalidFile = createMockFile('{ invalid json }');

			await snapshotStore.loadFromFile(invalidFile);

			expect(snapshotStore.currentSnapshot).toBeNull();
			expect(snapshotStore.error).toBeTruthy(); // JSON parse error message may vary
			expect(snapshotStore.loading).toBe(false);
			expect(snapshotStore.uploadProgress).toBe(0);
		});

		it('should handle schema validation failure', async () => {
			const invalidSnapshot = { invalid: 'data' };
			const testFile = createMockFile(JSON.stringify(invalidSnapshot));

			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: false,
				error: { message: 'Schema validation failed' }
			});

			await snapshotStore.loadFromFile(testFile);

			expect(snapshotStore.currentSnapshot).toBeNull();
			expect(snapshotStore.error).toContain('Invalid snapshot format');
			expect(snapshotStore.loading).toBe(false);
		});

		it('should set loading state during file processing', async () => {
			const mockSnapshot = createMockClassroomSnapshot();
			const testFile = createMockFile(JSON.stringify(mockSnapshot));

			// Mock slow file reading
			const originalText = testFile.text;
			testFile.text = vi
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(() => resolve(originalText.call(testFile)), 50))
				);

			const loadPromise = snapshotStore.loadFromFile(testFile);

			// Check loading state is true during processing
			expect(snapshotStore.loading).toBe(true);
			expect(snapshotStore.error).toBeNull();

			await loadPromise;

			expect(snapshotStore.loading).toBe(false);
		});

		it('should update upload progress during file processing', async () => {
			const mockSnapshot = createMockClassroomSnapshot();
			const testFile = createMockFile(JSON.stringify(mockSnapshot));

			await snapshotStore.loadFromFile(testFile);

			// Progress should reach 100% on successful load
			expect(snapshotStore.uploadProgress).toBe(100);
		});
	});

	describe('Snapshot Management', () => {
		it('should preserve previous snapshot when loading new one', async () => {
			const firstSnapshot = createMockClassroomSnapshot();
			const secondSnapshot = {
				...createMockClassroomSnapshot(),
				teacher: { ...firstSnapshot.teacher, name: 'Different Teacher' }
			};

			// Load first snapshot
			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: true,
				data: firstSnapshot
			});
			await snapshotStore.loadFromFile(createMockFile(JSON.stringify(firstSnapshot)));

			// Load second snapshot
			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: true,
				data: secondSnapshot
			});
			await snapshotStore.loadFromFile(createMockFile(JSON.stringify(secondSnapshot)));

			expect(snapshotStore.previousSnapshot).toEqual(firstSnapshot);
			expect(snapshotStore.currentSnapshot).toEqual(secondSnapshot);
		});

		it('should clear current snapshot', () => {
			const mockSnapshot = createMockClassroomSnapshot();

			// Manually set current snapshot (simulating loaded state)
			snapshotStore.loadFromFile(createMockFile(JSON.stringify(mockSnapshot)));

			snapshotStore.clearSnapshot();

			expect(snapshotStore.currentSnapshot).toBeNull();
			expect(snapshotStore.diffData).toBeNull();
			expect(snapshotStore.error).toBeNull();
			expect(snapshotStore.uploadProgress).toBe(0);
		});

		it('should reset all snapshot data', () => {
			// Set some state first
			snapshotStore.loadFromFile(createMockFile(JSON.stringify(createMockClassroomSnapshot())));

			snapshotStore.resetAll();

			expect(snapshotStore.currentSnapshot).toBeNull();
			expect(snapshotStore.previousSnapshot).toBeNull();
			expect(snapshotStore.diffData).toBeNull();
			expect(snapshotStore.error).toBeNull();
			expect(snapshotStore.uploadProgress).toBe(0);
			expect(snapshotStore.loading).toBe(false);
		});
	});

	describe('Diff Generation', () => {
		it('should generate diff when both snapshots exist', async () => {
			const firstSnapshot = createMockClassroomSnapshot();
			const secondSnapshot = {
				...createMockClassroomSnapshot(),
				teacher: { ...firstSnapshot.teacher, name: 'Updated Teacher' }
			};
			const mockDiffResult = { teacher: { name: ['Original Teacher', 'Updated Teacher'] } };

			mockDiffer.diff.mockReturnValue(mockDiffResult);

			// Load first snapshot
			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: true,
				data: firstSnapshot
			});
			await snapshotStore.loadFromFile(createMockFile(JSON.stringify(firstSnapshot)));

			// Load second snapshot (should generate diff)
			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: true,
				data: secondSnapshot
			});
			await snapshotStore.loadFromFile(createMockFile(JSON.stringify(secondSnapshot)));

			expect(mockDiffer.diff).toHaveBeenCalledWith(firstSnapshot, secondSnapshot);
			expect(snapshotStore.diffData).toEqual(mockDiffResult);
		});

		it('should not generate diff when no previous snapshot exists', async () => {
			const mockSnapshot = createMockClassroomSnapshot();

			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: true,
				data: mockSnapshot
			});
			await snapshotStore.loadFromFile(createMockFile(JSON.stringify(mockSnapshot)));

			expect(mockDiffer.diff).not.toHaveBeenCalled();
			expect(snapshotStore.diffData).toBeNull();
		});

		it('should compare snapshots directly', () => {
			const snapshot1 = createMockClassroomSnapshot();
			const snapshot2 = {
				...createMockClassroomSnapshot(),
				teacher: { ...snapshot1.teacher, name: 'Different' }
			};
			const mockDiffResult = { teacher: { name: ['Original', 'Different'] } };

			mockDiffer.diff.mockReturnValue(mockDiffResult);

			const result = snapshotStore.compareSnapshots(snapshot1, snapshot2);

			expect(mockDiffer.diff).toHaveBeenCalledWith(snapshot1, snapshot2);
			expect(result).toEqual(mockDiffResult);
		});
	});

	describe('Validation Utility', () => {
		it('should validate correct snapshot data', () => {
			const validSnapshot = createMockClassroomSnapshot();

			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: true,
				data: validSnapshot
			});

			const result = snapshotStore.validateSnapshot(validSnapshot);

			expect(result.isValid).toBe(true);
			expect(result.snapshot).toEqual(validSnapshot);
			expect(result.error).toBeUndefined();
		});

		it('should identify invalid snapshot data', () => {
			const invalidData = { invalid: 'snapshot' };

			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: false,
				error: { message: 'Invalid schema' }
			});

			const result = snapshotStore.validateSnapshot(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Invalid schema');
			expect(result.snapshot).toBeUndefined();
		});

		it('should handle validation exceptions', () => {
			const invalidData = { test: 'data' };

			mockClassroomSnapshotSchema.safeParse.mockImplementation(() => {
				throw new Error('Parse error');
			});

			const result = snapshotStore.validateSnapshot(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Parse error');
		});
	});

	describe('Error Handling', () => {
		it('should handle file reading errors gracefully', async () => {
			const errorFile = createMockFile('valid json');
			errorFile.text = vi.fn().mockRejectedValue(new Error('File read error'));

			await snapshotStore.loadFromFile(errorFile);

			expect(snapshotStore.error).toBe('File read error'); // Error matches the thrown error message
			expect(snapshotStore.loading).toBe(false);
			expect(snapshotStore.currentSnapshot).toBeNull();
		});

		it('should reset error state on successful load', async () => {
			const mockSnapshot = createMockClassroomSnapshot();

			// First, set an error state
			const errorFile = createMockFile('invalid json');
			await snapshotStore.loadFromFile(errorFile);
			expect(snapshotStore.error).toBeTruthy();

			// Then load a valid file
			mockClassroomSnapshotSchema.safeParse.mockReturnValue({
				success: true,
				data: mockSnapshot
			});
			const validFile = createMockFile(JSON.stringify(mockSnapshot));
			await snapshotStore.loadFromFile(validFile);

			expect(snapshotStore.error).toBeNull();
			expect(snapshotStore.currentSnapshot).toEqual(mockSnapshot);
		});
	});
});
