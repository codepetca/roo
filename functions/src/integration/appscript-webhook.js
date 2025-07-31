/**
 * AppScript Integration for Automatic Classroom Sync
 * 
 * INSTRUCTIONS FOR TEACHERS:
 * 1. Copy the functions below into your existing AppScript project
 * 2. Set up the API key using setupRooWebhook() function
 * 3. The syncClassroomsToRoo() function will be called automatically after processAllSubmissions()
 * 
 * This enables automatic classroom and student syncing whenever your board data is processed!
 */

// ============================================
// CONFIGURATION
// ============================================
const ROO_CONFIG = {
  // Your Firebase Functions API URL
  WEBHOOK_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync',
  STATUS_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status',
  
  // Property keys for storing configuration
  API_KEY_PROPERTY: 'ROO_WEBHOOK_API_KEY',
  TEACHER_ID_PROPERTY: 'ROO_TEACHER_ID',
  LAST_SYNC_PROPERTY: 'ROO_LAST_SYNC_TIME'
};

// ============================================
// SETUP FUNCTIONS (Run these once)
// ============================================

/**
 * Initial setup - call this once to configure the webhook
 * This will be provided by the Roo system admin
 */
function setupRooWebhook() {
  console.log("=== ROO WEBHOOK SETUP ===");
  
  // WORKING VALUES - ready to use!
  const apiKey = "roo-webhook-dev-stable123456"; // Working API key
  const teacherId = "stewart.chan@gapps.yrdsb.ca"; // Your teacher ID
  
  if (apiKey === "YOUR_API_KEY_HERE" || teacherId === "YOUR_TEACHER_ID_HERE") {
    console.log("❌ Please replace the placeholder values with actual API key and teacher ID");
    console.log("Contact your Roo system administrator for these values");
    return;
  }
  
  // Store configuration securely
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    [ROO_CONFIG.API_KEY_PROPERTY]: apiKey,
    [ROO_CONFIG.TEACHER_ID_PROPERTY]: teacherId
  });
  
  console.log("✅ Roo webhook configured successfully");
  console.log("API Key stored (last 4 chars):", apiKey.slice(-4));
  console.log("Teacher ID:", teacherId);
  
  // Test the connection
  testRooConnection();
}

/**
 * Test connection to Roo webhook
 */
function testRooConnection() {
  console.log("\n=== TESTING ROO CONNECTION ===");
  
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty(ROO_CONFIG.API_KEY_PROPERTY);
  
  if (!apiKey) {
    console.log("❌ API key not configured. Run setupRooWebhook() first");
    return;
  }
  
  try {
    const response = UrlFetchApp.fetch(ROO_CONFIG.STATUS_URL, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Status check response:", responseCode);
    
    if (responseCode === 200) {
      console.log("✅ Connection to Roo successful!");
      const data = JSON.parse(responseText);
      console.log("Webhook version:", data.data?.webhookVersion);
    } else {
      console.log("❌ Connection failed:", responseText);
    }
    
  } catch (error) {
    console.log("❌ Connection test failed:", error.toString());
  }
}

// ============================================
// MAIN SYNC FUNCTIONS
// ============================================

/**
 * Sync classrooms to Roo system
 * Call this after processing submissions to keep Roo updated
 */
function syncClassroomsToRoo() {
  console.log("\n=== SYNCING CLASSROOMS TO ROO ===");
  
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty(ROO_CONFIG.API_KEY_PROPERTY);
  const teacherId = properties.getProperty(ROO_CONFIG.TEACHER_ID_PROPERTY);
  
  if (!apiKey || !teacherId) {
    console.log("❌ Roo webhook not configured. Run setupRooWebhook() first");
    return false;
  }
  
  try {
    // Get the current spreadsheet ID
    const spreadsheetId = CONFIG.PERSONAL_SPREADSHEET_ID; // From existing AppScript
    
    if (!spreadsheetId) {
      console.log("❌ No spreadsheet ID available");
      return false;
    }
    
    console.log("Syncing to Roo...");
    console.log("Spreadsheet ID:", spreadsheetId);
    console.log("Teacher ID:", teacherId);
    
    const startTime = new Date().getTime();
    
    const response = UrlFetchApp.fetch(ROO_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        spreadsheetId: spreadsheetId,
        teacherId: teacherId,
        timestamp: new Date().toISOString(),
        source: 'appscript-auto-sync'
      }),
      muteHttpExceptions: true
    });
    
    const duration = new Date().getTime() - startTime;
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log(`Roo sync completed in ${duration}ms`);
    console.log("Response code:", responseCode);
    
    if (responseCode >= 200 && responseCode < 300) {
      // Success
      const result = JSON.parse(responseText);
      console.log("✅ Classroom sync successful!");
      
      if (result.data) {
        console.log("Results:");
        console.log(`  Classrooms created: ${result.data.classroomsCreated || 0}`);
        console.log(`  Classrooms updated: ${result.data.classroomsUpdated || 0}`);
        console.log(`  Students created: ${result.data.studentsCreated || 0}`);
        console.log(`  Students updated: ${result.data.studentsUpdated || 0}`);
        console.log(`  Errors: ${result.data.totalErrors || 0}`);
      }
      
      // Record successful sync
      properties.setProperty(ROO_CONFIG.LAST_SYNC_PROPERTY, new Date().toISOString());
      
      return true;
      
    } else {
      // Error
      console.log("❌ Roo sync failed");
      console.log("Response:", responseText);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          console.log("Error details:", errorData.error);
        }
        if (errorData.data && errorData.data.errors) {
          console.log("Specific errors:", errorData.data.errors);
        }
      } catch (parseError) {
        console.log("Could not parse error response");
      }
      
      return false;
    }
    
  } catch (error) {
    console.log("❌ Roo sync failed with exception:", error.toString());
    return false;
  }
}

/**
 * Get sync status and history
 */
function getRooSyncStatus() {
  console.log("=== ROO SYNC STATUS ===");
  
  const properties = PropertiesService.getScriptProperties();
  const lastSync = properties.getProperty(ROO_CONFIG.LAST_SYNC_PROPERTY);
  const teacherId = properties.getProperty(ROO_CONFIG.TEACHER_ID_PROPERTY);
  const hasApiKey = !!properties.getProperty(ROO_CONFIG.API_KEY_PROPERTY);
  
  console.log("Configuration status:");
  console.log("  API Key configured:", hasApiKey ? "✅ Yes" : "❌ No");
  console.log("  Teacher ID:", teacherId || "❌ Not set");
  console.log("  Last successful sync:", lastSync || "❌ Never");
  
  if (lastSync) {
    const lastSyncDate = new Date(lastSync);
    const timeSinceSync = (new Date().getTime() - lastSyncDate.getTime()) / 1000 / 60; // minutes
    console.log(`  Time since last sync: ${Math.round(timeSinceSync)} minutes ago`);
  }
}

// ============================================
// INTEGRATION WITH EXISTING APPSCRIPT
// ============================================

/**
 * MODIFIED processAllSubmissions function
 * Add this to your existing AppScript (replace the existing function)
 */
function processAllSubmissions() {
  console.log("Starting complete submission processing...");

  try {
    // Validate spreadsheet access before processing
    try {
      const spreadsheetId = CONFIG.PERSONAL_SPREADSHEET_ID;
      console.log(`Using spreadsheet ID: ${spreadsheetId}`);
    } catch (configError) {
      console.error("Configuration error:", configError);
      throw new Error(`Cannot proceed without valid spreadsheet ID: ${configError.message}`);
    }

    // Process all submission types (EXISTING CODE)
    const allData = processAllSubmissionTypes();

    if (allData.length === 0) {
      console.log("No submissions found to process");
      return;
    }

    // Write to personal sheets (EXISTING CODE)
    writeToPersonalSheets(allData);

    console.log(`Successfully processed ${allData.length} total submissions`);
    
    // NEW: Sync classrooms to Roo system
    console.log("\n" + "=".repeat(50));
    console.log("SYNCING CLASSROOMS TO ROO SYSTEM");
    console.log("=".repeat(50));
    
    const syncSuccess = syncClassroomsToRoo();
    
    if (syncSuccess) {
      console.log("✅ Complete processing finished with Roo sync");
    } else {
      console.log("⚠️ Processing completed but Roo sync failed");
      console.log("   Submissions are still saved to your sheets");
      console.log("   Contact your system administrator if sync issues persist");
    }
    
  } catch (error) {
    console.error("Error in processAllSubmissions:", error);
    throw error; // Re-throw for web app error handling
  }
}

/**
 * Manual sync function - call this anytime to sync classrooms
 */
function manualSyncToRoo() {
  console.log("=== MANUAL ROO SYNC ===");
  
  const success = syncClassroomsToRoo();
  
  if (success) {
    console.log("✅ Manual sync completed successfully");
  } else {
    console.log("❌ Manual sync failed - check logs above");
  }
  
  return success;
}

// ============================================
// DEBUGGING AND MAINTENANCE
// ============================================

/**
 * Clear Roo configuration (for troubleshooting)
 */
function clearRooConfig() {
  console.log("=== CLEARING ROO CONFIGURATION ===");
  
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty(ROO_CONFIG.API_KEY_PROPERTY);
  properties.deleteProperty(ROO_CONFIG.TEACHER_ID_PROPERTY);
  properties.deleteProperty(ROO_CONFIG.LAST_SYNC_PROPERTY);
  
  console.log("✅ Roo configuration cleared");
  console.log("Run setupRooWebhook() to reconfigure");
}

/**
 * Show current configuration (without exposing secrets)
 */
function showRooConfig() {
  console.log("=== ROO CONFIGURATION ===");
  
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty(ROO_CONFIG.API_KEY_PROPERTY);
  const teacherId = properties.getProperty(ROO_CONFIG.TEACHER_ID_PROPERTY);
  
  console.log("Webhook URL:", ROO_CONFIG.WEBHOOK_URL);
  console.log("API Key configured:", !!apiKey);
  if (apiKey) {
    console.log("API Key preview:", apiKey.substring(0, 8) + "..." + apiKey.slice(-4));
  }
  console.log("Teacher ID:", teacherId);
  
  console.log("\nTo reconfigure, run setupRooWebhook()");
  console.log("To test connection, run testRooConnection()");
  console.log("To sync manually, run manualSyncToRoo()");
}

// ============================================
// INSTRUCTIONS SUMMARY
// ============================================

/*

SETUP INSTRUCTIONS FOR TEACHERS:

1. COPY THIS CODE:
   - Copy all the functions above
   - Paste them into your existing AppScript project
   - Save the project

2. GET YOUR CREDENTIALS:
   - Contact your Roo system administrator
   - Get your API key and teacher ID
   
3. CONFIGURE:
   - Replace "YOUR_API_KEY_HERE" and "YOUR_TEACHER_ID_HERE" in setupRooWebhook()
   - Run setupRooWebhook() once
   - Run testRooConnection() to verify

4. INTEGRATE:
   - Replace your existing processAllSubmissions() function with the modified one above
   - Or add syncClassroomsToRoo() call to your existing processing

5. TEST:
   - Run processAllSubmissions() to test the full flow
   - Check that classrooms and students appear in the Roo system
   - Use manualSyncToRoo() for on-demand syncing

WHAT HAPPENS:
- Every time your AppScript processes submissions (daily at 10 PM)
- It will automatically sync classroom and student data to the Roo system
- Teachers and students will see up-to-date class rosters
- New students are automatically added to the system

TROUBLESHOOTING:
- Run getRooSyncStatus() to check configuration
- Run testRooConnection() to verify connectivity
- Run showRooConfig() to see current settings
- Run clearRooConfig() to reset and start over

*/