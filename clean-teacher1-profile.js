const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = admin.initializeApp({
  projectId: 'roo-app-3d24e'
});
const db = app.firestore();

async function cleanTeacher1Profile() {
  try {
    console.log('🧹 Cleaning teacher1 profile for fresh import...\n');
    
    // 1. Get current user document
    const userDoc = await db.collection('users').doc('teacher1-e2e-uid').get();
    if (!userDoc.exists) {
      console.log('❌ Teacher1 user document not found');
      return;
    }
    
    const currentData = userDoc.data();
    console.log('📋 Current user profile:', {
      email: currentData.email,
      displayName: currentData.displayName,
      classroomIds: currentData.classroomIds,
      totalClassrooms: currentData.totalClassrooms,
      totalStudents: currentData.totalStudents
    });
    
    // 2. Clear classroom-related fields
    const updatedData = {
      classroomIds: [],
      totalClassrooms: 0,
      totalStudents: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc('teacher1-e2e-uid').update(updatedData);
    console.log('✅ Cleared classroom references from teacher1 user profile');
    
    // 3. Check and remove any compressed snapshots
    const compressedSnapshotDoc = await db.collection('compressed_snapshots').doc('teacher1-e2e-uid').get();
    if (compressedSnapshotDoc.exists) {
      await db.collection('compressed_snapshots').doc('teacher1-e2e-uid').delete();
      console.log('✅ Removed compressed snapshot for teacher1');
    } else {
      console.log('ℹ️  No compressed snapshot found for teacher1');
    }
    
    // 4. Verify cleanup
    const cleanedUserDoc = await db.collection('users').doc('teacher1-e2e-uid').get();
    const cleanedData = cleanedUserDoc.data();
    console.log('\n📋 Cleaned user profile:', {
      email: cleanedData.email,
      displayName: cleanedData.displayName,
      classroomIds: cleanedData.classroomIds,
      totalClassrooms: cleanedData.totalClassrooms,
      totalStudents: cleanedData.totalStudents
    });
    
    console.log('\n✅ Teacher1 profile cleaned successfully! Ready for fresh import.');
    
  } catch (error) {
    console.error('❌ Error cleaning teacher1 profile:', error);
  } finally {
    process.exit(0);
  }
}

cleanTeacher1Profile();