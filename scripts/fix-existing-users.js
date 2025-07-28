#!/usr/bin/env node

/**
 * Script to create profiles for existing Firebase Auth users
 * Usage: node scripts/fix-existing-users.js [--uid=USER_ID] [--role=teacher|student]
 */

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');

// Initialize Firebase Admin
const app = initializeApp({
  projectId: 'roo-app-3d24e'
});

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};
args.forEach(arg => {
  const [key, value] = arg.split('=');
  argMap[key.replace('--', '')] = value;
});

async function createProfileForUser(uid, role) {
  try {
    // Check if profile already exists
    const profileDoc = await db.collection('users').doc(uid).get();
    if (profileDoc.exists) {
      console.log(`Profile already exists for user ${uid}`);
      return profileDoc.data();
    }

    // Get user from Auth
    const user = await auth.getUser(uid);
    
    // Create profile data
    const profileData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      role: role || user.customClaims?.role || 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: user.emailVerified || false,
      photoURL: user.photoURL || null,
      phoneNumber: user.phoneNumber || null,
      disabled: user.disabled || false,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime || null
      }
    };

    // Add role-specific fields
    if (profileData.role === 'teacher') {
      profileData.teacherData = {
        configuredSheets: false,
        sheetId: null,
        lastSync: null,
        classrooms: []
      };
    } else if (profileData.role === 'student') {
      profileData.studentData = {
        enrolledClasses: [],
        submittedAssignments: []
      };
    }

    // Create the profile
    await db.collection('users').doc(user.uid).set(profileData);
    console.log(`✅ Created profile for user ${uid} with role ${profileData.role}`);
    
    return profileData;
  } catch (error) {
    console.error(`❌ Failed to create profile for user ${uid}:`, error.message);
    throw error;
  }
}

async function fixAllUsers() {
  try {
    console.log('Fetching all users from Firebase Auth...');
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;
    
    console.log(`Found ${users.length} users in Firebase Auth`);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const user of users) {
      try {
        // Check if profile exists
        const profileDoc = await db.collection('users').doc(user.uid).get();
        if (profileDoc.exists) {
          console.log(`Skipping ${user.email} - profile already exists`);
          skipped++;
          continue;
        }
        
        // Create profile
        await createProfileForUser(user.uid, user.customClaims?.role);
        created++;
      } catch (error) {
        console.error(`Failed to process user ${user.email}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Created: ${created} profiles`);
    console.log(`⏭️  Skipped: ${skipped} (already had profiles)`);
    console.log(`❌ Failed: ${failed}`);
    
  } catch (error) {
    console.error('Failed to list users:', error);
  }
}

// Main execution
async function main() {
  try {
    if (argMap.uid) {
      // Fix single user
      console.log(`Creating profile for user ${argMap.uid}...`);
      await createProfileForUser(argMap.uid, argMap.role);
    } else {
      // Fix all users
      console.log('Creating profiles for all users without profiles...');
      await fixAllUsers();
    }
    
    console.log('\nDone! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main();