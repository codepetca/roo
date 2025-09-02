#!/usr/bin/env node

// Simple debug script to test the import process
const fs = require('fs');

// Set up emulator environment
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.NODE_ENV = 'emulator';
process.env.GCLOUD_PROJECT = 'roo-app-3d24e';

const { SnapshotProcessor } = require('./lib/src/services/snapshot-processor');
const { FirestoreRepository } = require('./lib/src/services/firestore-repository');

async function testImport() {
  try {
    console.log('🔍 Loading test snapshot...');
    const snapshotData = JSON.parse(fs.readFileSync('../frontend/e2e/fixtures/teacher1-snapshot.json', 'utf8'));
    
    console.log('📊 Snapshot data structure:');
    console.log('  Teacher:', snapshotData.teacher.email);
    console.log('  Classrooms:', snapshotData.classrooms.length);
    console.log('  First classroom students:', snapshotData.classrooms[0].students.length);
    console.log('  Student emails:', snapshotData.classrooms[0].students.map(s => s.email));

    console.log('🚀 Creating processor...');
    const repository = new FirestoreRepository();
    const processor = new SnapshotProcessor(repository);
    
    console.log('📝 Processing snapshot...');
    const result = await processor.processSnapshot(snapshotData);
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testImport().catch(console.error);