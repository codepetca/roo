const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
admin.initializeApp({
  projectId: 'roo-app-3d24e'
});

// Connect to emulator
const firestore = admin.firestore();
firestore.settings({
  host: 'localhost:8080',
  ssl: false
});

async function createStudentPasscode() {
  try {
    console.log('Creating student passcode...');

    const stewartEmail = 'stewart.chan@gapps.yrdsb.ca';
    const stewartName = 'Stewart Chan';
    
    // Create student passcode for testing
    const passcode = {
      email: stewartEmail,
      code: 'TEST1',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry for testing
      isUsed: false,
      studentName: stewartName,
      isTemporary: false
    };

    await firestore.collection('passcodes').doc(`${stewartEmail}_TEST1`).set(passcode);
    console.log('✅ Created student passcode: TEST1 for', stewartEmail);

    console.log('✅ Passcode creation completed!');

  } catch (error) {
    console.error('❌ Error creating passcode:', error);
    throw error;
  }
}

createStudentPasscode()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });