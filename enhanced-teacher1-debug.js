const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = admin.initializeApp({
  projectId: 'roo-app-3d24e'
});
const db = app.firestore();

async function enhancedTeacher1Debug() {
  try {
    console.log('🔍 Enhanced debugging for teacher1 data in emulator...\n');
    
    // 1. Get full user document by UID
    console.log('1. Checking teacher1 user by UID (teacher1-e2e-uid):');
    try {
      const userDoc = await db.collection('users').doc('teacher1-e2e-uid').get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log('✅ User document found:', {
          id: userDoc.id,
          email: userData.email,
          schoolEmail: userData.schoolEmail,
          displayName: userData.displayName,
          role: userData.role,
          classroomIds: userData.classroomIds || 'undefined',
          totalStudents: userData.totalStudents || 'undefined',
          totalClassrooms: userData.totalClassrooms || 'undefined'
        });
      } else {
        console.log('❌ No user document found with UID teacher1-e2e-uid');
      }
    } catch (error) {
      console.log('❌ Error fetching user document:', error.message);
    }
    
    // 2. Check all collections for any references to teacher1
    console.log('\n2. Checking ALL collections for teacher1 references:');
    
    const collections = ['users', 'classrooms', 'assignments', 'submissions', 'grades', 'enrollments'];
    
    for (const collectionName of collections) {
      console.log(`\n--- Checking collection: ${collectionName} ---`);
      
      try {
        const snapshot = await db.collection(collectionName).get();
        console.log(`Total documents in ${collectionName}: ${snapshot.size}`);
        
        let teacher1Count = 0;
        const teacher1Docs = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const docString = JSON.stringify(data).toLowerCase();
          
          // Check for any teacher1 references
          if (docString.includes('teacher1') || 
              (data.teacherId && (data.teacherId.includes('teacher1') || data.teacherId === 'teacher1-e2e-uid')) ||
              (data.userId && data.userId === 'teacher1-e2e-uid') ||
              (data.email && data.email.includes('teacher1'))) {
            teacher1Count++;
            teacher1Docs.push({
              id: doc.id,
              teacherId: data.teacherId,
              userId: data.userId, 
              email: data.email,
              name: data.name || data.title || data.displayName
            });
          }
        });
        
        if (teacher1Count > 0) {
          console.log(`✅ Found ${teacher1Count} documents with teacher1 references:`);
          teacher1Docs.forEach(doc => {
            console.log(`  - ${doc.id}: ${doc.name || 'No name'} (teacherId: ${doc.teacherId}, userId: ${doc.userId}, email: ${doc.email})`);
          });
        } else {
          console.log(`❌ No documents found with teacher1 references`);
        }
        
      } catch (error) {
        console.log(`❌ Error checking collection ${collectionName}:`, error.message);
      }
    }
    
    // 3. Check compressed snapshots (where optimization data is stored)
    console.log('\n3. Checking compressed snapshots:');
    try {
      const compressedSnapshot = await db.collection('compressed_snapshots').doc('teacher1-e2e-uid').get();
      if (compressedSnapshot.exists) {
        const data = compressedSnapshot.data();
        console.log('✅ Compressed snapshot found:', {
          hasData: !!data,
          keys: Object.keys(data || {}),
          timestamp: data?.timestamp || 'undefined'
        });
      } else {
        console.log('❌ No compressed snapshot found for teacher1-e2e-uid');
      }
    } catch (error) {
      console.log('❌ Error checking compressed snapshots:', error.message);
    }
    
    // 4. Check for any import history/logs
    console.log('\n4. Checking import history/logs:');
    try {
      const importLogs = await db.collection('import_logs').where('teacherId', '==', 'teacher1-e2e-uid').get();
      if (importLogs.empty) {
        console.log('❌ No import logs found for teacher1-e2e-uid');
      } else {
        console.log(`✅ Found ${importLogs.size} import logs:`);
        importLogs.forEach(doc => {
          const data = doc.data();
          console.log(`  - ${doc.id}: ${data.status} at ${data.timestamp}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking import logs:', error.message);
    }
    
    // 5. Summary comparison with teacher2 and teacher3
    console.log('\n5. Summary comparison with other teachers:');
    
    for (const teacherNum of ['2', '3']) {
      const teacherUid = `teacher${teacherNum}-e2e-uid`;
      const teacherEmail = `teacher${teacherNum}@schoolemail.com`;
      
      console.log(`\n--- Teacher${teacherNum} (${teacherUid}) ---`);
      
      // Check user
      const userDoc = await db.collection('users').doc(teacherUid).get();
      console.log(`User exists: ${userDoc.exists}`);
      
      // Check classrooms
      const classrooms = await db.collection('classrooms').where('teacherId', '==', teacherEmail).get();
      console.log(`Classrooms: ${classrooms.size}`);
      
      if (classrooms.size > 0) {
        classrooms.forEach(doc => {
          const data = doc.data();
          console.log(`  - ${doc.id}: ${data.name} (teacherId: ${data.teacherId})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    process.exit(0);
  }
}

enhancedTeacher1Debug();