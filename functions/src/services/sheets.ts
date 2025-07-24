import { google } from 'googleapis';
import { logger } from 'firebase-functions';

// Google Sheets API scopes
const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];

// Configuration - get from Firebase config
import { defineString } from 'firebase-functions/params';
const spreadsheetId = defineString('SHEETS_SPREADSHEET_ID');

export interface SheetAssignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: string;
  maxPoints?: number;
  submissionType: 'forms' | 'files' | 'mixed';
  createdDate: string;
}

export interface SheetSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submissionText: string;
  submissionDate: string;
  status: 'submitted' | 'late' | 'missing';
  currentGrade?: number;
  submissionType: 'forms' | 'files';
  sourceFileId?: string;
}

export class SheetsService {
  private sheets: any;

  constructor(private serviceAccountAuth: any) {
    this.sheets = google.sheets({ version: 'v4', auth: this.serviceAccountAuth });
  }

  /**
   * Test the connection to Google Sheets
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to read basic spreadsheet metadata
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId.value()
      });
      
      logger.info(`Sheets connection test successful - spreadsheet: ${response.data.properties.title}`);
      return true;
    } catch (error) {
      logger.error('Sheets connection test failed', error);
      return false;
    }
  }

  /**
   * Get assignments from the Assignments sheet
   * Expected sheet format:
   * A: Assignment ID | B: Course ID | C: Title | D: Description | E: Due Date | F: Max Points | G: Created Date
   */
  async getAssignments(): Promise<SheetAssignment[]> {
    try {
      logger.info('Fetching assignments from Google Sheets');
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId.value(),
        range: 'Assignments!A2:H', // Skip header row - added submission type column
      });

      const rows = response.data.values || [];
      logger.info(`Found ${rows.length} assignments in sheet`);
      
      return rows.map((row: string[], index: number) => ({
        id: row[0] || `assignment_${index}`,
        courseId: row[1] || 'unknown',
        title: row[2] || 'Untitled Assignment',
        description: row[3] || '',
        dueDate: row[4] || '',
        maxPoints: row[5] ? parseInt(row[5]) : undefined,
        submissionType: row[6] || 'mixed',
        createdDate: row[7] || ''
      }));
    } catch (error) {
      logger.error('Error fetching assignments from Sheets', error);
      throw error;
    }
  }

  /**
   * Get submissions for a specific assignment from the Submissions sheet
   * Expected sheet format:
   * A: Submission ID | B: Assignment ID | C: Student ID | D: Student Name | E: Student Email | 
   * F: Submission Text | G: Submission Date | H: Status | I: Current Grade
   */
  async getSubmissions(assignmentId: string): Promise<SheetSubmission[]> {
    try {
      logger.info(`Fetching submissions for assignment ${assignmentId} from Google Sheets`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId.value(),
        range: 'Submissions!A2:K', // Extended to include submission type and source file ID // Skip header row
      });

      const rows = response.data.values || [];
      
      // Filter rows for the specific assignment
      const assignmentRows = rows.filter((row: string[]) => row[1] === assignmentId);
      logger.info(`Found ${assignmentRows.length} submissions for assignment ${assignmentId}`);
      
      return assignmentRows.map((row: string[], index: number) => ({
        id: row[0] || `submission_${assignmentId}_${index}`,
        assignmentId: row[1] || assignmentId,
        studentId: row[2] || 'unknown',
        studentName: row[3] || 'Unknown Student',
        studentEmail: row[4] || '',
        submissionText: row[5] || '',
        submissionDate: row[6] || '',
        status: (row[7] as 'submitted' | 'late' | 'missing') || 'submitted',
        currentGrade: row[8] ? parseFloat(row[8]) : undefined,
        submissionType: (row[9] as 'forms' | 'files') || 'forms',
        sourceFileId: row[10] || undefined
      }));
    } catch (error) {
      logger.error(`Error fetching submissions for assignment ${assignmentId}`, error);
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
        spreadsheetId: spreadsheetId.value(),
        range: 'Submissions!A2:K', // Extended to include submission type and source file ID
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row: string[]) => row[0] === submissionId);
      
      if (rowIndex === -1) {
        throw new Error(`Submission ${submissionId} not found in sheet`);
      }

      // Update the grade (column I, which is index 8)
      const cellRange = `Submissions!I${rowIndex + 2}`; // +2 because we start from row 2 (skipping header)
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId.value(),
        range: cellRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[grade]]
        }
      });

      logger.info(`Successfully updated grade for submission ${submissionId}`);
    } catch (error) {
      logger.error(`Error updating grade for submission ${submissionId}`, error);
      throw error;
    }
  }

  /**
   * Get all assignments that need grading (submissions without grades)
   */
  async getUngraduatedSubmissions(): Promise<Array<SheetSubmission & { assignmentTitle: string }>> {
    try {
      logger.info('Fetching ungraded submissions from Google Sheets');
      
      // Get all assignments first to map titles
      const assignments = await this.getAssignments();
      const assignmentMap = new Map(assignments.map(a => [a.id, a.title]));
      
      // Get all submissions
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId.value(),
        range: 'Submissions!A2:K', // Extended to include submission type and source file ID
      });

      const rows = response.data.values || [];
      
      // Filter for submissions without grades (column I is empty)
      const ungradedRows = rows.filter((row: string[]) => !row[8] || row[8].trim() === '');
      
      logger.info(`Found ${ungradedRows.length} ungraded submissions`);
      
      return ungradedRows.map((row: string[], index: number) => ({
        id: row[0] || `submission_${index}`,
        assignmentId: row[1] || 'unknown',
        studentId: row[2] || 'unknown',
        studentName: row[3] || 'Unknown Student',
        studentEmail: row[4] || '',
        submissionText: row[5] || '',
        submissionDate: row[6] || '',
        status: (row[7] as 'submitted' | 'late' | 'missing') || 'submitted',
        currentGrade: undefined,
        submissionType: (row[9] as 'forms' | 'files') || 'forms',
        sourceFileId: row[10] || undefined,
        assignmentTitle: assignmentMap.get(row[1]) || 'Unknown Assignment'
      }));
    } catch (error) {
      logger.error('Error fetching ungraded submissions', error);
      throw error;
    }
  }
}

/**
 * Create a Sheets service instance with service account authentication
 */
export const createSheetsService = async (): Promise<SheetsService> => {
  try {
    // Use Google Auth with default credentials (Firebase service account)
    const authClient = new google.auth.GoogleAuth({
      scopes: SHEETS_SCOPES
    });

    const authInstance = await authClient.getClient();
    return new SheetsService(authInstance);
  } catch (error) {
    logger.error('Failed to create Sheets service', error);
    throw error;
  }
};