/**
 * Google Apps Script Test for Firebase Functions API Calls
 * 
 * INSTRUCTIONS:
 * 1. Go to script.google.com in your board account
 * 2. Create New Project → Name it "Firebase API Test"
 * 3. Copy this entire file and paste it into the editor
 * 4. Replace the configuration values below with your actual values
 * 5. Save the project (Ctrl+S or Cmd+S)
 * 6. Run testFirebaseFunctionsAPI() and check the logs
 * 7. Report back the results!
 */

// ============================================
// CONFIGURATION - REPLACE WITH YOUR VALUES
// ============================================
const CONFIG = {
  // Your Firebase Functions URL (get this from Firebase Console)
  FUNCTIONS_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api', // Replace this!
  
  // Your test spreadsheet ID (the one with submissions data)
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID', // Replace this!
  
  // For testing, we'll create a simple teacher token
  // In real implementation, this would be stored securely
  TEST_TEACHER_EMAIL: 'stewart.chan@gapps.yrdsb.ca'
};

/**
 * Main test function - START HERE
 */
function testFirebaseFunctionsAPI() {
  console.log("=".repeat(60));
  console.log("FIREBASE FUNCTIONS API TEST - STARTING");
  console.log("=".repeat(60));
  
  console.log("Functions URL:", CONFIG.FUNCTIONS_URL);
  console.log("Test Time:", new Date().toISOString());
  console.log("");
  
  // Run tests in sequence
  testHealthEndpoint();
  testAuthenticationFlow();
  testClassroomSyncEndpoint();
  
  console.log("=".repeat(60));
  console.log("TESTS COMPLETED - Check results above");
  console.log("=".repeat(60));
}

/**
 * Test 1: Check if we can reach the Firebase Functions health endpoint
 */
function testHealthEndpoint() {
  console.log("--- TEST 1: Health Endpoint ---");
  
  try {
    const url = `${CONFIG.FUNCTIONS_URL}/`;
    console.log("Testing URL:", url);
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      muteHttpExceptions: true // Don't throw on HTTP errors
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Response Code:", responseCode);
    console.log("Response Preview:", responseText.substring(0, 200) + "...");
    
    if (responseCode >= 200 && responseCode < 300) {
      console.log("✅ Health endpoint: Accessible");
    } else {
      console.log("⚠️ Health endpoint: Unexpected response code");
    }
    
  } catch (error) {
    console.log("❌ Health endpoint failed:", error.toString());
  }
}

/**
 * Test 2: Test authentication and user profile endpoints
 */
function testAuthenticationFlow() {
  console.log("\n--- TEST 2: Authentication Flow ---");
  
  try {
    // First, let's test the user profile exists endpoint (no auth required)
    const profileUrl = `${CONFIG.FUNCTIONS_URL}/users/profile/exists`;
    console.log("Testing profile exists endpoint:", profileUrl);
    
    const profileResponse = UrlFetchApp.fetch(profileUrl, {
      method: 'GET',
      muteHttpExceptions: true
    });
    
    console.log("Profile check response:", profileResponse.getResponseCode());
    console.log("Profile response:", profileResponse.getContentText());
    
    // Test with OAuth token (if available)
    console.log("\nTesting with OAuth token...");
    const token = ScriptApp.getOAuthToken();
    
    if (token) {
      const authResponse = UrlFetchApp.fetch(profileUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        muteHttpExceptions: true
      });
      
      console.log("Auth response code:", authResponse.getResponseCode());
      console.log("Auth response:", authResponse.getContentText());
      
      if (authResponse.getResponseCode() < 400) {
        console.log("✅ Authentication: Working with OAuth token");
      } else {
        console.log("⚠️ Authentication: OAuth token not accepted");
      }
    } else {
      console.log("❌ No OAuth token available");
    }
    
  } catch (error) {
    console.log("❌ Authentication test failed:", error.toString());
  }
}

/**
 * Test 3: Test the classroom sync endpoint with sample data
 */
function testClassroomSyncEndpoint() {
  console.log("\n--- TEST 3: Classroom Sync Endpoint ---");
  
  if (CONFIG.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
    console.log("❌ Please set SPREADSHEET_ID in config first");
    return;
  }
  
  try {
    const syncUrl = `${CONFIG.FUNCTIONS_URL}/classrooms/sync-from-sheets`;
    console.log("Testing sync endpoint:", syncUrl);
    
    const token = ScriptApp.getOAuthToken();
    
    if (!token) {
      console.log("❌ No OAuth token - cannot test authenticated endpoint");
      return;
    }
    
    const requestBody = {
      spreadsheetId: CONFIG.SPREADSHEET_ID
    };
    
    console.log("Request body:", JSON.stringify(requestBody));
    
    const response = UrlFetchApp.fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Sync response code:", responseCode);
    console.log("Sync response:", responseText);
    
    if (responseCode === 200) {
      console.log("✅ Classroom sync: Successful!");
      
      // Parse and show results
      try {
        const result = JSON.parse(responseText);
        if (result.data) {
          console.log("Sync results:");
          console.log("  Classrooms created:", result.data.classroomsCreated || 0);
          console.log("  Classrooms updated:", result.data.classroomsUpdated || 0);
          console.log("  Students created:", result.data.studentsCreated || 0);
          console.log("  Students updated:", result.data.studentsUpdated || 0);
        }
      } catch (parseError) {
        console.log("Could not parse response as JSON");
      }
      
    } else if (responseCode === 403) {
      console.log("⚠️ Classroom sync: Authentication/authorization issue");
    } else if (responseCode === 400) {
      console.log("⚠️ Classroom sync: Request format issue");
    } else {
      console.log("❌ Classroom sync: Failed with code", responseCode);
    }
    
  } catch (error) {
    console.log("❌ Classroom sync test failed:", error.toString());
  }
}

/**
 * Test with sample submission data (simulate real AppScript usage)
 */
function testWithSampleData() {
  console.log("\n--- SAMPLE DATA TEST ---");
  
  // Create sample submission data (like what AppScript would generate)
  const sampleSubmissions = [
    {
      submissionId: "test_001",
      assignmentTitle: "Karel Assignment 1",
      courseId: "CS101",
      studentFirstName: "Test",
      studentLastName: "Student",
      studentEmail: "test.student@example.com",
      submissionText: "Sample submission content",
      submissionDate: new Date().toISOString(),
      gradingStatus: "pending",
      maxPoints: 100
    },
    {
      submissionId: "test_002", 
      assignmentTitle: "Math Quiz 1",
      courseId: "MATH201",
      studentFirstName: "Another",
      studentLastName: "Student",
      studentEmail: "another.student@example.com",
      submissionText: "Sample quiz answers",
      submissionDate: new Date().toISOString(),
      gradingStatus: "pending",
      maxPoints: 50
    }
  ];
  
  console.log("Sample submissions created:", sampleSubmissions.length);
  console.log("This simulates what the real AppScript would send");
  
  // In the real implementation, we would:
  // 1. Extract submissions from Google Sheets using existing AppScript code
  // 2. Call our classroom sync API with the spreadsheet ID
  // 3. Let the API handle the extraction and sync to Firestore
}

/**
 * Quick test - just check if we can reach the API
 */
function quickApiTest() {
  console.log("=== QUICK API CONNECTIVITY TEST ===");
  
  if (CONFIG.FUNCTIONS_URL.includes('YOUR_')) {
    console.log("❌ Please set your Firebase Functions URL first!");
    return;
  }
  
  try {
    const response = UrlFetchApp.fetch(CONFIG.FUNCTIONS_URL, {
      method: 'GET',
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    console.log("API Response Code:", responseCode);
    
    if (responseCode < 400) {
      console.log("✅ SUCCESS! Can reach Firebase Functions API");
    } else {
      console.log("⚠️ API reachable but returned error:", responseCode);
    }
    
  } catch (error) {
    console.log("❌ FAILED to reach API:", error.toString());
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the Firebase Functions URL for your project
 * You can find this in Firebase Console → Functions
 */
function getFunctionsUrl() {
  // Format: https://REGION-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME
  // Example: https://us-central1-roo-app-3d24e.cloudfunctions.net/api
  return `https://us-central1-roo-app-3d24e.cloudfunctions.net/api`;
}

/**
 * Instructions for getting your Firebase Functions URL
 */
function howToGetFunctionsUrl() {
  console.log("To get your Firebase Functions URL:");
  console.log("1. Go to Firebase Console");
  console.log("2. Select your project (roo-app-3d24e)");
  console.log("3. Go to Functions section");
  console.log("4. Find the 'api' function");
  console.log("5. Click on it to see the trigger URL");
  console.log("6. Copy that URL and update CONFIG.FUNCTIONS_URL above");
  console.log("");
  console.log("Expected format:");
  console.log("https://us-central1-roo-app-3d24e.cloudfunctions.net/api");
}

// ============================================
// INSTRUCTIONS REMINDER
// ============================================
/*

TO RUN THESE TESTS:

1. Update CONFIG values at the top:
   - FUNCTIONS_URL: Your Firebase Functions API URL
   - SPREADSHEET_ID: A spreadsheet with submission data
   
2. Save the script (Ctrl+S or Cmd+S)

3. Run testFirebaseFunctionsAPI() function

4. View → Logs to see the results

5. Report back what you see!

WHAT WE'RE TESTING:
- Can AppScript reach Firebase Functions?
- Does authentication work with OAuth tokens?
- Can it call our classroom sync endpoint?
- What errors occur (if any)?

If this works, we can integrate it into the existing AppScript
to automatically sync classrooms whenever submissions are processed!

*/