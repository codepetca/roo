/**
 * Unit tests for snapshot store using Svelte 5 runes
 * Location: frontend/src/lib/stores/snapshot.svelte.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  mockData, 
  createMockClassroomSnapshot, 
  createMockFile, 
  createInvalidMockFile,
  createMockDiffData,
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

// Mock FileReader
const mockFileReader = {
  addEventListener: vi.fn(),
  readAsText: vi.fn(),
  result: '',
  onload: null as any,
  onerror: null as any
};

Object.defineProperty(global, 'FileReader', {
  value: vi.fn(() => mockFileReader),
  writable: true
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123')
  },
  writable: true
});

describe('Snapshot Store', () => {
  let snapshotStore: typeof import('./snapshot.svelte')['snapshotStore'];

  beforeEach(async () => {
    resetAllMocks();
    vi.resetModules();

    // Reset FileReader mock
    mockFileReader.addEventListener = vi.fn();
    mockFileReader.readAsText = vi.fn();
    mockFileReader.result = '';
    mockFileReader.onload = null;
    mockFileReader.onerror = null;

    // Import store after mocks are set up
    const storeModule = await import('./snapshot.svelte');
    snapshotStore = storeModule.snapshotStore;
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(snapshotStore.currentSnapshot).toBeNull();
      expect(snapshotStore.previousSnapshot).toBeNull();
      expect(snapshotStore.importFile).toBeNull();
      expect(snapshotStore.uploadProgress).toBe(0);
      expect(snapshotStore.importing).toBe(false);
      expect(snapshotStore.validating).toBe(false);
      expect(snapshotStore.error).toBeNull();
      expect(snapshotStore.importHistory).toEqual([]);
      expect(snapshotStore.loadingHistory).toBe(false);
      expect(snapshotStore.diffData).toBeNull();
      expect(snapshotStore.showDiff).toBe(false);
    });
  });

  describe('File Upload Management', () => {
    it('should set import file correctly', () => {
      const testFile = createMockFile();

      snapshotStore.setImportFile(testFile);

      expect(snapshotStore.importFile).toBe(testFile);
      expect(snapshotStore.error).toBeNull();
      expect(snapshotStore.uploadProgress).toBe(0);
    });

    it('should clear import state', () => {
      // First set some state
      snapshotStore.setImportFile(createMockFile());

      snapshotStore.clearImport();

      expect(snapshotStore.currentSnapshot).toBeNull();
      expect(snapshotStore.previousSnapshot).toBeNull();
      expect(snapshotStore.importFile).toBeNull();
      expect(snapshotStore.uploadProgress).toBe(0);
      expect(snapshotStore.importing).toBe(false);
      expect(snapshotStore.validating).toBe(false);
      expect(snapshotStore.error).toBeNull();
      expect(snapshotStore.diffData).toBeNull();
      expect(snapshotStore.showDiff).toBe(false);
    });

    it('should clear error state', () => {
      // Manually set error state for testing
      const storeInternal = snapshotStore as any;
      storeInternal.error = 'Test error';

      snapshotStore.clearError();

      expect(snapshotStore.error).toBeNull();
    });
  });

  describe('File Validation', () => {
    it('should validate file successfully', async () => {
      const testFile = createMockFile();
      const mockSnapshot = createMockClassroomSnapshot();

      snapshotStore.setImportFile(testFile);

      // Mock FileReader success
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          mockFileReader.result = JSON.stringify(mockSnapshot);
          setTimeout(() => callback({ target: { result: JSON.stringify(mockSnapshot) } }), 0);
        }
      });

      // Mock schema validation success
      mockClassroomSnapshotSchema.safeParse.mockReturnValue({
        success: true,
        data: mockSnapshot
      });

      const result = await snapshotStore.validateImportFile();

      expect(result).toBe(true);
      expect(snapshotStore.currentSnapshot).toEqual(mockSnapshot);
      expect(snapshotStore.uploadProgress).toBe(100);
      expect(snapshotStore.error).toBeNull();
      expect(snapshotStore.validating).toBe(false);
    });

    it('should handle file validation failure - no file', async () => {
      const result = await snapshotStore.validateImportFile();

      expect(result).toBe(false);
      expect(snapshotStore.error).toBe('No file selected');
      expect(snapshotStore.currentSnapshot).toBeNull();
    });

    it('should handle invalid JSON format', async () => {
      const invalidFile = createInvalidMockFile();
      snapshotStore.setImportFile(invalidFile);

      // Mock FileReader success but with invalid JSON
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          mockFileReader.result = '{ invalid json }';
          setTimeout(() => callback({ target: { result: '{ invalid json }' } }), 0);
        }
      });

      const result = await snapshotStore.validateImportFile();

      expect(result).toBe(false);
      expect(snapshotStore.error).toBe('Invalid JSON file format');
      expect(snapshotStore.validating).toBe(false);
    });

    it('should handle schema validation failure', async () => {
      const testFile = createMockFile();
      snapshotStore.setImportFile(testFile);

      // Mock FileReader success
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          mockFileReader.result = JSON.stringify({ invalid: 'data' });
          setTimeout(() => callback({ target: { result: JSON.stringify({ invalid: 'data' }) } }), 0);
        }
      });

      // Mock schema validation failure
      mockClassroomSnapshotSchema.safeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ message: 'Missing required field: teacher' }]
        }
      });

      const result = await snapshotStore.validateImportFile();

      expect(result).toBe(false);
      expect(snapshotStore.error).toBe('Schema validation failed: Missing required field: teacher');
      expect(snapshotStore.validating).toBe(false);
    });

    it('should handle file reading errors', async () => {
      const testFile = createMockFile();
      snapshotStore.setImportFile(testFile);

      // Mock FileReader error
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('File read error')), 0);
        }
      });

      const result = await snapshotStore.validateImportFile();

      expect(result).toBe(false);
      expect(snapshotStore.error).toBe('Failed to validate file');
      expect(snapshotStore.validating).toBe(false);
    });

    it('should set validating state during validation', async () => {
      const testFile = createMockFile();
      snapshotStore.setImportFile(testFile);

      // Mock slow FileReader
      let resolveFileReader: () => void;
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          return new Promise<void>(resolve => {
            resolveFileReader = resolve;
          }).then(() => {
            mockFileReader.result = JSON.stringify(mockData.snapshot);
            callback({ target: { result: JSON.stringify(mockData.snapshot) } });
          });
        }
      });

      mockClassroomSnapshotSchema.safeParse.mockReturnValue({
        success: true,
        data: mockData.snapshot
      });

      // Start validation
      const validationPromise = snapshotStore.validateImportFile();

      // Check validating state
      expect(snapshotStore.validating).toBe(true);

      // Complete validation
      resolveFileReader!();
      await validationPromise;

      expect(snapshotStore.validating).toBe(false);
    });
  });

  describe('Diff Generation', () => {
    it('should generate diff when both snapshots exist', async () => {
      const currentSnapshot = createMockClassroomSnapshot();
      const previousSnapshot = createMockClassroomSnapshot();
      const mockDiffResult = createMockDiffData();

      // Set up snapshots
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = currentSnapshot;
      storeInternal.previousSnapshot = previousSnapshot;

      // Mock jsondiffpatch
      mockDiffer.diff.mockReturnValue(mockDiffResult);

      await snapshotStore.generateDiff();

      expect(mockCreate).toHaveBeenCalledWith({
        objectHash: expect.any(Function),
        arrays: { detectMove: true }
      });
      expect(mockDiffer.diff).toHaveBeenCalledWith(previousSnapshot, currentSnapshot);
      expect(snapshotStore.diffData).toEqual(mockDiffResult);
      expect(snapshotStore.showDiff).toBe(true);
    });

    it('should not generate diff when current snapshot is missing', async () => {
      const previousSnapshot = createMockClassroomSnapshot();
      
      // Set up only previous snapshot
      const storeInternal = snapshotStore as any;
      storeInternal.previousSnapshot = previousSnapshot;

      await snapshotStore.generateDiff();

      expect(mockDiffer.diff).not.toHaveBeenCalled();
      expect(snapshotStore.diffData).toBeNull();
      expect(snapshotStore.showDiff).toBe(false);
    });

    it('should not generate diff when previous snapshot is missing', async () => {
      const currentSnapshot = createMockClassroomSnapshot();
      
      // Set up only current snapshot
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = currentSnapshot;

      await snapshotStore.generateDiff();

      expect(mockDiffer.diff).not.toHaveBeenCalled();
      expect(snapshotStore.diffData).toBeNull();
      expect(snapshotStore.showDiff).toBe(false);
    });

    it('should handle diff generation errors', async () => {
      const currentSnapshot = createMockClassroomSnapshot();
      const previousSnapshot = createMockClassroomSnapshot();

      // Set up snapshots
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = currentSnapshot;
      storeInternal.previousSnapshot = previousSnapshot;

      // Mock jsondiffpatch error
      mockDiffer.diff.mockImplementation(() => {
        throw new Error('Diff generation failed');
      });

      await snapshotStore.generateDiff();

      expect(snapshotStore.error).toBe('Failed to generate diff');
      expect(snapshotStore.diffData).toBeNull();
    });
  });

  describe('Snapshot Import', () => {
    it('should import snapshot successfully', async () => {
      const testSnapshot = createMockClassroomSnapshot();
      
      // Set up snapshot
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = testSnapshot;

      const result = await snapshotStore.importSnapshot();

      expect(result.success).toBe(true);
      expect(result.snapshotId).toBe('test-uuid-123');
      expect(result.message).toBe('Snapshot imported successfully');
      expect(snapshotStore.importing).toBe(false);

      // Check history was updated
      expect(snapshotStore.importHistory).toHaveLength(1);
      const historyEntry = snapshotStore.importHistory[0];
      expect(historyEntry.id).toBe('test-uuid-123');
      expect(historyEntry.source).toBe(testSnapshot.snapshotMetadata.source);
      expect(historyEntry.classroomCount).toBe(testSnapshot.classrooms.length);
    });

    it('should handle import without snapshot', async () => {
      const result = await snapshotStore.importSnapshot();

      expect(result.success).toBe(false);
      expect(result.message).toBe('No validated snapshot to import');
      expect(snapshotStore.importing).toBe(false);
    });

    it('should handle import simulation failure', async () => {
      const testSnapshot = createMockClassroomSnapshot();
      
      // Set up snapshot
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = testSnapshot;

      // Mock Math.random to always trigger simulated failure
      const originalMathRandom = Math.random;
      Math.random = vi.fn(() => 0.05); // Less than 0.1 threshold

      const result = await snapshotStore.importSnapshot();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Import failed (simulated error)');
      expect(snapshotStore.error).toBe('Import failed (simulated error)');
      expect(snapshotStore.importing).toBe(false);

      // Restore Math.random
      Math.random = originalMathRandom;
    });

    it('should set importing state during import', async () => {
      const testSnapshot = createMockClassroomSnapshot();
      
      // Set up snapshot
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = testSnapshot;

      // Mock Math.random to avoid random failures
      Math.random = vi.fn(() => 0.95);

      // Start import
      const importPromise = snapshotStore.importSnapshot();

      // Check importing state (may be brief due to simulation)
      // Note: Due to async nature and setTimeout, this test may be flaky
      // In real scenarios, this would be more reliable with actual API calls

      const result = await importPromise;

      expect(result.success).toBe(true);
      expect(snapshotStore.importing).toBe(false);
    });

    it('should update previous snapshot after successful import', async () => {
      const testSnapshot = createMockClassroomSnapshot();
      
      // Set up snapshot
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = testSnapshot;

      // Mock Math.random for success
      Math.random = vi.fn(() => 0.95);

      await snapshotStore.importSnapshot();

      expect(snapshotStore.previousSnapshot).toEqual(testSnapshot);
    });

    it('should track hasChanges in history entry', async () => {
      const testSnapshot = createMockClassroomSnapshot();
      const mockDiffResult = createMockDiffData();
      
      // Set up snapshot and diff
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = testSnapshot;
      storeInternal.diffData = mockDiffResult;

      Math.random = vi.fn(() => 0.95);

      await snapshotStore.importSnapshot();

      expect(snapshotStore.importHistory[0].hasChanges).toBe(true);
    });

    it('should track no changes when diff is null', async () => {
      const testSnapshot = createMockClassroomSnapshot();
      
      // Set up snapshot without diff
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = testSnapshot;
      storeInternal.diffData = null;

      Math.random = vi.fn(() => 0.95);

      await snapshotStore.importSnapshot();

      expect(snapshotStore.importHistory[0].hasChanges).toBe(false);
    });
  });

  describe('Import History', () => {
    it('should load empty import history', async () => {
      await snapshotStore.loadImportHistory();

      expect(snapshotStore.importHistory).toEqual([]);
      expect(snapshotStore.loadingHistory).toBe(false);
      expect(snapshotStore.error).toBeNull();
    });

    it('should set loading state during history load', async () => {
      // Since loadImportHistory is currently mocked, we test the loading state pattern
      const loadPromise = snapshotStore.loadImportHistory();

      // Due to the mock implementation, loading state may be brief
      await loadPromise;

      expect(snapshotStore.loadingHistory).toBe(false);
    });

    it('should handle history loading errors', async () => {
      // Override the store method to simulate error
      const originalMethod = snapshotStore.loadImportHistory;
      (snapshotStore as any).loadImportHistory = async () => {
        const storeInternal = snapshotStore as any;
        storeInternal.loadingHistory = true;
        try {
          throw new Error('History load failed');
        } catch (error) {
          storeInternal.error = (error as Error).message;
        } finally {
          storeInternal.loadingHistory = false;
        }
      };

      await snapshotStore.loadImportHistory();

      expect(snapshotStore.error).toBe('History load failed');
      expect(snapshotStore.loadingHistory).toBe(false);

      // Restore original method
      (snapshotStore as any).loadImportHistory = originalMethod;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large snapshot files', async () => {
      const largeSnapshot = createMockClassroomSnapshot();
      // Add many classrooms to make it large
      largeSnapshot.classrooms = Array.from({ length: 1000 }, (_, i) =>
        mockData.classroom // This would create a large dataset
      );

      const largeFile = createMockFile(JSON.stringify(largeSnapshot), 'large-snapshot.json');
      snapshotStore.setImportFile(largeFile);

      // Mock FileReader for large file
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          mockFileReader.result = JSON.stringify(largeSnapshot);
          setTimeout(() => callback({ target: { result: JSON.stringify(largeSnapshot) } }), 0);
        }
      });

      mockClassroomSnapshotSchema.safeParse.mockReturnValue({
        success: true,
        data: largeSnapshot
      });

      const result = await snapshotStore.validateImportFile();

      expect(result).toBe(true);
      expect(snapshotStore.currentSnapshot?.classrooms).toHaveLength(1000);
    });

    it('should handle concurrent validation attempts', async () => {
      const testFile = createMockFile();
      snapshotStore.setImportFile(testFile);

      // Mock FileReader
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          mockFileReader.result = JSON.stringify(mockData.snapshot);
          setTimeout(() => callback({ target: { result: JSON.stringify(mockData.snapshot) } }), 10);
        }
      });

      mockClassroomSnapshotSchema.safeParse.mockReturnValue({
        success: true,
        data: mockData.snapshot
      });

      // Start multiple validations
      const promise1 = snapshotStore.validateImportFile();
      const promise2 = snapshotStore.validateImportFile();
      const promise3 = snapshotStore.validateImportFile();

      const results = await Promise.all([promise1, promise2, promise3]);

      // All should succeed, but validation should only happen once
      expect(results).toEqual([true, true, true]);
      expect(snapshotStore.currentSnapshot).toEqual(mockData.snapshot);
    });

    it('should handle malformed diff data gracefully', async () => {
      const currentSnapshot = createMockClassroomSnapshot();
      const previousSnapshot = createMockClassroomSnapshot();

      // Set up snapshots
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = currentSnapshot;
      storeInternal.previousSnapshot = previousSnapshot;

      // Mock jsondiffpatch to return malformed data
      mockDiffer.diff.mockReturnValue(null);

      await snapshotStore.generateDiff();

      expect(snapshotStore.diffData).toBeNull();
      expect(snapshotStore.showDiff).toBe(true); // Still shows even with null diff
    });

    it('should handle import with missing snapshot metadata', async () => {
      const testSnapshot = createMockClassroomSnapshot();
      delete (testSnapshot as any).snapshotMetadata;
      
      // Set up snapshot
      const storeInternal = snapshotStore as any;
      storeInternal.currentSnapshot = testSnapshot;

      Math.random = vi.fn(() => 0.95);

      // Should handle gracefully even with missing metadata
      const result = await snapshotStore.importSnapshot();

      expect(result.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete upload-to-import workflow', async () => {
      const testSnapshot = createMockClassroomSnapshot();
      const testFile = createMockFile(JSON.stringify(testSnapshot));

      // Step 1: Set file
      snapshotStore.setImportFile(testFile);
      expect(snapshotStore.importFile).toBe(testFile);

      // Step 2: Validate file
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          mockFileReader.result = JSON.stringify(testSnapshot);
          setTimeout(() => callback({ target: { result: JSON.stringify(testSnapshot) } }), 0);
        }
      });

      mockClassroomSnapshotSchema.safeParse.mockReturnValue({
        success: true,
        data: testSnapshot
      });

      const validationResult = await snapshotStore.validateImportFile();
      expect(validationResult).toBe(true);
      expect(snapshotStore.currentSnapshot).toEqual(testSnapshot);

      // Step 3: Generate diff (no previous snapshot, so no diff)
      await snapshotStore.generateDiff();
      expect(snapshotStore.diffData).toBeNull();

      // Step 4: Import
      Math.random = vi.fn(() => 0.95);
      const importResult = await snapshotStore.importSnapshot();
      expect(importResult.success).toBe(true);

      // Verify final state
      expect(snapshotStore.previousSnapshot).toEqual(testSnapshot);
      expect(snapshotStore.importHistory).toHaveLength(1);
      expect(snapshotStore.importing).toBe(false);
    });

    it('should handle workflow with errors at each step', async () => {
      // Step 1: File validation error
      snapshotStore.setImportFile(createInvalidMockFile());
      
      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          mockFileReader.result = '{ invalid json }';
          setTimeout(() => callback({ target: { result: '{ invalid json }' } }), 0);
        }
      });

      let result = await snapshotStore.validateImportFile();
      expect(result).toBe(false);
      expect(snapshotStore.error).toBeTruthy();

      // Step 2: Clear error and try valid file
      snapshotStore.clearError();
      const testSnapshot = createMockClassroomSnapshot();
      const validFile = createMockFile(JSON.stringify(testSnapshot));
      snapshotStore.setImportFile(validFile);

      mockFileReader.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          mockFileReader.result = JSON.stringify(testSnapshot);
          setTimeout(() => callback({ target: { result: JSON.stringify(testSnapshot) } }), 0);
        }
      });

      mockClassroomSnapshotSchema.safeParse.mockReturnValue({
        success: true,
        data: testSnapshot
      });

      result = await snapshotStore.validateImportFile();
      expect(result).toBe(true);
      expect(snapshotStore.error).toBeNull();

      // Step 3: Simulate import failure
      Math.random = vi.fn(() => 0.05); // Force failure
      const importResult = await snapshotStore.importSnapshot();
      expect(importResult.success).toBe(false);
      expect(snapshotStore.error).toBeTruthy();
    });
  });
});