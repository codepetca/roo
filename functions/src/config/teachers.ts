/**
 * Teacher configuration for Google Sheets access
 * Location: functions/src/config/teachers.ts:1
 */

import { logger } from "firebase-functions";

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
    const boardEmail = emails.find(email => email.endsWith("@gapps.yrdsb.ca"));
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
 * Get all configured teacher sheets
 */
export function getTeacherSheetsConfig(): Record<string, string> {
  const envConfig = getTeacherSheetsFromEnv();
  
  // Use environment config if available, otherwise fall back to default
  const config = Object.keys(envConfig).length > 0 ? envConfig : DEFAULT_CONFIG;
  
  logger.info(`Loaded ${Object.keys(config).length} teacher sheet configurations`);
  return config;
}

/**
 * Get spreadsheet ID for a specific teacher
 */
export function getTeacherSpreadsheetId(teacherEmail: string): string | null {
  const config = getTeacherSheetsConfig();
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
export function getConfiguredTeachers(): string[] {
  const config = getTeacherSheetsConfig();
  return Object.keys(config);
}

/**
 * Check if a teacher has a configured spreadsheet
 */
export function isTeacherConfigured(teacherEmail: string): boolean {
  return getTeacherSpreadsheetId(teacherEmail) !== null;
}

/**
 * Create a TeacherConfig object from email
 */
export function getTeacherConfig(teacherEmail: string): TeacherConfig | null {
  const spreadsheetId = getTeacherSpreadsheetId(teacherEmail);
  
  if (!spreadsheetId) {
    return null;
  }
  
  return {
    email: teacherEmail,
    name: teacherEmail.split("@")[0], // Extract name from email
    spreadsheetId,
    classroomId: `${teacherEmail.split("@")[0]}-classroom` // Generate classroom ID
  };
}

/**
 * Update teacher configuration with new spreadsheet ID
 * In production, this would save to a database
 */
export async function updateTeacherConfiguration(teacherEmail: string, spreadsheetId: string): Promise<void> {
  logger.info("Updating teacher configuration", { teacherEmail, spreadsheetId });
  
  // For development, we just log this
  // In production, you would:
  // 1. Save to Firestore database
  // 2. Or update environment variables programmatically
  // 3. Or update configuration management system
  
  logger.info(`Teacher ${teacherEmail} configured with sheet ${spreadsheetId}`);
  logger.warn("Teacher configuration update - implement persistent storage in production");
}