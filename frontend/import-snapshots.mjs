#!/usr/bin/env node

/**
 * Import Classroom Snapshots Script
 * Location: frontend/import-snapshots.mjs
 *
 * Imports classroom snapshot data via authenticated API requests
 * Uses Firebase Admin SDK to get custom auth tokens for teachers
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import fetch from 'node-fetch';

// Configuration
const FIREBASE_PROJECT_ID = 'roo-app-3d24e';
const EMULATOR_HOST = '127.0.0.1';
const AUTH_EMULATOR_PORT = 9099;
const FUNCTIONS_URL = `http://${EMULATOR_HOST}:5001/${FIREBASE_PROJECT_ID}/us-central1/api`;

// Test teacher credentials
const TEACHERS = [
  { email: 'teacher1@test.com', uid: 'teacher1-e2e-uid', snapshotFile: './e2e/fixtures/teacher1-snapshot.json' },
  { email: 'teacher2@test.com', uid: 'teacher2-e2e-uid', snapshotFile: './e2e/fixtures/teacher2-snapshot.json' },
  { email: 'teacher3@test.com', uid: 'teacher3-e2e-uid', snapshotFile: './e2e/fixtures/teacher3-snapshot.json' }
];

/**
 * Initialize Firebase Admin SDK for emulator
 */
function initializeFirebaseAdmin() {
  try {
    // Set emulator environment variables
    process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:8080`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`;

    const app = initializeApp({
      projectId: FIREBASE_PROJECT_ID
    });

    console.log(`✅ Initialized Firebase Admin SDK for emulator`);
    console.log(`   Project: ${FIREBASE_PROJECT_ID}`);
    console.log(`   Auth Emulator: ${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`);
    
    return app;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    process.exit(1);
  }
}

/**
 * Get a custom auth token for a teacher
 */
async function getCustomToken(teacherUid) {
  try {
    const auth = getAuth();
    const customToken = await auth.createCustomToken(teacherUid);
    console.log(`✅ Created custom token for ${teacherUid}`);
    return customToken;
  } catch (error) {
    console.error(`❌ Failed to create custom token for ${teacherUid}:`, error.message);
    throw error;
  }
}

/**
 * Exchange custom token for an ID token that can be used in API requests
 */
async function getIdToken(customToken) {
  try {
    const response = await fetch(`http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}/www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=fake-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Failed to exchange custom token: ${data.error?.message || response.statusText}`);
    }

    console.log(`✅ Exchanged custom token for ID token`);
    return data.idToken;
  } catch (error) {
    console.error(`❌ Failed to exchange custom token for ID token:`, error.message);
    throw error;
  }
}

/**
 * Import a snapshot via authenticated API request
 */
async function importSnapshot(snapshotData, idToken, teacherEmail) {
  try {
    console.log(`📡 Importing snapshot for ${teacherEmail}...`);
    
    const response = await fetch(`${FUNCTIONS_URL}/snapshots/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(snapshotData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`API request failed: ${result.error || result.message || response.statusText}`);
    }

    if (!result.success) {
      throw new Error(`Import failed: ${result.error || 'Unknown error'}`);
    }

    console.log(`✅ Successfully imported snapshot for ${teacherEmail}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to import snapshot for ${teacherEmail}:`, error.message);
    throw error;
  }
}

/**
 * Main import process
 */
async function importAllSnapshots() {
  console.log('🚀 Starting classroom snapshot import...\n');

  // Initialize Firebase Admin
  initializeFirebaseAdmin();

  let successCount = 0;
  let failureCount = 0;

  // Process each teacher
  for (const teacher of TEACHERS) {
    try {
      console.log(`\n📝 Processing ${teacher.email}...`);

      // Read snapshot file
      console.log(`📖 Reading snapshot file: ${teacher.snapshotFile}`);
      const snapshotData = JSON.parse(readFileSync(teacher.snapshotFile, 'utf8'));

      // Get custom token
      const customToken = await getCustomToken(teacher.uid);

      // Exchange for ID token
      const idToken = await getIdToken(customToken);

      // Import snapshot
      await importSnapshot(snapshotData, idToken, teacher.email);

      successCount++;
      console.log(`✅ Successfully processed ${teacher.email}`);

    } catch (error) {
      failureCount++;
      console.error(`❌ Failed to process ${teacher.email}:`, error.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Snapshot Import Summary:');
  console.log(`   ✅ Successfully imported: ${successCount} snapshots`);
  console.log(`   ❌ Failed to import: ${failureCount} snapshots`);

  if (failureCount > 0) {
    console.log('\n⚠️  Some snapshots failed to import. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All snapshots imported successfully!');
    console.log('\n💡 Your emulator now has full classroom data for testing:');
    console.log('   - Classrooms with assignments and submissions');
    console.log('   - Student enrollments and grades'); 
    console.log('   - Teacher dashboards with real data');
    console.log('\n🔗 Access the app at: http://localhost:5173');
  }
}

// Check if emulators are running
async function checkEmulators() {
  try {
    const response = await fetch(`http://${EMULATOR_HOST}:4000`, { timeout: 2000 });
    console.log('✅ Firebase emulators are running\n');
  } catch (error) {
    console.error('❌ Firebase emulators are not running!');
    console.error('Start them with: npm run emulators');
    console.error('Make sure both Auth and Functions emulators are accessible');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Check if emulators are running
    await checkEmulators();

    // Import all snapshots
    await importAllSnapshots();
  } catch (error) {
    console.error('\n💥 Unexpected error during import:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);