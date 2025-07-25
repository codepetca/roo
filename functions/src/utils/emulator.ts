/**
 * Emulator detection and configuration utilities
 * Location: functions/src/utils/emulator.ts:1
 */

/**
 * Check if the function is running in Firebase Emulator
 * Location: functions/src/utils/emulator.ts:7
 */
export function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}

/**
 * Get the appropriate Firestore settings for emulator/production
 * Location: functions/src/utils/emulator.ts:15
 */
export function getFirestoreSettings() {
  if (isEmulator()) {
    return {
      host: "localhost:8080",
      ssl: false,
    };
  }
  return {};
}

/**
 * Get the Auth emulator URL if running locally
 * Location: functions/src/utils/emulator.ts:28
 */
export function getAuthEmulatorUrl(): string | undefined {
  if (isEmulator()) {
    return "http://localhost:9099";
  }
  return undefined;
}

/**
 * Log emulator status on startup
 * Location: functions/src/utils/emulator.ts:38
 */
export function logEmulatorStatus(): void {
  if (isEmulator()) {
    console.log("🔧 Running in Firebase Emulator Suite");
    console.log("   Firestore: http://localhost:8080");
    console.log("   Auth: http://localhost:9099");
    console.log("   Functions: http://localhost:5001");
    console.log("   UI: http://localhost:4000");
  } else {
    console.log("🚀 Running in production environment");
  }
}