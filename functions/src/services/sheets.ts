import { google } from "googleapis";
import { logger } from "firebase-functions";
import { initializeCompatibility } from "../utils/compatibility";
import {
  sheetAssignmentsArraySchema,
  sheetSubmissionsArraySchema,
  sheetAnswerKeysArraySchema,
  parseAssignmentRow,
  parseSubmissionRow,
  parseAnswerKeyRow,
  sheetAnswerKeysToDomain,
  type SheetAssignment,
  type SheetSubmission,
  type QuizAnswerKeyDomain as QuizAnswerKey
} from "../schemas";

// Initialize compatibility fixes
initializeCompatibility();

// Google Sheets API scopes - includes both read and write permissions
// Required for:
// - Reading sheets data (getAssignments, getAllSubmissions, getAnswerKey)
// - Writing grades back to sheets (updateGrade method)
// Authentication uses Firebase Functions default service account
const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets" // Full read/write access
];

export class SheetsService {
  private sheets: any; // TODO: Type with proper Google Sheets API types
  private spreadsheetId: string;

  constructor(private serviceAccountAuth: any, spreadsheetId: string) { // TODO: Type with proper auth type
    this.sheets = google.sheets({ version: "v4", auth: this.serviceAccountAuth });
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * Handle Google API errors with better error messages
   */
  private handleApiError(error: unknown, operation: string): Error {
    const baseMessage = `Google Sheets API error during ${operation}`;
    
    if (error instanceof Error) {
      logger.error(baseMessage, {
        error: error.message,
        stack: error.stack,
        operation,
        spreadsheetId: this.spreadsheetId
      });
      
      // Provide more helpful error messages for common issues
      if (error.message.includes('URLSearchParams')) {
        return new Error(`${baseMessage}: Node.js compatibility issue. Please ensure you're using Node.js 20.`);
      }
      if (error.message.includes('403')) {
        return new Error(`${baseMessage}: Access denied. Check Google Sheets API permissions and service account access.`);
      }
      if (error.message.includes('404')) {
        return new Error(`${baseMessage}: Spreadsheet not found. Check spreadsheet ID: ${this.spreadsheetId}`);
      }
      
      return new Error(`${baseMessage}: ${error.message}`);
    }
    
    const errorStr = String(error);
    logger.error(baseMessage, { error: errorStr, operation, spreadsheetId: this.spreadsheetId });
    return new Error(`${baseMessage}: ${errorStr}`);
  }

  /**
   * Test the connection to Google Sheets
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to read basic spreadsheet metadata
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      logger.info(`Sheets connection test successful - spreadsheet: ${response.data.properties?.title || 'Unknown'}`);
      return true;
    } catch (error) {
      this.handleApiError(error, 'connection test');
      return false;
    }
  }

  /**
   * List all sheet names in the spreadsheet
   */
  async listSheetNames(): Promise<string[]> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const sheetNames = response.data.sheets?.map((sheet: { properties?: { title?: string } }) => sheet.properties?.title).filter(Boolean) || [];
      logger.info(`Found ${sheetNames.length} sheets:`, sheetNames);
      return sheetNames;
    } catch (error) {
      logger.error("Error listing sheet names", error);
      throw error;
    }
  }

  /**
   * Get assignments from the Sheet1 (default assignments sheet)
   * Expected sheet format:
   * A: Assignment ID | B: Course ID | C: Title | D: Description | E: Due Date | F: Max Points | G: Created Date
   */
  async getAssignments(): Promise<SheetAssignment[]> {
    try {
      logger.info("Fetching assignments from Google Sheets");
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Sheet1!A2:H", // Skip header row - changed from Assignments to Sheet1
      });

      const rows = response.data.values || [];
      logger.info(`Found ${rows.length} assignments in sheet`);
      
      // Parse each row and build array for validation
      const parsedRows = rows.map((row: string[]) => {
        return parseAssignmentRow(row);
      });
      
      // Validate and transform the entire array at once
      return sheetAssignmentsArraySchema.parse(parsedRows);
    } catch (error) {
      throw this.handleApiError(error, 'fetching assignments');
    }
  }

  /**
   * Get all submissions from the Submissions sheet
   * New sheet format with 17 columns including quiz metadata
   */
  async getAllSubmissions(): Promise<SheetSubmission[]> {
    try {
      logger.info("Fetching all submissions from Google Sheets");
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Submissions!A2:Q", // All 17 columns
      });

      const rows = response.data.values || [];
      logger.info(`Found ${rows.length} total submissions`);
      
      // Parse each row and build array for validation
      const parsedRows = rows.map((row: string[]) => {
        return parseSubmissionRow(row);
      });
      
      // Validate and transform the entire array at once
      return sheetSubmissionsArraySchema.parse(parsedRows);
    } catch (error) {
      logger.error("Error fetching submissions", error);
      throw error;
    }
  }

  /**
   * Get submissions for a specific assignment
   */
  async getSubmissions(assignmentTitle: string): Promise<SheetSubmission[]> {
    const allSubmissions = await this.getAllSubmissions();
    return allSubmissions.filter(s => s.assignmentTitle === assignmentTitle);
  }

  /**
   * Get quiz answer keys from the Answer Keys sheet
   */
  async getAnswerKey(formId: string): Promise<QuizAnswerKey | null> {
    try {
      logger.info(`Fetching answer key for form ${formId}`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Answer Keys!A2:J", // All answer key columns
      });

      const rows = response.data.values || [];
      
      // Filter for this specific form
      const formRows = rows.filter((row: string[]) => row[0] === formId);
      
      if (formRows.length === 0) {
        logger.info(`No answer key found for form ${formId}`);
        return null;
      }
      
      // Parse each row and build array for validation
      const parsedRows = formRows.map((row: string[]) => {
        return parseAnswerKeyRow(row);
      });
      
      // Validate and transform the entire array at once
      const validatedAnswerKeys = sheetAnswerKeysArraySchema.parse(parsedRows);
      return sheetAnswerKeysToDomain(validatedAnswerKeys);
    } catch (error) {
      logger.error(`Error fetching answer key for form ${formId}`, error);
      throw error;
    }
  }

  /**
   * Update a grade in the Submissions sheet
   * This writes back to column I (Current Grade)
   */
  async updateGrade(submissionId: string, grade: number): Promise<void> {
    try {
      logger.info(`Updating grade ${grade} for submission ${submissionId}`);
      
      // First, find the row for this submission
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Submissions!A2:Q", // All 17 columns
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row: string[]) => row[0] === submissionId);
      
      if (rowIndex === -1) {
        throw new Error(`Submission ${submissionId} not found in sheet`);
      }

      // Update the grade (column I, which is index 8) and status (column J, index 9)
      const gradeRange = `Submissions!I${rowIndex + 2}:J${rowIndex + 2}`;
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: gradeRange,
        valueInputOption: "RAW",
        requestBody: {
          values: [[grade, "graded"]]
        }
      });

      logger.info(`Successfully updated grade for submission ${submissionId}`);
    } catch (error) {
      logger.error(`Error updating grade for submission ${submissionId}`, error);
      throw error;
    }
  }

  /**
   * Get all submissions that need grading (submissions without grades)
   */
  async getUngraduatedSubmissions(): Promise<SheetSubmission[]> {
    try {
      logger.info("Fetching ungraded submissions from Google Sheets");
      
      const allSubmissions = await this.getAllSubmissions();
      
      // Filter for submissions without grades (currentGrade is empty or pending status)
      const ungradedSubmissions = allSubmissions.filter(s => 
        !s.currentGrade || 
        s.currentGrade.trim() === "" || 
        s.gradingStatus === "pending"
      );
      
      logger.info(`Found ${ungradedSubmissions.length} ungraded submissions`);
      
      return ungradedSubmissions;
    } catch (error) {
      logger.error("Error fetching ungraded submissions", error);
      throw error;
    }
  }
}

/**
 * Create a Sheets service instance with service account authentication
 */
export const createSheetsService = async (spreadsheetId: string): Promise<SheetsService> => {
  let lastError: Error | undefined;
  
  // Retry authentication up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      logger.info(`Creating Sheets service (attempt ${attempt}/3)`, { spreadsheetId });
      
      // Production-only: Use Firebase default service account credentials
      const authClient = new google.auth.GoogleAuth({
        scopes: SHEETS_SCOPES
      });

      const authInstance = await authClient.getClient();
      
      // Test the authentication by getting client info
      await authInstance.getAccessToken();
      
      logger.info("Successfully created Sheets service", { spreadsheetId });
      return new SheetsService(authInstance, spreadsheetId);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Sheets service creation attempt ${attempt} failed`, { 
        error: lastError.message,
        spreadsheetId,
        attempt
      });
      
      // Wait before retry (exponential backoff)
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  logger.error("Failed to create Sheets service after all attempts", { 
    error: lastError?.message,
    spreadsheetId 
  });
  throw lastError || new Error("Unknown authentication error");
};