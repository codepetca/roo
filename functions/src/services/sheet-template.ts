/**
 * Google Sheets template service for automated teacher onboarding
 * Location: functions/src/services/sheet-template.ts:1
 */

import { google } from "googleapis";
import { logger } from "firebase-functions";

// Required scopes for creating and managing sheets
const SHEET_CREATION_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file"
];

export interface SheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  success: boolean;
  error?: string;
}

export interface TeacherSheetTemplate {
  title: string;
  boardAccountEmail: string;
}

/**
 * Service for creating and configuring Google Sheets for teachers (app-owned)
 */
export class SheetTemplateService {
  private sheets: any;
  private drive: any;

  constructor(serviceAccountAuth: any) {
    this.sheets = google.sheets({ version: "v4", auth: serviceAccountAuth });
    this.drive = google.drive({ version: "v3", auth: serviceAccountAuth });
  }

  /**
   * Create a complete Google Sheet for a teacher with proper structure
   */
  async createTeacherSheet(template: TeacherSheetTemplate): Promise<SheetCreationResult> {
    try {
      logger.info("Creating sheet for board account", { boardAccountEmail: template.boardAccountEmail });

      // Step 1: Create the spreadsheet
      const spreadsheet = await this.createSpreadsheet(template.title);
      
      // Step 2: Set up the sheet structure
      await this.setupSheetStructure(spreadsheet.spreadsheetId!);
      
      // Step 3: Share with the board account
      await this.shareWithBoardAccount(spreadsheet.spreadsheetId!, template.boardAccountEmail);
      
      // Step 4: Set up data validation and formatting
      await this.applyFormattingAndValidation(spreadsheet.spreadsheetId!);

      const result: SheetCreationResult = {
        spreadsheetId: spreadsheet.spreadsheetId!,
        spreadsheetUrl: spreadsheet.spreadsheetUrl!,
        title: template.title,
        success: true
      };

      logger.info("Teacher sheet created successfully", result);
      return result;

    } catch (error) {
      logger.error("Failed to create teacher sheet", { error, template });
      return {
        spreadsheetId: "",
        spreadsheetUrl: "",
        title: template.title,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Create the basic spreadsheet
   */
  private async createSpreadsheet(title: string) {
    const requestBody = {
      properties: {
        title: title,
        locale: "en_US",
        autoRecalc: "ON_CHANGE",
        timeZone: "America/Los_Angeles"
      },
      sheets: [
        {
          properties: {
            title: "Sheet1",
            gridProperties: {
              rowCount: 1000,
              columnCount: 26
            }
          }
        }
      ]
    };

    const response = await this.sheets.spreadsheets.create({
      requestBody,
      fields: "spreadsheetId,spreadsheetUrl,properties.title"
    });

    return response.data;
  }

  /**
   * Set up the complete sheet structure with all required tabs
   */
  private async setupSheetStructure(spreadsheetId: string) {
    // Create additional sheets
    const requests = [
      // Create Submissions sheet
      {
        addSheet: {
          properties: {
            title: "Submissions",
            gridProperties: {
              rowCount: 10000,
              columnCount: 17,
              frozenRowCount: 1
            }
          }
        }
      },
      // Create Answer Keys sheet  
      {
        addSheet: {
          properties: {
            title: "Answer Keys",
            gridProperties: {
              rowCount: 1000,
              columnCount: 10,
              frozenRowCount: 1
            }
          }
        }
      }
    ];

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });

    // Add headers to each sheet
    await this.addSheetHeaders(spreadsheetId);
  }

  /**
   * Add proper headers to all sheets
   */
  private async addSheetHeaders(spreadsheetId: string) {
    const updates = [
      // Sheet1 headers (assignments)
      {
        range: "Sheet1!A1:H1",
        values: [[
          "Assignment ID",
          "Course ID", 
          "Title",
          "Description",
          "Due Date",
          "Max Points",
          "Submission Type",
          "Created Date"
        ]]
      },
      // Submissions headers
      {
        range: "Submissions!A1:Q1",
        values: [[
          "Submission ID",
          "Assignment Title",
          "Course ID",
          "First Name",
          "Last Name", 
          "Email",
          "Submission Text",
          "Submission Date",
          "Current Grade",
          "Grading Status",
          "Max Points",
          "Source Sheet Name",
          "Assignment Description",
          "Last Processed",
          "Source File ID",
          "Is Quiz",
          "Form ID"
        ]]
      },
      // Answer Keys headers
      {
        range: "Answer Keys!A1:J1",
        values: [[
          "Form ID",
          "Assignment Title",
          "Course ID",
          "Question Number",
          "Question Text",
          "Question Type",
          "Points",
          "Correct Answer",
          "Answer Explanation",
          "Grading Strictness"
        ]]
      }
    ];

    const requestBody = {
      valueInputOption: "RAW",
      data: updates
    };

    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody
    });
  }

  /**
   * Apply formatting and data validation
   */
  private async applyFormattingAndValidation(spreadsheetId: string) {
    const requests = [
      // Format headers with bold and background color
      {
        repeatCell: {
          range: {
            sheetId: 0, // Sheet1
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
              textFormat: { 
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                bold: true 
              }
            }
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)"
        }
      },
      // Format Submissions headers
      {
        repeatCell: {
          range: {
            sheetId: 1, // Submissions sheet (second sheet created)
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
              textFormat: { 
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                bold: true 
              }
            }
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)"
        }
      },
      // Format Answer Keys headers
      {
        repeatCell: {
          range: {
            sheetId: 2, // Answer Keys sheet (third sheet created)
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
              textFormat: { 
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                bold: true 
              }
            }
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)"
        }
      }
    ];

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
  }

  /**
   * Share the sheet with the teacher's board account
   */
  private async shareWithBoardAccount(spreadsheetId: string, boardAccountEmail: string) {
    try {
      await this.drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "editor", // Full edit access for board account
          type: "user",
          emailAddress: boardAccountEmail
        },
        sendNotificationEmail: true // Notify the board account
      });

      logger.info("Sheet shared with board account", { 
        spreadsheetId, 
        boardAccountEmail 
      });
    } catch (error) {
      logger.error("Failed to share sheet with board account", { 
        error, 
        spreadsheetId, 
        boardAccountEmail 
      });
      throw error;
    }
  }

  /**
   * Generate AppScript code for the board account's specific sheet
   */
  generateAppScriptCode(spreadsheetId: string, boardAccountEmail: string): string {
    return `/**
 * Roo Auto-Grading System - Board Account Apps Script
 * Generated for: ${boardAccountEmail}
 * Target Sheet: ${spreadsheetId}
 */

// Configuration - DO NOT MODIFY
const CONFIG = {
  PERSONAL_SPREADSHEET_ID: "${spreadsheetId}",
  CLASSROOMS_PARENT_FOLDER_NAME: "classrooms",
  ROO_SUFFIX: "-roo",
  EXCLUDED_FOLDER_NAMES: ["_old_classrooms", "staff", "clubs"],
};

/**
 * Main function - Run this to sync all data to your personal sheet
 */
function processAllSubmissions() {
  console.log("Starting submission processing...");
  
  try {
    const allData = processAllSubmissionTypes();
    writeToPersonalSheets(allData);
    console.log(\`Successfully processed \${allData.length} total submissions\`);
  } catch (error) {
    console.error("Error in processAllSubmissions:", error);
  }
}

/**
 * Set up automated triggers (run once)
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  // Daily sync at 10 PM
  ScriptApp.newTrigger("processAllSubmissions")
    .timeBased()
    .everyDays(1)
    .atHour(22)
    .create();

  console.log("Triggers set up successfully - daily sync at 10 PM");
}

// [Include the rest of the AppScript code from board-appscript.gs]
// This would include all the helper functions from the existing AppScript
`;
  }
}

/**
 * Get the service account email for sharing
 */
export async function getServiceAccountEmail(): Promise<string> {
  try {
    // Use Google Auth to get service account info
    const authClient = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"]
    });

    const credentials = await authClient.getCredentials();
    
    if (credentials.client_email) {
      return credentials.client_email;
    }
    
    // Fallback - construct from project ID
    const projectId = await authClient.getProjectId();
    return `firebase-adminsdk-xxxxx@${projectId}.iam.gserviceaccount.com`;
    
  } catch (error) {
    logger.error("Failed to get service account email", { error });
    throw new Error("Could not determine service account email");
  }
}

/**
 * Create a SheetTemplateService using our service account (simplified - no teacher OAuth)
 */
export async function createSheetTemplateService(): Promise<SheetTemplateService> {
  try {
    // Create service account auth (we own all sheets)
    const serviceAccountAuth = new google.auth.GoogleAuth({
      scopes: SHEET_CREATION_SCOPES
    });
    const serviceAuthInstance = await serviceAccountAuth.getClient();

    return new SheetTemplateService(serviceAuthInstance);
  } catch (error) {
    logger.error("Failed to create SheetTemplateService", error);
    throw error;
  }
}