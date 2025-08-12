/**
 * Snapshot store using Svelte 5 runes
 * Location: frontend/src/lib/stores/snapshot.svelte.ts
 */

import { create } from 'jsondiffpatch';
import {
	classroomSnapshotSchema,
	type ClassroomSnapshot
} from '@shared/schemas/classroom-snapshot';

// Create jsondiffpatch instance
const differ = create({
	objectHash: (obj: any) => obj?.id || obj?.name || JSON.stringify(obj)
});

// Global state using Svelte 5 runes
let currentSnapshot = $state<ClassroomSnapshot | null>(null);
let previousSnapshot = $state<ClassroomSnapshot | null>(null);
let diffData = $state<any>(null);
let loading = $state(false);
let error = $state<string | null>(null);
let uploadProgress = $state(0);

/**
 * Load snapshot from file
 */
async function loadFromFile(file: File): Promise<void> {
	loading = true;
	error = null;
	uploadProgress = 0;

	try {
		const text = await file.text();
		uploadProgress = 50;

		const data = JSON.parse(text);
		uploadProgress = 75;

		// Validate the snapshot data
		const validation = classroomSnapshotSchema.safeParse(data);
		if (!validation.success) {
			throw new Error(`Invalid snapshot format: ${validation.error.message}`);
		}

		previousSnapshot = currentSnapshot;
		currentSnapshot = validation.data;
		uploadProgress = 100;

		// Generate diff if we have a previous snapshot
		if (previousSnapshot) {
			diffData = differ.diff(previousSnapshot, currentSnapshot);
		} else {
			diffData = null;
		}

		error = null;
	} catch (err) {
		console.error('Failed to load snapshot:', err);
		error = err instanceof Error ? err.message : 'Failed to load snapshot';
		currentSnapshot = null;
		diffData = null;
		uploadProgress = 0;
	} finally {
		loading = false;
	}
}

/**
 * Compare two snapshots
 */
function compareSnapshots(snapshot1: ClassroomSnapshot, snapshot2: ClassroomSnapshot): any {
	return differ.diff(snapshot1, snapshot2);
}

/**
 * Clear current snapshot data
 */
function clearSnapshot(): void {
	previousSnapshot = currentSnapshot;
	currentSnapshot = null;
	diffData = null;
	error = null;
	uploadProgress = 0;
}

/**
 * Reset all snapshot data
 */
function resetAll(): void {
	currentSnapshot = null;
	previousSnapshot = null;
	diffData = null;
	error = null;
	uploadProgress = 0;
	loading = false;
}

/**
 * Validate snapshot data
 */
function validateSnapshot(data: unknown): {
	isValid: boolean;
	error?: string;
	snapshot?: ClassroomSnapshot;
} {
	try {
		const validation = classroomSnapshotSchema.safeParse(data);
		if (validation.success) {
			return { isValid: true, snapshot: validation.data };
		} else {
			return { isValid: false, error: validation.error.message };
		}
	} catch (err) {
		return {
			isValid: false,
			error: err instanceof Error ? err.message : 'Validation failed'
		};
	}
}

// Export store with reactive properties and actions
export const snapshotStore = {
	// Reactive state accessed via getters
	get currentSnapshot() {
		return currentSnapshot;
	},
	get previousSnapshot() {
		return previousSnapshot;
	},
	get diffData() {
		return diffData;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	get uploadProgress() {
		return uploadProgress;
	},

	// Actions
	loadFromFile,
	compareSnapshots,
	clearSnapshot,
	resetAll,
	validateSnapshot
};
