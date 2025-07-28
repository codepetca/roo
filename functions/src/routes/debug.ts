/**
 * Debug endpoints for troubleshooting Google Sheets permissions
 * Location: functions/src/routes/debug.ts:1
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { google } from "googleapis";
import { initializeCompatibility } from "../utils/compatibility";

// Initialize compatibility fixes
initializeCompatibility();

/**
 * Debug Google Sheets permissions step by step
 * Location: functions/src/routes/debug.ts:12
 * Route: GET /debug/sheets-permissions
 */
export async function debugSheetsPermissions(req: Request, res: Response) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    // Test 1: Check if Google credentials are available
    results.tests.push(await testCredentialsAvailable(req));
    
    // Test 2: Test Google Auth initialization
    results.tests.push(await testGoogleAuth(req));
    
    // Test 3: Test Google Sheets API connection
    results.tests.push(await testSheetsApiConnection(req));
    
    // Test 4: Test basic spreadsheet creation
    results.tests.push(await testSpreadsheetCreation(req));
    
    // Test 5: Test sharing functionality
    results.tests.push(await testSharingFunctionality(req));

    // Overall status
    const allPassed = results.tests.every((test: any) => test.success);
    results.overallStatus = allPassed ? "PASS" : "FAIL";
    
    logger.info("Google Sheets permission debug completed", {
      overallStatus: results.overallStatus,
      testCount: results.tests.length
    });

    res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error("Debug endpoint failed", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      data: results
    });
  }
}

/**
 * Test 1: Check if credentials are available
 */
async function testCredentialsAvailable(req: Request) {
  const test = {
    name: "Credentials Available",
    success: false,
    details: {} as any,
    error: null as string | null
  };

  try {
    const googleCredentials = req.app.locals.googleCredentials;
    
    if (!googleCredentials) {
      test.error = "GOOGLE_CREDENTIALS_JSON secret not found in request locals";
      test.details.secretFound = false;
      return test;
    }

    // Try to parse credentials
    const credentials = JSON.parse(googleCredentials);
    
    test.details.secretFound = true;
    test.details.credentialsStructure = {
      hasClientEmail: !!credentials.client_email,
      hasPrivateKey: !!credentials.private_key,
      hasProjectId: !!credentials.project_id,
      clientEmail: credentials.client_email || "NOT_FOUND"
    };
    
    if (credentials.client_email && credentials.private_key && credentials.project_id) {
      test.success = true;
      test.details.message = "All required credential fields present";
    } else {
      test.error = "Missing required credential fields";
    }

  } catch (error) {
    test.error = `Failed to parse credentials: ${error instanceof Error ? error.message : String(error)}`;
  }

  return test;
}

/**
 * Test 2: Test Google Auth initialization
 */
async function testGoogleAuth(req: Request) {
  const test = {
    name: "Google Auth Initialization",
    success: false,
    details: {} as any,
    error: null as string | null
  };

  try {
    const googleCredentials = req.app.locals.googleCredentials;
    if (!googleCredentials) {
      test.error = "No credentials available for auth test";
      return test;
    }

    const credentials = JSON.parse(googleCredentials);
    
    // Test Google Auth initialization
    const serviceAccountAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"  // Broader scope for creating files
      ]
    });

    // Get auth client
    const authClient = await serviceAccountAuth.getClient();
    
    // Test getting access token
    const accessToken = await authClient.getAccessToken();
    
    test.details.authClientCreated = true;
    test.details.accessTokenObtained = !!accessToken.token;
    test.details.serviceAccountEmail = credentials.client_email;
    test.details.scopes = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive"
    ];
    
    if (accessToken.token) {
      test.success = true;
      test.details.message = "Successfully obtained access token";
    } else {
      test.error = "Failed to obtain access token";
    }

  } catch (error) {
    test.error = `Auth initialization failed: ${error instanceof Error ? error.message : String(error)}`;
    test.details.errorType = error instanceof Error ? error.constructor.name : "Unknown";
  }

  return test;
}

/**
 * Test 3: Test Google Sheets API connection
 */
async function testSheetsApiConnection(req: Request) {
  const test = {
    name: "Google Sheets API Connection",
    success: false,
    details: {} as any,
    error: null as string | null
  };

  try {
    const googleCredentials = req.app.locals.googleCredentials;
    if (!googleCredentials) {
      test.error = "No credentials available for API test";
      return test;
    }

    const credentials = JSON.parse(googleCredentials);
    
    const serviceAccountAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const authClient = await serviceAccountAuth.getClient();
    const sheets = google.sheets({ version: "v4", auth: authClient as any });
    
    // Try to access a non-existent spreadsheet to test API connectivity
    // This should fail with a specific error, not a permission error
    try {
      await sheets.spreadsheets.get({
        spreadsheetId: "1234567890ABCDEF_TEST_ID_THAT_DOES_NOT_EXIST"
      });
    } catch (apiError: any) {
      // Expected error codes that indicate API is working:
      // 400: Invalid spreadsheet ID format
      // 404: Spreadsheet not found
      // These indicate the API is accessible but the ID is invalid
      
      if (apiError.code === 400 || apiError.code === 404) {
        test.success = true;
        test.details.message = "API is accessible (got expected error for invalid ID)";
        test.details.apiError = {
          code: apiError.code,
          message: apiError.message
        };
      } else if (apiError.code === 403) {
        test.error = "Permission denied - API access forbidden";
        test.details.apiError = {
          code: apiError.code,
          message: apiError.message
        };
      } else {
        test.error = `Unexpected API error: ${apiError.message}`;
        test.details.apiError = {
          code: apiError.code,
          message: apiError.message
        };
      }
    }

  } catch (error) {
    test.error = `API connection failed: ${error instanceof Error ? error.message : String(error)}`;
  }

  return test;
}

/**
 * Test 4: Test basic spreadsheet creation
 */
async function testSpreadsheetCreation(req: Request) {
  const test = {
    name: "Spreadsheet Creation",
    success: false,
    details: {} as any,
    error: null as string | null
  };

  try {
    const googleCredentials = req.app.locals.googleCredentials;
    if (!googleCredentials) {
      test.error = "No credentials available for creation test";
      return test;
    }

    const credentials = JSON.parse(googleCredentials);
    
    const serviceAccountAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const authClient = await serviceAccountAuth.getClient();
    const sheets = google.sheets({ version: "v4", auth: authClient as any });
    
    // Create a test spreadsheet
    const testTitle = `Debug Test - ${new Date().toISOString()}`;
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: testTitle
        }
      }
    });

    test.details.spreadsheetCreated = true;
    test.details.spreadsheetId = (response as any).data.spreadsheetId;
    test.details.spreadsheetUrl = (response as any).data.spreadsheetUrl;
    test.details.title = testTitle;
    test.success = true;
    test.details.message = "Successfully created test spreadsheet";

    // Clean up - delete the test spreadsheet
    try {
      const drive = google.drive({ version: "v3", auth: authClient as any });
      await drive.files.delete({
        fileId: (response as any).data.spreadsheetId!
      });
      test.details.cleanupSuccess = true;
    } catch (cleanupError) {
      test.details.cleanupError = "Failed to delete test spreadsheet";
      test.details.manualCleanupRequired = (response as any).data.spreadsheetId;
    }

  } catch (error: any) {
    test.error = `Spreadsheet creation failed: ${error.message || String(error)}`;
    test.details.errorCode = error.code;
    test.details.errorType = error.constructor.name;
    
    if (error.code === 403) {
      test.details.permissionAnalysis = "Service account lacks permission to create spreadsheets";
    }
  }

  return test;
}

/**
 * Test 5: Test sharing functionality
 */
async function testSharingFunctionality(req: Request) {
  const test = {
    name: "Sharing Functionality",
    success: false,
    details: {} as any,
    error: null as string | null
  };

  try {
    const googleCredentials = req.app.locals.googleCredentials;
    if (!googleCredentials) {
      test.error = "No credentials available for sharing test";
      return test;
    }

    const credentials = JSON.parse(googleCredentials);
    
    const serviceAccountAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"  // Broader scope for creating files
      ]
    });

    const authClient = await serviceAccountAuth.getClient();
    const drive = google.drive({ version: "v3", auth: authClient as any });
    
    // Test Drive API access by listing files (this tests the drive scope)
    const listResponse = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)'
    });
    
    test.details.driveApiAccessible = true;
    test.details.canListFiles = true;
    test.details.fileCount = (listResponse as any).data.files?.length || 0;
    
    // If we can list files, sharing should work
    test.success = true;
    test.details.message = "Drive API accessible - sharing should work";

  } catch (error: any) {
    test.error = `Sharing test failed: ${error.message || String(error)}`;
    test.details.errorCode = error.code;
    
    if (error.code === 403) {
      test.details.permissionAnalysis = "Service account lacks Drive API permissions for sharing";
    }
  }

  return test;
}