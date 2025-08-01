/**
 * Roo Board Integration Web App
 * 
 * This AppScript is designed to be deployed as a web app that receives
 * sheet IDs via URL parameters and processes them securely.
 * 
 * DEPLOYMENT SETTINGS:
 * - Execute as: Me (your account)
 * - Who has access: Anyone with Google account
 * 
 * URL FORMAT FOR TEACHERS:
 * https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?sheetId=SHEET_ID_HERE
 */

// ============================================
// CONFIGURATION
// ============================================

const BOARD_CONFIG = {
  // Roo webhook endpoints
  WEBHOOK_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync',
  STATUS_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status',
  
  // Script property keys
  API_KEY_PROPERTY: 'ROO_BOARD_API_KEY',
  LAST_SYNC_PROPERTY: 'ROO_LAST_SYNC_TIME',
  
  // Processing configuration
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000
};

// ============================================
// WEB APP ENTRY POINT
// ============================================

/**
 * Main entry point for the web app
 * Called when teachers visit the URL with sheet ID parameter
 */
function doGet(e) {
  console.log("=== ROO BOARD WEB APP TRIGGERED ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Parameters:", JSON.stringify(e.parameter || {}));
  
  try {
    // Extract sheet ID from URL parameter
    const sheetId = e.parameter.sheetId;
    
    if (!sheetId) {
      console.log("❌ No sheet ID provided");
      return createErrorResponse("Missing required parameter: sheetId");
    }
    
    console.log("📋 Processing sheet ID:", sheetId);
    
    // Validate sheet ID format
    if (!isValidSheetId(sheetId)) {
      console.log("❌ Invalid sheet ID format");
      return createErrorResponse("Invalid sheet ID format");
    }
    
    // Check if API key is configured
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      console.log("❌ Board API key not configured");
      return createErrorResponse("Board integration not configured. Contact system administrator.");
    }
    
    // Process the teacher's sheet
    console.log("🔄 Starting sheet processing...");
    const processingResult = processTeacherSheet(sheetId);
    
    if (!processingResult.success) {
      console.log("❌ Sheet processing failed:", processingResult.error);
      return createErrorResponse("Sheet processing failed: " + processingResult.error);
    }
    
    console.log("✅ Sheet processing completed");
    console.log("📊 Processed submissions:", processingResult.submissionCount);
    
    // Sync to Roo system
    console.log("🔄 Starting Roo sync...");
    const syncResult = syncToRooSystem(sheetId, apiKey);
    
    if (syncResult.success) {
      console.log("✅ Roo sync completed successfully");
      return createSuccessResponse({
        message: "Processing and sync completed successfully",
        submissionsProcessed: processingResult.submissionCount,
        syncResults: syncResult.data
      });
    } else {
      console.log("⚠️ Roo sync had issues:", syncResult.error);
      return createWarningResponse({
        message: "Processing completed but sync had issues",
        submissionsProcessed: processingResult.submissionCount,
        syncError: syncResult.error
      });
    }
    
  } catch (error) {
    console.error("❌ Unexpected error:", error.toString());
    console.error("Stack trace:", error.stack);
    return createErrorResponse("Unexpected error occurred: " + error.message);
  }
}

/**
 * Health check endpoint
 * URL: ?action=health
 */
function doGet_Health() {
  return createSuccessResponse({
    status: "online",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    apiConfigured: !!getStoredApiKey()
  });
}

// ============================================
// CORE PROCESSING FUNCTIONS
// ============================================

/**
 * Process the teacher's Google Sheet submissions
 */
function processTeacherSheet(sheetId) {
  try {
    console.log("📖 Accessing sheet:", sheetId);
    
    // Try to open the sheet
    let sheet;
    try {
      sheet = SpreadsheetApp.openById(sheetId);
    } catch (error) {
      if (error.message.includes("Permission denied")) {
        return { 
          success: false, 
          error: "Cannot access sheet. Please ensure the sheet is shared with: " + Session.getActiveUser().getEmail()
        };
      }
      throw error;
    }
    
    console.log("📋 Sheet name:", sheet.getName());
    
    // Get all form responses (assuming they're on the first sheet)
    const responseSheet = sheet.getSheets()[0];
    const data = responseSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log("ℹ️ No data found in sheet (header only)");
      return { success: true, submissionCount: 0 };
    }
    
    // Process the data (you can customize this based on your sheet format)
    const headers = data[0];
    const submissions = data.slice(1); // Skip header row
    
    console.log("📊 Found", submissions.length, "submissions");
    console.log("📋 Headers:", headers.join(", "));
    
    // Here you could add specific processing logic if needed
    // For now, we'll just validate that we can read the data
    
    return { 
      success: true, 
      submissionCount: submissions.length,
      headers: headers,
      lastSubmission: submissions.length > 0 ? submissions[submissions.length - 1][0] : null
    };
    
  } catch (error) {
    console.error("❌ Error processing sheet:", error.toString());
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Sync processed data to Roo system
 */
function syncToRooSystem(sheetId, apiKey) {
  try {
    console.log("🔗 Calling Roo webhook...");
    
    // Determine teacher ID from the sheet or context
    const teacherId = determineTeacherId(sheetId);
    
    const payload = {
      spreadsheetId: sheetId,
      teacherId: teacherId,
      timestamp: new Date().toISOString(),
      source: 'board-webapp'
    };
    
    console.log("📤 Webhook payload:", JSON.stringify(payload, null, 2));
    
    const response = UrlFetchApp.fetch(BOARD_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("📥 Webhook response code:", responseCode);
    console.log("📥 Webhook response:", responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      try {
        const result = JSON.parse(responseText);
        console.log("✅ Sync successful");
        
        if (result.data) {
          console.log("📊 Sync results:");
          console.log("  - Classrooms created:", result.data.classroomsCreated || 0);
          console.log("  - Classrooms updated:", result.data.classroomsUpdated || 0);
          console.log("  - Students created:", result.data.studentsCreated || 0);
          console.log("  - Students updated:", result.data.studentsUpdated || 0);
          console.log("  - Errors:", result.data.totalErrors || 0);
        }
        
        // Record successful sync
        recordLastSync();
        
        return { success: true, data: result.data };
        
      } catch (parseError) {
        console.log("⚠️ Could not parse webhook response, but got success code");
        return { success: true, data: { raw: responseText } };
      }
    } else {
      console.log("❌ Webhook returned error code:", responseCode);
      let errorDetails = responseText;
      
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          errorDetails = errorData.error;
        }
      } catch (e) {
        // Use raw response text
      }
      
      return { 
        success: false, 
        error: `Webhook failed (${responseCode}): ${errorDetails}` 
      };
    }
    
  } catch (error) {
    console.error("❌ Error calling webhook:", error.toString());
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Determine teacher ID from sheet or context
 */
function determineTeacherId(sheetId) {
  // Try to get from sheet owner
  try {
    const sheet = SpreadsheetApp.openById(sheetId);
    const owner = sheet.getOwner();
    if (owner && owner.getEmail()) {
      console.log("📧 Teacher ID from sheet owner:", owner.getEmail());
      return owner.getEmail();
    }
  } catch (error) {
    console.log("⚠️ Could not get sheet owner:", error.message);
  }
  
  // Fallback to current user (the web app executor)
  const currentUser = Session.getActiveUser().getEmail();
  console.log("📧 Teacher ID from current user:", currentUser);
  return currentUser;
}

/**
 * Validate sheet ID format
 */
function isValidSheetId(sheetId) {
  // Google Sheet IDs are typically 44 characters long and contain letters, numbers, and some symbols
  const sheetIdPattern = /^[a-zA-Z0-9\-_]{25,}$/;
  return sheetIdPattern.test(sheetId);
}

/**
 * Get stored API key
 */
function getStoredApiKey() {
  const properties = PropertiesService.getScriptProperties();
  return properties.getProperty(BOARD_CONFIG.API_KEY_PROPERTY);
}

/**
 * Record last sync time
 */
function recordLastSync() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(BOARD_CONFIG.LAST_SYNC_PROPERTY, new Date().toISOString());
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create success response
 */
function createSuccessResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Create warning response (partial success)
 */
function createWarningResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      warning: true,
      data: data,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Create error response
 */
function createErrorResponse(error) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: error,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// ADMIN SETUP FUNCTIONS
// ============================================

/**
 * Setup function - run this once to configure the API key
 * ONLY YOU (the deployer) should run this function
 */
function setupBoardApiKey() {
  console.log("=== SETTING UP BOARD API KEY ===");
  
  // Use the working API key (temporary - until board key is active)
  const apiKey = "roo-webhook-dev-stable123456";
  
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(BOARD_CONFIG.API_KEY_PROPERTY, apiKey);
  
  console.log("✅ Board API key configured");
  console.log("API Key preview:", apiKey.substring(0, 12) + "...");
  
  // Test the connection
  testBoardConnection();
}

/**
 * Test the board connection to Roo
 */
function testBoardConnection() {
  console.log("=== TESTING BOARD CONNECTION ===");
  
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    console.log("❌ No API key configured. Run setupBoardApiKey() first");
    return;
  }
  
  try {
    const response = UrlFetchApp.fetch(BOARD_CONFIG.STATUS_URL, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Status response code:", responseCode);
    
    if (responseCode === 200) {
      console.log("✅ Board connection successful!");
      try {
        const data = JSON.parse(responseText);
        console.log("Webhook version:", data.data?.webhookVersion);
      } catch (e) {
        console.log("Response received but could not parse JSON");
      }
    } else {
      console.log("❌ Connection failed:", responseText);
    }
    
  } catch (error) {
    console.log("❌ Connection test failed:", error.toString());
  }
}

/**
 * Test with a sample sheet ID
 * Replace SHEET_ID with an actual sheet ID for testing
 */
function testWithSampleSheet() {
  console.log("=== TESTING WITH SAMPLE SHEET ===");
  
  // Replace this with an actual sheet ID you have access to
  const testSheetId = "1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g";
  
  console.log("Testing with sheet:", testSheetId);
  
  // Simulate the doGet call
  const mockEvent = { parameter: { sheetId: testSheetId } };
  const result = doGet(mockEvent);
  
  console.log("Test result:", result.getContent());
}

/**
 * Clear configuration (for troubleshooting)
 */
function clearBoardConfig() {
  console.log("=== CLEARING BOARD CONFIGURATION ===");
  
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty(BOARD_CONFIG.API_KEY_PROPERTY);
  properties.deleteProperty(BOARD_CONFIG.LAST_SYNC_PROPERTY);
  
  console.log("✅ Board configuration cleared");
  console.log("Run setupBoardApiKey() to reconfigure");
}

/**
 * Show current configuration status
 */
function showBoardStatus() {
  console.log("=== BOARD CONFIGURATION STATUS ===");
  
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty(BOARD_CONFIG.API_KEY_PROPERTY);
  const lastSync = properties.getProperty(BOARD_CONFIG.LAST_SYNC_PROPERTY);
  
  console.log("Webhook URL:", BOARD_CONFIG.WEBHOOK_URL);
  console.log("API Key configured:", !!apiKey);
  if (apiKey) {
    console.log("API Key preview:", apiKey.substring(0, 12) + "...");
  }
  console.log("Last sync:", lastSync || "Never");
  console.log("Current user:", Session.getActiveUser().getEmail());
}