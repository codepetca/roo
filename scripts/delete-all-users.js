#!/usr/bin/env node

/**
 * Script to delete all users from Firebase Authentication
 * Usage: node scripts/delete-all-users.js
 */

const admin = require('firebase-admin');

// Initialize admin SDK
admin.initializeApp();

async function deleteAllUsers() {
  const listUsersResult = await admin.auth().listUsers(1000);
  const users = listUsersResult.users;
  
  if (users.length === 0) {
    console.log('No users found to delete');
    return;
  }

  console.log(`Found ${users.length} users to delete`);
  
  // Delete users in batches
  const uids = users.map(user => user.uid);
  
  try {
    const deleteResult = await admin.auth().deleteUsers(uids);
    console.log(`Successfully deleted ${deleteResult.successCount} users`);
    
    if (deleteResult.failureCount > 0) {
      console.log(`Failed to delete ${deleteResult.failureCount} users`);
      deleteResult.errors.forEach((error) => {
        console.log(`Error deleting user ${error.index}: ${error.error}`);
      });
    }
  } catch (error) {
    console.error('Error deleting users:', error);
  }

  // Check if there are more users (pagination)
  if (listUsersResult.pageToken) {
    console.log('More users found, continuing deletion...');
    await deleteAllUsers();
  }
}

// Run the script
deleteAllUsers()
  .then(() => {
    console.log('User deletion complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to delete users:', error);
    process.exit(1);
  });