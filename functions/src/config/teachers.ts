/**
 * Teacher configuration for Google Sheets access
 * Location: functions/src/config/teachers.ts:1
 */

import { logger } from "firebase-functions";
import { db, getCurrentTimestamp } from "./firebase";
import { createSheetsService } from "../services/sheets";
import { serializeTimestamp } from "../schemas/transformers";
import type { TeacherConfiguration, SheetVerificationResult, SerializedTimestamp } from "../../../shared/types";

export interface TeacherConfig {
  email: string;
  name: string;
  spreadsheetId: string;
  classroomId?: string;
}

/**
 * Get teacher configuration from environment variables
 * Expected format: TEACHER_SHEETS_CONFIG='{"teacher1@school.com":"sheet-id-1","teacher2@school.com":"sheet-id-2"}'
 */
function getTeacherSheetsFromEnv(): Record<string, string> {
  const config = process.env.TEACHER_SHEETS_CONFIG;

  if (!config) {
    logger.warn("TEACHER_SHEETS_CONFIG environment variable not set");
    return {};
  }

  try {
    return JSON.parse(config);
  } catch (error) {
    logger.error("Failed to parse TEACHER_SHEETS_CONFIG", { error, config });
    return {};
  }
}

/**
 * Get the primary teacher email for board testing
 * This should be the real board account, not a test account
 */
export function getPrimaryTeacherEmail(): string {
  const config = getTeacherSheetsConfig();
  const emails = Object.keys(config);

  // Return the first configured teacher email, or fall back to environment variable
  if (emails.length > 0) {
    // Prefer @gapps.yrdsb.ca domain emails (real board accounts)
    const boardEmail = emails.find((email) => email.endsWith("@gapps.yrdsb.ca"));
    if (boardEmail) return boardEmail;

    // Otherwise return the first configured email
    return emails[0];
  }

  // Fallback to environment variable if no config found
  return process.env.VITE_TEST_TEACHER_BOARD_EMAIL || "teacher@example.com";
}

/**
 * Default fallback configuration for development
 * Uses real board account instead of test accounts
 */
const DEFAULT_CONFIG: Record<string, string> = {
  // Will be populated with real board account if environment is configured
};

/**
 * Get all configured teacher sheets from both environment and Firestore
 */
export async function getTeacherSheetsConfig(): Promise<Record<string, string>> {
  const envConfig = getTeacherSheetsFromEnv();

  // Get configurations from Firestore
  let firestoreConfig: Record<string, string> = {};
  try {
    const snapshot = await db.collection("teacherConfigurations").get();
    snapshot.forEach((doc) => {
      const data = doc.data() as TeacherConfiguration;
      firestoreConfig[data.email] = data.spreadsheetId;
    });
  } catch (error) {
    logger.warn("Failed to load teacher configurations from Firestore", { error });
  }

  // Merge environment and Firestore configs (Firestore takes precedence)
  const config = { ...DEFAULT_CONFIG, ...envConfig, ...firestoreConfig };

  logger.info(`Loaded ${Object.keys(config).length} teacher sheet configurations`, {
    envCount: Object.keys(envConfig).length,
    firestoreCount: Object.keys(firestoreConfig).length,
  });
  return config;
}

/**
 * Synchronous version for backward compatibility - returns only env config
 */
export function getTeacherSheetsConfigSync(): Record<string, string> {
  const envConfig = getTeacherSheetsFromEnv();
  const config = Object.keys(envConfig).length > 0 ? envConfig : DEFAULT_CONFIG;
  return config;
}

/**
 * Get a default spreadsheet ID (first configured teacher) for operations that need a sheet
 */
export async function getDefaultSpreadsheetId(): Promise<string | null> {
  const config = await getTeacherSheetsConfig();
  const spreadsheetIds = Object.values(config);

  if (spreadsheetIds.length === 0) {
    logger.warn("No teacher sheets configured - cannot get default spreadsheet ID");
    return null;
  }

  const defaultId = spreadsheetIds[0];
  logger.info(`Using default spreadsheet ID: ${defaultId}`);
  return defaultId;
}

/**
 * Get spreadsheet ID for a specific teacher
 */
export async function getTeacherSpreadsheetId(teacherEmail: string): Promise<string | null> {
  const config = await getTeacherSheetsConfig();
  const spreadsheetId = config[teacherEmail];

  if (!spreadsheetId) {
    logger.warn(`No spreadsheet configured for teacher: ${teacherEmail}`);
    return null;
  }

  logger.info(`Found spreadsheet for teacher: ${teacherEmail}`, { spreadsheetId });
  return spreadsheetId;
}

/**
 * Get all configured teacher emails
 */
export async function getConfiguredTeachers(): Promise<string[]> {
  const config = await getTeacherSheetsConfig();
  return Object.keys(config);
}

/**
 * Check if a teacher has a configured spreadsheet
 */
export async function isTeacherConfigured(teacherEmail: string): Promise<boolean> {
  const spreadsheetId = await getTeacherSpreadsheetId(teacherEmail);
  return spreadsheetId !== null;
}

/**
 * Create a TeacherConfig object from email
 */
export async function getTeacherConfig(teacherEmail: string): Promise<TeacherConfig | null> {
  const spreadsheetId = await getTeacherSpreadsheetId(teacherEmail);

  if (!spreadsheetId) {
    return null;
  }

  return {
    email: teacherEmail,
    name: teacherEmail.split("@")[0], // Extract name from email
    spreadsheetId,
    classroomId: `${teacherEmail.split("@")[0]}-classroom`, // Generate classroom ID
  };
}

/**
 * Verify that a teacher's spreadsheet exists and is accessible via service account
 */
export async function verifyTeacherSheetAccess(teacherEmail: string): Promise<SheetVerificationResult> {
  const verifiedAt = serializeTimestamp(getCurrentTimestamp()) as SerializedTimestamp;

  try {
    const spreadsheetId = await getTeacherSpreadsheetId(teacherEmail);

    if (!spreadsheetId) {
      return {
        exists: false,
        accessible: false,
        error: "No spreadsheet configured for teacher",
        verifiedAt,
      };
    }

    // Test connection using service account (same auth used for ongoing operations)
    const sheetsService = await createSheetsService(spreadsheetId);
    const connectionTest = await sheetsService.testConnection();

    if (connectionTest) {
      return {
        exists: true,
        accessible: true,
        verifiedAt,
      };
    } else {
      return {
        exists: true,
        accessible: false,
        error: "Sheet exists but service account cannot access it",
        verifiedAt,
      };
    }
  } catch (error) {
    logger.error("Sheet verification failed", { teacherEmail, error });
    return {
      exists: false,
      accessible: false,
      error: error instanceof Error ? error.message : "Unknown error",
      verifiedAt,
    };
  }
}

/**
 * Update teacher configuration with new spreadsheet ID and persist to Firestore
 */
export async function updateTeacherConfiguration(
  teacherId: string,
  teacherEmail: string,
  spreadsheetId: string,
  method: "oauth" | "service-account" = "oauth"
): Promise<void> {
  logger.info("Updating teacher configuration", { teacherId, teacherEmail, spreadsheetId, method });

  try {
    const config: Omit<TeacherConfiguration, "lastVerified"> = {
      teacherId,
      email: teacherEmail,
      spreadsheetId,
      method,
      createdAt: serializeTimestamp(getCurrentTimestamp()) as SerializedTimestamp,
    };

    // Save to Firestore
    await db.collection("teacherConfigurations").doc(teacherId).set(config);

    logger.info("Teacher configuration saved to Firestore", { teacherId, teacherEmail, spreadsheetId });
  } catch (error) {
    logger.error("Failed to save teacher configuration to Firestore", {
      teacherId,
      teacherEmail,
      spreadsheetId,
      error,
    });
    throw error;
  }
}
