/**
 * Centralized timestamp handling for Firebase Firestore
 * Location: functions/src/utils/timestamps.ts
 * 
 * This module provides standardized timestamp handling across the entire codebase
 * to solve Firebase timestamp conversion issues once and for all.
 */

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { isEmulator } from "./emulator";

// ============================================
// Core Timestamp Types
// ============================================

/**
 * Standard timestamp type used throughout the application
 * Always represents a point in time, never a placeholder
 */
export type AppTimestamp = admin.firestore.Timestamp;

/**
 * Serialized timestamp format for API responses
 * Matches the existing SerializedTimestamp type
 */
export interface SerializedTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

/**
 * Raw timestamp data that might come from Firestore
 */
export type FirestoreTimestampData = 
  | admin.firestore.Timestamp 
  | admin.firestore.FieldValue 
  | SerializedTimestamp
  | Date
  | string
  | number
  | null
  | undefined;

// ============================================
// Timestamp Creation (for writes)
// ============================================

/**
 * Get current timestamp for writing to Firestore
 * Handles emulator vs production differences
 */
export function getCurrentTimestamp(): admin.firestore.Timestamp | admin.firestore.FieldValue {
  if (isEmulator()) {
    return admin.firestore.Timestamp.now();
  }
  return FieldValue.serverTimestamp();
}

/**
 * Create timestamp from Date object for writing to Firestore
 */
export function createTimestamp(date: Date): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * Create timestamp from ISO string for writing to Firestore
 */
export function createTimestampFromISO(isoString: string): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(isoString));
}

// ============================================
// Timestamp Conversion (for reads)
// ============================================

/**
 * Convert any timestamp-like value to a standard AppTimestamp
 * Returns null if conversion fails
 * 
 * This is the ONE function to use for all timestamp conversions
 */
export function toAppTimestamp(value: FirestoreTimestampData): AppTimestamp | null {
  if (!value) return null;

  // Already a Timestamp
  if (value instanceof admin.firestore.Timestamp) {
    return value;
  }

  // FieldValue (shouldn't happen in reads, but handle gracefully)
  if (value instanceof admin.firestore.FieldValue) {
    return null; // Cannot convert FieldValue to timestamp
  }

  // Serialized timestamp object
  if (typeof value === 'object' && '_seconds' in value) {
    const obj = value as SerializedTimestamp;
    if (typeof obj._seconds === 'number') {
      return new admin.firestore.Timestamp(obj._seconds, obj._nanoseconds || 0);
    }
  }

  // Date object
  if (value instanceof Date) {
    return admin.firestore.Timestamp.fromDate(value);
  }

  // ISO string
  if (typeof value === 'string') {
    try {
      return admin.firestore.Timestamp.fromDate(new Date(value));
    } catch {
      return null;
    }
  }

  // Unix timestamp (number)
  if (typeof value === 'number') {
    try {
      return admin.firestore.Timestamp.fromMillis(value);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Convert AppTimestamp to serialized format for API responses
 */
export function toSerializedTimestamp(timestamp: AppTimestamp): SerializedTimestamp {
  return {
    _seconds: timestamp.seconds,
    _nanoseconds: timestamp.nanoseconds
  };
}

/**
 * Convert AppTimestamp to Date object
 */
export function toDate(timestamp: AppTimestamp): Date {
  return timestamp.toDate();
}

/**
 * Convert AppTimestamp to ISO string
 */
export function toISOString(timestamp: AppTimestamp): string {
  return timestamp.toDate().toISOString();
}

// ============================================
// Document Processing
// ============================================

/**
 * Process a Firestore document to ensure all timestamp fields are properly converted
 * This should be called on every document read from Firestore
 * 
 * @param doc Raw document data from Firestore
 * @param timestampFields Array of field names that should be treated as timestamps
 * @returns Document with properly converted timestamps
 */
export function processDocumentTimestamps<T extends Record<string, any>>(
  doc: T, 
  timestampFields: string[] = ['createdAt', 'updatedAt', 'dueDate', 'submittedAt', 'gradedAt']
): T {
  const processed = { ...doc } as any;

  for (const field of timestampFields) {
    if (field in processed) {
      const converted = toAppTimestamp(processed[field]);
      if (converted) {
        processed[field] = converted;
      } else {
        // Remove invalid timestamp fields rather than crash
        delete processed[field];
      }
    }
  }

  return processed as T;
}

/**
 * Process multiple documents
 */
export function processDocumentsTimestamps<T extends Record<string, any>>(
  docs: T[], 
  timestampFields?: string[]
): T[] {
  return docs.map(doc => processDocumentTimestamps(doc, timestampFields));
}

/**
 * Prepare document for API response by converting timestamps to serialized format
 */
export function serializeDocumentTimestamps<T extends Record<string, any>>(
  doc: T,
  timestampFields: string[] = ['createdAt', 'updatedAt', 'dueDate', 'submittedAt', 'gradedAt']
): T {
  const serialized = { ...doc } as any;

  for (const field of timestampFields) {
    if (field in serialized && serialized[field] instanceof admin.firestore.Timestamp) {
      serialized[field] = toSerializedTimestamp(serialized[field] as AppTimestamp);
    }
  }

  return serialized as T;
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Check if a value is a valid timestamp
 */
export function isValidTimestamp(value: any): value is AppTimestamp {
  return value instanceof admin.firestore.Timestamp;
}

/**
 * Check if a value is a serialized timestamp
 */
export function isSerializedTimestamp(value: any): value is SerializedTimestamp {
  return typeof value === 'object' && 
         value !== null && 
         typeof value._seconds === 'number' && 
         typeof value._nanoseconds === 'number';
}

// ============================================
// Migration/Compatibility
// ============================================

/**
 * Legacy compatibility function - use toAppTimestamp instead
 * @deprecated Use toAppTimestamp instead
 */
export function convertTimestampObject(timestampObj: any): admin.firestore.Timestamp | undefined {
  const result = toAppTimestamp(timestampObj);
  return result || undefined;
}