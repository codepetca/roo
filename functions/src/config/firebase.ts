import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getFirestoreSettings, logEmulatorStatus, isEmulator, getAuthEmulatorUrl } from "../utils/emulator";

// Configure Auth emulator BEFORE using Firebase Admin
if (isEmulator()) {
  const authEmulatorUrl = getAuthEmulatorUrl();
  if (authEmulatorUrl) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
  }
}

// Get instances using the default app (initialized in index.ts)
export const db = getFirestore();
export const FieldValue = admin.firestore.FieldValue;

// Service Account Configuration
export const SERVICE_ACCOUNT_EMAIL = "firebase-adminsdk-fbsvc@roo-app-3d24e.iam.gserviceaccount.com";

// Export timestamp helper that handles emulator vs production
export function getCurrentTimestamp(): admin.firestore.Timestamp | admin.firestore.FieldValue {
  if (isEmulator()) {
    return admin.firestore.Timestamp.now();
  }
  return FieldValue.serverTimestamp();
}

// Document sanitization functions
export function sanitizeDocument<T extends Record<string, unknown>>(doc: T): T {
  const sanitized: Record<string, unknown> = { ...doc };
  
  // Convert Firestore Timestamps to serializable format
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    if (value && typeof value === "object") {
      if (value instanceof admin.firestore.Timestamp) {
        sanitized[key] = {
          _seconds: value.seconds,
          _nanoseconds: value.nanoseconds
        };
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === "object" ? sanitizeDocument(item) : item
        );
      } else if (typeof value === "object") {
        sanitized[key] = sanitizeDocument(value as Record<string, unknown>);
      }
    }
  });
  
  return sanitized as T;
}

export function sanitizeDocuments<T extends Record<string, unknown>>(docs: T[]): T[] {
  return docs.map(doc => sanitizeDocument(doc));
}

// Convert timestamp objects back to Firestore Timestamps
export function convertTimestampObject(timestampObj: any): admin.firestore.Timestamp | undefined {
  if (!timestampObj || typeof timestampObj !== "object") return undefined;
  
  if (timestampObj instanceof admin.firestore.Timestamp) {
    return timestampObj;
  }
  
  if ("_seconds" in timestampObj) {
    const seconds = timestampObj._seconds;
    const nanoseconds = timestampObj._nanoseconds || 0;
    return new admin.firestore.Timestamp(seconds, nanoseconds);
  }
  
  return undefined;
}