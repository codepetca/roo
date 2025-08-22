/**
 * Student Test User Creation Script
 * 
 * Creates a test student user account with the following credentials:
 * - Email: student@test.com (for login)
 * - School Email: student@schoolemail.com (for classroom enrollment matching)
 * - Passcode: 12345 (for passcode authentication)
 * - Role: student
 * 
 * Usage:
 *   cd functions
 *   node create-student-test-user.js
 * 
 * Prerequisites:
 *   - Firebase service account file: roo-app-3d24e-service-account.json
 *   - Proper Firebase project permissions
 */

const admin = require('firebase-admin');
const serviceAccount = require('./roo-app-3d24e-service-account.json');

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'roo-app-3d24e'
});

const firestore = admin.firestore();
const auth = admin.auth();

async function createStudentTestUser() {
  try {
    console.log('Creating student@test.com user profile...');

    const studentEmail = 'student@test.com';
    
    // Check if user document already exists
    const existingUsersQuery = await firestore.collection('users')
      .where('email', '==', studentEmail)
      .limit(1)
      .get();

    if (!existingUsersQuery.empty) {
      const existingDoc = existingUsersQuery.docs[0];
      console.log('User already exists, updating passcode...');
      
      // Update existing user with passcode and school email
      await existingDoc.ref.update({
        schoolEmail: 'student@schoolemail.com', // Ensure school email is set
        passcode: {
          value: '12345',
          createdAt: new Date(),
          lastRequestedAt: new Date(),
          attempts: 0
        },
        updatedAt: new Date()
      });
      
      console.log('✅ Updated existing user with passcode 12345');
      console.log('User document ID:', existingDoc.id);
      return;
    }

    // Create new user document with passcode (matching student-request-passcode.ts structure)
    const userData = {
      email: studentEmail,
      name: 'Test Student',
      displayName: 'Test Student',
      role: 'student',
      schoolEmail: 'student@schoolemail.com', // School email for classroom enrollment matching
      passcode: {
        value: '12345',
        createdAt: new Date(),
        lastRequestedAt: new Date(),
        attempts: 0
      },
      classroomIds: [],
      totalStudents: 0,
      totalClassrooms: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create the user document
    const newUserDoc = await firestore.collection('users').add(userData);
    console.log('✅ Created new user document with passcode 12345');
    console.log('User document ID:', newUserDoc.id);

    // Optionally create Firebase Auth user if it doesn't exist
    try {
      const authUser = await auth.getUserByEmail(studentEmail);
      console.log('Firebase Auth user already exists:', authUser.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('Creating Firebase Auth user...');
        const newAuthUser = await auth.createUser({
          email: studentEmail,
          emailVerified: true,
          displayName: 'Test Student'
        });
        
        // Set custom claims
        await auth.setCustomUserClaims(newAuthUser.uid, { role: 'student' });
        
        console.log('✅ Created Firebase Auth user:', newAuthUser.uid);
        
        // Update the Firestore document with the Auth UID
        await newUserDoc.update({
          uid: newAuthUser.uid
        });
      } else {
        throw error;
      }
    }

    console.log('\n========================================');
    console.log('✅ Student test user created successfully!');
    console.log('========================================');
    console.log('Email: student@test.com');
    console.log('School Email: student@schoolemail.com');
    console.log('Passcode: 12345');
    console.log('Role: student');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error creating student test user:', error);
    throw error;
  }
}

// Run the script
createStudentTestUser()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });