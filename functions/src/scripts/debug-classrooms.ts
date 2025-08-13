#!/usr/bin/env ts-node

/**
 * Debug Classrooms Script
 * Location: functions/src/scripts/debug-classrooms.ts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin for emulator
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'roo-app-3d24e'
  });
}

// Connect to emulator
const firestore = admin.firestore();
firestore.settings({
  host: 'localhost:8080',
  ssl: false
});

async function debugClassrooms() {
  try {
    console.log('Checking all classrooms in emulator...');

    const snapshot = await firestore.collection('classrooms').limit(10).get();
    
    if (snapshot.empty) {
      console.log('No classrooms found in emulator');
    } else {
      console.log(`Found ${snapshot.docs.length} classrooms:`);
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}, teacherId: ${data.teacherId}, name: ${data.name}`);
      });
    }

    console.log('\nChecking users collection...');
    const usersSnapshot = await firestore.collection('users').limit(10).get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in emulator');
    } else {
      console.log(`Found ${usersSnapshot.docs.length} users:`);
      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}, email: ${data.email}, role: ${data.role}, schoolEmail: ${data.schoolEmail || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugClassrooms()
  .then(() => {
    console.log('Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Debug failed:', error);
    process.exit(1);
  });