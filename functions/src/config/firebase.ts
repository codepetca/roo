import * as admin from "firebase-admin";
import { getFirestore, FieldPath as AdminFieldPath } from "firebase-admin/firestore";
import { getFirestoreSettings, logEmulatorStatus, isEmulator, getAuthEmulatorUrl } from "../utils/emulator";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Configure emulators BEFORE using Firebase Admin
if (isEmulator()) {
  console.log('🔍 DEBUG: Emulator environment detected');
  
  // Ensure Firestore emulator connection
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    console.log('🔍 DEBUG: Set FIRESTORE_EMULATOR_HOST to localhost:8080');
  }
  
  // Ensure Auth emulator connection
  const authEmulatorUrl = getAuthEmulatorUrl();
  if (authEmulatorUrl && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
    console.log('🔍 DEBUG: Set FIREBASE_AUTH_EMULATOR_HOST to localhost:9099');
  }
  
  console.log('🔧 Firebase Admin SDK configured for emulators');
  console.log(`   Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`   Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
} else {
  console.log('🚀 Production environment detected - using Firebase services');
}

// Initialize Firestore directly with proper emulator detection
export const db = getFirestore();

// Safe access to FieldValue that handles initialization
export const FieldValue = {
  get serverTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp;
  },
  get delete() {
    return admin.firestore.FieldValue.delete;
  },
  get arrayUnion() {
    return admin.firestore.FieldValue.arrayUnion;
  },
  get arrayRemove() {
    return admin.firestore.FieldValue.arrayRemove;
  },
  get increment() {
    return admin.firestore.FieldValue.increment;
  }
};

// Safe access to FieldPath that handles initialization
export const FieldPath = {
  get documentId() {
    // Debug the FieldPath access issue in emulators
    if (isEmulator()) {
      console.log('🔍 DEBUG: Accessing FieldPath.documentId in emulator');
      console.log('🔍 DEBUG: AdminFieldPath:', !!AdminFieldPath);
      console.log('🔍 DEBUG: AdminFieldPath.documentId:', !!AdminFieldPath?.documentId);
      console.log('🔍 DEBUG: admin.firestore.FieldPath:', !!admin.firestore.FieldPath);
    }
    // Use the properly imported AdminFieldPath instead of admin.firestore.FieldPath
    return AdminFieldPath.documentId();
  }
};

// Service Account Configuration
export const SERVICE_ACCOUNT_EMAIL = "firebase-adminsdk-fbsvc@roo-app-3d24e.iam.gserviceaccount.com";

// Export timestamp helper that handles emulator vs production
export function getCurrentTimestamp(): any {
  // In emulator environment, use Date objects to avoid Firebase Admin compilation issues
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return new Date();
  }
  // Use the FieldValue from the proper import for production
  return admin.firestore.FieldValue.serverTimestamp();
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