import { google } from "googleapis";
import { logger } from "firebase-functions";
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
   * Test the connection to Google Sheets
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to read basic spreadsheet metadata
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      logger.info(`Sheets connection test successful - spreadsheet: ${response.data.properties.title}`);
      return true;
    } catch (error) {
      logger.error("Sheets connection test failed", error);
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
      logger.error("Error fetching assignments from Sheets", error);
      throw error;
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
  try {
    // Use Google Auth with default credentials (Firebase service account)
    const authClient = new google.auth.GoogleAuth({
      scopes: SHEETS_SCOPES
    });

    const authInstance = await authClient.getClient();
    return new SheetsService(authInstance, spreadsheetId);
  } catch (error) {
    logger.error("Failed to create Sheets service", error);
    throw error;
  }
};