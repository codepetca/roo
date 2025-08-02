/**
 * Check Firestore sync history directly
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'roo-app-3d24e'
});

const db = admin.firestore();

async function checkSyncHistory() {
  console.log('📜 Checking webhook sync history...\n');
  
  try {
    const snapshot = await db.collection('webhook_sync_history')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    if (snapshot.empty) {
      console.log('No sync history found');
      return;
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n📍 Sync ID: ${doc.id}`);
      console.log(`   Timestamp: ${data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp}`);
      console.log(`   Teacher: ${data.teacherId}`);
      console.log(`   Sheet: ${data.spreadsheetId}`);
      console.log(`   Success: ${data.success}`);
      if (data.error) {
        console.log(`   ❌ Error: ${data.error}`);
      }
      if (data.results) {
        console.log(`   Results:`, data.results);
      }
    });
    
  } catch (error) {
    console.error('Error reading sync history:', error.message);
    console.error('Make sure you have the correct permissions to access Firestore');
  }
}

async function checkTeachers() {
  console.log('\n\n👥 Checking teachers in database...\n');
  
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'teacher')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      console.log('No teachers found');
      return;
    }
    
    console.log(`Found ${snapshot.size} teacher(s):`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.email} (ID: ${doc.id})`);
    });
    
  } catch (error) {
    console.error('Error reading teachers:', error.message);
  }
}

async function main() {
  await checkSyncHistory();
  await checkTeachers();
  process.exit(0);
}

main();