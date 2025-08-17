const admin = require('firebase-admin');

// Initialize admin SDK with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'roo-app-3d24e'
  });
}

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid exploding the stack
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteAllData() {
  console.log('Starting to delete all Firestore data...');
  
  // List all root collections
  const collections = await db.listCollections();
  
  for (const collection of collections) {
    console.log(`Deleting collection: ${collection.id}`);
    await deleteCollection(collection.id);
    console.log(`✓ Deleted collection: ${collection.id}`);
  }
  
  console.log('✅ All Firestore data deleted successfully!');
}

deleteAllData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error deleting data:', error);
    process.exit(1);
  });