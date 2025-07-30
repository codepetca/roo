/**
 * Debug script to test teacher onboarding API directly
 */

const API_BASE_URL = "http://localhost:5001/roo-app-3d24e/us-central1/api";

async function testOnboardingEndpoint() {
  try {
    console.log("Testing onboarding endpoint...");
    
    // Test 1: Unauthenticated request (should get 403)
    console.log("\n1. Testing unauthenticated request:");
    const response1 = await fetch(`${API_BASE_URL}/teacher/onboarding-status`);
    console.log(`Status: ${response1.status}`);
    const data1 = await response1.json();
    console.log(`Response:`, data1);
    
    // Test 2: Health check to ensure API is working
    console.log("\n2. Testing health endpoint:");
    const response2 = await fetch(`${API_BASE_URL}/`);
    console.log(`Status: ${response2.status}`);
    const data2 = await response2.json();
    console.log(`Response:`, data2);
    
    // Test 3: Check if the actual endpoint path is correct
    console.log("\n3. Testing endpoint variations:");
    const endpoints = [
      "/teacher/onboarding-status",
      "/teacher/onboarding/status", 
      "/onboarding-status"
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        console.log(`${endpoint}: ${response.status}`);
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error("Error testing onboarding endpoint:", error);
  }
}

testOnboardingEndpoint();