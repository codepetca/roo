/**
 * QUICK WEBHOOK TEST FOR APPSCRIPT
 * 
 * This is a simplified test script - just copy all of this code
 * into a new AppScript project and run quickTestWebhook()
 */

// Configuration - Already set up with working values!
const WEBHOOK_CONFIG = {
  statusUrl: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status',
  syncUrl: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync',
  apiKey: 'roo-webhook-dev-stable123456',
  spreadsheetId: '1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g',
  teacherId: 'stewart.chan@gapps.yrdsb.ca'
};

/**
 * MAIN TEST FUNCTION - RUN THIS!
 * Tests both webhook endpoints and shows clear results
 */
function quickTestWebhook() {
  console.log("========================================");
  console.log("🚀 STARTING WEBHOOK TEST");
  console.log("========================================\n");
  
  // Test 1: Check if API is online
  console.log("📡 Test 1: Checking API health...");
  const apiOnline = testApiHealth();
  
  if (!apiOnline) {
    console.log("❌ API is not responding. Please check deployment.");
    return;
  }
  
  // Test 2: Test webhook status
  console.log("\n📊 Test 2: Testing webhook status endpoint...");
  const statusWorks = testWebhookStatus();
  
  if (!statusWorks) {
    console.log("❌ Webhook status endpoint failed.");
    console.log("   Check API key: " + WEBHOOK_CONFIG.apiKey);
    return;
  }
  
  // Test 3: Test classroom sync
  console.log("\n🔄 Test 3: Testing classroom sync...");
  const syncResult = testClassroomSync();
  
  // Summary
  console.log("\n========================================");
  console.log("📝 TEST SUMMARY");
  console.log("========================================");
  console.log("✅ API Health: PASSED");
  console.log(statusWorks ? "✅ Webhook Status: PASSED" : "❌ Webhook Status: FAILED");
  console.log(syncResult ? "✅ Classroom Sync: PASSED" : "⚠️  Classroom Sync: PARTIAL (check errors)");
  
  if (statusWorks && syncResult) {
    console.log("\n🎉 ALL TESTS PASSED! Webhook integration is ready!");
    console.log("📋 Next step: Integrate with your existing AppScript");
  }
}

/**
 * Test if the API is online
 */
function testApiHealth() {
  try {
    const response = UrlFetchApp.fetch('https://us-central1-roo-app-3d24e.cloudfunctions.net/api/', {
      method: 'GET',
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      console.log("   ✅ API is online");
      
      // Check for webhook endpoints
      const data = JSON.parse(response.getContentText());
      const endpoints = Object.keys(data.endpoints || {});
      const webhookCount = endpoints.filter(ep => ep.includes('webhook')).length;
      
      if (webhookCount > 0) {
        console.log("   ✅ Found " + webhookCount + " webhook endpoints");
      } else {
        console.log("   ⚠️  No webhook endpoints found");
      }
      
      return true;
    }
  } catch (error) {
    console.log("   ❌ Error: " + error.toString());
  }
  return false;
}

/**
 * Test webhook status endpoint
 */
function testWebhookStatus() {
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_CONFIG.statusUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': WEBHOOK_CONFIG.apiKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    const text = response.getContentText();
    
    if (code === 200) {
      console.log("   ✅ Status endpoint working (HTTP 200)");
      
      try {
        const data = JSON.parse(text);
        if (data.success && data.data) {
          console.log("   ℹ️  Webhook version: " + data.data.webhookVersion);
          return true;
        }
      } catch (e) {
        console.log("   ⚠️  Could not parse response");
      }
    } else if (code === 401) {
      console.log("   ❌ Authentication failed (HTTP 401)");
      console.log("   ❌ API Key invalid: " + WEBHOOK_CONFIG.apiKey);
    } else {
      console.log("   ❌ Unexpected response code: " + code);
    }
    
  } catch (error) {
    console.log("   ❌ Error: " + error.toString());
  }
  return false;
}

/**
 * Test classroom sync endpoint
 */
function testClassroomSync() {
  try {
    console.log("   📤 Sending sync request...");
    console.log("   📋 Spreadsheet: " + WEBHOOK_CONFIG.spreadsheetId.substring(0, 10) + "...");
    console.log("   👤 Teacher: " + WEBHOOK_CONFIG.teacherId);
    
    const response = UrlFetchApp.fetch(WEBHOOK_CONFIG.syncUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': WEBHOOK_CONFIG.apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        spreadsheetId: WEBHOOK_CONFIG.spreadsheetId,
        teacherId: WEBHOOK_CONFIG.teacherId
      }),
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    const text = response.getContentText();
    
    console.log("   📥 Response code: " + code);
    
    if (code >= 200 && code < 300) {
      try {
        const result = JSON.parse(text);
        
        if (result.data) {
          console.log("\n   📊 Sync Results:");
          console.log("   - Classrooms created: " + (result.data.classroomsCreated || 0));
          console.log("   - Classrooms updated: " + (result.data.classroomsUpdated || 0));
          console.log("   - Students created: " + (result.data.studentsCreated || 0));
          console.log("   - Students updated: " + (result.data.studentsUpdated || 0));
          
          if (result.data.errors && result.data.errors.length > 0) {
            console.log("\n   ⚠️  Errors encountered:");
            result.data.errors.forEach((error, i) => {
              console.log("   " + (i + 1) + ". " + error);
            });
            console.log("\n   ℹ️  Note: Permission errors are EXPECTED in test environment");
          }
        }
        
        return code === 200; // Full success
        
      } catch (e) {
        console.log("   ⚠️  Could not parse response");
      }
    } else {
      console.log("   ❌ Sync failed with code: " + code);
      console.log("   Response: " + text);
    }
    
  } catch (error) {
    console.log("   ❌ Error: " + error.toString());
  }
  return false;
}

/**
 * Alternative: Test just the connection
 */
function simpleConnectionTest() {
  console.log("🔌 Testing basic connection...\n");
  
  const url = WEBHOOK_CONFIG.statusUrl;
  const apiKey = WEBHOOK_CONFIG.apiKey;
  
  console.log("URL: " + url);
  console.log("API Key: " + apiKey.substring(0, 20) + "...");
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    console.log("\nResponse Code: " + code);
    console.log("Response: " + response.getContentText());
    
    if (code === 200) {
      console.log("\n✅ Connection successful!");
    } else {
      console.log("\n❌ Connection failed!");
    }
    
  } catch (error) {
    console.log("\n❌ Error: " + error.toString());
  }
}

/*
 * HOW TO USE THIS TEST SCRIPT:
 * 
 * 1. Copy ALL of this code
 * 2. Go to https://script.google.com
 * 3. Create a new project
 * 4. Delete the default code
 * 5. Paste this code
 * 6. Save (Ctrl+S or Cmd+S)
 * 7. Run quickTestWebhook() from the dropdown
 * 8. Grant permissions when prompted
 * 9. View results in View > Logs
 * 
 * If all tests pass, you're ready to integrate!
 */