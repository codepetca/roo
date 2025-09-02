const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = admin.initializeApp({
  projectId: 'roo-app-3d24e'
});
const db = app.firestore();

async function debugTeacher1Data() {
  try {
    console.log('🔍 Debugging teacher1 data in emulator...\n');
    
    // 1. Check user data
    console.log('1. Checking user data:');
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'teacher1@test.com')
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No user found with email teacher1@test.com');
    } else {
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log('✅ User found:', {
          id: doc.id,
          email: userData.email,
          schoolEmail: userData.schoolEmail,
          displayName: userData.displayName
        });
      });
    }
    
    // 2. Check classrooms with teacherId = teacher1@test.com
    console.log('\n2. Checking classrooms with teacherId = teacher1@test.com:');
    const classrooms1 = await db.collection('classrooms')
      .where('teacherId', '==', 'teacher1@test.com')
      .get();
    
    if (classrooms1.empty) {
      console.log('❌ No classrooms found with teacherId = teacher1@test.com');
    } else {
      console.log(`✅ Found ${classrooms1.size} classrooms with teacherId = teacher1@test.com`);
      classrooms1.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.name} (teacherId: ${data.teacherId})`);
      });
    }
    
    // 3. Check classrooms with teacherId = teacher1@schoolemail.com
    console.log('\n3. Checking classrooms with teacherId = teacher1@schoolemail.com:');
    const classrooms2 = await db.collection('classrooms')
      .where('teacherId', '==', 'teacher1@schoolemail.com')
      .get();
    
    if (classrooms2.empty) {
      console.log('❌ No classrooms found with teacherId = teacher1@schoolemail.com');
    } else {
      console.log(`✅ Found ${classrooms2.size} classrooms with teacherId = teacher1@schoolemail.com`);
      classrooms2.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.name} (teacherId: ${data.teacherId})`);
      });
    }
    
    // 4. Check ALL classrooms to see what teacherIds exist
    console.log('\n4. Checking ALL classrooms to see teacherIds:');
    const allClassrooms = await db.collection('classrooms').get();
    
    if (allClassrooms.empty) {
      console.log('❌ No classrooms found at all');
    } else {
      console.log(`✅ Found ${allClassrooms.size} total classrooms:`);
      allClassrooms.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.name || 'Unnamed'} (teacherId: ${data.teacherId})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugTeacher1Data();