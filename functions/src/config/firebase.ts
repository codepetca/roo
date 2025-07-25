import * as admin from "firebase-admin";
import { getFirestoreSettings, logEmulatorStatus, isEmulator } from "../utils/emulator";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
  logEmulatorStatus();
}

// Configure Firestore with emulator settings if applicable
const firestoreSettings = getFirestoreSettings();
if (Object.keys(firestoreSettings).length > 0) {
  admin.firestore().settings(firestoreSettings);
}

export const db = admin.firestore();
export const auth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;

// Export timestamp helper that handles emulator vs production
export function getCurrentTimestamp(): any {
  if (isEmulator()) {
    return new Date();
  }
  return FieldValue.serverTimestamp();
}

// Document sanitization functions
export function sanitizeDocument<T extends Record<string, any>>(doc: T): T {
  const sanitized: any = { ...doc };
  
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
        sanitized[key] = sanitizeDocument(value);
      }
    }
  });
  
  return sanitized as T;
}

export function sanitizeDocuments<T extends Record<string, any>>(docs: T[]): T[] {
  return docs.map(doc => sanitizeDocument(doc));
}