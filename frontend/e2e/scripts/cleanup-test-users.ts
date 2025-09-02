#!/usr/bin/env node

/**
 * Cleanup Test Users Script
 * Location: frontend/e2e/scripts/cleanup-test-users.ts
 *
 * Removes all test users from Firebase Auth and cleans up their Firestore data
 * Supports three environments: emulators (default), staging, and production
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ALL_TEST_USERS, TestUserConfig } from './test-users-config';

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
 * Delete a single user from Firebase Auth
 */
async function deleteUser(userConfig: TestUserConfig): Promise<boolean> {
  try {
    const auth = getAuth();
    
    // Try to delete by UID first
    try {
      await auth.deleteUser(userConfig.uid);
      console.log(`✅ Deleted user by UID: ${userConfig.email} (${userConfig.uid})`);
      return true;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Try to find and delete by email
        try {
          const userRecord = await auth.getUserByEmail(userConfig.email);
          await auth.deleteUser(userRecord.uid);
          console.log(`✅ Deleted user by email: ${userConfig.email} (${userRecord.uid})`);
          return true;
        } catch (emailError) {
          if (emailError.code === 'auth/user-not-found') {
            console.log(`⚠️  User not found: ${userConfig.email} (already deleted)`);
            return true;
          } else {
            throw emailError;
          }
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`❌ Failed to delete user ${userConfig.email}:`, error.message);
    return false;
  }
}

/**
 * Delete user profile from Firestore
 */
async function deleteUserProfile(userConfig: TestUserConfig): Promise<boolean> {
  try {
    const db = getFirestore();
    
    // Delete user profile document
    await db.collection('users').doc(userConfig.uid).delete();
    console.log(`✅ Deleted profile for: ${userConfig.email}`);
    
    return true;
  } catch (error) {
    // Profile might not exist, which is okay
    if (error.code === 'not-found') {
      console.log(`⚠️  Profile not found: ${userConfig.email} (already deleted)`);
      return true;
    } else {
      console.error(`❌ Failed to delete profile for ${userConfig.email}:`, error.message);
      return false;
    }
  }
}

/**
 * Clean up all test-related data for a user
 */
async function cleanupUserData(userConfig: TestUserConfig): Promise<boolean> {
  try {
    const db = getFirestore();
    let deletedDocs = 0;

    // Clean up teacher-specific data
    if (userConfig.role === 'teacher') {
      // Delete classrooms owned by this teacher
      const classroomsQuery = await db
        .collection('classrooms')
        .where('teacherEmail', '==', userConfig.schoolEmail || userConfig.email)
        .get();
      
      for (const doc of classroomsQuery.docs) {
        await doc.ref.delete();
        deletedDocs++;
      }

      // Delete assignments created by this teacher
      const assignmentsQuery = await db
        .collection('assignments')
        .where('teacherEmail', '==', userConfig.schoolEmail || userConfig.email)
        .get();
      
      for (const doc of assignmentsQuery.docs) {
        await doc.ref.delete();
        deletedDocs++;
      }

      // Delete submissions in teacher's classrooms
      const submissionsQuery = await db
        .collection('submissions')
        .where('teacherEmail', '==', userConfig.schoolEmail || userConfig.email)
        .get();
      
      for (const doc of submissionsQuery.docs) {
        await doc.ref.delete();
        deletedDocs++;
      }

      // Delete grades given by this teacher
      const gradesQuery = await db
        .collection('grades')
        .where('graderId', '==', userConfig.schoolEmail || userConfig.email)
        .get();
      
      for (const doc of gradesQuery.docs) {
        await doc.ref.delete();
        deletedDocs++;
      }
    }

    // Clean up student-specific data
    if (userConfig.role === 'student') {
      // Delete submissions by this student
      const submissionsQuery = await db
        .collection('submissions')
        .where('studentEmail', '==', userConfig.schoolEmail || userConfig.email)
        .get();
      
      for (const doc of submissionsQuery.docs) {
        await doc.ref.delete();
        deletedDocs++;
      }

      // Delete grades for this student
      const gradesQuery = await db
        .collection('grades')
        .where('studentEmail', '==', userConfig.schoolEmail || userConfig.email)
        .get();
      
      for (const doc of gradesQuery.docs) {
        await doc.ref.delete();
        deletedDocs++;
      }

      // Delete enrollments for this student
      const enrollmentsQuery = await db
        .collection('enrollments')
        .where('studentEmail', '==', userConfig.schoolEmail || userConfig.email)
        .get();
      
      for (const doc of enrollmentsQuery.docs) {
        await doc.ref.delete();
        deletedDocs++;
      }
    }

    if (deletedDocs > 0) {
      console.log(`✅ Cleaned up ${deletedDocs} documents for: ${userConfig.email}`);
    } else {
      console.log(`⚠️  No additional data found for: ${userConfig.email}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to cleanup data for ${userConfig.email}:`, error.message);
    return false;
  }
}

/**
 * Clean up all test user data by querying for test marker
 */
async function cleanupAllTestData(): Promise<void> {
  try {
    const db = getFirestore();
    let totalDeleted = 0;

    console.log('🧹 Cleaning up all test-related data...');

    // Collections that might contain test data
    const collections = [
      'classrooms',
      'assignments', 
      'submissions',
      'grades',
      'enrollments',
      'users' // Clean up any remaining test user profiles
    ];

    for (const collectionName of collections) {
      try {
        // Query for documents marked as test data
        const testDataQuery = await db
          .collection(collectionName)
          .where('isTestUser', '==', true)
          .get();

        for (const doc of testDataQuery.docs) {
          await doc.ref.delete();
          totalDeleted++;
        }

        if (testDataQuery.docs.length > 0) {
          console.log(`✅ Cleaned up ${testDataQuery.docs.length} test documents from ${collectionName}`);
        }
      } catch (error) {
        // Some collections might not have the isTestUser field, which is okay
        console.log(`⚠️  Could not query ${collectionName} for test data: ${error.message}`);
      }
    }

    console.log(`✅ Total test documents cleaned: ${totalDeleted}`);
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error.message);
  }
}

/**
 * Delete all test users
 */
async function deleteAllTestUsers(): Promise<void> {
  console.log('🗑️  Starting test user cleanup process...\n');
  
  let successCount = 0;
  let failureCount = 0;

  // Delete all users
  for (const userConfig of ALL_TEST_USERS) {
    console.log(`\n🗑️  Processing user: ${userConfig.email} (${userConfig.role})`);
    
    const userDeleted = await deleteUser(userConfig);
    const profileDeleted = await deleteUserProfile(userConfig);
    const dataDeleted = await cleanupUserData(userConfig);
    
    if (userDeleted && profileDeleted && dataDeleted) {
      successCount++;
      console.log(`✅ Successfully cleaned up: ${userConfig.email}`);
    } else {
      failureCount++;
      console.log(`❌ Failed to fully clean up: ${userConfig.email}`);
    }
  }

  // Clean up any remaining test data
  await cleanupAllTestData();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test User Cleanup Summary:');
  console.log(`   ✅ Successfully cleaned: ${successCount} users`);
  console.log(`   ❌ Failed to clean: ${failureCount} users`);
  
  if (failureCount > 0) {
    console.log('\n⚠️  Some users failed to clean up. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All test users and data cleaned successfully!');
  }
}

/**
 * Confirm cleanup with user
 */
function confirmCleanup(): Promise<boolean> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(
      `⚠️  This will permanently delete ALL test users and their data from ${FIREBASE_PROJECT_ID}.\n` +
      'Are you sure you want to continue? (yes/no): ',
      (answer: string) => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      }
    );
  });
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
    console.log('🧹 Firebase test users cleanup...\n');
    
    // Verify environment
    verifyEnvironment();
    
    // Get confirmation (skip in CI or if --force flag is passed)
    const forceCleanup = process.argv.includes('--force') || process.env.CI;
    if (!forceCleanup) {
      const confirmed = await confirmCleanup();
      if (!confirmed) {
        console.log('❌ Cleanup cancelled.');
        process.exit(0);
      }
    }
    
    // Initialize Firebase
    initializeFirebaseAdmin();
    
    // Delete all test users
    await deleteAllTestUsers();
    
  } catch (error) {
    console.error('\n💥 Unexpected error during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);