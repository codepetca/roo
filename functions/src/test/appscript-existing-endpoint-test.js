/**
 * Test AppScript → Firebase Functions with EXISTING endpoints
 * This tests the authentication flow completely before we deploy new endpoints
 */

const CONFIG = {
  FUNCTIONS_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api',
  SPREADSHEET_ID: '1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g'
};

/**
 * Test existing endpoints to verify full authentication flow
 */
function testExistingEndpoints() {
  console.log("=== TESTING EXISTING ENDPOINTS ===");
  
  // Test 1: Health endpoint (no auth needed)
  console.log("\n--- Test 1: Health Check ---");
  testHealthEndpoint();
  
  // Test 2: Test write endpoint (may need auth)
  console.log("\n--- Test 2: Test Write ---");
  testWriteEndpoint();
  
  // Test 3: User profile creation (needs auth)
  console.log("\n--- Test 3: User Profile Creation ---");
  testUserProfileCreation();
  
  // Test 4: List available endpoints
  console.log("\n--- Test 4: Available Endpoints ---");
  listAvailableEndpoints();
}

function testHealthEndpoint() {
  try {
    const response = UrlFetchApp.fetch(`${CONFIG.FUNCTIONS_URL}/`);
    const data = JSON.parse(response.getContentText());
    
    console.log("✅ Health endpoint works");
    console.log("API Status:", data.status);
    console.log("Version:", data.version);
    
  } catch (error) {
    console.log("❌ Health endpoint failed:", error.toString());
  }
}

function testWriteEndpoint() {
  try {
    const token = ScriptApp.getOAuthToken();
    
    const response = UrlFetchApp.fetch(`${CONFIG.FUNCTIONS_URL}/test-write`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        testData: "Hello from AppScript!",
        timestamp: new Date().toISOString(),
        source: "board-appscript"
      }),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Test write response code:", responseCode);
    console.log("Test write response:", responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      console.log("✅ Test write endpoint works with authentication!");
    } else if (responseCode === 401 || responseCode === 403) {
      console.log("⚠️ Authentication issue - may need user profile");
    } else {
      console.log("❌ Unexpected response code:", responseCode);
    }
    
  } catch (error) {
    console.log("❌ Test write failed:", error.toString());
  }
}

function testUserProfileCreation() {
  try {
    const token = ScriptApp.getOAuthToken();
    
    // First, try to create a teacher profile
    const profileData = {
      role: "teacher",
      displayName: "Stewart Chan (AppScript Test)"
    };
    
    const response = UrlFetchApp.fetch(`${CONFIG.FUNCTIONS_URL}/users/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(profileData),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Profile creation response code:", responseCode);
    console.log("Profile creation response:", responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      console.log("✅ User profile creation works!");
      
      // Now test getting the profile
      testGetUserProfile(token);
      
    } else if (responseCode === 400 && responseText.includes("already exists")) {
      console.log("✅ Profile already exists - testing get profile");
      testGetUserProfile(token);
      
    } else {
      console.log("⚠️ Profile creation issue:", responseCode);
    }
    
  } catch (error) {
    console.log("❌ Profile creation failed:", error.toString());
  }
}

function testGetUserProfile(token) {
  try {
    const response = UrlFetchApp.fetch(`${CONFIG.FUNCTIONS_URL}/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Get profile response code:", responseCode);
    console.log("Get profile response:", responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      console.log("✅ Full authentication flow works!");
      
      // Parse and show user info
      try {
        const userData = JSON.parse(responseText);
        if (userData.data) {
          console.log("User role:", userData.data.role);
          console.log("User email:", userData.data.email);
          console.log("🎉 Ready for classroom sync integration!");
        }
      } catch (parseError) {
        console.log("Could not parse user data");
      }
      
    } else {
      console.log("❌ Get profile failed:", responseCode);
    }
    
  } catch (error) {
    console.log("❌ Get profile failed:", error.toString());
  }
}

function listAvailableEndpoints() {
  try {
    const response = UrlFetchApp.fetch(`${CONFIG.FUNCTIONS_URL}/`);
    const data = JSON.parse(response.getContentText());
    
    if (data.endpoints) {
      console.log("Available endpoints:");
      Object.keys(data.endpoints).forEach(endpoint => {
        console.log(`  ${endpoint}: ${data.endpoints[endpoint]}`);
      });
    }
    
    // Look for classroom-related endpoints
    const endpointKeys = Object.keys(data.endpoints || {});
    const classroomEndpoints = endpointKeys.filter(key => 
      key.toLowerCase().includes('classroom') || 
      key.toLowerCase().includes('sync')
    );
    
    if (classroomEndpoints.length > 0) {
      console.log("\nClassroom-related endpoints found:");
      classroomEndpoints.forEach(endpoint => {
        console.log(`  ${endpoint}`);
      });
    } else {
      console.log("\n⚠️ No classroom sync endpoints found yet");
      console.log("   Need to deploy the new classroom sync endpoint");
    }
    
  } catch (error) {
    console.log("❌ Could not list endpoints:", error.toString());
  }
}

/**
 * Quick test - just verify we can authenticate and access user profile
 */
function quickAuthTest() {
  console.log("=== QUICK AUTHENTICATION TEST ===");
  
  try {
    const token = ScriptApp.getOAuthToken();
    console.log("OAuth token available:", !!token);
    
    if (token) {
      // Test profile exists
      const response = UrlFetchApp.fetch(`${CONFIG.FUNCTIONS_URL}/users/profile/exists`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        muteHttpExceptions: true
      });
      
      console.log("Auth test response:", response.getResponseCode());
      console.log("Auth test data:", response.getContentText());
      
      if (response.getResponseCode() < 400) {
        console.log("✅ Authentication flow works!");
        console.log("🚀 Ready to integrate classroom sync!");
      } else {
        console.log("⚠️ Authentication needs work");
      }
    }
    
  } catch (error) {
    console.log("❌ Quick auth test failed:", error.toString());
  }
}

// Run this to test everything
function runAllTests() {
  testExistingEndpoints();
}

/*
INSTRUCTIONS:

1. Copy this code to a new AppScript project
2. Run testExistingEndpoints() 
3. Check the logs to see:
   - ✅ Can we authenticate fully?
   - ✅ Can we call authenticated endpoints?
   - ✅ What endpoints are currently available?
   - ✅ Is the system ready for classroom sync?

If authentication works completely, we know AppScript → Firebase Functions
integration will work perfectly once we deploy the classroom sync endpoint!

*/