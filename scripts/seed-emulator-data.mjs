#!/usr/bin/env node

/**
 * Seed Emulator Data Script
 * Location: scripts/seed-emulator-data.mjs
 * 
 * Seeds Firebase emulators with test users and sample Firestore data
 * This is the main seeding script referenced by npm run emulators:seed
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🌱 Seeding Firebase emulators with test data...\n');

/**
 * Execute a command and handle errors
 */
function runCommand(command, description) {
  console.log(`⏳ ${description}...`);
  try {
    execSync(command, { 
      cwd: projectRoot, 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

/**
 * Check if emulators are running
 */
function checkEmulators() {
  console.log('🔍 Checking if Firebase emulators are running...');
  try {
    execSync('curl -s http://localhost:4000 > /dev/null', { stdio: 'ignore' });
    console.log('✅ Firebase emulators are running\n');
  } catch (error) {
    console.error('❌ Firebase emulators are not running!');
    console.error('Start them with: npm run emulators:start');
    process.exit(1);
  }
}

/**
 * Main seeding workflow
 */
async function seedEmulators() {
  try {
    // Step 1: Check emulators
    checkEmulators();

    // Step 2: Seed test users
    runCommand(
      'npx tsx frontend/e2e/scripts/setup-test-users.ts',
      'Seeding Firebase Auth users and profiles'
    );

    // Step 3: Optional - seed sample assignments (if script exists)
    try {
      runCommand(
        'node scripts/create-sample-assignments.js',
        'Creating sample assignments'
      );
    } catch (error) {
      console.log('⚠️  Sample assignments script not available, skipping...\n');
    }

    console.log('🎉 Emulator seeding completed successfully!');
    console.log('\n💡 Available test accounts:');
    console.log('   Teachers: teacher1@test.com, teacher2@test.com, teacher3@test.com (password: test123)');
    console.log('   Students: student1@schoolemail.com through student8@schoolemail.com (passcode: 12345)');
    console.log('\n🔗 Access points:');
    console.log('   Frontend: http://localhost:5173');
    console.log('   Emulator UI: http://localhost:4000');
    
  } catch (error) {
    console.error('\n💥 Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run the seeding process
seedEmulators();