import * as admin from "firebase-admin";
import { getFirestoreSettings, logEmulatorStatus } from "../utils/emulator";

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