/**
 * Type converters between Firebase Admin types and serializable types
 * Used to convert between backend Firebase types and frontend-safe types
 */

import * as admin from "firebase-admin";
import { SerializedTimestamp } from "./types";

/**
 * Convert Firebase Timestamp to serializable format
 */
export function serializeTimestamp(timestamp: admin.firestore.Timestamp | Date): SerializedTimestamp {
  if (timestamp instanceof Date) {
    return {
      _seconds: Math.floor(timestamp.getTime() / 1000),
      _nanoseconds: (timestamp.getTime() % 1000) * 1000000
    };
  }
  return {
    _seconds: timestamp.seconds,
    _nanoseconds: timestamp.nanoseconds
  };
}

/**
 * Convert serializable timestamp to Date
 */
export function deserializeTimestamp(timestamp: SerializedTimestamp): Date {
  return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
}

/**
 * Convert ISO string to Firebase Timestamp
 */
export function isoToTimestamp(isoString: string): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(isoString));
}

/**
 * Convert Firebase Timestamp to ISO string
 */
export function timestampToISO(timestamp: admin.firestore.Timestamp | SerializedTimestamp): string {
  if ("seconds" in timestamp) {
    // Firebase Timestamp
    return timestamp.toDate().toISOString();
  } else {
    // SerializedTimestamp
    return deserializeTimestamp(timestamp).toISOString();
  }
}

/**
 * Get current timestamp based on environment
 */
export function getCurrentTimestamp(): admin.firestore.Timestamp | Date {
  // Check if running in emulator
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" || 
                     process.env.FIRESTORE_EMULATOR_HOST !== undefined;
  
  if (isEmulator) {
    return new Date();
  }
  return admin.firestore.FieldValue.serverTimestamp() as any;
}

/**
 * Strip Firebase-specific fields from documents for API responses
 */
export function sanitizeDocument<T extends Record<string, any>>(doc: T): T {
  const sanitized: any = { ...doc };
  
  // Convert Firestore Timestamps
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    if (value && typeof value === "object") {
      if (value instanceof admin.firestore.Timestamp) {
        sanitized[key] = serializeTimestamp(value);
      } else if (value.constructor && value.constructor.name === "Timestamp") {
        // Handle cases where instanceof doesn't work
        sanitized[key] = serializeTimestamp(value);
      } else if (value._seconds !== undefined && value._nanoseconds !== undefined) {
        // Already serialized, leave as is
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === "object" ? sanitizeDocument(item) : item
        );
      } else if (typeof value === "object") {
        sanitized[key] = sanitizeDocument(value);
      }
    }
  });
  
  return sanitized as T;
}

/**
 * Convert array of Firestore documents to API-safe format
 */
export function sanitizeDocuments<T extends Record<string, any>>(docs: T[]): T[] {
  return docs.map(doc => sanitizeDocument(doc));
}