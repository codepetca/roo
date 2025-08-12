/**
 * Manual Gmail Testing Script for dev.codepet@gmail.com
 * Location: functions/src/test/manual-gmail-test.ts
 * 
 * Run this script to test Gmail integration with real dev.codepet@gmail.com account
 * Usage: node lib/src/test/manual-gmail-test.js
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/**
 * Test Data Setup
 */
const DEV_TEACHER = {
  uid: 'dev-codepet-test-uid',
  email: 'dev.codepet@gmail.com',
  displayName: 'Dev CodePet Teacher',
  role: 'teacher',
  gmailAccessToken: 'REPLACE_WITH_REAL_OAUTH_TOKEN', // You'll need to get this from OAuth flow
  classroomIds: ['dev-test-classroom'],
  totalStudents: 1,
  totalClassrooms: 1,
  isActive: true
};

const TEST_STUDENT_EMAIL = 'your.test.email@gmail.com'; // Replace with your test email

/**
 * Setup Test Teacher Profile
 */
async function setupDevTeacher() {
  console.log('🔧 Setting up dev teacher profile...');
  
  try {
    await db.collection('users').doc(DEV_TEACHER.uid).set({
      ...DEV_TEACHER,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Dev teacher profile created successfully');
    console.log(`   Email: ${DEV_TEACHER.email}`);
    console.log(`   UID: ${DEV_TEACHER.uid}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to setup dev teacher:', error);
    return false;
  }
}

/**
 * Create Mock Firebase Auth Token for Testing
 */
async function createTestAuthToken(uid: string): Promise<string | null> {
  try {
    console.log('🔐 Creating test auth token...');
    const customToken = await auth.createCustomToken(uid);
    console.log('✅ Test auth token created');
    return customToken;
  } catch (error) {
    console.error('❌ Failed to create auth token:', error);
    return null;
  }
}

/**
 * Test Gmail Token Storage API
 */
async function testGmailTokenStorage(authToken: string, gmailToken: string) {
  console.log('📧 Testing Gmail token storage API...');
  
  try {
    const API_BASE_URL = 'http://127.0.0.1:5001/roo-app-3d24e/us-central1/api';
    
    const response = await fetch(`${API_BASE_URL}/auth/store-gmail-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: gmailToken
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Gmail token storage API test passed');
      console.log('   Response:', result);
      return true;
    } else {
      console.error('❌ Gmail token storage API test failed:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Gmail token storage API error:', error);
    return false;
  }
}

/**
 * Test Passcode Sending API
 */
async function testPasscodeSending(authToken: string, studentEmail: string) {
  console.log('📨 Testing passcode sending API...');
  
  try {
    const API_BASE_URL = 'http://127.0.0.1:5001/roo-app-3d24e/us-central1/api';
    
    const response = await fetch(`${API_BASE_URL}/auth/send-passcode`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: studentEmail
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Passcode sending API test passed');
      console.log('   Response:', result);
      console.log('   📧 Check dev.codepet@gmail.com sent folder for email!');
      return { success: true, passcode: result.passcode };
    } else {
      console.error('❌ Passcode sending API test failed:', result);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Passcode sending API error:', error);
    return { success: false };
  }
}

/**
 * Test Passcode Verification API
 */
async function testPasscodeVerification(studentEmail: string, passcode: string) {
  console.log('🔍 Testing passcode verification API...');
  
  try {
    const API_BASE_URL = 'http://127.0.0.1:5001/roo-app-3d24e/us-central1/api';
    
    const response = await fetch(`${API_BASE_URL}/auth/verify-passcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: studentEmail,
        passcode: passcode
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Passcode verification API test passed');
      console.log('   Response:', result);
      return true;
    } else {
      console.error('❌ Passcode verification API test failed:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Passcode verification API error:', error);
    return false;
  }
}

/**
 * Verify Gmail Email Template Quality
 */
async function verifyEmailTemplate() {
  console.log('📋 Verifying email template quality...');
  
  const { GmailEmailService } = await import('../services/gmail-email-service');
  const gmailService = new GmailEmailService('mock-token');
  
  // Test passcode email template
  const passcodeHTML = gmailService['createPasscodeEmailHTML'](
    '123456', 
    'Dev CodePet', 
    'dev.codepet@gmail.com'
  );
  
  const requiredElements = [
    'Your Roo Login Code',
    '123456',
    'Dev CodePet', 
    'dev.codepet@gmail.com',
    'expires in 10 minutes',
    '<!DOCTYPE html>',
    'style=',
    'Access Your Grades'
  ];
  
  const missingElements = requiredElements.filter(element => !passcodeHTML.includes(element));
  
  if (missingElements.length === 0) {
    console.log('✅ Email template quality check passed');
    console.log('   All required elements present');
    return true;
  } else {
    console.error('❌ Email template quality check failed');
    console.error('   Missing elements:', missingElements);
    return false;
  }
}

/**
 * Clean Up Test Data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Remove test teacher
    await db.collection('users').doc(DEV_TEACHER.uid).delete();
    
    // Remove test passcode
    await db.collection('passcodes').doc(TEST_STUDENT_EMAIL).delete();
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.warn('⚠️  Cleanup warning (may be expected):', error);
  }
}

/**
 * Main Test Runner
 */
async function runGmailIntegrationTests() {
  console.log('🚀 Starting Gmail Integration Tests');
  console.log('=====================================');
  
  let testsPassed = 0;
  let totalTests = 0;
  
  try {
    // Test 1: Setup
    totalTests++;
    if (await setupDevTeacher()) {
      testsPassed++;
    }
    
    // Test 2: Auth Token Creation
    totalTests++;
    const authToken = await createTestAuthToken(DEV_TEACHER.uid);
    if (authToken) {
      testsPassed++;
    } else {
      console.log('❌ Skipping remaining tests due to auth token failure');
      return;
    }
    
    // Test 3: Gmail Token Storage
    totalTests++;
    if (await testGmailTokenStorage(authToken, DEV_TEACHER.gmailAccessToken)) {
      testsPassed++;
    }
    
    // Test 4: Email Template Quality
    totalTests++;
    if (await verifyEmailTemplate()) {
      testsPassed++;
    }
    
    // Test 5: Passcode Sending (this will use real Gmail if token is valid)
    totalTests++;
    console.log('\n⚠️  IMPORTANT: The next test will attempt to send a real email!');
    console.log('   Make sure you have a valid Gmail OAuth token in DEV_TEACHER.gmailAccessToken');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const passcodeResult = await testPasscodeSending(authToken, TEST_STUDENT_EMAIL);
    if (passcodeResult.success) {
      testsPassed++;
      
      // Test 6: Passcode Verification
      if (passcodeResult.passcode) {
        totalTests++;
        if (await testPasscodeVerification(TEST_STUDENT_EMAIL, passcodeResult.passcode)) {
          testsPassed++;
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Test runner error:', error);
  } finally {
    await cleanupTestData();
  }
  
  // Results
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${totalTests - testsPassed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉 All Gmail integration tests passed!');
    console.log('   Your Gmail integration is working correctly.');
    console.log('   Check dev.codepet@gmail.com sent folder to see the email.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    console.log('   Common issues:');
    console.log('   - Invalid Gmail OAuth token');
    console.log('   - Emulators not running');
    console.log('   - Network connectivity issues');
  }
}

/**
 * Instructions for Manual Testing
 */
function printInstructions() {
  console.log('\n📋 MANUAL TESTING INSTRUCTIONS');
  console.log('==============================');
  console.log('1. Start Firebase emulators: npm run emulators');
  console.log('2. Update DEV_TEACHER.gmailAccessToken with real OAuth token');
  console.log('3. Update TEST_STUDENT_EMAIL with your test email');
  console.log('4. Run this script: npm run build && node lib/src/test/manual-gmail-test.js');
  console.log('5. Check dev.codepet@gmail.com sent folder for test email');
  console.log('6. Use the received passcode to test student login');
  console.log('\n⚠️  To get a real Gmail OAuth token:');
  console.log('   - Use the frontend Google OAuth flow');
  console.log('   - Check browser dev tools for the access token');
  console.log('   - Copy the token to this script');
}

// Run the tests if this script is executed directly
if (require.main === module) {
  printInstructions();
  console.log('\nStarting tests in 3 seconds...');
  setTimeout(() => {
    runGmailIntegrationTests().then(() => {
      process.exit(0);
    }).catch((error) => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
  }, 3000);
}

export {
  runGmailIntegrationTests,
  setupDevTeacher,
  testGmailTokenStorage,
  testPasscodeSending,
  testPasscodeVerification
};