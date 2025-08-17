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
import { 
	normalizeWithSchema,
	safeNormalizeWithSchema,
	normalizeTimestamps as sharedNormalizeTimestamps
} from '../../../shared/utils/normalization';

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
	 * Normalize raw Firestore document data with enhanced schema normalization
	 * @param doc - Firestore document snapshot or mock object
	 * @param schema - Optional Zod schema for validation and normalization
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

		// If schema is provided, use shared schema-driven normalization
		if (schema) {
			try {
				return normalizeWithSchema(data, schema, doc.id);
			} catch (error) {
				console.error('❌ DataAdapter: Schema-driven normalization failed:', error);
				// Fallback to manual normalization
			}
		}

		// Fallback: Manual normalization for backward compatibility
		// Add the document ID to the data
		const dataWithId = { ...data, id: doc.id };

		// Normalize timestamps using shared utility
		let normalizedData = sharedNormalizeTimestamps(dataWithId);

		// Apply field mapping transformations
		normalizedData = this.applyFieldMapping(normalizedData);

		// Final schema validation without normalization
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
			console.debug('🔧 DataAdapter: Mapping id → uid for compatibility');
			mapped.uid = mapped.id;
		}

		// Ensure displayName exists (common missing field)
		if (!('displayName' in mapped) && 'email' in mapped) {
			console.debug('🔧 DataAdapter: Generating displayName from email');
			mapped.displayName = mapped.email.split('@')[0];
		}

		// Add default values for missing versioning fields (for backward compatibility)
		if (!('version' in mapped)) {
			console.debug('🔧 DataAdapter: Adding default version = 1');
			mapped.version = 1;
		}

		if (!('isLatest' in mapped)) {
			console.debug('🔧 DataAdapter: Adding default isLatest = true');
			mapped.isLatest = true;
		}

		// Ensure timestamps are dates (not strings)
		if ('createdAt' in mapped && typeof mapped.createdAt === 'string') {
			mapped.createdAt = new Date(mapped.createdAt);
		}
		if ('updatedAt' in mapped && typeof mapped.updatedAt === 'string') {
			mapped.updatedAt = new Date(mapped.updatedAt);
		}
		if ('lastLogin' in mapped && typeof mapped.lastLogin === 'string') {
			mapped.lastLogin = new Date(mapped.lastLogin);
		}

		return mapped as T;
	}

	/**
	 * Transform Firestore timestamp objects to JavaScript dates
	 * @param obj - Object that may contain Firestore timestamps
	 * @returns Object with timestamps converted to dates
	 */
	static normalizeTimestamps<T>(obj: any): T {
		// Use shared normalization utility for consistency
		return sharedNormalizeTimestamps(obj);
	}

	/**
	 * Normalize raw data using Zod schema with enhanced field defaulting
	 * Solves Firestore's undefined values limitation by adding missing fields
	 * @param rawData - Raw data (may have missing fields)
	 * @param schema - Zod schema defining expected structure
	 * @param docId - Optional document ID to add to the data
	 * @returns Normalized data with all schema fields present
	 */
	static withSchema<T>(rawData: any, schema: z.ZodType<T>, docId?: string): T {
		return normalizeWithSchema(rawData, schema, docId);
	}

	/**
	 * Safely normalize data with schema, returning null on error
	 * @param rawData - Raw data to normalize
	 * @param schema - Zod schema for validation
	 * @param docId - Optional document ID
	 * @returns Normalized data or null on error
	 */
	static safeWithSchema<T>(rawData: any, schema: z.ZodType<T>, docId?: string): T | null {
		return safeNormalizeWithSchema(rawData, schema, docId);
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
	timestamps: <T>(obj: any) => DataAdapter.normalizeTimestamps<T>(obj),

	/** Normalize raw data with schema-driven field defaulting */
	schema: <T>(rawData: any, schema: z.ZodType<T>, docId?: string) => DataAdapter.withSchema(rawData, schema, docId),

	/** Safely normalize data with schema, returning null on error */
	safeSchema: <T>(rawData: any, schema: z.ZodType<T>, docId?: string) => DataAdapter.safeWithSchema(rawData, schema, docId)
};
