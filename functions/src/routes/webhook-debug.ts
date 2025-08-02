/**
 * Debug endpoints for webhook troubleshooting
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { google } from "googleapis";
import { db, getCurrentTimestamp } from "../config/firebase";

/**
 * Get current service account information
 */
export async function getServiceAccountInfo(req: Request, res: Response): Promise<Response> {
  try {
    // Get the default auth client
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/userinfo.email"]
    });
    
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    // Try to get the service account email
    let serviceAccountEmail = "unknown";
    try {
      const tokenInfo = await client.getAccessToken();
      if (tokenInfo && tokenInfo.token) {
        // Use the OAuth2 API to get token info
        const oauth2 = google.oauth2({ version: 'v2', auth: auth });
        const tokenInfoResponse = await oauth2.tokeninfo();
        serviceAccountEmail = tokenInfoResponse.data.email || "unknown";
      }
    } catch (error) {
      logger.warn("Could not get service account email from token", { error });
      
      // Try alternate method
      try {
        const credentials = await auth.getCredentials();
        serviceAccountEmail = credentials.client_email || "unknown";
      } catch (credError) {
        logger.warn("Could not get service account email from credentials", { error: credError });
      }
    }
    
    // Get recent sync history
    const recentSyncs = await db.collection('webhook_sync_history')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    const syncHistory = recentSyncs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return res.status(200).json({
      success: true,
      serviceAccount: {
        email: serviceAccountEmail,
        projectId: projectId
      },
      environment: {
        FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR || 'not set',
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set',
        NODE_ENV: process.env.NODE_ENV || 'not set'
      },
      recentSyncHistory: syncHistory,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error("Failed to get service account info", { error });
    return res.status(500).json({
      success: false,
      error: "Failed to get service account information",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Test Google Sheets access with detailed diagnostics
 */
export async function testSheetAccess(req: Request, res: Response): Promise<Response> {
  const { spreadsheetId } = req.query;
  
  if (!spreadsheetId) {
    return res.status(400).json({
      success: false,
      error: "spreadsheetId query parameter is required"
    });
  }
  
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: auth });
    
    // Try to get spreadsheet metadata
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId as string
    });
    
    return res.status(200).json({
      success: true,
      sheetInfo: {
        title: metadata.data.properties?.title,
        locale: metadata.data.properties?.locale,
        timeZone: metadata.data.properties?.timeZone,
        sheets: metadata.data.sheets?.map(s => ({
          title: s.properties?.title,
          index: s.properties?.index,
          rowCount: s.properties?.gridProperties?.rowCount,
          columnCount: s.properties?.gridProperties?.columnCount
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails: any = { message: errorMessage };
    
    // Check for specific Google API errors
    if (error instanceof Error && 'code' in error) {
      errorDetails.code = (error as any).code;
    }
    if (error instanceof Error && 'errors' in error) {
      errorDetails.errors = (error as any).errors;
    }
    
    return res.status(500).json({
      success: false,
      error: "Failed to access spreadsheet",
      details: errorDetails,
      helpfulHints: [
        "Make sure the spreadsheet is shared with the service account",
        "Check the service account email using /webhooks/debug/service-account",
        "Verify the spreadsheet ID is correct"
      ],
      timestamp: new Date().toISOString()
    });
  }
}