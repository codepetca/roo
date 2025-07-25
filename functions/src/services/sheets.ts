import { google } from 'googleapis';
import { logger } from 'firebase-functions';

// Google Sheets API scopes
const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];

// Configuration - hardcoded for now (TODO: use environment variables)
const spreadsheetId = "119EdfrPtA3G180b2EgkzVr5v-kxjNgYQjgDkLmuN02Y";

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
  assignmentTitle: string;
  courseId: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  submissionText: string;
  submissionDate: string;
  currentGrade?: string;
  gradingStatus: 'pending' | 'graded' | 'reviewed';
  maxPoints: number;
  sourceSheetName: string;
  assignmentDescription: string;
  lastProcessed: string;
  sourceFileId: string;
  isQuiz: boolean;
  formId: string;
}

export interface QuizQuestion {
  formId: string;
  assignmentTitle: string;
  courseId: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  points: number;
  correctAnswer: string;
  answerExplanation: string;
  gradingStrictness: 'strict' | 'standard' | 'generous';
}

export interface QuizAnswerKey {
  formId: string;
  assignmentTitle: string;
  courseId: string;
  questions: QuizQuestion[];
  totalPoints: number;
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
        spreadsheetId: spreadsheetId
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
        spreadsheetId: spreadsheetId,
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
   * Get all submissions from the Submissions sheet
   * New sheet format with 17 columns including quiz metadata
   */
  async getAllSubmissions(): Promise<SheetSubmission[]> {
    try {
      logger.info('Fetching all submissions from Google Sheets');
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'Submissions!A2:Q', // All 17 columns
      });

      const rows = response.data.values || [];
      logger.info(`Found ${rows.length} total submissions`);
      
      return rows.map((row: string[]) => ({
        id: row[0] || '',
        assignmentTitle: row[1] || '',
        courseId: row[2] || '',
        studentFirstName: row[3] || '',
        studentLastName: row[4] || '',
        studentEmail: row[5] || '',
        submissionText: row[6] || '',
        submissionDate: row[7] || '',
        currentGrade: row[8] || undefined,
        gradingStatus: (row[9] as 'pending' | 'graded' | 'reviewed') || 'pending',
        maxPoints: parseInt(row[10]) || 100,
        sourceSheetName: row[11] || '',
        assignmentDescription: row[12] || '',
        lastProcessed: row[13] || '',
        sourceFileId: row[14] || '',
        isQuiz: row[15] === 'TRUE' || row[15] === 'true',
        formId: row[16] || ''
      }));
    } catch (error) {
      logger.error('Error fetching submissions', error);
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
        spreadsheetId: spreadsheetId,
        range: 'Answer Keys!A2:J', // All answer key columns
      });

      const rows = response.data.values || [];
      
      // Filter for this specific form
      const formRows = rows.filter((row: string[]) => row[0] === formId);
      
      if (formRows.length === 0) {
        logger.info(`No answer key found for form ${formId}`);
        return null;
      }
      
      // Build answer key object
      const questions: QuizQuestion[] = formRows.map((row: string[]) => ({
        formId: row[0],
        assignmentTitle: row[1],
        courseId: row[2],
        questionNumber: parseInt(row[3]) || 0,
        questionText: row[4] || '',
        questionType: row[5] || '',
        points: parseInt(row[6]) || 0,
        correctAnswer: row[7] || '',
        answerExplanation: row[8] || '',
        gradingStrictness: (row[9] as 'strict' | 'standard' | 'generous') || 'generous'
      }));
      
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      
      return {
        formId: formId,
        assignmentTitle: questions[0]?.assignmentTitle || '',
        courseId: questions[0]?.courseId || '',
        questions: questions,
        totalPoints: totalPoints
      };
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
        spreadsheetId: spreadsheetId,
        range: 'Submissions!A2:Q', // All 17 columns
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row: string[]) => row[0] === submissionId);
      
      if (rowIndex === -1) {
        throw new Error(`Submission ${submissionId} not found in sheet`);
      }

      // Update the grade (column I, which is index 8) and status (column J, index 9)
      const gradeRange = `Submissions!I${rowIndex + 2}:J${rowIndex + 2}`;
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: gradeRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[grade, 'graded']]
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
      logger.info('Fetching ungraded submissions from Google Sheets');
      
      const allSubmissions = await this.getAllSubmissions();
      
      // Filter for submissions without grades (currentGrade is empty or pending status)
      const ungradedSubmissions = allSubmissions.filter(s => 
        !s.currentGrade || 
        s.currentGrade.trim() === '' || 
        s.gradingStatus === 'pending'
      );
      
      logger.info(`Found ${ungradedSubmissions.length} ungraded submissions`);
      
      return ungradedSubmissions;
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