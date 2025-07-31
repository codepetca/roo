/**
 * Test the new webhook endpoint from AppScript
 * 
 * INSTRUCTIONS:
 * 1. First, deploy the webhook endpoint: npm run deploy
 * 2. Copy this code to a new AppScript project
 * 3. Set the API key (you'll get this after deployment)
 * 4. Run testWebhookEndpoint() to verify it works
 */

const TEST_CONFIG = {
  WEBHOOK_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync',
  STATUS_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status',
  
  // WORKING API KEY - ready to use!
  API_KEY: 'roo-webhook-dev-stable123456',
  
  // Your test spreadsheet ID
  SPREADSHEET_ID: '1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g',
  
  // Your teacher ID (email or UID)
  TEACHER_ID: 'stewart.chan@gapps.yrdsb.ca'
};

/**
 * Test the webhook endpoint
 */
function testWebhookEndpoint() {
  console.log("=== TESTING WEBHOOK ENDPOINT ===");
  
  console.log("Webhook URL:", TEST_CONFIG.WEBHOOK_URL);
  console.log("Using API Key:", TEST_CONFIG.API_KEY.substring(0, 12) + "...");
  console.log("Spreadsheet ID:", TEST_CONFIG.SPREADSHEET_ID);
  console.log("Teacher ID:", TEST_CONFIG.TEACHER_ID);
  
  try {
    const startTime = new Date().getTime();
    
    const response = UrlFetchApp.fetch(TEST_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': TEST_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        spreadsheetId: TEST_CONFIG.SPREADSHEET_ID,
        teacherId: TEST_CONFIG.TEACHER_ID
      }),
      muteHttpExceptions: true
    });
    
    const duration = new Date().getTime() - startTime;
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log(`\nResponse received in ${duration}ms`);
    console.log("Response Code:", responseCode);
    console.log("Response:", responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      console.log("✅ WEBHOOK TEST SUCCESSFUL!");
      
      try {
        const result = JSON.parse(responseText);
        if (result.data) {
          console.log("\nSync Results:");
          console.log("  Classrooms created:", result.data.classroomsCreated || 0);
          console.log("  Classrooms updated:", result.data.classroomsUpdated || 0);
          console.log("  Students created:", result.data.studentsCreated || 0);
          console.log("  Students updated:", result.data.studentsUpdated || 0);
          console.log("  Errors:", result.data.totalErrors || 0);
          
          if (result.data.errors && result.data.errors.length > 0) {
            console.log("\nErrors encountered:");
            result.data.errors.forEach((error, index) => {
              console.log(`  ${index + 1}. ${error}`);
            });
          }
        }
        
        console.log("\n🎉 Automatic classroom syncing is working! 🎉");
        
      } catch (parseError) {
        console.log("Could not parse response JSON, but webhook worked");
      }
      
    } else if (responseCode === 401) {
      console.log("❌ Authentication failed - check your API key");
      console.log("Current API key:", TEST_CONFIG.API_KEY);
      console.log("Check Firebase Functions logs for the correct API key");
      
    } else if (responseCode === 400) {
      console.log("❌ Bad request - check your parameters");
      console.log("Make sure spreadsheetId and teacherId are correct");
      
    } else if (responseCode === 404) {
      console.log("❌ Endpoint not found - webhook may not be deployed yet");
      console.log("Run 'npm run deploy' to deploy the webhook endpoint");
      
    } else {
      console.log("❌ Unexpected response code:", responseCode);
      console.log("Response:", responseText);
    }
    
  } catch (error) {
    console.log("❌ Test failed with error:", error.toString());
  }
}

/**
 * Test the webhook status endpoint
 */
function testWebhookStatus() {
  console.log("=== TESTING WEBHOOK STATUS ===");
  
  try {
    const response = UrlFetchApp.fetch(TEST_CONFIG.STATUS_URL, {
      method: 'GET',
      headers: {
        'X-API-Key': TEST_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Status Response Code:", responseCode);
    console.log("Status Response:", responseText);
    
    if (responseCode === 200) {
      console.log("✅ Webhook status endpoint working");
      try {
        const data = JSON.parse(responseText);
        console.log("Webhook version:", data.data?.webhookVersion);
        console.log("Available endpoints:");
        data.data?.availableEndpoints?.forEach(endpoint => {
          console.log("  " + endpoint);
        });
      } catch (parseError) {
        console.log("Could not parse status response");
      }
    } else {
      console.log("❌ Status endpoint failed");
    }
    
  } catch (error) {
    console.log("❌ Status test failed:", error.toString());
  }
}

/**
 * Check if the webhook endpoints are deployed
 */
function checkWebhookDeployment() {
  console.log("=== CHECKING WEBHOOK DEPLOYMENT ===");
  
  // Test the main API health endpoint first
  try {
    const response = UrlFetchApp.fetch('https://us-central1-roo-app-3d24e.cloudfunctions.net/api/', {
      method: 'GET',
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    console.log("API Health Check:", responseCode === 200 ? "✅ API is online" : "❌ API offline");
    
    if (responseCode === 200) {
      const data = JSON.parse(response.getContentText());
      console.log("API Version:", data.version);
      
      // Check if webhook endpoints are listed
      const endpoints = Object.keys(data.endpoints || {});
      const webhookEndpoints = endpoints.filter(ep => ep.includes('webhook'));
      
      if (webhookEndpoints.length > 0) {
        console.log("✅ Webhook endpoints found:");
        webhookEndpoints.forEach(endpoint => {
          console.log("  " + endpoint);
        });
      } else {
        console.log("⚠️ No webhook endpoints found in API listing");
        console.log("May need to deploy the webhook endpoints");
      }
    }
    
  } catch (error) {
    console.log("❌ Deployment check failed:", error.toString());
  }
}

/**
 * Run all tests
 */
function runAllWebhookTests() {
  checkWebhookDeployment();
  testWebhookStatus();
  testWebhookEndpoint();
}

/*

TESTING WORKFLOW:

1. DEPLOY FIRST:
   - In your functions directory, run: npm run deploy
   - Wait for deployment to complete

2. GET API KEY:
   - Check Firebase Functions logs after deployment
   - Look for a message like: "Using generated API key for development: roo-webhook-dev-xxxxx"
   - Copy that key and update TEST_CONFIG.API_KEY above

3. RUN TESTS:
   - Copy this code to a new AppScript project
   - Update the API_KEY in TEST_CONFIG
   - Run runAllWebhookTests() to test everything
   - Or run individual test functions

4. VERIFY:
   - testWebhookEndpoint() should return success
   - Check Firestore to see if classrooms and users were created
   - Check the Roo frontend to see if data appears

5. INTEGRATE:
   - If tests pass, copy the AppScript integration code to your existing project
   - Replace processAllSubmissions() with the enhanced version
   - Enjoy automatic classroom syncing!

*/