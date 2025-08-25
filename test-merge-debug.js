#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Loading transformation functions...');

try {
  // Load both functions
  const { snapshotToCore, mergeSnapshotWithExisting } = require('./functions/lib/shared/schemas/transformers.js');
  
  console.log('Loading mock data...');
  const mockDataPath = path.join(__dirname, 'frontend/e2e/fixtures/classroom-snapshot-mock.json');
  const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

  console.log('Running transformation...');
  const transformed = snapshotToCore(mockData);
  
  console.log('Running merge with empty existing data (fresh import)...');
  const emptyExisting = {
    classrooms: [],
    assignments: [],
    submissions: [],
    enrollments: [],
    grades: []
  };
  
  const mergeResult = mergeSnapshotWithExisting(transformed, emptyExisting);

  console.log('=== Merge Results ===');
  console.log(`Classrooms to create: ${mergeResult.toCreate.classrooms.length}`);
  console.log(`Assignments to create: ${mergeResult.toCreate.assignments.length}`);
  console.log(`Submissions to create: ${mergeResult.toCreate.submissions.length}`);
  console.log(`Enrollments to create: ${mergeResult.toCreate.enrollments.length}`);
  
  console.log(`Classrooms to update: ${mergeResult.toUpdate.classrooms.length}`);
  console.log(`Assignments to update: ${mergeResult.toUpdate.assignments.length}`);
  console.log(`Submissions to update: ${mergeResult.toUpdate.submissions.length}`);
  console.log(`Enrollments to update: ${mergeResult.toUpdate.enrollments.length}`);
  
  if (mergeResult.toCreate.submissions.length === 0) {
    console.log('\n❌ NO SUBMISSIONS IN MERGE RESULT - This confirms merge logic bug!');
  } else if (mergeResult.toCreate.submissions.length !== transformed.submissions.length) {
    console.log(`\n⚠️ SUBMISSION MISMATCH: Transformed ${transformed.submissions.length}, Merge result ${mergeResult.toCreate.submissions.length}`);
  } else {
    console.log('\n✅ All submissions correctly placed in merge result');
  }

} catch (error) {
  console.error('Error running merge test:', error);
  console.error(error.stack);
}