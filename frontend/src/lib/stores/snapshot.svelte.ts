/**
 * Snapshot Import store using Svelte 5 runes
 * Manages classroom snapshot import workflow, history, and diff state
 * Location: frontend/src/lib/stores/snapshot.svelte.ts
 */

import type { ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';
import { api } from '$lib/api';

// Import workflow state
let currentSnapshot = $state<ClassroomSnapshot | null>(null);
let previousSnapshot = $state<ClassroomSnapshot | null>(null);
let importFile = $state<File | null>(null);
let uploadProgress = $state<number>(0);
let importing = $state(false);
let validating = $state(false);
let error = $state<string | null>(null);

// Import history state
let importHistory = $state<SnapshotHistoryEntry[]>([]);
let loadingHistory = $state(false);

// Diff state
let diffData = $state<any>(null); // Will be jsondiffpatch result
let showDiff = $state(false);

// Types for our store
export interface SnapshotHistoryEntry {
	id: string;
	timestamp: Date;
	source: 'mock' | 'google-classroom' | 'roo-api';
	classroomCount: number;
	studentCount: number;
	assignmentCount: number;
	hasChanges: boolean;
}

export interface ImportResult {
	success: boolean;
	snapshotId?: string;
	message: string;
	errors?: string[];
}

/**
 * Set the file to be imported
 */
function setImportFile(file: File): void {
	importFile = file;
	error = null;
	uploadProgress = 0;
}

/**
 * Clear the current import session
 */
function clearImport(): void {
	currentSnapshot = null;
	previousSnapshot = null;
	importFile = null;
	uploadProgress = 0;
	importing = false;
	validating = false;
	error = null;
	diffData = null;
	showDiff = false;
}

/**
 * Validate and parse uploaded JSON file
 */
async function validateImportFile(): Promise<boolean> {
	if (!importFile) {
		error = 'No file selected';
		return false;
	}

	try {
		validating = true;
		error = null;

		// Read file content
		const fileContent = await readFileAsText(importFile);

		// Parse JSON
		let jsonData;
		try {
			jsonData = JSON.parse(fileContent);
		} catch (parseError) {
			error = 'Invalid JSON file format';
			return false;
		}

		// First validate locally against schema
		const { classroomSnapshotSchema } = await import('@shared/schemas/classroom-snapshot');
		const validation = classroomSnapshotSchema.safeParse(jsonData);
		if (!validation.success) {
			error = `Schema validation failed: ${validation.error.issues[0]?.message || 'Invalid format'}`;
			return false;
		}

		// Now validate with backend API (includes business logic validation)
		const validationResult = await api.validateSnapshot(validation.data);
		if (!validationResult.isValid) {
			error = 'Snapshot validation failed on server';
			return false;
		}

		// Set validated snapshot
		currentSnapshot = validation.data;
		uploadProgress = 100;
		return true;
	} catch (err: unknown) {
		console.error('Validation error:', err);
		error = err instanceof Error ? err.message : 'Failed to validate file';
		return false;
	} finally {
		validating = false;
	}
}

/**
 * Compare current snapshot with previous import (if any)
 */
async function generateDiff(): Promise<void> {
	if (!currentSnapshot) {
		diffData = null;
		return;
	}

	try {
		// Generate diff using backend API (compares with existing data)
		const diffResult = await api.generateSnapshotDiff(currentSnapshot);
		diffData = diffResult;
		showDiff = diffResult.hasExistingData;

		// Also generate local diff if we have a previous snapshot
		if (previousSnapshot) {
			const { create } = await import('jsondiffpatch');
			const differ = create({
				objectHash: (obj: any) => obj.id || JSON.stringify(obj),
				arrays: { detectMove: true }
			});

			const localDiff = differ.diff(previousSnapshot, currentSnapshot);
			
			// Combine API diff with local diff data
			diffData = {
				...diffResult,
				localDiff
			};
		}
	} catch (err: unknown) {
		console.error('Diff generation error:', err);
		error = 'Failed to generate diff';
	}
}

/**
 * Import the validated snapshot
 */
async function importSnapshot(): Promise<ImportResult> {
	if (!currentSnapshot) {
		return { success: false, message: 'No validated snapshot to import' };
	}

	try {
		importing = true;
		error = null;

		// Use real API to import snapshot
		const importResult = await api.importSnapshot(currentSnapshot);

		// Add to history
		const historyEntry: SnapshotHistoryEntry = {
			id: importResult.snapshotId,
			timestamp: new Date(),
			source: currentSnapshot.snapshotMetadata.source,
			classroomCount: importResult.stats.classroomsCreated + importResult.stats.classroomsUpdated,
			studentCount: importResult.stats.enrollmentsCreated + importResult.stats.enrollmentsUpdated,
			assignmentCount: importResult.stats.assignmentsCreated + importResult.stats.assignmentsUpdated,
			hasChanges: importResult.stats.classroomsCreated > 0 || importResult.stats.assignmentsCreated > 0
		};

		importHistory = [historyEntry, ...importHistory];

		// Set as previous for future diffs
		previousSnapshot = currentSnapshot;

		return {
			success: true,
			snapshotId: importResult.snapshotId,
			message: importResult.summary
		};
	} catch (err: unknown) {
		console.error('Import error:', err);
		const message = err instanceof Error ? err.message : 'Failed to import snapshot';
		error = message;
		return { success: false, message };
	} finally {
		importing = false;
	}
}

/**
 * Load import history for the current user
 */
async function loadImportHistory(): Promise<void> {
	try {
		loadingHistory = true;
		error = null;

		// Load history from API
		const historyData = await api.getImportHistory();
		
		// Transform API data to our local format
		importHistory = historyData.map(entry => ({
			id: entry.id,
			timestamp: entry.timestamp,
			source: 'roo-api' as const, // API doesn't return source currently
			classroomCount: entry.stats.classroomsCreated,
			studentCount: 0, // API doesn't return this currently
			assignmentCount: entry.stats.assignmentsCreated,
			hasChanges: entry.stats.classroomsCreated > 0 || entry.stats.assignmentsCreated > 0
		}));
	} catch (err: unknown) {
		console.error('Failed to load import history:', err);
		error = err instanceof Error ? err.message : 'Failed to load import history';
	} finally {
		loadingHistory = false;
	}
}

/**
 * Clear error state
 */
function clearError(): void {
	error = null;
}

/**
 * Helper: Read file as text
 */
function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve(e.target?.result as string);
		reader.onerror = (e) => reject(new Error('Failed to read file'));
		reader.readAsText(file);
	});
}

// Removed simulateImport function - using real API calls now

// Export reactive properties and actions (Svelte 5 style with closures)
export const snapshotStore = {
	// Reactive state accessed via getters to maintain reactivity
	get currentSnapshot() {
		return currentSnapshot;
	},
	get previousSnapshot() {
		return previousSnapshot;
	},
	get importFile() {
		return importFile;
	},
	get uploadProgress() {
		return uploadProgress;
	},
	get importing() {
		return importing;
	},
	get validating() {
		return validating;
	},
	get error() {
		return error;
	},
	get importHistory() {
		return importHistory;
	},
	get loadingHistory() {
		return loadingHistory;
	},
	get diffData() {
		return diffData;
	},
	get showDiff() {
		return showDiff;
	},

	// Actions
	setImportFile,
	clearImport,
	validateImportFile,
	generateDiff,
	importSnapshot,
	loadImportHistory,
	clearError
};
