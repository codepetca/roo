/**
 * Data Adapters - Normalize data from different Firebase sources
 * Location: frontend/src/lib/data/adapters.ts
 *
 * Provides consistent data transformation regardless of source:
 * - HTTP API responses (with sendApiResponse wrapper)
 * - Firebase Functions Callable results
 * - Raw Firestore document data
 * - Real-time listener snapshots
 */

import type {
	DocumentSnapshot,
	DocumentChange,
	QueryDocumentSnapshot,
	HttpsCallableResult
} from 'firebase/firestore';
import { z } from 'zod';

/**
 * Standard API response format from backend endpoints
 */
export interface ApiResponse<T> {
	success: boolean;
	data: T;
	error?: string;
	message?: string;
}

/**
 * Data adapter for normalizing different Firebase data sources
 */
export class DataAdapter {
	/**
	 * Normalize HTTP API responses that use sendApiResponse wrapper
	 * @param response - API response with { success, data, error? } format
	 * @param schema - Optional Zod schema for validation
	 * @returns Unwrapped, normalized, and validated data
	 * @throws Error if response indicates failure or validation fails
	 */
	static fromApiResponse<T>(response: ApiResponse<any>, schema?: z.ZodType<T>): T {
		this.validateApiResponse(response);

		if (!response.success) {
			const error = response.error || 'API request failed';
			throw new Error(error);
		}

		if (response.data === null || response.data === undefined) {
			throw new Error('API response missing data field');
		}

		// Normalize timestamps in the data
		let normalizedData = this.normalizeTimestamps(response.data);

		// Apply field mapping transformations
		normalizedData = this.applyFieldMapping(normalizedData);

		// Validate against schema if provided
		if (schema) {
			try {
				return schema.parse(normalizedData);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const errorMessages = error.issues
						.map((issue) => `Field "${issue.path.join('.')}": ${issue.message}`)
						.join(', ');
					console.error('❌ DataAdapter: Schema validation failed:', errorMessages);
					console.error('Data received:', normalizedData);
					throw new Error(`Schema validation failed: ${errorMessages}`);
				}
				throw error;
			}
		}

		return normalizedData as T;
	}

	/**
	 * Normalize Firebase Functions Callable results
	 * @param result - Callable function result
	 * @returns Unwrapped data
	 */
	static fromCallableResult<T>(result: HttpsCallableResult<T>): T {
		return result.data;
	}

	/**
	 * Normalize raw Firestore document data
	 * @param doc - Firestore document snapshot or mock object
	 * @param schema - Optional Zod schema for validation
	 * @returns Document data with normalized fields and validation
	 * @throws Error if document doesn't exist or has no data
	 */
	static fromFirestoreDoc<T>(doc: any, schema?: z.ZodType<T>): T {
		this.validateFirestoreDoc(doc);

		// Handle both real Firestore docs and test mocks
		const exists = typeof doc.exists === 'function' ? doc.exists() : doc.exists;

		if (!exists) {
			throw new Error('Document does not exist');
		}

		// Get data from either real doc or mock
		const data = typeof doc.data === 'function' ? doc.data() : doc.data;

		if (data === null || data === undefined) {
			throw new Error('Document data is null or undefined');
		}

		// Add the document ID to the data
		const dataWithId = { ...data, id: doc.id };

		// Normalize timestamps
		let normalizedData = this.normalizeTimestamps(dataWithId);

		// Apply field mapping transformations
		normalizedData = this.applyFieldMapping(normalizedData);

		// Validate against schema if provided
		if (schema) {
			try {
				return schema.parse(normalizedData);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const errorMessages = error.issues
						.map((issue) => `Field "${issue.path.join('.')}": ${issue.message}`)
						.join(', ');
					console.error('❌ DataAdapter: Firestore schema validation failed:', errorMessages);
					console.error('Data received:', normalizedData);
					throw new Error(`Firestore schema validation failed: ${errorMessages}`);
				}
				throw error;
			}
		}

		return normalizedData as T;
	}

	/**
	 * Normalize real-time listener document changes
	 * @param change - Document change from onSnapshot
	 * @returns Document data with id field
	 */
	static fromDocumentChange<T>(change: DocumentChange): T & { id: string } {
		return {
			id: change.doc.id,
			...change.doc.data()
		} as T & { id: string };
	}

	/**
	 * Normalize query document snapshot (for collections)
	 * @param doc - Query document snapshot
	 * @returns Document data with id field
	 */
	static fromQueryDoc<T>(doc: QueryDocumentSnapshot): T & { id: string } {
		return {
			id: doc.id,
			...doc.data()
		} as T & { id: string };
	}

	/**
	 * Batch normalize array of query documents
	 * @param docs - Array of query document snapshots
	 * @returns Array of normalized documents with id fields
	 */
	static fromQueryDocs<T>(docs: QueryDocumentSnapshot[]): (T & { id: string })[] {
		return docs.map((doc) => this.fromQueryDoc<T>(doc));
	}

	/**
	 * Normalize real-time listener data (raw objects from onSnapshot)
	 * @param data - Raw data from real-time listeners
	 * @returns Normalized data
	 * @throws Error if data is null or undefined
	 */
	static fromRealtimeData<T>(data: any): T {
		if (data === null || data === undefined) {
			throw new Error('Real-time data is null or undefined');
		}

		// For non-objects, return as-is
		if (typeof data !== 'object') {
			throw new Error('Real-time data must be an object or array');
		}

		// Normalize timestamps if it's an object
		if (Array.isArray(data)) {
			return data.map((item) =>
				typeof item === 'object' ? this.normalizeTimestamps(item) : item
			) as T;
		}

		return this.normalizeTimestamps(data) as T;
	}

	/**
	 * Handle potential double-wrapped API responses
	 * Some endpoints may incorrectly double-wrap data
	 * @param response - Potentially double-wrapped response
	 * @returns Properly unwrapped data
	 */
	static fromPotentiallyWrappedResponse<T>(response: any): T {
		// Handle standard API response
		if (response && typeof response === 'object' && 'success' in response) {
			return this.fromApiResponse<T>(response);
		}

		// Handle direct data (no wrapper)
		return response as T;
	}

	/**
	 * Validate input for API response adapter
	 * @param response - Input to validate
	 * @throws Error if input is invalid
	 */
	private static validateApiResponse(response: any): void {
		if (!response || typeof response !== 'object') {
			throw new Error('Invalid API response: must be an object');
		}
		if (!('success' in response)) {
			throw new Error('Invalid API response: missing success field');
		}
	}

	/**
	 * Validate input for Firestore document adapter
	 * @param doc - Input to validate
	 * @throws Error if input is invalid
	 */
	private static validateFirestoreDoc(doc: any): void {
		if (!doc || typeof doc !== 'object') {
			throw new Error('Invalid Firestore document: must be an object');
		}
		if (!('exists' in doc)) {
			throw new Error('Invalid Firestore document: missing exists field');
		}
	}

	/**
	 * Safely extract data with error handling and logging
	 * @param source - Data source identifier for logging
	 * @param extractor - Function that extracts data
	 * @returns Extracted data or null on error
	 */
	static safeExtract<T>(source: string, extractor: () => T): T | null {
		try {
			const result = extractor();
			console.debug(`✅ Data extracted from ${source}:`, result);
			return result;
		} catch (error) {
			console.error(`❌ Failed to extract data from ${source}:`, error);
			return null;
		}
	}

	/**
	 * Apply field mapping transformations for common API/schema mismatches
	 * @param obj - Object to transform
	 * @returns Object with field mappings applied
	 */
	static applyFieldMapping<T>(obj: any): T {
		if (!obj || typeof obj !== 'object') {
			return obj;
		}

		const mapped: any = { ...obj };

		// Map 'id' to 'uid' if 'uid' is missing but 'id' exists
		if ('id' in mapped && !('uid' in mapped)) {
			mapped.uid = mapped.id;
		}

		// Add default values for missing versioning fields (for backward compatibility)
		if (!('version' in mapped)) {
			mapped.version = 1;
		}

		if (!('isLatest' in mapped)) {
			mapped.isLatest = true;
		}

		return mapped as T;
	}

	/**
	 * Transform Firestore timestamp objects to JavaScript dates
	 * @param obj - Object that may contain Firestore timestamps
	 * @returns Object with timestamps converted to dates
	 */
	static normalizeTimestamps<T>(obj: any): T {
		if (!obj || typeof obj !== 'object') {
			return obj;
		}

		const normalized: any = { ...obj };

		// Convert Firestore timestamp objects to dates
		Object.keys(normalized).forEach((key) => {
			const value = normalized[key];

			// Check for Firestore timestamp format
			if (value && typeof value === 'object') {
				if ('_seconds' in value && '_nanoseconds' in value) {
					// Firestore timestamp format
					normalized[key] = new Date(value._seconds * 1000 + value._nanoseconds / 1000000);
				} else if ('seconds' in value && 'nanoseconds' in value) {
					// Alternative timestamp format
					normalized[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
				} else if (value.toDate && typeof value.toDate === 'function') {
					// Firestore Timestamp object
					normalized[key] = value.toDate();
				}
			}
		});

		return normalized as T;
	}
}

/**
 * Convenience functions for common operations
 */
export const adapt = {
	/** Extract data from API response */
	api: <T>(response: ApiResponse<T>) => DataAdapter.fromApiResponse(response),

	/** Extract data from callable result */
	callable: <T>(result: HttpsCallableResult<T>) => DataAdapter.fromCallableResult(result),

	/** Extract data from Firestore document */
	doc: <T>(doc: DocumentSnapshot) => DataAdapter.fromFirestoreDoc<T>(doc),

	/** Extract data from document change */
	change: <T>(change: DocumentChange) => DataAdapter.fromDocumentChange<T>(change),

	/** Extract data from query documents */
	query: <T>(docs: QueryDocumentSnapshot[]) => DataAdapter.fromQueryDocs<T>(docs),

	/** Extract data from real-time listeners */
	realtime: <T>(data: any) => DataAdapter.fromRealtimeData<T>(data),

	/** Normalize timestamps in object */
	timestamps: <T>(obj: any) => DataAdapter.normalizeTimestamps<T>(obj)
};
