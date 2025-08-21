/**
 * Firestore Test Data Cleanup Script
 * 
 * Deletes test data collections while preserving user accounts
 * This allows for fresh import testing without re-registering accounts
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'roo-app-3d24e'
  });
}

const db = admin.firestore();

/**
 * Delete all documents in a collection (in batches for efficiency)
 */
async function deleteCollection(collectionName, batchSize = 100) {
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, batchSize, resolve, reject);
  });
}

async function deleteQueryBatch(query, batchSize, resolve, reject) {
  try {
    const snapshot = await query.get();

    // No documents left, we're done
    if (snapshot.size === 0) {
      resolve();
      return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse on the next batch
    process.nextTick(() => {
      deleteQueryBatch(query, batchSize, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

/**
 * Main cleanup function
 */
async function cleanupTestData() {
  console.log('🧹 Starting Firestore Test Data Cleanup...\n');
  
  // Collections to delete (preserving users)
  const collectionsToDelete = [
    'classrooms',
    'assignments',
    'submissions',
    'grades',
    'enrollments',
    'teacher_imports'
  ];
  
  console.log('📋 Collections to delete:');
  collectionsToDelete.forEach(col => console.log(`  - ${col}`));
  console.log('\n✅ Preserving: users collection\n');
  
  // Delete each collection
  for (const collectionName of collectionsToDelete) {
    try {
      process.stdout.write(`Deleting ${collectionName}...`);
      
      // Get document count first
      const snapshot = await db.collection(collectionName).count().get();
      const count = snapshot.data().count;
      
      if (count === 0) {
        console.log(' (empty - skipped)');
        continue;
      }
      
      await deleteCollection(collectionName);
      console.log(` ✅ (deleted ${count} documents)`);
    } catch (error) {
      console.log(` ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Cleanup complete!');
  console.log('📝 User accounts preserved - ready for fresh import testing');
  
  // Show remaining users count
  try {
    const usersSnapshot = await db.collection('users').count().get();
    const userCount = usersSnapshot.data().count;
    console.log(`👥 ${userCount} user accounts remain in the system`);
  } catch (error) {
    console.log('Could not count users:', error.message);
  }
}

// Run the cleanup
cleanupTestData()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });