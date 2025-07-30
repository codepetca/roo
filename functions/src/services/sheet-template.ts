/**
 * Google Sheets template service for automated teacher onboarding (OAuth only)
 * Location: functions/src/services/sheet-template.ts:1
 */

import { google } from "googleapis";
import { logger } from "firebase-functions";
import { initializeCompatibility } from "../utils/compatibility";
import { 
  BaseSheetService, 
  SheetCreationResult, 
  TeacherSheetTemplate, 
  SheetIds 
} from "./base-sheet-service";

// Initialize compatibility fixes
initializeCompatibility();

/**
 * Service for creating and configuring Google Sheets for teachers using OAuth
 */
export class OAuthSheetTemplateService extends BaseSheetService {
  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    super(oauth2Client);
  }

  /**
   * Create a complete Google Sheet for a teacher with proper structure using OAuth
   */
  async createTeacherSheet(template: TeacherSheetTemplate): Promise<SheetCreationResult> {
    // Enforce naming convention: always use "_roo_data" as the sheet name
    const sheetTitle = "_roo_data";
    
    try {
      logger.info("Creating sheet with OAuth for board account", { boardAccountEmail: template.boardAccountEmail });
      
      // Step 1: Check for existing sheets with this name and delete them
      await this.deleteExistingRooSheets();
      
      // Step 2: Create the spreadsheet in teacher's personal Drive
      const spreadsheet = await this.createSpreadsheet(sheetTitle);
      
      // Step 2: Set up the sheet structure and get sheet IDs
      const sheet1Id = spreadsheet.sheets?.[0]?.properties?.sheetId ?? 0;
      const additionalSheetIds = await this.createAdditionalSheets(spreadsheet.spreadsheetId!);
      const sheetIds: SheetIds = {
        sheet1Id,
        submissionsId: additionalSheetIds.submissionsId,
        answerKeysId: additionalSheetIds.answerKeysId
      };
      
      // Step 3: Add headers to all sheets
      await this.addSheetHeaders(spreadsheet.spreadsheetId!);
      
      // Step 4: Share with the board account
      await this.shareWithBoardAccount(spreadsheet.spreadsheetId!, template.boardAccountEmail);
      
      // Step 5: Apply formatting and validation using actual sheet IDs
      await this.applyFormattingAndValidation(spreadsheet.spreadsheetId!, sheetIds);

      const result: SheetCreationResult = {
        spreadsheetId: spreadsheet.spreadsheetId!,
        spreadsheetUrl: spreadsheet.spreadsheetUrl!,
        title: sheetTitle,
        success: true
      };

      logger.info("OAuth teacher sheet created successfully", result);
      return result;

    } catch (error) {
      logger.error("Failed to create OAuth teacher sheet", { error, template });
      return {
        spreadsheetId: "",
        spreadsheetUrl: "",
        title: sheetTitle,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Generate complete AppScript code for the board account's specific sheet
   */
  generateAppScriptCode(spreadsheetId: string, boardAccountEmail: string): string {
    return super.generateAppScriptCode(spreadsheetId, boardAccountEmail);
  }

  /**
   * Get the sheet ID of the _roo_data sheet in the teacher's Drive
   */
  async getRooDataSheetId(): Promise<string | null> {
    return super.getRooDataSheetId();
  }
}

/**
 * Create an OAuthSheetTemplateService using teacher's OAuth access token
 */
export function createOAuthSheetTemplateService(accessToken: string): OAuthSheetTemplateService {
  try {
    logger.info("Creating OAuthSheetTemplateService with access token");
    return new OAuthSheetTemplateService(accessToken);
  } catch (error) {
    logger.error("Failed to create OAuthSheetTemplateService", { error });
    throw error;
  }
}

// Exports for compatibility
export { SheetCreationResult, TeacherSheetTemplate };