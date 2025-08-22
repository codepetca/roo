const admin = require('firebase-admin');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForced = args.includes('--force');
const useEmulator = args.includes('--emulator');

// Console colors for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  if (useEmulator) {
    // Configure for Firebase emulator
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    admin.initializeApp({
      projectId: 'roo-app-3d24e'
    });
    colorLog('🧪 Connected to Firebase Emulator', colors.cyan);
  } else {
    // Configure for production
    admin.initializeApp({
      projectId: 'roo-app-3d24e'
    });
    colorLog('🔥 Connected to Production Firebase', colors.red);
  }
}

const db = admin.firestore();

/**
 * Delete all documents in a collection using batch operations
 * @param {string} collectionPath - Path to the collection
 * @param {number} batchSize - Number of documents to delete per batch
 */
async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, collectionPath, resolve).catch(reject);
  });
}

/**
 * Delete a batch of documents recursively
 */
async function deleteQueryBatch(query, collectionPath, resolve) {
  const snapshot = await query.get();
  const batchSize = snapshot.size;

  if (batchSize === 0) {
    resolve();
    return;
  }

  if (isDryRun) {
    colorLog(`  📄 Would delete ${batchSize} documents from ${collectionPath}`, colors.yellow);
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  colorLog(`  ✅ Deleted ${batchSize} documents from ${collectionPath}`, colors.green);

  // Recurse on the next process tick to avoid stack overflow
  process.nextTick(() => {
    deleteQueryBatch(query, collectionPath, resolve);
  });
}

/**
 * Get user confirmation before proceeding with deletion
 */
function getUserConfirmation(collections) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    colorLog('\n⚠️  WARNING: This will permanently delete the following collections:', colors.red);
    collections.forEach(collection => {
      colorLog(`    • ${collection}`, colors.yellow);
    });
    colorLog(`\n✅ Protected collection (will NOT be deleted):`, colors.green);
    colorLog(`    • users`, colors.green);

    const environment = useEmulator ? 'EMULATOR' : 'PRODUCTION';
    colorLog(`\n🎯 Target: ${environment}`, useEmulator ? colors.cyan : colors.red);

    if (isDryRun) {
      colorLog('\n🧪 DRY RUN MODE: No data will actually be deleted', colors.cyan);
      rl.close();
      resolve(true);
      return;
    }

    rl.question('\nAre you sure you want to proceed? Type "DELETE" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'DELETE');
    });
  });
}

/**
 * Main function to delete all collections except users
 */
async function deleteAllCollectionsExceptUsers() {
  try {
    colorLog('🔍 Scanning Firestore for collections...', colors.blue);
    
    // Get all root collections
    const collections = await db.listCollections();
    const collectionNames = collections.map(collection => collection.id);
    
    if (collectionNames.length === 0) {
      colorLog('📭 No collections found in Firestore', colors.yellow);
      return;
    }

    // Filter out the users collection
    const collectionsToDelete = collectionNames.filter(name => name !== 'users');
    const usersExists = collectionNames.includes('users');

    colorLog(`\n📊 Found ${collectionNames.length} total collections:`, colors.blue);
    collectionNames.forEach(name => {
      if (name === 'users') {
        colorLog(`    ✅ ${name} (protected)`, colors.green);
      } else {
        colorLog(`    🗑️  ${name} (will be deleted)`, colors.red);
      }
    });

    if (collectionsToDelete.length === 0) {
      colorLog('\n🎉 No collections to delete (only users collection exists)', colors.green);
      return;
    }

    if (!usersExists) {
      colorLog('\n⚠️  WARNING: Users collection not found!', colors.yellow);
    }

    // Get user confirmation unless forced
    if (!isForced) {
      const confirmed = await getUserConfirmation(collectionsToDelete);
      if (!confirmed) {
        colorLog('\n❌ Operation cancelled by user', colors.yellow);
        return;
      }
    }

    // Delete collections
    const mode = isDryRun ? 'DRY RUN' : 'DELETION';
    colorLog(`\n🚀 Starting ${mode}...`, isDryRun ? colors.cyan : colors.red);
    
    for (const collectionName of collectionsToDelete) {
      colorLog(`\n🗑️  Processing collection: ${collectionName}`, colors.magenta);
      
      try {
        await deleteCollection(collectionName);
        
        if (!isDryRun) {
          colorLog(`✅ Successfully deleted collection: ${collectionName}`, colors.green);
        } else {
          colorLog(`✅ Dry run completed for collection: ${collectionName}`, colors.cyan);
        }
      } catch (error) {
        colorLog(`❌ Error processing collection ${collectionName}: ${error.message}`, colors.red);
        throw error;
      }
    }

    const successMessage = isDryRun 
      ? `🧪 Dry run completed! ${collectionsToDelete.length} collections would be deleted`
      : `🎉 Successfully deleted ${collectionsToDelete.length} collections!`;
    
    colorLog(`\n${successMessage}`, isDryRun ? colors.cyan : colors.green);
    colorLog(`✅ Users collection remains protected and untouched`, colors.green);

  } catch (error) {
    colorLog(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Show usage information
function showUsage() {
  colorLog('\n📖 Usage:', colors.bright);
  colorLog('  node scripts/delete-collections-except-users.js [options]', colors.cyan);
  colorLog('\n🎛️  Options:', colors.bright);
  colorLog('  --dry-run    Preview what will be deleted without actually deleting', colors.cyan);
  colorLog('  --force      Skip confirmation prompt', colors.cyan);
  colorLog('  --emulator   Target Firebase emulator instead of production', colors.cyan);
  colorLog('\n📝 Examples:', colors.bright);
  colorLog('  # Preview deletion (recommended first step)', colors.cyan);
  colorLog('  node scripts/delete-collections-except-users.js --dry-run', colors.yellow);
  colorLog('\n  # Delete with confirmation prompt', colors.cyan);
  colorLog('  node scripts/delete-collections-except-users.js', colors.yellow);
  colorLog('\n  # Delete without confirmation (use with caution)', colors.cyan);
  colorLog('  node scripts/delete-collections-except-users.js --force', colors.red);
  colorLog('\n  # Target emulator for testing', colors.cyan);
  colorLog('  node scripts/delete-collections-except-users.js --emulator --dry-run', colors.yellow);
}

// Handle help argument
if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Main execution
colorLog('🔥 Firestore Collection Deletion Script', colors.bright);
colorLog('📋 Deletes ALL collections except /users', colors.blue);

deleteAllCollectionsExceptUsers()
  .then(() => {
    colorLog('\n✨ Script completed successfully!', colors.green);
    process.exit(0);
  })
  .catch((error) => {
    colorLog(`\n💥 Script failed: ${error.message}`, colors.red);
    process.exit(1);
  });