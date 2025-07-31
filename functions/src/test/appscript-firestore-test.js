/**
 * Google Apps Script Test for Firestore Connectivity
 * 
 * INSTRUCTIONS:
 * 1. Go to script.google.com in your board account
 * 2. Create New Project → Name it "Firestore Connectivity Test"
 * 3. Copy this entire file and paste it into the editor
 * 4. Replace "YOUR_FIREBASE_PROJECT_ID" with your actual Firebase project ID
 * 5. Save the project (Ctrl+S or Cmd+S)
 * 6. Run testAll() function and check the logs (View → Logs)
 * 7. Report back the results!
 */

// ============================================
// CONFIGURATION - REPLACE WITH YOUR PROJECT ID
// ============================================
const FIREBASE_PROJECT_ID = 'YOUR_FIREBASE_PROJECT_ID'; // Replace this!

/**
 * Run all tests - START HERE
 * This is the main function to execute
 */
function testAll() {
  console.log("=".repeat(60));
  console.log("FIRESTORE CONNECTIVITY TEST - STARTING");
  console.log("=".repeat(60));
  
  console.log("Project ID:", FIREBASE_PROJECT_ID);
  console.log("Environment: Board Organization");
  console.log("Test Time:", new Date().toISOString());
  console.log("");
  
  // Run all tests
  testFirestoreAvailability();
  testNetworkConnectivity();
  testFirestoreBasicAccess();
  testFirestorePermissions();
  testAuthenticationMethod();
  
  console.log("=".repeat(60));
  console.log("TESTS COMPLETED - Check results above");
  console.log("=".repeat(60));
}

/**
 * Test 1: Check if FirestoreApp is available
 */
function testFirestoreAvailability() {
  console.log("--- TEST 1: FirestoreApp Availability ---");
  
  try {
    if (typeof FirestoreApp === 'undefined') {
      console.log("❌ FirestoreApp is NOT available");
      console.log("   This means we cannot use direct Firestore access");
      return false;
    }
    
    console.log("✅ FirestoreApp is available");
    console.log("   FirestoreApp object exists:", typeof FirestoreApp);
    return true;
    
  } catch (error) {
    console.log("❌ Error checking FirestoreApp:", error.toString());
    return false;
  }
}

/**
 * Test 2: Basic network connectivity
 */
function testNetworkConnectivity() {
  console.log("\n--- TEST 2: Network Connectivity ---");
  
  const endpoints = [
    {
      name: "Google Discovery API",
      url: "https://www.googleapis.com/discovery/v1/apis",
      expected: "Should work (Google internal)"
    },
    {
      name: "Firebase REST API",
      url: `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)`,
      expected: "May work (Google service)"
    },
    {
      name: "External Test API",
      url: "https://httpbin.org/get",
      expected: "Should be blocked (external)"
    }
  ];
  
  endpoints.forEach(endpoint => {
    try {
      console.log(`Testing: ${endpoint.name} (${endpoint.expected})`);
      const response = UrlFetchApp.fetch(endpoint.url);
      const responseCode = response.getResponseCode();
      
      if (responseCode >= 200 && responseCode < 300) {
        console.log(`✅ ${endpoint.name}: Accessible (${responseCode})`);
      } else {
        console.log(`⚠️ ${endpoint.name}: Unexpected response (${responseCode})`);
      }
      
    } catch (error) {
      if (endpoint.name === "External Test API") {
        console.log(`✅ ${endpoint.name}: Blocked as expected (${error.message})`);
      } else {
        console.log(`❌ ${endpoint.name}: Failed (${error.message})`);
      }
    }
  });
}

/**
 * Test 3: Basic Firestore access
 */
function testFirestoreBasicAccess() {
  console.log("\n--- TEST 3: Basic Firestore Access ---");
  
  if (FIREBASE_PROJECT_ID === 'YOUR_FIREBASE_PROJECT_ID') {
    console.log("❌ Please replace YOUR_FIREBASE_PROJECT_ID with your actual project ID");
    return false;
  }
  
  try {
    console.log("Attempting to get Firestore instance...");
    const firestore = FirestoreApp.getFirestore(FIREBASE_PROJECT_ID);
    console.log("✅ Successfully got Firestore instance");
    
    console.log("Attempting to write test document...");
    const testDoc = {
      testMessage: "Hello from board AppScript!",
      timestamp: new Date().toISOString(),
      environment: "board-organization",
      testId: Math.random().toString(36).substr(2, 9)
    };
    
    const result = firestore.collection('connectivity-test').add(testDoc);
    console.log("✅ Successfully wrote to Firestore!");
    console.log("   Document ID:", result.id);
    
    // Try to read it back
    console.log("Attempting to read document back...");
    const readDoc = firestore.collection('connectivity-test').doc(result.id).get();
    if (readDoc.exists) {
      console.log("✅ Successfully read document back");
      console.log("   Data:", JSON.stringify(readDoc.data()));
    } else {
      console.log("⚠️ Document was written but cannot be read back");
    }
    
    return true;
    
  } catch (error) {
    console.log("❌ Firestore access failed:", error.toString());
    
    if (error.toString().includes('permission')) {
      console.log("   → This looks like a permissions issue");
    } else if (error.toString().includes('network') || error.toString().includes('fetch')) {
      console.log("   → This looks like a network/connectivity issue");
    } else if (error.toString().includes('project')) {
      console.log("   → This looks like a project ID issue");
    }
    
    return false;
  }
}

/**
 * Test 4: Detailed permission testing
 */
function testFirestorePermissions() {
  console.log("\n--- TEST 4: Detailed Permissions Test ---");
  
  if (FIREBASE_PROJECT_ID === 'YOUR_FIREBASE_PROJECT_ID') {
    console.log("❌ Skipping - need real project ID");
    return;
  }
  
  try {
    const firestore = FirestoreApp.getFirestore(FIREBASE_PROJECT_ID);
    let testDocId = null;
    
    // Test CREATE
    try {
      const createResult = firestore.collection('permission-test').add({
        action: 'create',
        timestamp: new Date().toISOString()
      });
      testDocId = createResult.id;
      console.log("✅ CREATE permission: Working");
    } catch (error) {
      console.log("❌ CREATE permission: Failed -", error.message);
    }
    
    // Test READ
    if (testDocId) {
      try {
        const readResult = firestore.collection('permission-test').doc(testDocId).get();
        console.log("✅ READ permission: Working");
      } catch (error) {
        console.log("❌ READ permission: Failed -", error.message);
      }
      
      // Test UPDATE
      try {
        firestore.collection('permission-test').doc(testDocId).update({
          action: 'update',
          updated: true
        });
        console.log("✅ UPDATE permission: Working");
      } catch (error) {
        console.log("❌ UPDATE permission: Failed -", error.message);
      }
      
      // Test DELETE
      try {
        firestore.collection('permission-test').doc(testDocId).delete();
        console.log("✅ DELETE permission: Working");
      } catch (error) {
        console.log("❌ DELETE permission: Failed -", error.message);
      }
    }
    
    // Test QUERY
    try {
      const queryResult = firestore.collection('permission-test').limit(1).get();
      console.log("✅ QUERY permission: Working");
    } catch (error) {
      console.log("❌ QUERY permission: Failed -", error.message);
    }
    
  } catch (error) {
    console.log("❌ Cannot test permissions - basic access failed:", error.toString());
  }
}

/**
 * Test 5: Authentication method detection
 */
function testAuthenticationMethod() {
  console.log("\n--- TEST 5: Authentication Method ---");
  
  try {
    // Check OAuth token
    const token = ScriptApp.getOAuthToken();
    if (token) {
      console.log("✅ OAuth token available");
      console.log("   Token preview:", token.substring(0, 20) + "...");
    } else {
      console.log("❌ No OAuth token available");
    }
    
    // Check effective user
    const user = Session.getEffectiveUser();
    if (user && user.getEmail) {
      console.log("✅ Effective user:", user.getEmail());
    } else {
      console.log("⚠️ Cannot determine effective user");
    }
    
    // Check active user
    const activeUser = Session.getActiveUser();
    if (activeUser && activeUser.getEmail) {
      console.log("✅ Active user:", activeUser.getEmail());
    } else {
      console.log("⚠️ Cannot determine active user");
    }
    
  } catch (error) {
    console.log("❌ Authentication check failed:", error.toString());
  }
}

/**
 * Clean up test data (optional)
 */
function cleanupTestData() {
  console.log("\n--- CLEANUP: Removing Test Data ---");
  
  if (FIREBASE_PROJECT_ID === 'YOUR_FIREBASE_PROJECT_ID') {
    console.log("❌ Cannot cleanup - need real project ID");
    return;
  }
  
  try {
    const firestore = FirestoreApp.getFirestore(FIREBASE_PROJECT_ID);
    
    // Delete test collections
    const testCollections = ['connectivity-test', 'permission-test'];
    
    testCollections.forEach(collectionName => {
      try {
        const docs = firestore.collection(collectionName).get();
        docs.forEach(doc => {
          doc.ref.delete();
        });
        console.log(`✅ Cleaned up collection: ${collectionName}`);
      } catch (error) {
        console.log(`⚠️ Could not clean up ${collectionName}:`, error.message);
      }
    });
    
  } catch (error) {
    console.log("❌ Cleanup failed:", error.toString());
  }
}

/**
 * Simple connectivity test (run this first if testAll() is too much)
 */
function quickTest() {
  console.log("=== QUICK FIRESTORE TEST ===");
  
  if (FIREBASE_PROJECT_ID === 'YOUR_FIREBASE_PROJECT_ID') {
    console.log("❌ Please set your Firebase project ID first!");
    return;
  }
  
  if (typeof FirestoreApp === 'undefined') {
    console.log("❌ FirestoreApp not available - direct access not possible");
    return;
  }
  
  try {
    const firestore = FirestoreApp.getFirestore(FIREBASE_PROJECT_ID);
    const result = firestore.collection('quick-test').add({
      message: "Quick test successful!",
      timestamp: new Date().toISOString()
    });
    
    console.log("✅ SUCCESS! Firestore access works from board environment");
    console.log("Document ID:", result.id);
    
  } catch (error) {
    console.log("❌ FAILED:", error.toString());
  }
}

// ============================================
// INSTRUCTIONS REMINDER
// ============================================
/*

TO RUN THESE TESTS:

1. Replace "YOUR_FIREBASE_PROJECT_ID" with your actual Firebase project ID
2. Save the script (Ctrl+S or Cmd+S)
3. Run testAll() function (or quickTest() for a simple check)
4. View → Logs to see the results
5. Report back what you see!

WHAT WE'RE TESTING:
- Can AppScript access FirestoreApp library?
- Can it make network calls to Google services?
- Can it authenticate with your Firebase project?
- Can it read/write Firestore documents?
- What specific errors occur (if any)?

This will tell us if we can build automatic classroom syncing
directly in AppScript, or if we need a different approach.

*/