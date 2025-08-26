#!/usr/bin/env node

/**
 * Delete Firestore Data Script
 * Uses Firebase CLI for authentication to avoid credential issues
 * 
 * USAGE:
 *   node scripts/delete-firestore-data.js --dry-run     # Preview deletion
 *   node scripts/delete-firestore-data.js               # Delete all except users
 *   node scripts/delete-firestore-data.js --include-users  # Delete everything
 *   node scripts/delete-firestore-data.js --force       # Skip confirmation
 * 
 * COLLECTIONS DELETED (by default):
 *   - classrooms, assignments, submissions, grades, enrollments, teacher_imports
 * COLLECTIONS PRESERVED:
 *   - users (unless --include-users flag is used)
 */

const { execSync } = require('child_process');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForced = args.includes('--force');
const deleteUsers = args.includes('--include-users');

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

/**
 * Execute Firebase CLI command safely
 */
function executeFirebaseCommand(command, description) {
  try {
    colorLog(`🔧 ${description}`, colors.blue);
    
    if (isDryRun) {
      colorLog(`  📋 DRY RUN: Would execute: ${command}`, colors.yellow);
      return 'DRY_RUN_SUCCESS';
    }
    
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    colorLog(`  ✅ Success: ${description}`, colors.green);
    return result;
  } catch (error) {
    colorLog(`  ❌ Failed: ${description}`, colors.red);
    colorLog(`  📋 Command: ${command}`, colors.yellow);
    colorLog(`  💥 Error: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Get confirmation from user
 */
function getUserConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    colorLog('\\n⚠️  WARNING: This will delete Firestore data from PRODUCTION!', colors.red);
    colorLog('🎯 Project: roo-app-3d24e', colors.red);
    
    if (deleteUsers) {
      colorLog('🗑️  This will delete ALL data including users!', colors.red);
    } else {
      colorLog('🗑️  This will delete all collections EXCEPT users', colors.yellow);
      colorLog('✅ Users collection will be preserved', colors.green);
    }

    if (isDryRun) {
      colorLog('\\n🧪 DRY RUN MODE: No data will actually be deleted', colors.cyan);
      rl.close();
      resolve(true);
      return;
    }

    rl.question('\\nType "DELETE" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'DELETE');
    });
  });
}

/**
 * Delete collections using Firebase CLI
 */
async function deleteFirestoreCollections() {
  try {
    // Check Firebase CLI access
    colorLog('🔍 Checking Firebase CLI access...', colors.blue);
    const projectCheck = execSync('firebase projects:list', { encoding: 'utf8' });
    
    if (!projectCheck.includes('roo-app-3d24e')) {
      throw new Error('Cannot access Firebase project roo-app-3d24e. Make sure you are logged in with Firebase CLI.');
    }
    
    colorLog('✅ Firebase CLI access confirmed', colors.green);

    // Get user confirmation
    if (!isForced) {
      const confirmed = await getUserConfirmation();
      if (!confirmed) {
        colorLog('\\n❌ Operation cancelled by user', colors.yellow);
        return;
      }
    }

    colorLog('\\n🚀 Starting Firestore data deletion...', colors.bright);

    // List of collections to delete (excluding users unless specified)
    const collectionsToDelete = [
      'classrooms',
      'assignments', 
      'submissions',
      'grades',
      'enrollments',
      'teacher_imports'
    ];

    if (deleteUsers) {
      collectionsToDelete.push('users');
    }

    // Delete each collection
    for (const collection of collectionsToDelete) {
      const description = `Deleting collection: ${collection}`;
      const command = `firebase firestore:delete --project=roo-app-3d24e --recursive --force ${collection}`;
      
      try {
        await executeFirebaseCommand(command, description);
      } catch (error) {
        colorLog(`⚠️  Warning: Could not delete ${collection} (may not exist)`, colors.yellow);
      }
    }

    // Delete Firebase Auth users if requested
    if (deleteUsers && !isDryRun) {
      try {
        colorLog('🔧 Deleting Firebase Auth users...', colors.blue);
        execSync('node scripts/delete-all-users.js', { encoding: 'utf8', stdio: 'inherit' });
        colorLog('✅ Firebase Auth users deleted', colors.green);
      } catch (error) {
        colorLog('⚠️  Warning: Could not delete Auth users', colors.yellow);
      }
    }

    const mode = isDryRun ? 'DRY RUN COMPLETED' : 'DELETION COMPLETED';
    colorLog(`\\n🎉 ${mode}!`, isDryRun ? colors.cyan : colors.green);
    
    if (!deleteUsers) {
      colorLog('✅ Users collection was preserved', colors.green);
    }

  } catch (error) {
    colorLog(`\\n❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Show usage information
function showUsage() {
  colorLog('\\n📖 Usage:', colors.bright);
  colorLog('  node scripts/delete-firestore-data.js [options]', colors.cyan);
  colorLog('\\n🎛️  Options:', colors.bright);
  colorLog('  --dry-run        Preview what will be deleted', colors.cyan);
  colorLog('  --force          Skip confirmation prompt', colors.cyan);
  colorLog('  --include-users  Also delete users collection and auth users', colors.cyan);
  colorLog('\\n📝 Examples:', colors.bright);
  colorLog('  # Preview deletion (recommended first)', colors.cyan);
  colorLog('  node scripts/delete-firestore-data.js --dry-run', colors.yellow);
  colorLog('\\n  # Delete all data except users', colors.cyan);
  colorLog('  node scripts/delete-firestore-data.js', colors.yellow);
  colorLog('\\n  # Delete everything including users', colors.cyan);
  colorLog('  node scripts/delete-firestore-data.js --include-users', colors.red);
}

// Handle help
if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Main execution
colorLog('🔥 Firebase Data Deletion Script', colors.bright);
colorLog('📋 Uses Firebase CLI for safe authentication', colors.blue);

deleteFirestoreCollections()
  .then(() => {
    colorLog('\\n✨ Script completed successfully!', colors.green);
    process.exit(0);
  })
  .catch((error) => {
    colorLog(`\\n💥 Script failed: ${error.message}`, colors.red);
    process.exit(1);
  });