/**
 * Base sheet service with shared functionality for Google Sheets operations
 * Location: functions/src/services/base-sheet-service.ts
 */

import { google } from "googleapis";
import { logger } from "firebase-functions";
import { APPSCRIPT_TEMPLATE } from "./appscript-template";

// Fallback template in case the main template fails to load
const FALLBACK_APPSCRIPT_TEMPLATE = `/**
 * Fallback Roo Auto-Grading System - Board Account Apps Script
 * This is a minimal fallback template in case the main template fails to load.
 */

const CONFIG = {
  PERSONAL_SPREADSHEET_ID: "{{SPREADSHEET_ID}}",
  CLASSROOMS_PARENT_FOLDER_NAME: "classrooms",
  ROO_SUFFIX: "-roo",
  EXCLUDED_FOLDER_NAMES: ["_old_classrooms", "staff", "clubs"],
};

function processAllSubmissions() {
  console.log("Fallback template - minimal implementation");
  console.log("Please check the main AppScript template for full functionality");
  return [];
}

function setupTriggers() {
  console.log("Setting up daily trigger...");
  ScriptApp.newTrigger('processAllSubmissions')
    .timeBased()
    .everyDays(1)
    .atHour(22) // 10 PM
    .create();
  console.log("Daily trigger created for 10 PM");
}
`;

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

export interface SheetIds {
  sheet1Id: number;
  submissionsId: number;
  answerKeysId: number;
}

/**
 * Abstract base class for Google Sheets template services
 */
export abstract class BaseSheetService {
  protected sheets: any;
  protected drive: any;

  constructor(auth: any) {
    this.sheets = google.sheets({ version: "v4", auth });
    this.drive = google.drive({ version: "v3", auth });
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  abstract createTeacherSheet(template: TeacherSheetTemplate): Promise<SheetCreationResult>;

  /**
   * Create the basic spreadsheet structure
   */
  protected async createSpreadsheet(title: string) {
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
      resource: requestBody,
      fields: "spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.sheetId"
    });

    return response.data;
  }

  /**
   * Add proper headers to all sheets
   */
  protected async addSheetHeaders(spreadsheetId: string) {
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
      resource: requestBody
    });
  }

  /**
   * Apply formatting and data validation to sheets
   */
  protected async applyFormattingAndValidation(spreadsheetId: string, sheetIds: SheetIds) {
    const requests = [
      // Format Sheet1 headers
      {
        repeatCell: {
          range: {
            sheetId: sheetIds.sheet1Id,
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
            sheetId: sheetIds.submissionsId,
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
            sheetId: sheetIds.answerKeysId,
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
      resource: { requests }
    });
  }

  /**
   * Share the sheet with the teacher's board account
   */
  protected async shareWithBoardAccount(spreadsheetId: string, boardAccountEmail: string) {
    try {
      await this.drive.permissions.create({
        fileId: spreadsheetId,
        resource: {
          role: "writer", // Full edit access for board account
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
   * Generate complete AppScript code for the board account's specific sheet
   */
  protected generateAppScriptCode(spreadsheetId: string, boardAccountEmail: string): string {
    let templateToUse = APPSCRIPT_TEMPLATE;
    let usingFallback = false;
    
    // Check if the template is available
    if (!APPSCRIPT_TEMPLATE || typeof APPSCRIPT_TEMPLATE !== 'string') {
      logger.warn("APPSCRIPT_TEMPLATE is undefined or not a string, using fallback template", { 
        templateType: typeof APPSCRIPT_TEMPLATE,
        templateDefined: !!APPSCRIPT_TEMPLATE,
        spreadsheetId, 
        boardAccountEmail 
      });
      templateToUse = FALLBACK_APPSCRIPT_TEMPLATE;
      usingFallback = true;
    }

    // Use the selected template (main or fallback)
    const completeCode = templateToUse
      .replace(/\{\{SPREADSHEET_ID\}\}/g, spreadsheetId);
    
    logger.info("Generated complete AppScript code", { 
      spreadsheetId, 
      boardAccountEmail,
      codeLength: completeCode.length,
      templateLength: templateToUse.length,
      usingFallback
    });
    
    return completeCode;
  }

  /**
   * Create additional sheets (Submissions and Answer Keys)
   */
  protected async createAdditionalSheets(spreadsheetId: string): Promise<{ submissionsId: number; answerKeysId: number }> {
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

    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests }
    });

    // Extract the actual sheet IDs from the response
    const submissionsId = response.data.replies[0].addSheet.properties.sheetId;
    const answerKeysId = response.data.replies[1].addSheet.properties.sheetId;

    return { submissionsId, answerKeysId };
  }

  /**
   * Delete existing sheets with the name "_roo_data" from the teacher's Drive
   */
  protected async deleteExistingRooSheets() {
    try {
      // Search for files with the exact name "_roo_data" in the user's Drive
      const response = await this.drive.files.list({
        q: "name = '_roo_data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
        fields: "files(id, name)",
        spaces: "drive"
      });

      if (response.data.files && response.data.files.length > 0) {
        logger.info(`Found ${response.data.files.length} existing _roo_data sheets to delete`);
        
        // Delete each existing sheet
        for (const file of response.data.files) {
          try {
            await this.drive.files.delete({ fileId: file.id });
            logger.info(`Deleted existing _roo_data sheet: ${file.id}`);
          } catch (error) {
            logger.error(`Failed to delete sheet ${file.id}:`, error);
          }
        }
      } else {
        logger.info("No existing _roo_data sheets found");
      }
    } catch (error) {
      logger.error("Error searching for existing _roo_data sheets:", error);
      // Continue with sheet creation even if search fails
    }
  }

  /**
   * Check if a specific sheet exists in the teacher's Drive by ID
   */
  protected async verifySheetExists(spreadsheetId: string): Promise<boolean> {
    try {
      const response = await this.drive.files.get({
        fileId: spreadsheetId,
        fields: "id, name, mimeType, trashed"
      });

      // Check if the file exists, is a spreadsheet, and is not trashed
      return response.data && 
             response.data.mimeType === 'application/vnd.google-apps.spreadsheet' &&
             !response.data.trashed;
    } catch (error: any) {
      if (error.code === 404) {
        logger.info(`Sheet ${spreadsheetId} not found`);
        return false;
      }
      logger.error(`Error verifying sheet ${spreadsheetId}:`, error);
      return false;
    }
  }

  /**
   * Get the sheet ID of the _roo_data sheet in the teacher's Drive
   */
  protected async getRooDataSheetId(): Promise<string | null> {
    try {
      const response = await this.drive.files.list({
        q: "name = '_roo_data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
        fields: "files(id)",
        spaces: "drive",
        orderBy: "modifiedTime desc",
        pageSize: 1
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }
      return null;
    } catch (error) {
      logger.error("Error getting _roo_data sheet ID:", error);
      return null;
    }
  }
}