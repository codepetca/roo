#!/usr/bin/env node

/**
 * Setup Test Users Script
 * Location: frontend/e2e/scripts/setup-test-users.ts
 *
 * Creates all test users in Firebase Auth and sets up their profiles in Firestore
 * Supports three environments: emulators (default), staging, and production
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ALL_TEST_USERS, TEST_TEACHERS, TEST_STUDENTS, TestUserConfig } from './test-users-config';

/**
 * Environment configuration with support for emulators, staging, and production
 */
const TEST_ENVIRONMENT = process.env.TEST_ENVIRONMENT || 'emulator';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || (TEST_ENVIRONMENT === 'staging' ? 'roo-staging-602dd' : 'roo-app-3d24e');
const FIREBASE_ADMIN_SDK_PATH = process.env.FIREBASE_ADMIN_SDK_PATH || '../../../service-account-key.json';

// Emulator configuration
const USE_EMULATORS = TEST_ENVIRONMENT === 'emulator';
const EMULATOR_HOST = '127.0.0.1';
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8080;

/**
 * Initialize Firebase Admin SDK with emulator support
 */
function initializeFirebaseAdmin() {
  try {
    let app;

    if (USE_EMULATORS) {
      // For emulator: Use simple app initialization without service account
      process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`;
      process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`;
      
      app = initializeApp({
        projectId: FIREBASE_PROJECT_ID
      });
      
      console.log(`✅ Initialized Firebase Admin SDK for EMULATOR environment`);
      console.log(`   Project: ${FIREBASE_PROJECT_ID}`);
      console.log(`   Auth Emulator: ${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`);
      console.log(`   Firestore Emulator: ${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`);
    } else {
      // For staging/production: Use service account
      const serviceAccountPath = join(__dirname, FIREBASE_ADMIN_SDK_PATH);
      
      if (!existsSync(serviceAccountPath)) {
        throw new Error(`Service account key not found at: ${serviceAccountPath}`);
      }

      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8')) as ServiceAccount;
      
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
      });

      console.log(`✅ Initialized Firebase Admin SDK for ${TEST_ENVIRONMENT.toUpperCase()} environment`);
      console.log(`   Project: ${FIREBASE_PROJECT_ID}`);
    }

    return app;
  } catch (error) {
    console.error(`❌ Failed to initialize Firebase Admin SDK for ${TEST_ENVIRONMENT}:`, error.message);
    
    if (USE_EMULATORS) {
      console.error('\n📝 For emulator testing, make sure:');
      console.error('1. Firebase emulators are running: npm run emulators');
      console.error('2. Auth and Firestore emulators are accessible');
    } else {
      console.error('\n📝 For staging/production, make sure you have:');
      console.error('1. Downloaded the service account key file');
      console.error('2. Set FIREBASE_ADMIN_SDK_PATH environment variable');
      console.error('3. Set FIREBASE_PROJECT_ID environment variable');
    }
    process.exit(1);
  }
}

/**
 * Create a single user in Firebase Auth
 */
async function createUser(userConfig: TestUserConfig): Promise<boolean> {
  try {
    const auth = getAuth();
    
    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(userConfig.email);
      console.log(`⚠️  User ${userConfig.email} already exists (UID: ${existingUser.uid})`);
      
      // Update the existing user if needed
      await auth.updateUser(existingUser.uid, {
        displayName: userConfig.displayName,
        password: userConfig.password
      });
      
      console.log(`✅ Updated existing user: ${userConfig.email}`);
      return true;
    } catch (error) {
      // User doesn't exist, create new one
      if (error.code === 'auth/user-not-found') {
        const userRecord = await auth.createUser({
          uid: userConfig.uid,
          email: userConfig.email,
          password: userConfig.password,
          displayName: userConfig.displayName,
          emailVerified: true // Skip email verification for tests
        });
        
        console.log(`✅ Created user: ${userConfig.email} (UID: ${userRecord.uid})`);
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`❌ Failed to create user ${userConfig.email}:`, error.message);
    return false;
  }
}

/**
 * Create user profile in Firestore
 */
async function createUserProfile(userConfig: TestUserConfig): Promise<boolean> {
  try {
    const db = getFirestore();
    const userProfileData: any = {
      uid: userConfig.uid,
      email: userConfig.email,
      displayName: userConfig.displayName,
      role: userConfig.role,
      createdAt: new Date().toISOString(),
      isTestUser: true // Mark as test user for cleanup
    };

    // Add teacher-specific fields
    if (userConfig.role === 'teacher' && userConfig.schoolEmail) {
      userProfileData.schoolEmail = userConfig.schoolEmail;
      userProfileData.isTeacher = true;
    }

    // Add student-specific fields
    if (userConfig.role === 'student' && userConfig.schoolEmail) {
      userProfileData.schoolEmail = userConfig.schoolEmail;
      userProfileData.isStudent = true;
      // Add passcode field for student authentication
      userProfileData.passcode = {
        value: '12345',
        createdAt: new Date().toISOString(),
        lastRequestedAt: new Date().toISOString(),
        attempts: 0
      };
    }

    // Create profile document
    await db.collection('users').doc(userConfig.uid).set(userProfileData);
    
    console.log(`✅ Created profile for: ${userConfig.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create profile for ${userConfig.email}:`, error.message);
    return false;
  }
}

/**
 * Setup custom claims for users
 */
async function setupCustomClaims(userConfig: TestUserConfig): Promise<boolean> {
  try {
    const auth = getAuth();
    
    const customClaims: any = {
      role: userConfig.role,
      isTestUser: true
    };

    if (userConfig.role === 'teacher') {
      customClaims.isTeacher = true;
    }

    if (userConfig.role === 'student') {
      customClaims.isStudent = true;
    }

    await auth.setCustomUserClaims(userConfig.uid, customClaims);
    
    console.log(`✅ Set custom claims for: ${userConfig.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to set custom claims for ${userConfig.email}:`, error.message);
    return false;
  }
}

/**
 * Create all test users
 */
async function createAllTestUsers(): Promise<void> {
  console.log(`🚀 Starting test user creation for ${TEST_ENVIRONMENT.toUpperCase()} environment...\n`);
  
  let successCount = 0;
  let failureCount = 0;

  // Create all users
  for (const userConfig of ALL_TEST_USERS) {
    console.log(`\n📝 Processing user: ${userConfig.email} (${userConfig.role})`);
    
    const userCreated = await createUser(userConfig);
    const profileCreated = await createUserProfile(userConfig);
    const claimsSet = await setupCustomClaims(userConfig);
    
    if (userCreated && profileCreated && claimsSet) {
      successCount++;
      console.log(`✅ Successfully set up: ${userConfig.email}`);
    } else {
      failureCount++;
      console.log(`❌ Failed to set up: ${userConfig.email}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test User Setup Summary:');
  console.log(`   ✅ Successfully created: ${successCount} users`);
  console.log(`   ❌ Failed to create: ${failureCount} users`);
  console.log(`   📚 Teachers created: ${Object.keys(TEST_TEACHERS).length}`);
  console.log(`   🎓 Students created: ${Object.keys(TEST_STUDENTS).length}`);
  
  if (failureCount > 0) {
    console.log('\n⚠️  Some users failed to create. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All test users created successfully!');
    console.log('\n📝 You can now run multi-user E2E tests with:');
    console.log('   npm run test:e2e:multi-user');
  }
}

/**
 * Verify environment setup (skip for emulator mode)
 */
function verifyEnvironment(): void {
  if (USE_EMULATORS) {
    console.log('🏠 Using emulator environment - no service account required');
    return;
  }

  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_ADMIN_SDK_PATH'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables for ${TEST_ENVIRONMENT}:`);
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📝 Example setup:');
    console.error('   export FIREBASE_PROJECT_ID=your-project-id');
    console.error('   export FIREBASE_ADMIN_SDK_PATH=./path/to/service-account-key.json');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔧 Setting up Firebase test users...\n');
    
    // Verify environment
    verifyEnvironment();
    
    // Initialize Firebase
    initializeFirebaseAdmin();
    
    // Create all test users
    await createAllTestUsers();
    
  } catch (error) {
    console.error('\n💥 Unexpected error during setup:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);